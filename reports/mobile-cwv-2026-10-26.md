# Mobile performance, 26 October 2026

Lab audit of the live sites. No templates, CSS, images, or layout were changed.

Measured with Lighthouse 13.5.0, mobile form factor, simulated Slow 4G and a 4× CPU slowdown. Viewport 412×823 at a 1.75 device scale (the Moto G Power profile). Chrome was headless. Each URL was loaded three times, one run after another, between 23:38 and 23:42 UTC. Figures below are the median. The three raw runs are in the metrics table so a wide spread is visible.

Lab INP is not collected. The lab proxy is Total Blocking Time. Max potential FID, the older input-delay proxy, is listed next to it. Both were quiet: TBT was 0 ms on every page, and max potential FID was 16–31 ms.

Budgets: LCP over 2.5 s, CLS over 0.1, transfer over 1 MB, any one image over 200 KB. Transfer sizes are bytes on the wire, including response headers.

Rendered size is the CSS border box at 412 px wide. Lighthouse's wasted-byte estimate compares the file with the device-pixel box (CSS pixels × 1.75). Those device-pixel sizes are in the image notes.

`https://yallcityhall.org/about/` and `/about` both returned 404. That page is not in the tables. The YCH git repo (`evanmack45/austin-council-tracker`) was not readable from this environment (GitHub 404), so YCH file names below are the live URL plus the Astro component name taken from the built CSS filename.

Re-run the homepage pair with `npm run audit:perf`. That script is not part of CI.

## Headlines

| Page | LCP | CLS | TBT | Transfer | Requests | Over budget |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Bulletin homepage | 4.14 s | 0.048 | 0 ms | 727 KB | 21 | LCP |
| YCH homepage | 1.85 s | 0.030 | 0 ms | 862 KB | 20 | two images |
| Bulletin edition, 26 Oct | 1.70 s | 0.099 | 0 ms | 325 KB | 18 | CLS on 1 of 3 runs |
| Bulletin `/subscribe/` | 3.01 s | 0.269 | 0 ms | 273 KB | 17 | LCP, CLS |
| Bulletin `/corrections/` | 0.80 s | 0.168 | 0 ms | 214 KB | 14 | CLS |
| Bulletin `/archive/` | 0.91 s | 0.168 | 0 ms | 251 KB | 16 | CLS |
| YCH meeting, 22 Oct | 1.69 s | 0.009 | 0 ms | 267 KB | 13 | none |

No page crossed 1 MB. The heaviest is the YCH homepage at 862 KB, and 766 KB of that is images. The slowest paint is the Bulletin homepage. Main-thread work is not the problem on either site.

## The Austin Bulletin

Shared by every Bulletin page: `style.css` is render-blocking (about 7 KB on the wire, 30 KB uncompressed). `font-display: swap` is set on both faces. The faces are not preloaded; the browser discovers them from CSS, so the chain is document, then CSS, then the font. Bricolage is one variable file, weight 200–800 and stretch 75–100%, at 131,548 bytes (`src/fonts/bricolage.woff2`, declared in `src/css/style.css`). Hanken is 34,704 bytes. Together that is about 167 KB on every page, including corrections, where the fonts are most of the 214 KB. YCH already ships a Latin, weight-only cut of Bricolage at 41 KB. A subset that still keeps the condensed wordmark (`font-stretch: 75%`) will not get that small. Dropping unused writing systems is the realistic saving, on the order of 50–80 KB a page. It is not in the five fixes below: on the pages where text is the LCP element, text already paints in under a second.

Kit's embed and the Cloudflare beacon are on every page. They add roughly 30–90 KB and under 15 ms of main-thread time. TBT stays 0 ms. The Charlotte background JPEG (58 KB, `pages.convertkit.com/assets/charlotte/bg.jpg`) is the part that hurts, and only on pages whose inline form shows it.

### Homepage

`https://theaustinbulletin.com/`

