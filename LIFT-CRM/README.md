# LIFT CRM

Internal customer relationship system for **VendorLift** (Phase One). One record for every customer, from first enquiry to a delivered website.

- **Leads:** list or pipeline board, with the PRD rules built in (consent, owner, next action, lost reason, no duplicate phones).
- **Customers:** accounts with their contacts and jobs together.
- **Jobs tracker:** stage, health (On Track / At Risk / Blocked), owners, payments and balance, deadline.
- **Today dashboard:** overdue actions, jobs at risk and pipeline by stage.
- **Team:** the Super Admin invites staff and sets their role.
- **Security:** mandatory authenticator-app verification, role-based access, 8-hour idle timeout and an append-only audit log.

> Lift is an internal tool for staff. Customers never log in to it.

## How it is built

```
Browser  ──►  web/  (React + Tailwind, Cloudflare Pages)
                │   HTTPS + JSON, with a login token
                ▼
              api/  (Hono on Cloudflare Workers)
                │
                ▼
              Cloudflare D1 database
```

| Folder | What it is | Hosted on |
|---|---|---|
| `web/` | Front end: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide icons | Cloudflare Pages |
| `api/` | Back end: Hono (TypeScript) with the D1 database | Cloudflare Workers |

The two parts are separate websites that talk through the address in `web/.env` (`VITE_API_URL`). The back end only accepts requests from the addresses listed in `ALLOWED_ORIGINS` (`api/wrangler.toml`).

## Requirements
- Node.js 20 or newer (nodejs.org, LTS). Check with `node -v`.
- A free Cloudflare account (needed for the back end tools).
- An authenticator app on your phone (Google Authenticator or Microsoft Authenticator).

## Quick look (front end only, demo data)
```bash
npm run install:web
cd web
npm run dev
```
Open http://localhost:5173. With no `.env` file the app runs on demo data saved in your browser. A blue "Demo mode" box on the sign-in page shows the demo logins. Demo mode has no real security and is for looking at the screens only.

## Full setup (front end + back end on your computer)

Use three PowerShell windows. Replace the example email and password with your own.

### 1. Install
From the project root (the folder containing `web` and `api`):
```bash
npm run install:web
npm run install:api
```
If `install:api` stops with an `ERESOLVE` error, run `npm install --legacy-peer-deps` inside `api`.

### 2. Create the database and start the back end (window 1)
```bash
cd api
npx wrangler login
npx wrangler d1 create lift-db
```
Copy the `database_id` it prints into `api/wrangler.toml`. Keep `binding = "DB"` exactly as it is. Then:
```bash
npx wrangler d1 execute lift-db --local --file=schema.sql
npx wrangler dev
```
The back end runs at http://localhost:8787. Opening it in a browser should show `{"name":"lift-api","ok":true}`. Leave this window open.

