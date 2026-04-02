# M-Pesa STK Push POS System

A complete M-Pesa STK Push payment system for Point of Sale integration.
Cashiers can trigger M-Pesa payment prompts on customer phones without needing
POS hardware that natively supports M-Pesa.

## Architecture

```
Frontend (Vercel / Next.js)
    ↓  HTTPS
Backend (Render / Node.js + Express)
    ↓  PostgreSQL
Neon Database
    ↓
Safaricom Daraja API  ←→  Customer Phone
```

---

## Local Development

### Prerequisites
- Node.js 18+
- Git

### 1. Clone & install

```bash
git clone <repo>
cd mpesa

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require
FRONTEND_URL=http://localhost:3000
```

### 3. Configure frontend

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 4. Start both servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:3000

---

## Production Deployment

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo → select `backend/` as root directory
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add environment variables:
   - `DATABASE_URL` → your Neon connection string
   - `FRONTEND_URL` → your Vercel frontend URL
   - `NODE_ENV` → `production`
7. Deploy — note your Render URL: `https://your-app.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo → select `frontend/` as root directory
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → `https://your-app.onrender.com/api`
   - `NEXT_PUBLIC_WS_URL` → `https://your-app.onrender.com`
4. Update `frontend/vercel.json` — replace the backend rewrite URL
5. Deploy

---

## Daraja Setup (Safaricom)

### Sandbox (Testing)

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an App → add **Lipa Na M-Pesa Sandbox**
3. Copy credentials from your app:
   - Consumer Key
   - Consumer Secret
4. From the **Lipa Na M-Pesa** section:
   - Shortcode: `174379`
   - Passkey: (provided in the sandbox)
5. In the app Settings page:
   - Paste all credentials
   - Set Callback URL: `https://your-backend.onrender.com/api/mpesa/callback`
   - Set Environment: **Sandbox**
   - Click **Test Connection** to verify
6. Test with sandbox phone: `254708374149`, PIN: `1234`

### Production

1. Apply for **Go-Live** on the Safaricom portal
2. Get your live:
   - Shortcode (Paybill or Till number)
   - Passkey
   - Consumer Key & Secret
3. Update Settings → switch Environment to **Production**

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mpesa/stkpush` | Initiate STK Push |
| POST | `/api/mpesa/callback` | Safaricom callback (public) |
| GET | `/api/mpesa/status/:checkoutRequestId` | Poll payment status |
| POST | `/api/mpesa/query` | Query Daraja directly |
| GET | `/api/transactions` | List transactions |
| GET | `/api/transactions/:id` | Single transaction |
| GET | `/api/settings` | Get settings (masked) |
| POST | `/api/settings` | Save settings |
| GET | `/api/settings/test` | Test Daraja connection |

---

## Security Notes

- Daraja credentials are stored in the database (masked in API responses)
- Never expose your passkey or consumer secret in client-side code
- Callback URL must be HTTPS (Safaricom requirement)
- Rate limiting is applied to all `/api/*` routes except `/callback`

---

## Database Schema

Tables created automatically on first run:

- **`settings`** — Daraja credentials and configuration (1 row)
- **`transactions`** — Payment records with status tracking
