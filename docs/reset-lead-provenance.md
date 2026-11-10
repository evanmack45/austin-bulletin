# Provenance: reset lead visual data package (2026-11-10 edition)
Built 2026-11-09 (CT). Pure data vector graphics; no AI imagery, no photos, no clip art.

## Dataset
- City of Austin, **Affordable Housing Inventory**, Socrata id `ifzc-3xz8`. Page: https://data.austintexas.gov/d/ifzc-3xz8 · API: https://data.austintexas.gov/resource/ifzc-3xz8.json
- Dataset rowsUpdatedAt: 2026-11-09 6:01:23 AM CT (unchanged between Marrow's pull and this re-query).
- Fields used: housing_tenure, development_status, affordability_expiration_date, affordable_units, total_units, council_district, project_name, address, zip, unit_type, latitude, longitude.

## Query / filter (same as Marrow's)
`housing_tenure='Rental' AND development_status IN ('Project Completed','Certified','Under Construction','Loan Awarded','Loan Closed') AND affordability_expiration_date >= 'YYYY-01-01T00:00:00' AND < 'YYYY+1-01-01T00:00:00'`; value = `sum(affordable_units)`, grouped by `date_trunc_y(affordability_expiration_date)`.
Excluded by that filter: statuses "Affordability Period Expired" and "Affordability Released"; placeholder dates (3799-12-30, 1900-12-30 etc.) fall outside 2027-2031 anyway.

## Retrieval
- Marrow's pulls: full table 2026-11-09 7:58:44 PM CT (2,430 rows); year/project queries 8:03:57-8:04:03 PM CT (`/workspace/sites/drafts/2026-11-10/original-data/raw/queries/`).
- Independent re-query (this package): **2026-11-09 8:07:42 PM CT**, saved in `verify/` (live_years.json, live_2027_projects.json, live_meta.json).

## Verification results
| figure | Marrow | recomputed from raw ahi_full.json | live re-query 8:07 PM CT | result |
|---|---|---|---|---|
| 2027 | 927 (11 rows) | 927 (11) | 927 (11) | match |
| 2028 | 268 (6) | 268 (6) | 268 (6) | match |
| 2029 | 637 (7) | 637 (7) | 637 (7) | match |
| 2030 | 953 (11) | 953 (11) | 953 (11) | match |
| 2031 | 358 (3) | 358 (3) | 358 (3) | match |
| top four 2027 communities | 882 | 264+252+186+180 = 882 | same | match |
| Districts 4, 5, 7 in 2027 | 883 | D4 433 + D5 264 + D7 186 = 883 | same | match |
| 11 places: names, addresses, districts, units, dates | lead.json places | identical | identical | match |

No mismatches. Sensitivity notes, not errors: without the status filter, 2028 would be 528 (adds La Cima Apartments, 260 units, status "Affordability Released") and 2031 would be 359 (adds one 1-unit "Affordability Released" row). 2027 is 927 either way, and all 2027 rental rows are "Project Completed".
Location check: each 2027 property's dataset latitude/longitude was tested against the City's official, unsimplified council district polygons (`../austin-map-base/raw/districts_raw.geojson`). All 11 fall in their listed district (`verify/pip_check.json`).

## Reading notes for copy
- 2030 (953) is larger than 2027 (927). The chart highlights 2027 because it's the next year, not because it's the biggest. Copy shouldn't call 2027 the peak.
- Units are recorded affordable units, not households or people.

## Caveat (must sit near the visual)
"An expiration date doesn't by itself mean rents will rise." The inventory records when an affordability period ends. A restriction can be extended, refinanced or replaced.

## Map
District lines come from the City of Austin CTM `BOUNDARIES_single_member_districts` layer, simplified for display (see `../austin-map-base/provenance.md`; no explicit open license, so treat reuse as credited public reuse). Circle area is proportional to affordable units (r = 2.6·√units at the 800-wide viewBox), placed at the dataset's own coordinates. The simplified shapes are for display only, and district assignment comes from the dataset plus the raw-boundary check above.

## Palette (from ../design-direction/tokens.css)
Chart/share on night stage: background night #0F2A47; 2027 bar and 927 in sun #FFC233 (9.0:1); muted bars #5E7A99 (3.3:1 non-text); text paper #FBF4E6 (13.3:1); bar and year labels #C9D3DE (9.6:1); source #AFBBC9 (7.5:1). The last three are new tints, not tokens.
Map on paper #FBF4E6: districts #EFE5D1 with ink #14171F strokes; districts 4/5/7 tinted #F6D58A; circles data-2 #C77700 at 85% with ink strokes; MAP label red #C8102E; muted text #5B5650; water #56B4E9 at 45%.
Font: Bricolage Grotesque (OFL), tnum.

## Rebuild
`python3 build_graphics.py && python3 render.py` (Playwright + /usr/bin/google-chrome). render.py also reports text out of bounds, overlaps, and type under 12.5 CSS px. Its remaining "overlap" flags are line-box false positives around the large 927, checked visually.
