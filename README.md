# Friends Included finance system

Day 4 homework for **Kristiāns Šlāpins**.

The application records fictional wedding sales and expenses, calculates earned commissions, supports manager decisions, and synchronizes records to Google Sheets. Telegram and the website call the same transaction-processing functions. No paid AI API is used.

## Current delivery status

Application source is implemented. Seventeen automated tests passed, covering both homework scenarios, roles, duplicates, rounding, original Telegram destinations, concurrent database writes, and simulated delivery failures. Browser checks passed for desktop/mobile layout, sale and expense submission, approvals and employee record filtering.

**The live homework is not yet completed.** Supabase, Telegram, Google service-account credentials, a GitHub repository and Vercel deployment still need to be connected. The supplied test records have not been entered through a real Telegram bot. No course spreadsheet entry has been made. Local tests use isolated simulated services; the actual application has no fake-data mode and no seeded control totals.

Start with [SETUP.md](SETUP.md), then follow [HOMEWORK_TESTS.md](HOMEWORK_TESTS.md).

## Run locally

Use Node.js 22 or newer. There are no npm dependencies to install.

```sh
npm test
```

Copy `.env.example` to `.env.local`, fill in your server configuration, then:

```sh
npm start
```

Open http://localhost:3000. With no database configuration the app displays a connection message, rather than pretending transactions have been saved.

## Files

- `public/` — responsive website, forms, records, approvals, dashboard and Telegram setup.
- `api/app.js` — website API; signed demonstration-role cookie and server-enforced permissions.
- `api/telegram.js` — secret-verified Telegram webhook and sender mapping.
- `lib/domain.mjs` — shared validation, approvals, commissions and totals in integer cents.
- `lib/store.mjs` and `supabase/schema.sql` — persistent state with atomic revision checking.
- `lib/integrations.mjs` — Google service-account authorization, stable Sheets rows and durable notification jobs.
- `test/` — isolated calculations, HTTP permissions and delivery-failure checks.

## Implementation notes

Supabase stores the demonstration system in one private JSONB state row, containing the employees' Telegram links, immutable proposals, decisions, transaction references and delivery jobs. A server-only compare-and-swap SQL function prevents lost updates and duplicate submissions under concurrent requests. This is sized for a homework demonstration, not a large accounting deployment. There are no browser-accessible database keys or direct database policies.

The public role selector is intentionally the assessment access mechanism required by the assignment. Anyone viewing the demonstration can choose Svetlana. Within the selected signed session, each request is checked on the server; supplying a different actor in a transaction body cannot bypass the role. Use fictional data only.

Each transaction reference owns a stable Sheets row. Approval and retry update that same row. Keep the `Sales` and `Expenses` tabs as application-owned copies; use filter views rather than physically sorting, deleting or inserting data rows. Spreadsheet edits do not update Supabase.

Money uses integer cents; percentage shares use hundredths of a percent. Rounding adjustments go to the largest share, with ties resolved Richard, Anastasia, Jean-Claude. Pending sales have no approved shares or earned commissions. Every saved expense is deducted exactly once from company result.

Telegram delivery is independent of financial approval. Failure retains the saved decision and exposes a retry. Delivery leases avoid ordinary concurrent duplicate sends. As with most external messaging APIs, if a send succeeds but its acknowledgment is lost, retry may resend that notification; it never duplicates the financial record.

Bot submission chat IDs are immutable. Website submissions use their linked chat at submission, or a link made before approval if there was no original recipient. This supports the assignment's Test 2 linking sequence.

## Technical references

- [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [Google Sheets values API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update)
- [Telegram Bot API](https://core.telegram.org/bots/api)

