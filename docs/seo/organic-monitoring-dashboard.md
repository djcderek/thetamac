# Organic Monitoring Dashboard (Google + Gemini + Perplexity)

This playbook tracks organic growth with signups as the primary KPI.

## KPI hierarchy

1. Primary: `organic_signups` and `organic_signup_rate`.
2. Secondary: non-branded organic clicks, non-branded impressions, and CTR.
3. AI referrals: sessions and signups from Gemini/Perplexity sources.

## Source definitions

Use these source buckets consistently in analytics:

1. `google_organic`
   - `source contains "google"` and `medium = "organic"`.
2. `gemini_referral`
   - `source contains "gemini"` or known Gemini referral domains.
3. `perplexity_referral`
   - `source contains "perplexity"` or known Perplexity referral domains.

## Weekly scorecard

Track every Monday:

1. Organic signups (7-day and 28-day).
2. Organic signup rate (signups / organic sessions).
3. Non-branded clicks and impressions.
4. Top 20 landing pages by signups.
5. Top 20 landing pages by AI referral sessions.
6. Index coverage changes for `/interview-math/*` and `/blog/*`.

## Search Console views

Create saved filters:

1. Non-branded query view.
   - Exclude brand tokens: `thetamac`, `theta mac`, common misspellings.
2. Interview-prep view.
   - Include tokens: `interview`, `consulting`, `case`, `finance`, `market sizing`, `percentages`.
3. Content cluster view.
   - Pages containing `/interview-math/` and `/blog/`.

## Alerts

Set alerts for:

1. Organic signups drop > 20% week over week.
2. Non-branded clicks drop > 20% week over week.
3. AI referral sessions drop > 25% week over week.
4. Any key landing page returns non-200.

## Weekly operating loop

1. Monday: review KPI scorecard and identify 3 pages to improve.
2. Wednesday: ship content/internal-link updates.
3. Friday: check indexation and early movement for changed pages.

## Monthly review questions

1. Which pages produce the highest organic signup rate?
2. Which topics get traffic but low conversion?
3. Which AI-referred pages are cited but not converting?
4. Which 3 pages should be refreshed next month?

## Fast QA checklist before publishing

1. Canonical URL is set.
2. Page is indexable.
3. One clear answer appears near top of page.
4. At least 3 internal links exist.
5. One clear CTA points to training flow (`/` or `/training/focused`).
