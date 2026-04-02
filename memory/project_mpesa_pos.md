---
name: M-Pesa POS STK Push System
description: Full-stack M-Pesa STK Push POS payment system — backend Node/Express on Render, frontend Next.js on Vercel, Neon PostgreSQL
type: project
---

Complete M-Pesa STK Push payment system for Point of Sale integration. Cashiers trigger payment prompts on customer phones.

**Stack:** Node.js/Express backend (Render), Next.js 14 frontend (Vercel), Neon PostgreSQL

**Why:** POS hardware without native M-Pesa support needs an external STK push system. Merchants configure their own Daraja credentials via the Settings page.

**How to apply:** When working on this project, the DB is Neon, backend deploys to Render, frontend to Vercel. The WSL local environment has port 5432 blocked for external connections — always test DB connectivity on Render directly.

**DB:** Tables `settings` (1 row, Daraja creds) and `transactions`. Schema already applied to Neon.

**Key files:**
- `backend/src/utils/mpesa.js` — token generation, STK push, Daraja API helpers
- `backend/src/routes/mpesa.js` — stkpush, callback, status, query endpoints
- `frontend/src/app/page.js` — main cashier payment UI
- `frontend/src/app/settings/page.js` — Daraja credentials config
- `frontend/src/app/transactions/page.js` — transaction history

**Deployment:**
- Backend: render.yaml in backend/, set DATABASE_URL + FRONTEND_URL env vars
- Frontend: vercel.json in frontend/, set NEXT_PUBLIC_API_URL + NEXT_PUBLIC_WS_URL
- Update frontend/vercel.json rewrite destination to real Render URL after deployment

**Real-time:** Socket.io + polling fallback (3s interval). Timeout at 60s marks transaction as 'timeout'.
