# Lift CRM: Front End

Internal customer system for VendorLift (Phase One). This repository holds the **front end only**. The back end (Hono on Cloudflare Workers, with D1 and R2) lives in a separate repository.

**Screens:** sign-in with verification code, Today dashboard, Leads (list and pipeline board), Accounts, Contacts, Jobs.

## Tech stack
React 18, TypeScript, Vite, Tailwind CSS v4. Hosted on Cloudflare Pages.

## Quick start
Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the address shown, usually http://localhost:5173.

### Demo mode
With no back end configured, the app runs on demo data stored in your browser.

| Email | Password | Code | Role |
|---|---|---|---|
| amina@vendorlift.ng | Lift@2026 | 123456 | Super Admin |
| tunde@vendorlift.ng | Lift@2026 | 123456 | Sales |
| grace@vendorlift.ng | Lift@2026 | 123456 | Production |
| ibrahim@vendorlift.ng | Lift@2026 | 123456 | Finance |

These are fake accounts that exist only in the front end. Do not reuse them anywhere real.

## Connecting to the back end
Copy `.env.example` to `.env` and set the address of the deployed or local Worker:

```
VITE_API_URL=http://localhost:8787
```

The back end must allow this app's address using CORS. The app calls:

| Area | Requests |
|---|---|
| Sign-in | `POST /auth/login`, `/auth/mfa`, `/auth/activate`, `/auth/forgot` |
| Data | `GET`, `POST`, `PUT`, `DELETE` on `/leads`, `/accounts`, `/contacts`, `/jobs` |

The back end, not this app, must enforce who may see or change what (return 403). Screens are hidden by role only for convenience.

## Project layout
```
src/
  App.tsx    Screens: dashboard, lists, board, forms
  Auth.tsx   Sign-in, verification code, invitation setup, roles
  api.ts     Data layer (demo data or real back end)
  lib.ts     Fields, rules and validation for each record type
```

## Deploying to Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` set to the Worker address

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Check types and build for production |
| `npm run preview` | Preview the production build |

## Status
Phase One front end in progress. Not yet built: quotes, file uploads (R2), agent referral page, and automated tests.