The LCP element on all three runs was the courthouse photo (`div.paper-main > section.front-lead > figure.lead-photo > img`).

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 4.14 s | 5.13 s, 4.14 s, 2.26 s | over 2.5 s |
| CLS | 0.048 | 0.048, 0.048, 0.048 | ok |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 31 ms | 35, 16, 31 | |
| Transfer | 727 KB | 727,165 / 727,176 / 727,165 bytes | ok |
| Requests | 21 | 21, 21, 21 | |

Lighthouse's performance score was 0.84. The LCP spread is wide. Simulated throttling did that; the element did not change. One run also recorded a 1.0 s delay between the photo finishing download and painting. The other two painted within 50 ms of the download. That delay was not stable enough to treat as its own fix. `decoding="async"` is set on the LCP image in `src/index.njk`.

CLS of 0.048 is attributed to the same lead photo, which Lighthouse called unsized even though the tag has `width` and `height`. It stays under 0.1.

| Image | Transfer | Format | Rendered | Intrinsic | Budget |
| --- | ---: | --- | --- | --- | --- |
| `/images/ill-masthead-v2.jpg` | 193 KB | JPEG | 412×120 | 1280×720 | under 200 KB |
| `/images/p-courthouse.jpg` | 184 KB | JPEG | 380×253 | 1280×853 | under 200 KB |
| `/images/ill-before-it-closes.jpg` | 74 KB | JPEG | 110×110 | 640×640 | ok |
| Kit Charlotte background | 58 KB | JPEG | CSS background | | ok |

Lighthouse's device-pixel comparison, and its waste estimate: masthead file used as 1280×374 against a 721×406 display (about 141 KB wasted, format plus size); courthouse 1280×853 against 665×443 (about 131 KB); spot art 640×640 against 193×193 (about 66 KB). Image-delivery insight: 338 KiB and 1,350 ms of LCP.

Render-blocking: `/css/style.css` (7.4 KB) and `/css/front-cover.css` (1.8 KB). Lighthouse's LCP saving for those two is 0 ms. No render-blocking script. Fonts: Bricolage 132 KB, Hanken 35 KB, both `font-display: swap`.

### Edition, 26 October 2026

`https://theaustinbulletin.com/2026/10/26/`

The LCP element was the early-voting chart, `article.bulletin > section.big-story > figure.graphic > img`. The tag in `src/bulletins/2026-10-26.md` has no `width` or `height`. `scripts/graphic.mjs` prints that tag from a 1200×800 canvas.

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 1.70 s | 2.60 s, 1.53 s, 1.70 s | median ok; one run over 2.5 s |
| CLS | 0.099 | 0.182, 0.099, 0.035 | median ok; one run over 0.1 |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 17 ms | 17, 27, 16 | |
| Transfer | 325 KB | 325,035 / 324,866 / 324,925 bytes | ok |
| Requests | 18 | 18, 18, 18 | |

| Image | Transfer | Format | Rendered | Intrinsic | Budget |
| --- | ---: | --- | --- | --- | --- |
| `/images/2026-10-26/early-ballots.png` | 50 KB | PNG | 292×195 | 1200×800 | ok |
| Kit Charlotte background | 58 KB | JPEG | CSS background | | ok |

The chart is the LCP element and the CLS culprit ("unsized image", plus a small web-font shift). Lighthouse estimated about 46 KB of that PNG is larger than the display. A chart with type will not shrink that far and still stay readable. The missing dimensions are the part that moves the story.

Render-blocking: `/css/style.css` only (7.3 KB), LCP saving 0 ms. Fonts: the same 132 KB and 35 KB pair.

### Subscribe

`https://theaustinbulletin.com/subscribe/`

The LCP element was Kit's form background, `div.formkit-background` with `background-image` pointing at the Charlotte JPEG. The page includes an inline form (`src/subscribe.njk`) and the mobile bar (`src/_includes/layout.njk`).

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 3.01 s | 3.09 s, 3.01 s, 2.55 s | over 2.5 s |
| CLS | 0.269 | 0.269, 0.269, 0.002 | over 0.1 |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 17 ms | 17, 17, 16 | |
| Transfer | 273 KB | 273,117 bytes, stable | ok |
| Requests | 17 | 17, 17, 17 | |

