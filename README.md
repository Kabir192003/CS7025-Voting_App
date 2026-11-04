# This or That

A community decision app. Post a two-sided choice you're stuck on, vote on other people's, and see where the crowd lands. Results stay hidden until you vote, so every vote is independent.

Built with Node.js, Express and Postgres (designed for [Supabase](https://supabase.com)), with a build-free vanilla JavaScript front end.

- Redesign case study (audit, research, decisions): [`docs/case-study/This-or-That-Case-Study.pdf`](docs/case-study/This-or-That-Case-Study.pdf)
- Design canvas source (Claude Design): [`docs/design/`](docs/design/)
- Deploying: [`DEPLOYMENT.md`](DEPLOYMENT.md)

## What it does

| Feature | How it works |
| --- | --- |
| **Vote, then reveal** | Results and arguments are hidden until you vote (or peek, or the poll closes). Three social-influence experiments are behind this; see the case study. |
| **Two sides, one bar** | Every decision has exactly two options (THIS / THAT) drawn as one split bar with a 50% line. |
| **Verdicts** | *Too early to call* (<10 votes), *Too close to call* (margin ≤ 6), *Leaning* and *Landslide* (leader ≥ 70%). One rule set in `lib/verdict.js`, used everywhere. |
| **Feeds** | *For you* (your topics boosted, time-decayed), *Rising* (last 48h activity, near-even splits boosted), *Fresh*, *Needs votes*, *Saved*, topic filters, search. |
| **Arguments** | Vote first, then make your case. Grouped by side, ranked by the Wilson lower bound of "convincing" marks. Up to 5 per person per decision. |
| **Change your mind** | Switch or undo a vote for 10 minutes; after that it's locked. |
| **Close the loop** | When a decision closes, the asker reports what they chose. Voters and savers get a notification. |
| **Lifecycle** | Voting windows of 6h / 1d / 3d / 7d, edit context until the first vote, delete your own decision, anonymous posting. |
| **Profile** | Your record: votes cast, how often you side with the majority (overall and by topic), streak, decisions asked, avatar, topics. |
| **Moderation** | Report decisions and arguments; five distinct reporters hide the content. |
| **Polish** | Light and dark themes, responsive down to phones, keyboard and screen-reader friendly, reduced-motion aware. |

## Architecture

```
server.js               boot: DB check, optional migrations, graceful shutdown
app.js                  Express app factory (headers, CSRF guard, rate limits, routes, static files)
config/                 env.js (no fallbacks, fails fast), db.js (pg pool)
routes/api.js           every endpoint, with its rate limiter
controllers/            auth, polls, arguments, users, misc
lib/                    validate (zod), verdict, wilson, polls (shared read queries), migrator, session, errors
middleware/             auth, security (helmet CSP, CSRF, limiters), error, requestLog
supabase/migrations/    SQL schema (also runs with `supabase db push` or the SQL editor)
scripts/                migrate.js, seed.js
data/questions.js       60 curated seed decisions across 12 topics
public/                 css/app.css (design tokens, light + dark), js/ (ES modules), *.html
tests/                  integration tests against a real Postgres
```

### Security model

- **No secrets in code.** `config/env.js` has no fallbacks; the server refuses to boot without `DATABASE_URL` and a 32+ character `JWT_SECRET`.
- **Sessions** are JWTs in an `HttpOnly`, `SameSite=Strict`, `Secure` (production) cookie. Tokens carry a `token_version`, so changing your password or "Sign out everywhere" revokes every older token.
- **CSRF**: on top of SameSite, every state-changing call needs `X-Requested-With`, a same-origin `Origin`, and a JSON body.
- **CSP** without `unsafe-inline`: scripts and styles only from this origin (plus Google Fonts). The front end builds DOM with `textContent`, never `innerHTML`, and text is stored raw and escaped on output.
- **Validation** at the edge with zod (`.strict()`, so unknown fields are rejected). Avatars must be PNG/JPEG/WebP data URIs under 200 KB; SVG is refused.
- **Brute force**: per-IP rate limits, plus a per-username lockout (5 misses, 15 minutes). Login does a constant-work bcrypt compare even for unknown users.
- **Integrity in the database**: votes and arguments reference `(option_id, question_id)` with a composite foreign key, so an option from another poll can't be used even by a buggy query. One vote per user per poll, exactly two options per poll, usernames unique case-insensitively, counters can't go negative.
- **Concurrency**: voting locks the poll row (`SELECT ... FOR UPDATE`) so denormalised counters never drift; a test hammers one poll with 30 simultaneous voters.
- **Supabase Data API locked out**: row-level security is on for every table with no policies, and `anon`/`authenticated` are revoked. The Node server is the only client.
- **Fail closed**: one error handler with a stable JSON shape and no stack traces; unknown process-level errors log and exit so the platform restarts a clean process.

## Run it locally

You need Node 18+ and a Postgres database (a local one, or a Supabase project).

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm run migrate             # create the schema
npm run seed                # optional: 60 demo decisions, 30 demo users
npm run dev                 # http://localhost:4000
```

The seed prints a demo login (`demo_ada`). Never run it against production.

```bash
npm test                    # 32 integration tests against a throwaway Postgres
```

Tests read `TEST_DATABASE_URL` (default `postgresql://tot:tot_local_pw@127.0.0.1:5432`) and create/reset the `thisorthat_test` and `thisorthat_schema` databases, which must already exist.

## API at a glance

All under `/api`, JSON in and out, errors as `{ "error": { "code", "message", "fields?" } }`.

`POST /auth/signup · login · logout · logout-all · password`
`GET /users/me` · `PUT /users/me` · `PUT /users/me/topics` · `GET /users/me/polls?tab=asked|voted|saved`
`GET /polls?lens=&topic=&q=&limit=&offset=` · `POST /polls` · `GET|PATCH|DELETE /polls/:id`
`POST|DELETE /polls/:id/vote` · `POST /polls/:id/peek` · `PUT|DELETE /polls/:id/save` · `POST /polls/:id/outcome` · `POST /polls/:id/report` · `GET /polls/:id/trend`
`GET|POST /polls/:id/arguments` · `DELETE /arguments/:id` · `POST /arguments/:id/convincing | report`
`GET /topics?trend=1` · `GET /notifications` · `POST /notifications/read` · `GET /health`

## Notes on the first version

This repo started as a university project (CS7025). The redesign replaced its schema and API; the old MySQL schema and its committed database credentials are gone from the code, but they remain in git history. **Rotate any credential that was ever committed.**
