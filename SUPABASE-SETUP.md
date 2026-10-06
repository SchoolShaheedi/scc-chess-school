# Switching on sign-in (Supabase)
About 20 minutes. You do these steps yourself, because they create accounts on outside services.
After that, the app only needs two **public** values from you.

## 1. Create the project
1. Go to supabase.com, sign in, and click **New project**.
2. Name it `scc-chess-school`. For **Region**, pick **London (eu-west-2)** so that children's data stays in the UK.
3. Save the database password somewhere safe. The app never needs it.

## 2. Create the table
SQL Editor → New query → paste all of `supabase/schema.sql` → **Run**.

## 3. Email sign-in links
Authentication → Providers → **Email**: leave it on and turn "Confirm email" on.
Authentication → URL Configuration:
- **Site URL**: where the app will live, e.g. `https://chess.shaheedibunga.com`
- **Redirect URLs**: add that address, plus `http://localhost:5173` for testing.

Supabase's built-in email service only sends a few emails an hour. Before launch, connect a sender under
Authentication → Emails → SMTP (e.g. Resend or Brevo, using an address on your own domain).

## 4. Google sign-in
1. In Google Cloud Console, create a project → APIs & Services → **OAuth consent screen**:
   External, app name "SCC Chess School", your support email. Ask only for the scopes email, profile and openid.
2. Go to Credentials → **Create credentials → OAuth client ID** → Web application.
   Authorised redirect URI: the callback URL shown in Supabase under Authentication → Providers → Google.
3. Paste the Client ID and Client Secret into Supabase → Providers → **Google** → Enable.

## 5. Give the app its two public values
Supabase → Project Settings → API. Copy the **Project URL** and the **anon public** key into a new file
`03_App/school/.env.local` (see `.env.example`). Never use the `service_role` key: it must not go into the app.
Then run `npm run build`. The Account box in Settings switches on by itself.

## Apple sign-in
This is deferred until the iPhone app (DECISIONS #37). It needs an Apple Developer account ($99/year).
