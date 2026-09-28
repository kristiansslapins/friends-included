# Connect and publish the homework

Student: **Kristiāns Šlāpins**

The code is ready for account connection. Follow these steps in order; never paste private keys into the website, repository, Google Sheet, or course submission.

## 1 Prepare Supabase

1. Sign in to https://supabase.com/dashboard and create a project for this homework.
2. Open its SQL Editor and run `supabase/schema.sql` from this project.
3. Copy the project URL to `SUPABASE_URL` and the server service-role/secret key to `SUPABASE_SERVICE_ROLE_KEY`. A public or anonymous key is insufficient.
4. Keep these values in Vercel environment variables and, if running locally, `.env.local`. That file is excluded from Git.

The SQL creates an empty system. Do not load the automated test fixtures into the live database: S01 and E01 must be real Telegram submissions.

## 2 Prepare the existing Google Sheet

1. Use your own reporting spreadsheet, separate from the course submission spreadsheet.
2. Create two blank tabs named exactly `Sales` and `Expenses`. The app writes their header rows and euro formatting automatically.
3. Open https://console.cloud.google.com/ and create/select a project.
4. Enable the **Google Sheets API**.
5. In **IAM and Admin → Service Accounts**, create a service account. It does not need a broad project owner/editor role just to write a shared spreadsheet.
6. Create a JSON key for that service account. In Vercel, set `GOOGLE_SERVICE_ACCOUNT_EMAIL` to the key's `client_email` and `GOOGLE_PRIVATE_KEY` to its `private_key`. Preserve the PEM BEGIN/END lines. The app accepts real newlines or literal `\n` separators.
7. Share the reporting spreadsheet with that service-account email as **Editor**.
8. Set `GOOGLE_SHEET_ID` to the string between `/d/` and `/edit` in its URL.
9. Give the instructor **Viewer** access. Do not enable public editing.

If institutional policy blocks service-account creation or key downloads, record the exact restriction and ask the instructor for help. Manual copying does not meet the assignment.

## 3 Create the Telegram bot

1. In Telegram, open the official **@BotFather** and use `/newbot`.
2. Set `TELEGRAM_BOT_TOKEN` to the token BotFather provides.
3. Set `PUBLIC_BOT_USERNAME` to the bot's username without `@`.
4. Generate two different random secrets of at least 32 characters for `SESSION_SECRET` and `TELEGRAM_WEBHOOK_SECRET`. Hexadecimal strings are suitable.

For example, run this locally twice and copy each output into its respective environment variable:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not put the bot token into browser URLs, screenshots or GitHub.

## 4 Save the project to GitHub

1. Sign in to https://github.com/ and create a repository, for example `friends-included`.
2. Upload the contents of this project folder, including `api`, `lib`, `public`, `scripts`, `supabase`, `test`, `package.json`, `vercel.json`, `.gitignore`, and `.env.example`.
3. Never upload `.env.local` or a downloaded service-account JSON key.
4. Give the instructor repository access if it is private.
5. Set `PUBLIC_GITHUB_URL` to the repository URL.

## 5 Deploy on Vercel

1. Sign in to https://vercel.com/ and import the GitHub repository.
2. Select **Other** as the framework. The project root is the folder containing `package.json`; output is `public`; the build command is empty. The `api` folder is deployed as Node.js functions. Use Node.js 22 or newer.
3. Add the variables below in Vercel's project environment settings, then deploy.

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database service key |
| `SESSION_SECRET` | First random secret |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_WEBHOOK_SECRET` | Second random secret |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | JSON key client_email |
| `GOOGLE_PRIVATE_KEY` | JSON key private_key |
| `GOOGLE_SHEET_ID` | Your reporting spreadsheet ID |
| `PUBLIC_STUDENT_NAME` | Kristiāns Šlāpins |
| `PUBLIC_BOT_USERNAME` | Bot username without @ |
| `PUBLIC_GITHUB_URL` | Accessible GitHub repository URL |
| `APP_URL` | Your production HTTPS Vercel URL |

4. If the production URL was unknown before deployment, set `APP_URL` afterward and redeploy. Environment changes require a new deployment.
5. Ensure the production page and `/api/telegram` can be reached without Vercel deployment-protection login. The bot cannot answer Vercel login prompts.
6. Open the app. Confirm your name, employee selector, empty dashboard and external links are visible.

## 6 Connect the Telegram webhook

On your computer, put the same `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` and `APP_URL` in the ignored `.env.local` file. From this project directory run:

```sh
npm run setup:telegram
```

The script reports success without printing the token. Send `/start` to the bot in a private chat. It returns your numeric Telegram user ID. On the website select Svetlana, open **Telegram setup**, enter that ID, and choose Richard.

## 7 Verify the first live milestone

Follow the S01 submission in `HOMEWORK_TESTS.md`. After the bot confirms recording, verify S01 in all three locations: Supabase's state, the Vercel records page, and the `Sales` tab. Then relink your Telegram account to Kevin and submit E01 through the bot.

Both submission and decision deliveries are automatic after a successful save. If a record says **Sync failed** or a notification says **failed**, correct the external connection and use **Retry incomplete deliveries**. Do not create a replacement transaction.

## 8 Submit only after live verification

Complete both tests and the failure/permission checks in `HOMEWORK_TESTS.md`. Confirm the instructor can open the app, reporting sheet, repository and bot link. Then enter the working Vercel URL in **Kristiāns Šlāpins's own row**, under the designated Day 4 column, in the course spreadsheet:

https://docs.google.com/spreadsheets/d/1AZ__P96ArJzLLTs6kGVPPIDS8229bhYcKgGu6I8O7wk/edit

Do not alter another student's row or any feedback. If the name or column is ambiguous, resolve it before editing. This course entry has not yet been made.