The footer shift scored 0.267. The inline form is on screen, so the mobile bar stays hidden (`inlineInView` in `src/js/signup.js`). What moves the footer is the form growing as Kit paints it. The third run barely shifted (0.002) and still took 2.55 s to paint the background. Fonts contributed 0.001 of CLS on the wordmark dot.

The only image of any size is the 58 KB Charlotte JPEG, painted at 372×200 CSS px. Render-blocking CSS is `style.css` (7.3 KB). Fonts are again 167 KB, which is most of this page.

### Corrections

`https://theaustinbulletin.com/corrections/`

The LCP element was a corrections paragraph. Text.

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 0.80 s | 0.80 s, 0.79 s, 0.80 s | ok |
| CLS | 0.168 | 0.168, 0.168, 0.002 | over 0.1 |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 16 ms | 16, 16, 16 | |
| Transfer | 214 KB | 214,451 / 214,425 / 214,456 bytes | ok |
| Requests | 14 | 14, 14, 14 | |

No content images. The Charlotte JPEG was not requested. The shift of 0.166 is `section.signup`, the mobile bar. It is `display: none` until `syncBar` adds `is-fixed` and `signup-bar-stuck`. That class sets `padding-bottom: 20rem` on the body (`src/css/style.css`). There is no inline form on this page, so the bar does show. Render-blocking: `style.css`. Fonts: 167 KB of the 214 KB.

### Archive

`https://theaustinbulletin.com/archive/`

The LCP element was text (the archive heading paints before Pagefind).

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 0.91 s | 0.80 s, 0.91 s, 0.91 s | ok |
| CLS | 0.168 | 0.168, 0.168, 0.168 | over 0.1 |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 16 ms | 16, 16, 16 | |
| Transfer | 251 KB | 250,644 / 250,687 / 250,536 bytes | ok |
| Requests | 16 | 16, 16, 16 | |

Same signup-bar shift as corrections, 0.166, on every run. No content images.

Render-blocking CSS: `style.css` (7.3 KB) and `/pagefind/pagefind-ui.css` (2.8 KB, Lighthouse marked about 150 ms). `/pagefind/pagefind-ui.js` is a parser-blocking script in the body (`src/archive.njk` has no `defer` or `async`): 30 KB on the wire, 120 KB uncompressed. It does not delay the heading, which is why LCP stays at 0.9 s, and it does not show up in the render-blocking insight. Fonts: the same 167 KB.

## Y'all, City Hall

Text responses are served with `cache-control: ... no-transform` and no `content-encoding`, even when the client asks for gzip. Measured on the meeting document: 103,650 bytes on the wire, 16,540 bytes after gzip -9. `Base.css` is the same: 11,070 bytes on the wire, 4,185 bytes gzipped, and its cache header also says `no-transform`. The homepage document is 12,534 bytes and gzips to 3,654. Woff2 and WebP are already compressed, so this hits HTML and CSS.

Fonts use `font-display: swap` and `unicode-range`, so only the Latin file for a family that is actually used gets downloaded. One small Hanken range is a data URI inside `Base.css` (part of that 11 KB, not a separate request).

### Homepage

`https://yallcityhall.org/`

The LCP element was the city hall photo, `main#main > section.hero > figure.city-hall-photo > img`. The browser picked the 960w candidate from the srcset.

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 1.85 s | 1.85 s, 1.85 s, 1.84 s | ok |
| CLS | 0.030 | 0.030, 0.030, 0.030 | ok |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 16 ms | 16, 16, 16 | |
| Transfer | 862 KB | 862,131 / 862,180 / 861,612 bytes | ok (under 1 MB) |
| Requests | 20 | 20, 20, 20 | |

Performance score was 1.00. LCP is stable and under budget. The weight is the images.

| Image | Transfer | Format | Rendered | Intrinsic | Budget |
| --- | ---: | --- | --- | --- | --- |
| `/images/alive/p-ullrich.jpg` | 284 KB | JPEG | 372×220 | 1215×720 | over 200 KB |
| `/images/alive/p-airport.jpg` | 263 KB | JPEG | 372×220 | 1280×758 | over 200 KB |
| `/images/photos/city-hall-960.webp` | 41 KB | WebP | 372×240 | 838×540 | ok |
| six `/images/alive/icon-*.jpg` | 178 KB together | JPEG | 84×84 each | about 426×360 | each one ok |

