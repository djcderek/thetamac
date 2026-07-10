# Search Console growth audit — 2026-07-10

## Scope and data quality

- Property: `sc-domain:thetamac.com`; search type: Web.
- The comparison windows end on 2026-07-08, the latest complete date in Search Console.
- This report contains only sanitized aggregates. Raw exports are stored locally under `analysis/search-console/` and ignored by Git.

## What the data says

| Window | Clicks | Impressions | CTR | Average position |
| --- | ---: | ---: | ---: | ---: |
| Last 3 months | 390 | 1,221 | 31.9% | 8.2 |
| Previous 3 months | 366 | 558 | 65.6% | 2.4 |
| Last 28 days | 98 | 636 | 15.4% | 10.6 |
| Previous 28 days | 96 | 246 | 39.0% | 8.3 |

Clicks are essentially flat while impressions have risen sharply. This is not yet evidence of durable non-brand growth: the `thetamac` query supplied 354 of the 390 last-three-month clicks (90.8%). The new impressions are mostly low- or zero-click queries, including unrelated `does mtqsolutions.com have a blog` (127 impressions, position 10.3) and Zetamac-related queries (for example, `zetamac`: 75 impressions, position 20.7).

The page breakdown explains the mismatch:

- `/blog` had 881 impressions, 4 clicks, 0.45% CTR, and position 7.9. Its main visible queries were `thetamac` (452 impressions), the unrelated MTQ query (127), and `zetamac` (68), rather than the blog posts' intended topics.
- `/interview-math` had 525 impressions, 4 clicks, 0.76% CTR, and position 2.0.
- `/multiplayer` and `/leaderboard` both had roughly 500 impressions, near-first-page average positions, and under 0.3% CTR. Treat these as query-mapping diagnostics, not proof that their titles or responsive layouts need changing.
- Desktop generated 821 impressions at 18.8% CTR and position 10.3, versus mobile's 390 impressions at 59.0% CTR and position 4.0. The query mix must be inspected before assigning this to a device UX problem.

## Prioritized backlog

| Priority | Action | Owner | Evidence and completion test |
| --- | --- | --- | --- |
| P0 | Verify the production `/sitemap.xml` response, canonical host, and cache behavior; confirm that all intended public routes are present. Then resubmit the existing sitemap and request recrawls only after verification. | Platform + SEO | Search Console shows the sitemap as successful but last read on 2026-01-20 with 12 discovered pages, while only 8 pages are indexed. Completion: a fresh successful read and the expected public URLs discovered. |
| P0 | Resolve indexability for the public URLs in the `Crawled - currently not indexed` bucket before writing more SEO content. Check live status, canonical, robots/noindex, rendered content, sitemap inclusion, and internal links for the public articles/guides; do not try to index static assets. | Platform + Content | 13 URLs are in this bucket, including `/blog/mental-math-interview-drills`, `/blog/fast-multiplication-techniques`, `/blog/market-sizing-examples-answers`, `/interview-math/business-word-problems`, `/interview-math/mental-math-speed-test`, `/interview-math/quick-multiplication-patterns`, and `/interview-math/brain-friendly-drill-plan`. Completion: intended public pages leave the exclusion bucket or have a documented intentional exclusion. |
| P1 | Make an explicit product decision on Zetamac-intent SEO. If it is in scope, make `/zetamac-alternative` the clear canonical destination through focused internal links, title/snippet testing, and a tighter comparison intent; do not use the generic `/blog` index as the target. If it is out of scope, do not optimize around the unrelated MTQ query. | Product + Content + SEO | The dedicated `/zetamac-alternative` route already exists and is in the sitemap, but Google currently associates the generic blog index with Zetamac queries. Completion: the intended page is indexed and query-to-page mapping favors it over `/blog`. |
| P1 | Diagnose the high-impression, low-CTR hub pages (`/blog`, `/interview-math`, `/multiplayer`, `/leaderboard`) by exporting queries per page after P0. Update titles/descriptions or page intent only for a relevant, repeatable query cluster. | SEO + Content | Four hubs have 2,371 combined impressions but only 10 clicks in the last three months. Completion: each retained target has a documented query cluster and a before/after CTR baseline. |
| P2 | Protect crawl budget and reporting quality: keep auth/dashboard URLs robot-blocked, classify the two 404s and three redirects as intentional or repair internal/sitemap references, and separate static asset URLs from public-content indexation work. | Platform | The robots bucket is primarily auth/dashboard and static chunks; those should not be opened to indexing. Completion: no intended public page remains in the wrong exclusion class. |
| P2 | Diversify discovery and internal authority after the public pages are indexable. Place contextual internal links from hubs to the highest-value guides and earn relevant deep links rather than concentrating links on the homepage. | Content + SEO | Search Console reports 66 external links, all from reddit.com; 65 point to the homepage and only one to `/multiplayer`. Completion: new relevant deep links point to indexed content targets. |

## Measurement plan

Use 2026-08-07 as the first post-change check, comparing 2026-07-10–2026-08-06 with the preceding 28 days. Track:

1. Indexed eligible public pages and count of public URLs in `Crawled - currently not indexed`.
2. Non-brand clicks, impressions, CTR, and average position, separated from `thetamac` brand terms.
3. Query-to-page alignment for `/zetamac-alternative` if that topic is adopted.
4. CTR and click changes for the selected hub pages after query-backed title or content work.

No Search Console settings, sitemap submissions, validation requests, or production files were changed as part of this audit.
