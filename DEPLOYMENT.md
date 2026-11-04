# Deployment: Supabase (database) + any Node host

Supabase hosts the **Postgres database**. The Express server is a long-running Node process, so it runs on a Node host (Railway, Render, Fly.io, any Docker host) and talks to Supabase over the network. (Supabase Edge Functions can't run this app as-is.)

## 1. Create the Supabase project

1. In the Supabase dashboard create a project (any organisation). Choose a region near your users, e.g. `eu-west-1` for Dublin. Save the database password.
2. Open **Connect** and copy the **Session pooler** connection string. It works from IPv4-only hosts and supports everything this app needs:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
3. Optional but recommended: **Project Settings → Database → SSL Configuration**, download the CA certificate. Setting `DB_SSL_CA` makes the server verify the database's certificate instead of only encrypting.

> The free plan allows two active projects per account. Pause one you don't need, or upgrade, if creation is blocked.

## 2. Create the schema

Pick one:

- **From your machine** (recommended, tracked in `schema_migrations`):
  ```bash
  DATABASE_URL='postgresql://…' JWT_SECRET=$(openssl rand -hex 32) npm run migrate
  ```
- **SQL editor**: paste `supabase/migrations/20261104000000_schema.sql` into the Supabase SQL editor and run it.
- **Supabase CLI**: `supabase link --project-ref <ref> && supabase db push`.

The migration enables row-level security on this app's twelve tables with no policies and revokes `anon`/`authenticated` on them, so the auto-generated Data API can't touch your data. It only touches its own tables, so it is safe in a project that already hosts other apps. If one of those table names (`users`, `questions`, `votes` …) already exists, it fails cleanly and changes nothing; use a fresh project in that case. Check **Advisors → Security** afterwards; it should report no exposed tables.

Optional demo content (never on a real production dataset): `npm run seed`.

## 3. Deploy the server (any Node host)

The server needs these environment variables, whichever host you pick:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the session pooler string from step 1 |
| `JWT_SECRET` | 64 random hex characters: `openssl rand -hex 32` (never reuse the old one) |
| `TRUST_PROXY` | `1` |
| `DB_SSL_CA` | contents of the Supabase CA certificate (optional, recommended) |
| `AUTO_MIGRATE` | `1` to apply new migrations on boot (optional) |

The host provides `PORT`. Health check path: `/api/health`. Use the host's `https://` URL; the session cookie is `Secure` in production.

**Railway** (least clicking; `railway.json` and the `Dockerfile` are already in the repo)
1. New Project → Deploy from GitHub repo → pick this repo.
2. Variables tab → add the table above.
3. Settings → Networking → Generate domain.

**Vercel** (serverless; `vercel.json` and `api/index.js` are already in the repo)
1. Add New → Project → import this GitHub repo. Leave the framework as "Other"; the build settings come from `vercel.json`.
2. Environment Variables: `NODE_ENV=production`, `TRUST_PROXY=1`, `JWT_SECRET`, and `DATABASE_URL`.
3. For `DATABASE_URL` use Supabase's **Transaction pooler** string (port `6543`, under Connect) so many short-lived function instances share a few database connections.
4. Deploy. Vercel serves `public/` from its CDN and runs the Express app as one function for `/api/*`.

Serverless caveats: the in-memory rate limits and the login lockout are kept per function instance, so they slow brute-force attempts but are not exact across instances. Cold starts add a moment to the first request after idle time. Run `npm run migrate` from your machine, never from the function.

**Render**: New Web Service from the repo, build `npm install`, start `npm start`, health check `/api/health`, add the variables.

**Fly.io, Koyeb, Cloud Run, a VPS**: anything that runs Docker works with the included `Dockerfile` (`docker build -t this-or-that . && docker run -p 4000:4000 --env-file .env this-or-that`).

Free tiers change often and most free web services sleep when idle (the first request after a pause takes 30 to 50 seconds). Check the host's pricing page before choosing.

## 4. Clean up the old deployment

The first version had a database password committed to `config/db.js` (Aiven MySQL), plus a hard-coded JWT secret. They are removed from the code but live on in git history.

- Rotate or delete the Aiven database and its password.
- Treat the old JWT secret as burned: the new `JWT_SECRET` replaces it.
- Existing accounts and polls from the MySQL version are not migrated; the redesign starts from a clean Postgres schema.

## 5. Verify

```bash
curl https://<your-app>.onrender.com/api/health     # {"ok":true}
```

Then sign up, pick topics, vote, and watch the poll page. In Supabase **Table Editor** you should see rows appear in `users`, `votes` and `arguments`.
