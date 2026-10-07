# Sample QA report: Toolshop (practice site, "with bugs" build)

- **Tester:** Osama Azab · **Date:** 2026-10-07 · **Type:** sample QA pass for portfolio purposes, not client work
- **Site under test:** https://with-bugs.practicesoftwaretesting.com (Toolshop v5.0, a shop built specifically for testers to practise on)
- **Expected behaviour taken from:** the reference build https://practicesoftwaretesting.com (same app without planted bugs)
- **Regression suite:** Playwright + TypeScript in this repo. Every bug below has its own re-runnable test (see README → "known bugs").

## 1. Scope

| In scope | Out of scope |
|---|---|
| Home, category pages, product page, search, sort, cart action, main navigation, contact, login, register | Checkout and payment, account area, rentals detail, admin |
| Responsive layout 360–1440 px, broken images, long content, unusual characters (Arabic, emoji) | Load, security and penetration testing |
| Metadata audit (title, description, canonical, OG, lang, h1) and automated WCAG 2.2 A/AA scan (axe-core) | Manual screen-reader pass (noted as a follow-up) |

**Coverage logic:** the money and lead paths (navigation → product → add to cart; contact form) got a full pass on all 6 projects. Metadata, link crawl, accessibility scan and breakpoint sweep ran once (desktop Chrome) because they don't depend on the engine.

## 2. Device and browser matrix

| Project | Engine / version | OS | Viewport | Real or emulated |
|---|---|---|---|---|
| Desktop Chrome | Chromium 153.0.8010.12 (Playwright 1.63.0) | macOS 27.0.1 | 1280×720 | real browser engine |
| Desktop Safari | WebKit 26.6 (Playwright build) | macOS 27.0.1 | 1280×720 | **emulated** (not Apple Safari) |
| Desktop Firefox | Firefox 155.0 | macOS 27.0.1 | 1280×720 | real browser engine |
| iPhone 14 | WebKit 26.6 | iOS profile | 390×664 | **emulated** |
| Pixel 7 | Chromium 153 | Android profile | 412×839 | **emulated** |
| iPad (gen 7) | WebKit 26.6 | iPadOS profile | 810×1080 | **emulated** |

Evidence screenshots were taken at 1440×900 (desktop Chrome) unless stated. Most bugs reproduced in **every** project. Three are environment-specific: **BUG-13** (Chromium only), **BUG-14** (Firefox only) and **BUG-16** (phone widths below 768 px, also confirmed in a resized desktop Chrome window).

**Final run (2026-10-07):** 228 test executions across the 6 projects in 14.3 minutes. 96 checks passed, 94 known-bug checks failed exactly as recorded, 38 were skipped (desktop-only suites on other projects, and sort on phones, which BUG-16 blocks), and there were **0 unexpected results**.

## 3. Summary

| ID | Title | Severity | Where |
|---|---|---|---|
| BUG-07 | Contact form can never be sent: "Subject is required" stays after choosing a subject | **Critical** | all projects |
| BUG-16 | Below 768 px the "Filters" toggle does nothing, so search, sort and filters are unreachable on phones | **High** | iPhone 14, Pixel 7, and desktop Chrome resized to 390 px |
| BUG-05 | "Add to cart" shows "Oeps, something went wrong." although the item is added (quantity ignored) | **High** | all projects |
| BUG-01 | Main nav "Home" opens the Contact page | **High** | all projects |
| BUG-02 | Categories menu: "UNDEFINED" opens an empty category; "Chainsaws" opens a 404 page | **High** | all projects |
| BUG-03 | Sort labels are inverted (Price "Low - High" sorts high→low; Name "A - Z" sorts Z→A) | Medium | all projects with the sort control visible |
| BUG-06 | Contact form accepts an invalid email ("not-an-email") | Medium | all projects |
| BUG-13 | "Add to favourites" covers 50 px of the "Add to cart" button | Medium | **Chromium only** (desktop Chrome, Pixel 7) |
| BUG-09 | Site logo and search icon are broken images (broken.png → 404) | Medium | all projects |
| BUG-14 | Long product names are clipped mid-word in the product grid | Low | **Firefox only** |

