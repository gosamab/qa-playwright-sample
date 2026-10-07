# QA sample: Playwright regression suite + bug report

A **sample QA pass** on the public practice site [Toolshop "with bugs"](https://with-bugs.practicesoftwaretesting.com), a shop built by Testsmith specifically for testers to practise on. **This is not client work.** It shows how I structure coverage, write bug reports and hand over a regression suite the team can re-run after every fix.

- Bug report: [`report/sample-bug-report.md`](report/sample-bug-report.md) (PDF: `report/sample-bug-report.pdf`), evidence in `report/evidence/`
- Reference build used for "expected" behaviour: https://practicesoftwaretesting.com (same app without the planted bugs)

## Run it

```bash
npm install
npx playwright install chromium webkit firefox
npx playwright test                       # full matrix (6 projects, sequential, gentle on the site)
npx playwright test --project=desktop-chrome
npx playwright show-report                # HTML report with screenshots and traces
BASE_URL=https://practicesoftwaretesting.com npx playwright test   # run against another build
npm run evidence                          # re-capture the bug-report screenshots step by step
npm run pdf                               # render report/sample-bug-report.md to PDF
```

## How "known bugs" work (re-run after every fix)

Every confirmed defect has its own focused test, marked with `knownBug('BUG-xx', …)` (`tests/helpers.ts`). On the buggy build that test is **expected to fail**, so the run stays green. When a developer fixes the bug, Playwright reports **"expected to fail, but passed"** for that test, which is the signal to verify the fix and delete the marker. Against any other build (`BASE_URL`), the markers are inactive and the tests run as normal assertions.

Some bugs only exist in one environment, and their markers are scoped the same way: BUG-13 (Chromium projects only), BUG-14 (Firefox only), BUG-16 (phone projects, below 768 px).

## Device / browser matrix

| Project | Engine | Type |
|---|---|---|
| desktop-chrome | Chromium | desktop browser |
| desktop-safari | WebKit | **emulation** (Playwright WebKit, not Apple Safari) |
| desktop-firefox | Firefox (Gecko) | desktop browser |
| iphone-14 | WebKit | **emulation** (viewport, UA, touch) |
| pixel-7 | Chromium | **emulation** |
| ipad | WebKit | **emulation** |

Findings that only appear in emulated projects are labelled as such in the report and need real-device confirmation.

## What each suite covers

| Suite | Runs on | Covers |
|---|---|---|
| `smoke.spec.ts` | all projects | home, category, product and search load; no console errors or failed requests; nav links; category menu; sort; quantity; add to cart; UI copy |
| `forms.spec.ts` | all projects | contact, login and register: empty, invalid email, long input, Arabic and emoji, success path |
| `content.spec.ts` | all projects | broken images, long names, price format, empty description, heading spelling and single h1, overlapping CTAs |
| `responsive.spec.ts` | desktop-chrome (sets its own viewports) | screenshots at 360/390/768/1024/1280/1440; horizontal overflow; key element visible |
| `seo-meta.spec.ts` | desktop-chrome, report-only | title (unique), meta description, canonical, Open Graph, `lang`, one h1 → `test-results/seo-findings.json` |
| `links.spec.ts` | desktop-chrome | internal crawl (≤ 60 pages) for 404 views and "undefined" routes; external links HEAD-checked → `test-results/links-findings.json` |
| `a11y.spec.ts` | desktop-chrome, report-only | axe-core WCAG 2.2 A/AA scan of key pages → `test-results/a11y-findings.json` (automated checks only; keyboard and screen-reader passes are manual) |

Load is kept low on purpose: 1 worker, no retries, crawl capped at 60 pages, no load testing, fuzzing or security testing.
