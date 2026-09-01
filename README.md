# Cafe Click & Collect

A reusable Expo Router + TypeScript cafe ordering app for customer pickup, QR table ordering, and secure staff administration.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npx expo start
```

Populate `.env` with the Supabase project URL, Supabase publishable key, and Stripe **test-mode publishable key**. Public Expo variables are embedded in the client bundle; never put a Supabase `service_role` key, Stripe secret key, webhook secret, access token, or password in an `EXPO_PUBLIC_` variable.

## Checks

```powershell
npm run typecheck
npx expo-doctor
npx expo export --platform web
```

## Production configuration

Use `.env.production.example` as the public-variable template. Store these server-only values in Supabase Edge Function Secrets:

- `STRIPE_SECRET_KEY` — currently an `sk_test_...` key
- `STRIPE_WEBHOOK_SECRET` — the signing secret for the deployed Stripe test webhook endpoint
- `ALLOWED_ORIGINS` — comma-separated deployed web origins once a production domain exists

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Do not copy either server secret into the app.

Deploy the three functions in `supabase/functions`: `create-payment-intent`, `cancel-payment-intent`, and `stripe-webhook`. Configure Stripe to send PaymentIntent events to the deployed `stripe-webhook` URL.

For web, `vercel.json` exports the Expo app as a single-page app and adds baseline security headers. The customer site and `/admin` dashboard are the same deployment; `/admin` remains protected by Supabase Auth and the `cafe_staff` authorization table. Native preview/production build profiles are in `eas.json`.

After assigning a production domain, update Supabase Auth `site_url` and redirect allow-list, register the domain for Stripe Apple Pay, and replace localhost in the Edge Function origin allow-list. Public Auth signup remains disabled; create Auth users through the Supabase dashboard, then authorize their email from **Admin → Staff Access**.

## Included

- Click & Collect with pickup capacity and live slot availability
- QR table ordering
- Menu images and sold-out controls
- Drink customisations
- Loyalty, free-coffee rewards, and promo codes
- Stripe sandbox card/wallet payments and optional pay at counter/pickup
- Realtime admin order alerts and customer order tracking
- Auth-protected admin menu, table, customisation, loyalty, pickup, payment, staff, and order management
