# Deployment: Supabase (database) + Render (Node server)

Supabase hosts the **Postgres database**. The Express server is a long-running Node process, so it runs on a Node host such as Render and talks to Supabase over the network. (Supabase Edge Functions can't run this app as-is.)

## 1. Create the Supabase project

1. In the Supabase dashboard create a project (any organisation). Choose a region near your users, e.g. `eu-west-1` for Dublin. Save the database password.
2. Open **Connect** and copy the **Session pooler** connection string. It works from IPv4-only hosts such as Render and supports everything this app needs:
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

The migration enables row-level security on every table with no policies and revokes `anon`/`authenticated`, so the auto-generated Data API can't touch your data. Check **Advisors → Security** afterwards; it should report no exposed tables.

Optional demo content (never on a real production dataset): `npm run seed`.

## 3. Deploy the server on Render

Create a **Web Service** from this repository:

| Setting | Value |
| --- | --- |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the session pooler string from step 1 |
| `JWT_SECRET` | output of `openssl rand -hex 32` (never reuse the old one) |
| `TRUST_PROXY` | `1` |
| `DB_SSL_CA` | contents of the CA certificate (optional, recommended) |
| `AUTO_MIGRATE` | `1` to apply new migrations on boot (optional) |

Render terminates TLS, and the session cookie is marked `Secure` in production, so use the `https://` URL.

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