Icon transfers: greenbelt 42 KB, housing 32 KB, bike 30 KB, dog 27 KB, airport 26 KB, water 21 KB. They are eager. The two place photos are `loading="lazy"` and sit below the fold (top 1743 and 2024). Lighthouse still fetched them while scrolling, which is what a reader who reaches that section pays. They are not the LCP.

Device-pixel waste from the image-delivery insight: Ullrich 1215×720 against 684×385, airport 1280×758 against 651×434, each icon about 426×360 against 147×124, city hall 838×540 against 747×420. Combined estimate: 610 KiB and 600 ms of LCP. The LCP saving is secondary. The page already paints in 1.8 s. The 610 KiB is the reason to do it.

The srcset descriptor says `city-hall-960.webp` is 960w. Lighthouse measured the file at 838×540. The `width` attribute is 1440. The displayed hero is fine; the descriptor is loose.

Render-blocking CSS, four files, about 20 KB uncompressed: `CityHallPhoto.*.css`, `index.*.css`, `Base.*.css`, `AgendaSearch.*.css`. AgendaSearch was the one Lighthouse marked at about 150 ms. Estimated saving is 100 ms of FCP and 0 ms of LCP. Scripts are `type="module"` (6.5 KB). No third-party transfer in these runs.

Fonts downloaded: Hanken Latin 35 KB, Archivo Black Latin 19 KB. Bricolage is declared and not used on this page, so it was not downloaded.

### Meeting, 22 October 2026

`https://yallcityhall.org/meetings/2026-10-22/`

Latest meeting linked from `/meetings/`. The LCP element was a recap paragraph (`.meaning-cards p.recap`), not the photo.

| Metric | Median | Runs | Budget |
| --- | ---: | --- | --- |
| LCP | 1.69 s | 2.15 s, 1.69 s, 1.68 s | ok |
| CLS | 0.009 | 0.011, 0.009, 0.009 | ok |
| TBT | 0 ms | 0, 0, 0 | ok |
| Max potential FID | 16 ms | 16, 16, 16 | |
| Transfer | 267 KB | 267,404 / 267,372 / 267,364 bytes | ok |
| Requests | 13 | 13, 13, 13 | |

The HTML document is 103,650 bytes and arrives uncompressed (Lighthouse counted about 105 KB, headers included). Gzip -9 of that same body is 16,540 bytes. That is about 87 KB on the critical path, roughly 0.4 s of download at the 1.6 Mbps Slow 4G Lighthouse simulates. The page still paints in 1.7 s, which is why this is fix 4 rather than the first thing.

| Image | Transfer | Format | Rendered | Intrinsic | Budget |
| --- | ---: | --- | --- | --- | --- |
| `/images/photos/city-hall-960.webp` | 41 KB | WebP | 364×148 | 960×380 | ok |

The photo is below the fold (top about 2000). It is not the LCP. Lighthouse estimated 16 KB of waste against a 627×352 device-pixel box.

Render-blocking CSS, six files, about 24 KB uncompressed: `CityHallPhoto`, `Base`, `OutcomeBadge`, `SourceChip`, `_date_` (the `[date].astro` page), `UnofficialBadge`. Estimated saving about 100 ms of LCP. No script requests in these runs.

Fonts: Bricolage Latin 42 KB, Hanken Latin 35 KB, Archivo Black Latin 19 KB. All `font-display: swap`, loaded by unicode range.

### About

Not present. `/about/` and `/about` returned 404.

## Five fixes, phone readers first

