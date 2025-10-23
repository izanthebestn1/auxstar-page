# Auxstar

Auxstar is a static-first news site that relies on Vercel serverless functions backed by a Postgres database. The public pages render with vanilla JavaScript while the admin dashboard performs CRUD operations through authenticated API calls.

## Project Structure
- `index.html`, `articles.html`, `evidence.html`, `railroads.html` – public content surfaces.
- `admin/` – protected admin entry points (`login.html`, `dashboard.html`).
- `js/` – frontend behaviour (auth helpers, API client, page renderers, dashboard logic).
- `css/` and `styles.css` – shared styling for public and admin sections.
- `api/` – Vercel functions for authentication, articles, evidence, and admin stats.

## Backend Overview
- Postgres schema includes `users`, `sessions`, `articles`, and `evidence` tables (see `api/_db.js`).
- Users are seeded from `AUTH_USERS_JSON` and persisted in the `users` table.
- Sessions are stored in the `sessions` table and validated on each admin request.
- Articles and evidence records are created, updated, and listed exclusively through the API layer.

## Running Locally
1. Install dependencies with `npm install`.
2. Create a `.env.local` (or `.env`) file that includes:
   - `DATABASE_URL` – connection string for your Postgres instance (Neon works well).
   - `AUTH_USERS_JSON` – JSON array of seed users, e.g. `[{"username":"admin","password":"secret","role":"admin"}]`.
3. Start the local environment with `vercel dev` (or deploy to Vercel for production parity).
4. Open the reported URL and log in through `admin/login.html`.

## Deployment Notes
- Configure `DATABASE_URL` and `AUTH_USERS_JSON` in the Vercel dashboard for each environment.
- Redeploy after updating environment variables so that the schema bootstrapping in `ensureSchema()` runs.
- Monitor serverless logs for API activity and errors during rollout.

## Security Checklist
- Replace plain-text passwords in `AUTH_USERS_JSON` with hashed values (bcrypt/argon2) and adjust `_auth.js` accordingly.
- Use role-based access in the admin dashboard; only admin accounts can call privileged APIs.
- Maintain the built-in math challenge (no external keys required) and manage evidence IP bans to throttle spam submissions (1-minute per-IP rate limit enforced server-side).
- Keep `.env*` files and database credentials out of version control.

## Contributing
- Open an issue describing the change or bug.
- Submit PRs with a short summary and testing notes.