**Also observed (each has a test, lower priority):** BUG-04 quantity "+" button does nothing · BUG-08 contact subject list contains "Error 101: Subject not found" / "Error 202: Translation error" · BUG-10 product page heading "Reltded products" (and it is a second h1) · BUG-11 empty login submit shows "Invalid email or password" instead of field-level "required" messages · BUG-12 copy typos "Contakt", "Sorth", "Serch" · BUG-15 product names in the grid mix left and right alignment.

## 4. Bugs

### BUG-07: Contact form can never be sent, "Subject is required" persists after a subject is chosen
- **Severity:** Critical. The site's only contact/lead form is unusable for every visitor.
- **Environment:** all 6 projects. Evidence: desktop Chrome 153, macOS 27.0.1, 1440×900.
- **Steps:**
  1. Open `/#/contact`.
  2. Enter First name `QA`, Last name `Sample`, Email `qa.sample@example.com`.
  3. Choose Subject **Customer service** (also tried Webmaster and Payments).
  4. Enter a message of 50+ characters and click **Send**.
- **Expected:** the message is sent and a confirmation is shown (reference build: "Thanks for your message! We will contact you shortly.").
- **Actual:** the subject field turns red with "Subject is required" even though its value is `customer-service`. Nothing is sent, and there is no confirmation.
- **Evidence:** `evidence/BUG-06-07-contact-form.png`
- **Fix hint:** the validator likely reads a different control or value than the one bound to the select (check the form-control name or the `required` validator on `subject`).

### BUG-16: Below 768 px the "Filters" toggle does nothing, so search, sort and filters can't be reached on phones
- **Severity:** High. On phones, where most marketing traffic lands, visitors can't search, sort or filter the catalogue at all.
- **Environment:** iPhone 14 (WebKit, **emulated**) and Pixel 7 (Chromium, **emulated**). **Also reproduced in plain desktop Chrome 153 resized to 390×844**, so it's a breakpoint bug, not an emulation artefact. Not applicable at ≥ 768 px (desktop and iPad show the sidebar).
- **Steps:** open the home page at a phone width → tap **Filters** above the product grid.
- **Expected:** the panel expands with Sort, Price Range, Search and the category/brand filters (it does on the reference build).
- **Actual:** nothing happens. The panel stays collapsed, and the search box and sort select stay hidden.
- **Evidence:**
  - `evidence/BUG-16-filters-tapped-iphone14-emulated-bug.png` (iPhone 14, emulated)
  - `evidence/BUG-16-filters-tapped-iphone14-emulated-ref.png` (reference build)
  - `evidence/BUG-16-filters-tapped-pixel7-emulated-bug.png` (Pixel 7, emulated)
- **Fix hint:** the buggy build renders the toggle as an `<a>` with `aria-controls="collapseExample"`, while the reference build uses a `<button data-bs-target="#filters">`. Check that the collapse handler is bound to the `#filters` panel, and that the anchor's default hash navigation doesn't swallow the click in the hash-routed app.

### BUG-05: "Add to cart" shows an error message although the item is added
- **Severity:** High. A core commerce action reports failure, so users will retry (and add duplicates) or leave.
- **Environment:** all 6 projects. Evidence: desktop Chrome, 1440×900.
- **Steps:** open any product (e.g. `/#/product/1`, Combination Pliers) → click **Add to cart**.
- **Expected:** green toast "Product added to shopping cart." and the cart badge shows the chosen quantity (reference build).
- **Actual:** red toast **"Oeps, something went wrong."** The cart badge still increments to 1, so the item *was* added. The message is wrong. The quantity can't be raised anyway: the "+" button does nothing (BUG-04).
- **Evidence:** `evidence/BUG-05-add-to-cart-error-toast.png`
- **Fix hint:** check the success branch of the add-to-cart call; it appears to fire the error toast on a 2xx response.

### BUG-01: Main navigation "Home" opens the Contact page
- **Severity:** High. Primary navigation on every page sends users to the wrong place.
- **Environment:** all 6 projects (link target is the same on mobile menus).
- **Steps:** open any page (e.g. a product page) → click **Home** in the top navigation.
- **Expected:** the home/catalogue page (`/`).
- **Actual:** the URL becomes `/#/contact` and the Contact form opens. The link's `href` is `#/contact`.
- **Evidence:** `evidence/BUG-01-home-link-opens-contact.png`
- **Fix hint:** `routerLink` of `nav-home` points to `/contact`.

