const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { initiateStkPush, queryStkStatus } = require('../utils/mpesa');
const { requireAuth } = require('../middleware/auth');

// POST /api/mpesa/stkpush - Initiate STK Push (public — cashier-facing)
router.post('/stkpush', async (req, res) => {
  const { phone, amount, reference, description, cashier_note } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: 'Phone number and amount are required' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 1) {
    return res.status(400).json({ error: 'Amount must be at least KES 1' });
  }

  let stkResponse;
  try {
    stkResponse = await initiateStkPush({ phone, amount: parsedAmount, reference, description });
  } catch (err) {
    const safaricomBody = err.response?.data;
    console.error('STK Push error:', err.response?.status, JSON.stringify(safaricomBody) || err.message);
    const errMsg =
      safaricomBody?.errorMessage ||
      safaricomBody?.error_description ||
      (typeof safaricomBody === 'string' ? safaricomBody : null) ||
      (safaricomBody ? JSON.stringify(safaricomBody) : null) ||
      err.message;
    return res.status(502).json({ error: errMsg });
  }

  if (stkResponse.ResponseCode !== '0') {
    return res.status(400).json({
      error: stkResponse.ResponseDescription || 'STK Push request failed',
    });
  }

  // Save transaction to database
  try {
    const result = await pool.query(
      `INSERT INTO transactions
        (phone, amount, reference, description, status, checkout_request_id, merchant_request_id, cashier_note)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
       RETURNING *`,
      [
        phone,
        parsedAmount,
        reference || null,
        description || null,
        stkResponse.CheckoutRequestID,
        stkResponse.MerchantRequestID,
        cashier_note || null,
      ]
    );

    const transaction = result.rows[0];
    return res.json({
      success: true,
      message: 'STK Push sent. Waiting for customer to enter PIN.',
      transaction_id: transaction.id,
      checkout_request_id: transaction.checkout_request_id,
    });
  } catch (dbErr) {
    console.error('DB insert error:', dbErr);
    return res.status(500).json({ error: 'Failed to save transaction' });
  }
});

// POST /api/mpesa/callback - Safaricom callback (must be public)
router.post('/callback', async (req, res) => {
  // Always respond 200 immediately to Safaricom
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) {
      console.error('Invalid callback payload:', JSON.stringify(req.body));
      return;
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callbackData;

    console.log(`Callback received: ${CheckoutRequestID} → ResultCode ${ResultCode}`);

    let mpesaReceipt = null;
    let status = ResultCode === 0 ? 'success' : 'failed';

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const items = CallbackMetadata.Item;
      const find = (name) => items.find((i) => i.Name === name)?.Value;
      mpesaReceipt = find('MpesaReceiptNumber') || null;
    }

    // Update transaction
    const updateResult = await pool.query(
      `UPDATE transactions
       SET status = $1,
           mpesa_receipt = $2,
           result_code = $3,
           result_desc = $4,
           updated_at = NOW()
       WHERE checkout_request_id = $5
       RETURNING *`,
      [status, mpesaReceipt, ResultCode, ResultDesc, CheckoutRequestID]
    );

    if (!updateResult.rows.length) {
      console.warn(`No transaction found for CheckoutRequestID: ${CheckoutRequestID}`);
      return;
    }

    const updatedTxn = updateResult.rows[0];

    // Emit real-time event via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit(`payment:${CheckoutRequestID}`, {
        status,
        mpesa_receipt: mpesaReceipt,
        result_code: ResultCode,
        result_desc: ResultDesc,
        transaction: updatedTxn,
      });
      // Also broadcast to general channel for transaction list refresh
      io.emit('transactions:updated', { checkout_request_id: CheckoutRequestID });
    }
  } catch (err) {
    console.error('Callback processing error:', err);
  }
});

// GET /api/mpesa/status/:checkoutRequestId - Poll payment status
router.get('/status/:checkoutRequestId', async (req, res) => {
  const { checkoutRequestId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE checkout_request_id = $1',
      [checkoutRequestId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Status query error:', err);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// POST /api/mpesa/query - Query transaction status from Safaricom
router.post('/query', async (req, res) => {
  const { checkout_request_id } = req.body;

  if (!checkout_request_id) {
    return res.status(400).json({ error: 'checkout_request_id is required' });
  }

  try {
    const darajaResult = await queryStkStatus(checkout_request_id);

    // Update DB if result is conclusive
    if (darajaResult.ResultCode !== undefined) {
      const status = darajaResult.ResultCode === 0 ? 'success' : 'failed';
      await pool.query(
        `UPDATE transactions
         SET status = $1, result_code = $2, result_desc = $3, updated_at = NOW()
         WHERE checkout_request_id = $4 AND status = 'pending'`,
        [status, darajaResult.ResultCode, darajaResult.ResultDesc, checkout_request_id]
      );
    }

    return res.json(darajaResult);
  } catch (err) {
    console.error('STK query error:', err.response?.data || err.message);
    return res.status(502).json({
      error: err.response?.data?.errorMessage || err.message,
    });
  }
});

module.exports = router;