1. **Resize the three Bulletin homepage JPEGs and give the lead photo a srcset.** Expected saving: 338 KiB and 1.35 s of LCP, which is the image-delivery estimate on the median run (LCP 4.14 s, element `/images/p-courthouse.jpg`). The masthead is 193 KB for a 412×120 strip, the courthouse is 184 KB for a 380×253 box, the spot illustration is 74 KB for a 110×110 box. None crosses 200 KB alone. Together they are why the front page misses 2.5 s. Files: `src/images/ill-masthead-v2.jpg`, `src/images/p-courthouse.jpg`, `src/images/ill-before-it-closes.jpg`, the dimensions in `src/_data/imageCredits.json`, the masthead tag in `src/_includes/layout.njk`, and the lead and spot tags in `src/index.njk`. A WebP (or AVIF) near the device-pixel box is the cut. Give the decorative masthead a lower fetch priority than the lead photo so the banner does not share the first seconds.

2. **Stop the signup form from moving the page, and stop its background being the largest paint.** Expected saving: CLS on `/subscribe/` from 0.269 to about the font-only remainder (0.002 on the quiet run), CLS on `/corrections/` and `/archive/` from 0.168 to about the same, and `/subscribe/` LCP from 3.01 s toward the 0.80 s text paint on corrections, which does not show the background. The bar starts hidden, then `syncBar` in `src/js/signup.js` adds `signup-bar-stuck`, and `src/css/style.css` adds `padding-bottom: 20rem`. That is the corrections and archive shift. On subscribe the bar stays hidden because the inline form is in view; the footer moves because the Kit form grows, and the Charlotte JPEG is the LCP element. Files: `src/css/style.css`, `src/js/signup.js`, `src/_includes/signup.njk`. Hiding `.formkit-background` on the inline forms the way the bar already does takes it out of the paint. Dropping the URL from the Kit form (not in this repo) is what keeps the 58 KB JPEG from downloading. The 58 KB is also on the homepage and the edition.

3. **Recompress the YCH homepage photos and the six icons.** Expected saving: 610 KiB, Lighthouse's estimate for that page, and both files that miss the 200 KB image budget fall under it. `p-ullrich.jpg` is 284 KB for a 372×220 box. `p-airport.jpg` is 263 KB for the same box. The six icons are 178 KB for six 84×84 slots. The hero WebP is already fine and is the LCP element at 1.85 s, so this is data and scroll weight, not the first paint. Repo: `evanmack45/austin-council-tracker`. Live files: `/images/alive/p-ullrich.jpg`, `/images/alive/p-airport.jpg`, `/images/alive/icon-airport.jpg`, `icon-water.jpg`, `icon-housing.jpg`, `icon-greenbelt.jpg`, `icon-bike.jpg`, `icon-dog.jpg`. The homepage module is the Astro file whose built CSS is `/_astro/index.*.css` (source filename `index.astro`). A roughly 800 px WebP for each photo, and an icon nearer 150 px, matches the device-pixel boxes above.

4. **Let YCH compress HTML and CSS.** Expected saving: 87 KB on the 22 Oct meeting document (103,650 bytes on the wire, 16,540 bytes gzipped), about 0.4 s of Slow 4G download on a page whose LCP is already 1.69 s. The same `no-transform` header is on CSS. `Base.css` alone is 11,070 bytes versus 4,185 gzipped. Homepage HTML would drop from 12,534 to 3,654 bytes. Repo: `evanmack45/austin-council-tracker`, whatever sets `Cache-Control: public, ... no-transform` on documents and `/_astro/*.css`. This environment could not read the repo, so that path is the live header rather than a guessed file.

5. **Put width and height on generated charts.** Expected saving: the unsized-image shift on the edition. Median CLS is 0.099, and one run reached 0.182, both blamed on `/images/2026-10-26/early-ballots.png`. The quiet run, where that shift was smaller, was 0.035. The file is 50 KB, under the image budget; dimensions matter more than another encode. `scripts/graphic.mjs` prints `<img src alt>` with no width or height from a 1200×800 canvas. The current tag is in `src/bulletins/2026-10-26.md`. Adding the canvas size keeps the next edition from repeating it.

Next, and not one of the five: subset `src/fonts/bricolage.woff2` (132 KB on every Bulletin page; see the shared note above). Pagefind on the archive is 30 KB of parser-blocking script plus a 3 KB stylesheet, and the archive already paints in 0.9 s, so it waits behind the signup shift.