### BUG-02: Categories menu, "UNDEFINED" opens an empty category and "Chainsaws" opens a 404 page
- **Severity:** High. Two of the four category entries are dead ends, and the menu shows a raw "UNDEFINED" label.
- **Environment:** all 6 projects. The link crawl (34 internal routes) found exactly these two broken routes.
- **Steps:** click **Categories** → **UNDEFINED**; then **Categories** → **Chainsaws**.
- **Expected:** real categories with products (the reference build shows "Other" and "Special Tools" in these positions).
- **Actual:** "UNDEFINED" → `/#/category/undefined`, page title "Category: Undefined", 0 products. "Chainsaws" → `/#/chainsaws`, "404 Error – Page Not Found".
- **Evidence:**
  - `evidence/BUG-02-categories-menu.png`
  - `evidence/BUG-02-category-undefined.png`
  - `evidence/BUG-02-chainsaws-404.png`
- **Fix hint:** the menu item's slug/label come from an undefined property, and the special-tools link is missing the `/category/` prefix.

### BUG-03: Sort labels are inverted
- **Severity:** Medium. Sorting works, but the opposite of what it says, which makes it look broken to shoppers.
- **Environment:** desktop Chrome, Safari (WebKit), Firefox and iPad. On phones the sort control can't be reached at all (BUG-16).
- **Steps:** on the home page choose Sort **Price (Low - High)**; then **Name (A - Z)**.
- **Expected:** prices ascending ($3.55, $3.95 … on the reference build); names A→Z.
- **Actual:** "Price (Low - High)" shows $125.23, $119.24, $100.79 …; "Name (A - Z)" shows Wood Saw, Thor Hammer, Slip Joint Pliers … The option values are swapped (`price,asc` is labelled "High - Low").
- **Evidence:**
  - `evidence/BUG-03-sort-low-high-shows-high-first.png`
  - `evidence/REF-sort-low-high.png` (reference build)
- **Fix hint:** swap the labels or values of the four sort options.

### BUG-06: Contact form accepts an invalid email address
- **Severity:** Medium. It would let unusable leads through. It's currently hidden behind BUG-07, so it will surface as soon as BUG-07 is fixed.
- **Environment:** all 6 projects.
- **Steps:** `/#/contact` → Email `not-an-email` → fill the other fields → **Send**.
- **Expected:** "Email format is invalid" (reference build).
- **Actual:** no email error is shown; only the (wrong) subject error from BUG-07.
- **Evidence:** `evidence/BUG-06-07-contact-form.png`
- **Fix hint:** add the email pattern/validator back to the `email` control.

### BUG-13: "Add to favourites" covers 50 px of the "Add to cart" button (Chromium only)
- **Severity:** Medium. The primary CTA label is cut ("Add to") in the most-used browser engine.
- **Environment:** **reproduces in desktop Chrome 153 and Pixel 7 emulation (Chromium).** Not reproduced in desktop Safari/WebKit, iPhone 14, iPad or Firefox, where the buttons join with the normal 1 px border. Pixel 7 is emulated: **needs confirmation on a real Android device.**
- **Steps:** open `/#/product/1` and look at the two buttons under the quantity field.
- **Expected:** the buttons sit side by side with the full "Add to cart" label visible.
- **Actual:** in Chromium the favourites button has `margin-left: -50px` and covers the right part of "Add to cart". In WebKit/Firefox the computed `margin-left` is `-1px`.
- **Evidence:**
  - `evidence/BUG-13-buttons-chrome-desktop.png` (desktop Chrome)
  - `evidence/BUG-13-buttons-pixel7-emulated.png` (Pixel 7, emulated)
  - `evidence/BUG-13-buttons-safari-desktop-webkit.png` (Safari/WebKit, no overlap)
- **Fix hint:** look for a Chromium-targeted CSS rule or a browser check that sets the negative margin.

