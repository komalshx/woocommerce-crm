<<<<<<< HEAD
<<<<<<< HEAD
# CRM — WooCommerce CRM

A CRM (not a storefront) that syncs customers and orders from WooCommerce, tracks notes, tasks and emails, segments customers by explicit rules, and recommends next steps through a rule-based action agent.

## Modules
1. **Customers** – list/search/filter/sort, profile, notes, tags, duplicate review. Woo-sourced fields are read-only; CRM tags/notes/tasks are CRM-owned.
2. **Orders** – read-only mirror of WooCommerce orders (manual sync + webhooks). No order writes exist.
3. **Communications** – templates, preview, explicit approval, Resend sending, history, tasks.
4. **CRM Action Agent** – deterministic rules; facts are separated from inferences; the only write is "create task", after confirmation. No AI model is called.
5. **Retention & Insights** – segments, repeat rate, AOV, 12-month first vs repeat orders.

## Stack
React + Vite + Tailwind (JavaScript), React Router, Lucide · Node + Express + Zod · PostgreSQL + Prisma · WooCommerce REST v3 + webhooks · Resend.

## Structure
```
prisma/schema.prisma         schema (migrations are generated into prisma/migrations)
backend/src/{routes,services,integrations,webhooks,validators,middleware,utils}
frontend/src/{pages,components,layouts,hooks,lib}
```

## Setup
Prerequisites: Node 20+, PostgreSQL 14+.
```bash
createdb woocommerce_crm
cp .env.example backend/.env        # then edit values
cd backend && npm install
npm run migrate -- --name init      # creates prisma/migrations and applies it
npm run dev                         # API on :4000
# new terminal
cd frontend && npm install && npm run dev   # UI on :5173 (proxies /api to :4000)
```
For a deployed database use `npm run migrate:deploy`.

## Environment variables
See `.env.example`. Key ones: `DATABASE_URL`, `WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY/SECRET`, `WOOCOMMERCE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_TOKEN`, `LOYAL_MIN_ORDERS`, `INACTIVE_AFTER_DAYS`.

## WooCommerce setup
1. WooCommerce → Settings → Advanced → REST API → add a key with **Read** permission; copy key/secret into `.env`. Use an HTTPS store URL.
2. Settings → Advanced → Webhooks → add webhooks for `order.created`, `order.updated`, `order.deleted`, `customer.created`, `customer.updated`. Delivery URL: `https://<your-public-api>/api/webhooks/woocommerce` (use a tunnel such as ngrok locally). Secret = `WOOCOMMERCE_WEBHOOK_SECRET`.
3. Open **Settings → Sync now** in the CRM.

## Email setup
Create a Resend API key and a verified sending domain; set `RESEND_API_KEY` and `EMAIL_FROM`.

## Segment rules (backend/src/config.js)
Qualifying orders: status `completed` or `processing`. Precedence: none → inactive (> `INACTIVE_AFTER_DAYS` since last qualifying order) → loyal (≥ `LOYAL_MIN_ORDERS`) → repeat (2+) → new (1). Guest orders are matched only by normalized email; guests without email stay unmatched and are excluded. Customers are never merged by name; the Customers page lists name/phone matches for manual review.

## API groups
`/api/customers` · `/api/orders` · `/api/tasks` · `/api/communications` (+`/templates`, `/preview`, `/send`) · `/api/insights` · `/api/agent` · `/api/integrations` · `/api/webhooks/woocommerce` · `/api/health`

## Behavior and limitations
- Webhooks: HMAC-SHA256 verified on the raw body; deliveries are recorded by delivery ID; processing is idempotent; older order payloads never overwrite newer data; failures return 500 so WooCommerce retries.
- Sync pages through the API (100/page) and upserts by Woo ID; re-running creates no duplicates. A failed record marks the sync as FAILED with the first error.
- Email status is `ATTEMPTED → ACCEPTED | FAILED`. "Accepted" means Resend took the message; delivery events (Resend webhooks) are not implemented.
- Segment totals assume a single store currency; the Insights page shows "Mixed currencies" when more than one exists.
- Authentication is a single shared `ADMIN_TOKEN`. Set it, or put the app behind SSO/VPN, before exposing it.
- shadcn/ui is not installed: the UI uses small hand-written components in `frontend/src/components/ui.jsx` styled with Tailwind and the specified palette.
- Template editing is available through the API (`/api/communications/templates`) but has no UI screen yet.
- Not executed against a live database or store in the environment where this was generated.
=======
# woocommerce-crm
WooCommerce CRM with customer management, orders, and insights
>>>>>>> 11c4bf88ae785843f841869c07515c4bca51136c
=======
WooCommerce CRM

A Customer Relationship Management (CRM) application designed to work with WooCommerce.

Features

- Customer management
- Order viewing and tracking
- Customer insights and retention tools
- CRM dashboard
- WooCommerce integration

Technologies

- Frontend: React and Vite
- Backend: Node.js and Express
- Database: PostgreSQL
- ORM: Prisma

Getting Started

Configure the required environment variables before running the application.

Backend

cd backend
npm install
npm run dev

Frontend

Open a separate terminal:

cd frontend
npm install
npm run dev

Refer to the project configuration and environment example files for setup details.

Security

Do not commit ".env" files, passwords, API keys, or other credentials to GitHub.
>>>>>>> 21ccbb96a8ccd95b9e0d8f92dea6bba4c24b164a
