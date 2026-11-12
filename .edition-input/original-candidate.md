# Bulletin original candidate for Thu., Nov. 12, 2026: City STR license count (Tally weekly finding)

Prepared Wed. Nov. 11, 1:05 p.m. CT from Tally's Wednesday refresh, for the 7:13 a.m. Thursday desk. This is a candidate, not bulletin-items.md, and there's no READY. Nothing is committed. CURRENT_PLAN.md was **v18** when this was written (12:52 p.m. CT Nov. 11). Re-read the Version line and re-run the gate at desk time; if it has moved, stop and ask Bodkin.

Source packet: `/workspace/sites/drafts/tally/2026-11-10/`. Dataset: City of Austin Active_Short_Term_Rental_Counts (`mydx-h5dy`). Verified 1:01–1:05 p.m. CT Nov. 11: `sha256sum -c SHA256SUMS` OK; `finding.md` sha `e92f6bfdc270a913b395368e8a97bc21e0eabfbbbe1dfb1531dce82190c30720`; tests 28 PASS / 0 FAIL; every figure below is marked [x] on `number_sheet.md`. Use only those checked figures. If the sheet is missing or a headline figure is unchecked at desk time, run no original item.

Pull: 2026-11-11 12:58 p.m. CT. Dataset `dataUpdatedAt` 2026-11-10 11:02 p.m. CT. This is the Wednesday refresh of the early Nov. 10 delivery (as-of Nov. 8 was 3,598); all 590 daily totals through Nov. 8 were unchanged; Nov. 9 (3,618) and Nov. 10 (3,663) are new dates.

## Lead copy

**Headline (6 words):** Licensed short-term rentals rise since September

**Sentence:** Austin had 3,663 active short-term rental licenses on Nov. 10, 2026, the most in the City's daily count, which starts Feb. 28, 2025. That is up 648 (21.5%) from 3,015 on Sept. 30.

**Why it matters:** The City will pause all new short-term rental license applications and renewals from Nov. 16 through Dec. 3 while it moves to a new system that launches Dec. 4. The dataset will not update during that pause.

**Second line (optional, all checked):** The same stretch last year added 103 licenses (2,503 to 2,606, up 4.1%). The 648 licenses added since Sept. 30 are more than the 409 added in the previous 11 months (Nov. 10, 2025 to Sept. 30, 2026). Year over year, the count is up 1,057 (40.6%). Before October 2026, the biggest gain over any 41-day stretch in this data was 176.