### BUG-09: Site logo and search icon are broken images
- **Severity:** Medium. The brand logo is missing on every page, and two 404 requests and console errors fire on each load.
- **Environment:** all 6 projects.
- **Steps:** open the home page with DevTools → Network.
- **Expected:** the logo and search icon render.
- **Actual:** both `<img>` point to `broken.png` → **HTTP 404**, so the browser shows the broken-image icon (top-left logo and next to "Search"). The images also have no `alt` text (see the axe results).
- **Evidence:** `evidence/BUG-09-broken-images-home.png`
- **Fix hint:** restore the asset paths and add `alt` (or `alt=""` for the decorative icon).

### BUG-14: Long product names are clipped mid-word in the product grid (Firefox only)
- **Severity:** Low. The product name is cut ("Claw Hammer with Shock R") with no ellipsis or tooltip, so shoppers can't read it on the listing.
- **Environment:** **Firefox 155 desktop only.** Chromium and WebKit wrap the name onto two lines; the reference build is fine in Firefox.
- **Steps:** open the home page in Firefox and find "Claw Hammer with Shock Reduction Grip".
- **Expected:** the full name is visible, wrapped onto two lines as in Chrome.
- **Actual:** the name is on one line (`white-space: nowrap`), 370 px of text in a 225 px box, clipped without an ellipsis.
- **Evidence:**
  - `evidence/BUG-14-long-name-firefox.png` (Firefox)
  - `evidence/BUG-14-long-name-chrome.png` (Chrome, wraps correctly)
- **Fix hint:** a Firefox-targeted rule sets `white-space: nowrap`; remove it, or add `text-overflow: ellipsis` with a `title` attribute.

## 5. Automated audit highlights (report-only suites)

- **Metadata (4 key pages):** all pages miss a meta description and canonical URL, none has an `<h1>`, and every page shares one `<title>` ("Practice Software Testing - Toolshop - v5.0 with bugs"). Full list: `audit/seo-findings.json`.
- **Accessibility, axe WCAG 2.2 A/AA (4 pages):** `image-alt` (critical, 10–11 product images per listing page), `select-name` (unlabelled sort select), `label` (unlabelled field on home), `button-name` (icon-only button on login), `color-contrast` (serious, 2–3 elements per page), `list` (invalid list markup). Full list: `audit/a11y-findings.json`. The automated scan covers only part of WCAG; a keyboard and screen-reader pass is still needed.
- **Responsive sweep (360–1440 px, home/contact/login):** no horizontal overflow, and key elements visible at every breakpoint. Screenshots in the HTML report.
- **Links:** 34 internal routes crawled (`audit/links-findings.json`), and only the 2 in BUG-02 are broken. 11 external Unsplash credit links return 401 to automated requests (bot protection), so they were marked "unverified", not broken.

## 6. How AI was used, and where it misled me

**Used for:** drafting the test permutations (form inputs incl. Arabic/emoji/long text, breakpoint list, device matrix), writing the first version of each spec, parsing console and network output, and comparing the buggy build against the reference build.

**Where it misled me (caught on manual re-check):**
1. **False positive: search.** The first automated search test reported "Bolt Cutters" in results for "pliers". Re-running by hand showed the result list was correct; the test read the grid before it re-rendered. Fixed with a poll on the result list. Not filed.
2. **False positive: link crawl.** The first crawl marked all 32 pages as broken. Hash-route navigations return no HTTP response object (which the script treated as an error), and a loose "404" text match hit normal pages. I rewrote the detector to look for the actual 404 view and "undefined" titles, and it now finds exactly the two real broken routes.
3. **Wrong scope: button overlap.** It was first noted as a general layout bug from a Chrome screenshot. Running the matrix showed it is **Chromium-only**, which changes the fix and who is affected. Reported that way.
4. **Real bug at first dismissed as a test issue: mobile search.** On phones the search test timed out, and my first read was "test problem, the search box sits in a collapsed panel". Opening the panel by hand on the reference build worked; on the buggy build the toggle did nothing, and the same happened in a resized desktop Chrome window. That became BUG-16, the most important mobile finding.
5. **Not a bug: external links.** Unsplash links returning 401 looked broken to the script; they work in a browser (bot protection). Marked "unverified".

Every bug in section 4 was reproduced manually, step by step, and compared with the reference build before filing.
