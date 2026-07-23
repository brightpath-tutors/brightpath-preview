# Supabase Setup Guide
## BrightPath QSBS & Business Strategy Lab

### Prerequisites
- Free Supabase account at supabase.com
- GitHub account (for GitHub Pages hosting)

---

## Step 1 — Create a Supabase Project

1. Go to app.supabase.com
2. Click **New Project**
3. Set a project name (e.g., `brightpath-qsbs`)
4. Set a strong database password (save it — you will not need it in the app but keep it secure)
5. Choose a region close to you
6. Click **Create new project**
7. Wait 1-2 minutes for provisioning

---

## Step 2 — Run the Schema

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Paste the entire contents of `DATABASE_SCHEMA.sql`
4. Click **Run**
5. You should see "Success. No rows returned." for each statement

---

## Step 3 — Get Your Credentials

1. In Supabase, click **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`)
   - **anon public key** (the long JWT string under "Project API keys")

**NEVER copy the service_role key. It must never be in browser code.**

---

## Step 4 — Configure the App

In `index.html`, find the `SUPABASE_CONFIG` section near the top:

```javascript
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL_HERE',
  anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
};
```

Replace the placeholder values with your actual credentials.

---

## Step 5 — Enable Email Auth

1. In Supabase, click **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. For private use, you may want to disable "Enable email confirmations" so you can sign in immediately

---

## Step 6 — Deploy to GitHub Pages

1. Create a new GitHub repository (public or private — Pages works on both)
2. Upload all project files:
   - `index.html`
   - `README.md`
   - `SUPABASE_SETUP.md`
   - `DATABASE_SCHEMA.sql`
   - `SAMPLE_SCENARIOS.json`
   - `LEGAL_AND_MODELING_ASSUMPTIONS.md`
3. Go to **Settings** → **Pages**
4. Under **Source**, select **Deploy from a branch**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**
7. Your app will be available at `https://yourusername.github.io/repositoryname` within a few minutes

---

## Step 7 — Add Supabase Auth Redirect URL

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Add your GitHub Pages URL to **Site URL**: `https://yourusername.github.io/repositoryname`
3. Add it to **Redirect URLs** as well

---

## Row Level Security

All tables have RLS enabled. Each user can only read and write their own data. No user can see another user's scenarios, companies, or assessments. This is enforced at the database level — not just in application code.

---

## Local-Only Mode

If you do not configure Supabase credentials, the app runs in local-only mode using IndexedDB. All data is saved to your browser. You can export a JSON backup at any time from the Settings panel.

**Local-only data does not sync across devices and can be lost if you clear browser storage.**

---

## Data Export and Deletion

- Use **Settings → Export All Data** to download a complete JSON backup
- Use **Settings → Import Data** to restore from a backup
- Use **Settings → Delete All Local Data** to clear your browser storage
- Supabase data can be deleted by dropping and recreating your project, or by running DELETE statements in the SQL editor

---

## Security Notes

- The anon key in your HTML is safe to expose — it is a public key controlled by RLS
- Never put the service_role key anywhere in browser code or public repositories
- All data access is restricted to the authenticated user by Row Level Security policies
- Consider making your GitHub repository private if your scenario data is sensitive
