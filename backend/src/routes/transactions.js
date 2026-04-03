const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// All transaction routes require authentication
router.use(requireAuth);

// GET /api/transactions - List transactions with pagination and filters
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    date_from,
    date_to,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(phone ILIKE $${params.length} OR reference ILIKE $${params.length} OR mpesa_receipt ILIKE $${params.length})`
    );
  }

  if (date_from) {
    params.push(date_from);
    conditions.push(`created_at >= $${params.length}`);
  }

  if (date_to) {
    params.push(date_to);
    conditions.push(`created_at <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated rows
    params.push(parseInt(limit));
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT * FROM transactions
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Compute summary stats for current filter
    const statsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'success') AS successful,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_amount
       FROM transactions ${where}`,
      params.slice(0, params.length - 2)
    );

    return res.json({
      transactions: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      summary: statsResult.rows[0],
    });
  } catch (err) {
    console.error('List transactions error:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/summary - Daily summary stats
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE status = 'success') AS success_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_amount
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get transaction error:', err);
    return res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// PATCH /api/transactions/:id/timeout - Mark pending transaction as timed out
router.patch('/:id/timeout', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE transactions
       SET status = 'timeout', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Transaction not found or already resolved' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Timeout update error:', err);
    return res.status(500).json({ error: 'Failed to update transaction' });
  }
});

module.exports = router;