**Sources:** [Active Short-Term Rental Counts (mydx-h5dy)](https://data.austintexas.gov/d/mydx-h5dy) · [City of Austin short-term rentals page](https://www.austintexas.gov/development-services/short-term-rentals)

Reproduce the Nov. 10 total: `https://data.austintexas.gov/resource/mydx-h5dy.json?$select=sum(count)&$where=process_date='2026-11-10T00:00:00'`

### Card fields (per art/2026-11-11/edition-cards/SPEC.md)

```yaml
- id: licensed-short-term-rentals-rise-since-september
  section: news
  lead: true
  bignum: "3,663"
  bignum_qualifier: "active licenses, Nov. 10"
  headline: "Licensed short-term rentals rise since September"   # 6 words; no 3,663
  deck: "The City's daily count, which starts Feb. 28, 2025, is up 21.5% since Sept. 30."   # 15 words; no 3,663
  summary: "The City's daily count is up 21.5% since Sept. 30. Applications pause Nov. 16 through Dec. 3."   # 2 sentences, 17 words
  chart_kicker: "Active short-term rental licenses in Austin, by day"
  chart_source: "Source: City of Austin, Active Short-Term Rental Counts (mydx-h5dy), as of Nov. 10, 2026."
  alt: "Chart: Daily count of active Austin short-term rental licenses from Sept. 1, 2025, to Nov. 10, 2026, ending at 3,663."
  method: "These are counts of active licenses, not listings, bookings, or short-term rentals actually operating. Unlicensed rentals are not counted. The count is net: it rises with new licenses and falls when licenses expire or are revoked. The data does not say why the count rose. The City's daily count starts Feb. 28, 2025. The Sept. 30 to Nov. 10 window is 41 days. The City says it will pause applications and renewals Nov. 16 through Dec. 3 and will not update the dataset during that pause. Pulled 12:58 p.m. CT Nov. 11; dataset last updated 11:02 p.m. CT Nov. 10."
  sources:
    - { label: "City dataset mydx-h5dy", url: "https://data.austintexas.gov/d/mydx-h5dy" }
    - { label: "City STR page", url: "https://www.austintexas.gov/development-services/short-term-rentals" }
```

**Today line:** write at desk time once the other items are set, ≤40 words, and do not repeat 3,663.

## Chart (story-specific): daily active-license total

Preferred: a line chart of total active STR licenses by day, Sept. 1, 2025 to Nov. 10, 2026. Data: `original-data/chart_data_daily_total.csv` (sha256 `68acbaf47d2ed2aee2458b40af8fda1bb658b24e315a3d7e04561f51a6d48112`; copy of Tally's file). No image was built. The lead-card mock used bars; this finding wants a line. If the Thursday template can only do bars, use this checked two-column fallback:

CHART kicker: "Licenses added, Sept. 30 to Nov. 10"

| label | value | note |
|---|---|---|
| 2026 | 648 | 3,015 to 3,663, up 21.5% |
| 2025 | 103 | 2,503 to 2,606, up 4.1% |

Alt for the fallback: "Chart: Austin added 648 active short-term rental licenses from Sept. 30 to Nov. 10, 2026, compared with 103 in the same stretch of 2025."

## Number sheet (checked figures used above)

| Figure | Value | Sheet |
|---|---|---|
| Active licenses, Nov. 10, 2026 | 3,663 | F01, also F12/F13 (dataset max; first date at max) |
| Active licenses, Sept. 30, 2026 | 3,015 | F05 |
| Change Sept. 30 to Nov. 10, 2026 | +648, +21.5% | F06/F07 (648/3015=21.49%) |
| Active licenses, Nov. 10, 2025 | 2,606 | F02 |
| Active licenses, Sept. 30, 2025 | 2,503 | F08 |
| Change Sept. 30 to Nov. 10, 2025 | +103, +4.1% | F09/F10 |
| YoY change | +1,057, +40.6% | F03/F04 (1057/2606=40.56%) |
| Change Nov. 10, 2025 to Sept. 30, 2026 | +409 | F11 |
| First date in dataset | Feb. 28, 2025 | F14 |
| Largest 41-day gain ending before Oct. 1, 2026 | 176 (ending April 10, 2025) | F15 |
| Pause / new system | Nov. 16–Dec. 3 pause; system launches Dec. 4; no dataset update during the pause | C1 (quoted from City STR page + dataset description) |

Left out of the copy, though checked: license-type breakdown (F16–F19, F21) and district breakdown (F20), because type definitions were not checked. Unchecked / not used: the 2,785 unlicensed-addresses figure from third-party coverage; any cause of the rise. Two-year licenses (October 2025) and July 1, 2026 platform rules are C2, context only, not cause.

## Caveats for the Thursday desk

- Say "active licenses," never listings, bookings, or the number of short-term rentals actually operating.
- Do not call this a peak or an all-time high. The record is the City's daily count starting Feb. 28, 2025.
- Do not write "six weeks." The comparison window is 41 days (Nov. 10 minus 41 days = Sept. 30).
- Do not state a cause. Do not imply owners rushed licenses ahead of the Nov. 16 pause unless a City source says so.
- Re-check the City STR page at desk time before printing the pause and Dec. 4 launch.
- Label the item "Bulletin original." Link the dataset and the City STR page. Do not reproduce paywalled text (not applicable here).
- Do not reuse Wednesday's 71.68 STAR Flight lead or Tuesday's 927 housing item.
