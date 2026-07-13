# PostHog product intelligence runbook

This runbook configures the PostHog workspace after the application instrumentation is deployed. Use a separate PostHog project token for production and non-production. Local capture is disabled unless `NEXT_PUBLIC_POSTHOG_ENABLE_NON_PRODUCTION=true` is set intentionally.

## Product metrics

- Primary outcome: weekly activated trainers.
- Provisional activation: the same person completes a second `training_completed` event within seven days of their first completion.
- Supporting outcomes: weekly active trainers, completions per active trainer, D1/D7/D30 training retention, guest-to-account conversion, activated-free-to-trial conversion, and trial-to-paid conversion.
- Validate activation after enough D30 data exists by comparing these candidate behaviors: one completion, two completions in seven days, and three completions across two days in fourteen days. Keep the behavior with the clearest retention lift and adequate sample size.

## Dashboards

### 1. Training health

1. Weekly unique users performing `training_completed`.
2. Funnel: `training_setup_viewed` → `training_started` → `training_first_answered` → `training_completed`.
3. Abandonment rate: `training_abandoned` divided by `training_started`, broken down by `end_reason`, `game_mode`, `training_type`, `auth_state`, and device.
4. Repeat funnel: first `training_completed` → second `training_completed` within seven days.
5. Retention using `training_completed` as the return event at daily and weekly intervals.
6. Trends for solved count, duration, accuracy, and average response time. Use aggregates only; do not inspect answers.

### 2. Account conversion

1. Funnel: guest `training_completed` → `signup_prompt_viewed` → `signup_cta_clicked` → `auth_started` → `account_created` or `auth_succeeded` → authenticated `training_completed`.
2. Show 24-hour and seven-day conversion windows.
3. Break down by `entry_source`, CTA `surface`, device, and guest result band.
4. Monitor `auth_failed` by `failure_stage` and `error_code` beside successful authentication.

### 3. Revenue

1. Funnel: `premium_gate_viewed` or `upgrade_page_viewed` → `upgrade_cta_clicked` → `checkout_initiated` → `checkout_completed` → `trial_started` or `subscription_activated` → `subscription_payment_succeeded`.
2. Break down by `feature`, `source`, `plan`, trial eligibility, and device.
3. Trends for checkout cancellation, checkout failure, subscription cancellation, expiration, and paid retention.
4. Connect Stripe under Data management → Sources. Use Stripe data for authoritative revenue and lifecycle reconciliation; use application events for feature and CTA attribution.
5. Ensure the existing Stripe webhook endpoint is subscribed to `invoice.paid` in addition to checkout and subscription lifecycle events so paid-conversion and renewal events are delivered.

### 4. Product discovery

1. Paths beginning with `training_completed` to see what users do after training.
2. Feature usage trends for dashboard, leaderboard, multiplayer, focused training, shop, and settings outcomes.
3. Survey response trends segmented by activation, plan, and training goal.
4. Retention comparison between users of each secondary surface and otherwise similar activated users.
5. A table of proposed opportunities scored by observed reach, retention difference, survey demand, paid intent, implementation effort, and confidence.

## Cohorts

- **Activated trainers:** at least two `training_completed` events within seven days.
- **Guest completers:** `training_completed` with `auth_state=guest`, with no subsequent `account_created`.
- **High-intent guests:** at least two guest completions or a `signup_cta_clicked`, without authentication success.
- **Signed in, never trained:** `auth_succeeded`, no `training_started` within seven days.
- **Repeat free trainers:** activated, `plan=free`, and active in the last 14 days.
- **Paywall no checkout:** `premium_gate_viewed` or `upgrade_page_viewed`, no `checkout_initiated` within seven days.
- **Trial users:** most recent `subscription_status_changed.status=trialing`.
- **Paying users:** `subscription_payment_succeeded` or current person property `is_premium=true`.
- **Churned users:** `subscription_cancelled` or `subscription_expired` and no later activation/payment event.

## Surveys

Use PostHog API surveys with the application-side product survey controller. Allow at most one survey per person every 14 days by excluding a dynamic cohort of recent `survey shown` activity; the browser also enforces the same cooldown immediately. PostHog records the lifecycle as `survey shown`, `survey sent`, `survey dismissed`, and `survey abandoned`.

1. **Training goal** — target activated trainers. Ask: “What are you mainly training for?” Options: consulting/interviews, school/exams, faster work calculations, personal improvement, competition/fun, other.
2. **Training friction** — target repeated abandoners. Ask: “What got in the way of finishing your session?” Options: session too long, difficulty felt wrong, controls or timer, interrupted, did not feel useful, technical problem, other.
3. **Next feature** — target repeat free trainers. Ask: “Which improvement would make thetamac most useful to you?” Options: adaptive practice plan, clearer progress insights, interview-specific packs, mobile experience, competition/accountability, other. Include the optional free-text follow-up “Anything specific you’d like us to know?”
4. **Upgrade friction** — show after `checkout_cancelled` or a second paywall view without checkout. Ask: “What kept you from trying Pro?” Options: price, unclear value, do not need the features, trial/payment concern, missing feature, other.

Keep free-text answers in PostHog survey analytics only; do not copy them into person properties. Do not show surveys during an active training run, authentication, checkout, settings, or multiplayer game. All four use “Send feedback” and confirm with “Thanks — this helps us decide what to improve next.” Use PostHog's launch/stop controls for rollout and emergency rollback.

## Replays, heatmaps, and errors

- Save replay lists for training abandonment, auth callback failures, checkout failures, rage clicks, dead clicks, and captured exceptions.
- Review those lists during the weekly product review; do not sample random recordings.
- Use heatmaps on marketing landing pages, training setup, game-over signup prompt, and the upgrade page. Exclude the active problem surface.
- Confirm inputs are masked, query strings are absent, and `.ph-no-capture` surfaces appear as privacy blocks before sharing recordings.

## Flags and experiments

Collect at least two weeks of baseline data before changing conversion UI.

1. **Guest game-over CTA:** control is the current save-history message. Variant explains the immediate value of keeping progress and rank. Primary metric: `account_created` within 24 hours. Guardrails: another `training_started`, completion rate, and auth failure rate.
2. **Upgrade presentation:** test feature-specific Pro messaging and monthly/yearly emphasis only for activated free users. Primary metrics: `checkout_initiated` and `subscription_payment_succeeded`. Guardrails: `checkout_failed`, `checkout_cancelled`, cancellation, and training retention.
3. **Feature concept validation:** only after behavior and survey evidence agree on a problem. Show a clearly labeled planned-feature concept behind a flag and measure concept view, expressed interest, and optional follow-up text. Do not present an unavailable feature as already shipped.

Evaluate flags before rendering affected UI or bootstrap them server-side. Do not decide an experiment from directional movement alone; wait for adequate sample size or use a sequential rollout plus survey/replay evidence when traffic is low.

## Event governance

- Event names and schema live in `src/lib/analytics.ts`; all custom events include `schema_version`.
- Client behavior uses `captureAnalyticsEvent`. Authoritative authentication, billing, and purchase outcomes use `captureServerAnalyticsEvent`.
- Never add email, name, profile image, operands, submitted/correct answers, auth tokens, or Stripe customer/subscription IDs to properties.
- Treat `training_start`, `training_first_answer`, `training_complete`, `signup_cta_click`, `seo_cta_click`, `user_signed_in`, `focused_training_completed`, and `multiplayer_duel_joined` as deprecated. Do not build new insights with them.
- Add descriptions and an owner to every event used by a dashboard. Review unknown events, property cardinality, ingestion volume, and dashboard health monthly.
