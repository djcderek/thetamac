# thetamac

Next.js 16 + Prisma + NextAuth app for competitive mental-math training, multiplayer matches, and analytics. The project now includes a paid tier powered by Stripe subscriptions so only subscribers can access the advanced dashboard.

## Getting started

1. Install dependencies (Stripe SDK is required for the new billing flows):

   ```bash
   npm install
   npm install stripe
   ```

2. Create a `.env` file at the project root (see the variables listed below).

3. Start the combined Next.js + Socket.io dev server:

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000`.

### Key scripts

| Command        | Description                             |
| -------------- | --------------------------------------- |
| `npm run dev`  | Next.js dev server + Socket.io bridge   |
| `npm run lint` | ESLint (recommended before committing)  |
| `npm run build`| Prisma generate + Next.js production    |

## Stripe subscription setup

Set the following variables in your `.env`:

```
STRIPE_SECRET_KEY=sk_live_or_test_
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Recommended workflow for local testing:

1. Create two recurring prices in your Stripe dashboard ($2/month and $12/year) and paste their price IDs above.
2. Run the dev server, then in another terminal start the Stripe CLI to forward events:

   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

   Copy the webhook signing secret that the CLI prints and set it as `STRIPE_WEBHOOK_SECRET`.
3. Use the hosted checkout by clicking “Go monthly” or “Go yearly” on `/stats/performance`. After paying with a test card the webhook will flip the user’s `isPremium` flag automatically.
4. Manage/cancel subscriptions through the billing portal endpoint (`POST /api/billing/portal`) once a `stripeCustomerId` exists.

### API routes added

| Route                              | Description                                   |
| ---------------------------------- | --------------------------------------------- |
| `POST /api/billing/checkout`       | Creates a subscription checkout session       |
| `POST /api/billing/portal`         | Opens the Stripe Billing customer portal      |
| `POST /api/billing/webhook`        | Receives subscription lifecycle events        |

## Premium vs free access

- Free users keep multiplayer, leaderboards, and the lightweight dashboard on `/`.
- Premium users (active Stripe subscription) unlock `/stats/performance` and `/stats/skills`. The UI now renders a paywall there if the viewer is not premium.
- Server-side analytics endpoints such as `/api/user/skills` also enforce the paywall to prevent direct API access without a subscription.

The Prisma `User` model now stores:

- `isPremium`, `premiumSince`
- Stripe identifiers (`stripeCustomerId`, `stripeSubscriptionId`)
- Plan metadata (`subscriptionPlan`, `subscriptionStatus`, `subscriptionCurrentPeriodEnd`)

Webhook events keep those fields in sync so that `session.user.isPremium` and feature flags stay accurate without manual intervention.
