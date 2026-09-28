# Nike Store Agent — Vercel Backend

This backend is prepared for Vercel Functions and a shared Supabase Postgres database.

## Why the old JSON database was removed

Vercel Functions have a read-only filesystem (apart from temporary `/tmp` storage), so writing `data/store.json` is not a safe persistent database strategy. The backend now stores production data in Supabase Postgres.

## Architecture

Customer Vercel
→ `/api/agent/chat`
→ Vercel Function
→ Agent
→ Supabase

Owner Vercel
→ Supabase Auth token
→ `/api/owner/*`
→ Vercel Function
→ Supabase

Gemini is only the language layer. The Agent's database, permissions and tool logic remain in this backend.

## Environment variables

Set these in the Vercel backend project:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server only, NEVER expose to frontend
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash-lite`
- `CORS_ORIGIN=https://customer-domain,https://owner-domain`

Google documents `GEMINI_API_KEY` as the recommended environment-variable approach. Gemini's current free tier includes free input/output tokens for eligible models, subject to limits.

## Database setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Create a store row.
5. Create the Owner user in Supabase Auth.
6. Insert that user's UUID into `store_members` with role `owner`.

Example:

```sql
insert into stores (name, slug) values ('My Store', 'my-store') returning id;

insert into store_members (store_id, user_id, role)
values ('STORE_UUID', 'SUPABASE_AUTH_USER_UUID', 'owner');
```

## Local test

Install:

```bash
npm install
```

Run with Vercel CLI:

```bash
npx vercel dev
```

Health endpoint:

```text
GET /api/health
```

## Vercel deployment

Create a separate Vercel project from the `backend` directory.

Set the environment variables in Vercel.

Deploy.

After deployment, test:

```text
https://YOUR-BACKEND.vercel.app/api/health
```

Expected:

```json
{
  "ok": true,
  "service": "nike-store-agent-backend",
  "version": "2.0.0"
}
```

## Important security rules

Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in Customer or Owner frontend code.

The Owner API requires a valid Supabase Auth Bearer token and a matching active `store_members` record.

Customer endpoints are public by design, but every request must include a valid `storeId`.

## API

Public:
- `GET /api/health`
- `GET /api/store?store=STORE_ID`
- `POST /api/agent/chat`

Owner:
- `GET /api/owner/products`
- `GET /api/owner/orders`
- `POST /api/owner/agent/chat`
- `GET/PUT /api/owner/agent-config`
- `GET/PUT /api/owner/settings`
- `POST /api/owner/product`
- `POST /api/owner/product/update`
- `POST /api/owner/order/status`
- `POST /api/owner/import/preview`
- `POST /api/owner/import/commit`

## Current limitation

This is the backend foundation for the split deployment. The next step is to update the Customer and Owner frontends to use these endpoints and Supabase Auth. Do not deploy the old JSON-writing server as production storage.