### 3. Create the first Super Admin (window 2, only once)
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8787/auth/bootstrap -ContentType 'application/json' -Body '{"email":"you@example.com","name":"Your Name","password":"YourPassword123"}'
```
This works only while there are no users. It prints a `setupKey`. Add it to your authenticator app (see below).

### 4. Connect and start the front end (window 3)
```powershell
cd web
Set-Content .env "VITE_API_URL=http://localhost:8787"
npm run dev
```
Open http://localhost:5173 and sign in. The front end reads `.env` only when it starts, so restart it after changing the file.

## How authentication works

Every staff sign-in has two steps:

1. **Email and password.** Passwords are never stored. Only a salted PBKDF2 hash is kept.
2. **A 6-digit code from an authenticator app.** The code changes every 30 seconds and proves you hold your phone. Lift does not send codes by email or text.

### Adding the key to your phone
1. Open Google Authenticator or Microsoft Authenticator and tap **+**.
2. Choose **Enter a setup key**.
3. Name it (for example `Lift`), paste the setup key, and make sure the type is **Time based**.
4. The app now shows a code with a countdown. Type the current code when Lift asks for it.

If the code never changes, the entry was added as counter-based. Delete it and add it again as time-based. Your phone's date and time must be set to automatic.

### Rules
- Passwords need at least 10 characters with upper case, lower case and a number.
- The code is accepted up to 30 seconds either side of the current time.
- Five wrong codes end that sign-in attempt.
- After 8 hours of inactivity the session ends and you sign in again.
- Failed sign-ins, failed codes and forbidden requests are recorded in the audit log.

### Inviting new staff
There is no public sign-up. The Super Admin creates every account:

1. Sign in as Super Admin and open **Team**.
2. Enter the person's name, work email and role, then click **Create invitation**.
3. Lift shows an **invitation code** and a **setup key**, with a button that copies a ready-made message. Send both privately (for example on WhatsApp). The setup key is shown only once. If it is lost, cancel the invitation and create a new one.
4. The new person adds the setup key to their own authenticator app (time based).
5. On the sign-in page they click **Have an invitation?** and enter the invitation code, name, the same email, a password and the current 6-digit code.
6. Their account is activated and they are signed in with the role you chose. The invitation code cannot be reused.

Pending invitations stay in the Team list with their code and a **Cancel** button.

### Roles and what they can open (enforced by the back end)

| Role | Leads | Accounts and contacts | Jobs | Team |
|---|---|---|---|---|
| Super Admin | yes | yes | yes | yes |
| Marketing | yes | yes | no | no |
| Sales | yes | yes | yes | no |
| Finance | yes | accounts | yes | no |
| Production | no | accounts | yes | no |
| Customer Success | no | yes | yes | no |

Other rules enforced by the back end:
- Only **Finance or Super Admin** can mark a lead **Paid / Won**.
- Only the **Super Admin** can delete records.
- A request outside your role returns **403** and writes a security alert to the audit log.
- Exports (`GET /export/leads|accounts|contacts|jobs`, CSV) are limited to Super Admin and Finance, and each one is logged.

## Business rules checked on the server
- A lead needs a business name, contact, phone, source, owner, next action with due date, and all three consents (WhatsApp, email, terms).
- Referral sources need a referral code.
- A lost lead needs a lost reason.
- A phone number can exist on only one lead.
- A job needs an account, package, contract value, status and health. Once it leaves "Awaiting Brief" it also needs a target date, production owner and customer success owner.
- A job that is At Risk or Blocked needs a blocker note, and the amount paid cannot exceed the contract value.

## Audit log
Every create, read, update, delete, export, sign-in, failed sign-in and forbidden request is written to `audit_log` with who, when, IP address and before/after data. Database triggers block any edit or delete of audit rows. To read it locally:
```bash
cd api
npx wrangler d1 execute lift-db --local --command "SELECT ts, actor_id, action, target FROM audit_log ORDER BY ts DESC LIMIT 20"
```

## API routes

| Route | Who | Purpose |
|---|---|---|
| `POST /auth/bootstrap` | anyone, once | Create the first Super Admin |
| `POST /auth/login` | anyone | Email and password, returns an MFA token |
| `POST /auth/mfa` | anyone | 6-digit code, returns the session token |
| `POST /auth/activate` | invited person | Accept an invitation |
| `POST /auth/forgot` | anyone | Reset request (email sending not built) |
| `POST /auth/logout` | signed in | End the session |
| `GET /users`, `POST /users`, `DELETE /users/:id` | Super Admin | List, invite, cancel a pending invitation |
| `GET/POST /leads`, `/accounts`, `/contacts`, `/jobs` | by role | List and create |
| `PUT/DELETE /{records}/:id` | by role / Super Admin | Update, delete |
| `GET /export/{records}` | Super Admin, Finance | CSV export |

Requests send `Authorization: Bearer <token>`. Errors look like `{ "error": { "message": "..." } }`.

## Project layout
```
LIFT-CRM/
├── web/
│   ├── public/            logo and favicon
│   └── src/
│       ├── App.tsx        screens: today, leads, customers, jobs
│       ├── Auth.tsx       sign-in, code, invitation, roles
│       ├── Team.tsx       invite and manage staff
│       ├── api.ts         data layer (demo data or the real back end)
│       └── lib.ts         fields and validation for each record type
└── api/
    ├── schema.sql         database tables and audit-log triggers
    ├── wrangler.toml      Cloudflare settings (database, allowed origins)
    └── src/index.ts       the whole back end
```

## Deploying to Cloudflare

**Back end**
1. Set `ALLOWED_ORIGINS` in `api/wrangler.toml` to your Pages address, for example `"https://lift-crm.pages.dev"` (separate several with commas).
2. Create the tables on the live database and deploy:
```bash
cd api
npx wrangler d1 execute lift-db --remote --file=schema.sql
npx wrangler deploy
```
3. Create the first Super Admin on the live back end with the bootstrap command from step 3 above, using the new `workers.dev` address.

**Front end**
1. In Cloudflare Pages, create a project from this repository.
2. Set the root directory to `web`, the build command to `npm run build`, and the output directory to `dist`.
3. Add the environment variable `VITE_API_URL` set to your Worker address.

The local test database and the live Cloudflare database are separate. Data you create on your computer never moves to the live one.

## Troubleshooting

| Problem | Fix |
|---|---|
| `wrangler is not recognized` | Run `npm install` inside `api`, or use `npx wrangler ...`. |
| `ERESOLVE` error on `install:api` | Run `npm install --legacy-peer-deps` inside `api`. |
| `Missing script: "dev"` | You are in the wrong folder. Go into `web` or `api`. |
| `vite` not found | Run `npm run install:web`. |
| Sign-in page still shows "Demo mode" | `web/.env` is missing or the front end was not restarted. |
| Request blocked or "Failed to fetch" | Add the front end's address to `ALLOWED_ORIGINS` and restart the back end. |
| "The 6-digit code is not correct" | Use the code from the authenticator entry that holds this person's key, added as time based. |
| Cannot create the admin: "Already set up" | An admin exists. Sign in, or clear users: `npx wrangler d1 execute lift-db --local --command "DELETE FROM sessions; DELETE FROM users"`. |

## Before you go live
- Use a strong, unique password for the Super Admin, and do not reuse any password shown in demos or chat.
- Keep the repository private.
- Confirm `ALLOWED_ORIGINS` lists only your real front end address.
- Test the invitation flow with a real second person and phone.

## Not built yet
Password-reset emails, file uploads (R2), quotes and payments, scheduled backups to R2 (D1 offers its own point-in-time restore), rate limiting on password sign-in, expiry of invitation codes, a page for viewing the audit log, and automated tests.
