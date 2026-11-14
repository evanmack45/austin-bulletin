# Bulletin original — Sat Nov. 14, 2026 (Marrow, daily desk)
Source: City of Austin / Austin Police, Crime Reports (fdj4-gpfu), https://data.austintexas.gov/d/fdj4-gpfu. Dataset rows updated Nov. 9, 2026 8:38 a.m. CT; max occ_date 2026-11-07, max rep_date 2026-11-08. Queried live ~7:35 a.m. CT Nov. 14.

## Finding
APD crime reports coded "THEFT CATALYTIC CONVERTER" (UCR 620) with an occurrence date January–October: 2020 220 · 2021 1,522 · 2022 1,763 · 2023 438 · 2024 29 · 2025 32 · 2026 297. 2026 is 9.3x 2025 (297/32 = 9.28); 83% below 2022 (297/1763 = 0.168). The rise starts in Dec. 2025 (39 reports vs. 1–9 a month through 2025).

## Query
$select=count(*) as n, count(distinct incident_report_number) as d
$where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='Y-01-01T00:00:00' and occ_date<'Y-11-01T00:00:00'
Results: 2023 438 (distinct 438) · 2024 29 (29) · 2025 32 (32) · 2026 297 (297). 2020–2022 from the grouped monthly pull (raw/).

## Cross-checks
- Henry (HE) sector, 2026 by occurrence month: Aug. 17, Sept. 4, Oct. 10 = 31. Matches APD's Nov. 13 release exactly (17/4/10; 31 reports Aug. 1–Nov. 8).
- Not a recode from "THEFT OF AUTO PARTS": that code went 291 (2025) → 257 (2026) Jan–Oct, a drop of 34, too small to explain +265. "THEFT FROM AUTO" 110 → 131. Recoding can't be fully ruled out; desk did not find evidence of it.
- 2026 Jan–Oct by location type: parking lot/garage 161, residence 98, commercial 16, street 5, hotel 5, other 3 (sum 288 of 297 shown; top 6 only).
- 2026 Jan–Oct by council district: D3 71, D2 47, D7 45, D1 37, D4 26, D5 23, D9 17, D8 14, D10 11, D6 6 (sum 297). Not printed.

## Chart
Bars Jan.–Oct. by year 2020–2026: original-data/chart_data_jan_oct_by_year.csv (sha 86ef73b7…). Optional monthly 2025–26: original-data/chart_data_monthly_2025_2026.csv (sha dde3ea93…; Oct. 2025 has no rows = 0). Raw: original-data/raw/fdj4-gpfu_catalytic_monthly_pulled_20261114.json.

## Method / caveats (keep on page)
These are police reports of catalytic converter theft by date the theft happened, not arrests or convictions. Reports are preliminary and can be reclassified. Some thefts go unreported. The data does not say why reports rose. Nov. 2026 is incomplete and not used.

## Do not
State a cause (prices, law changes); name the man in APD's release; tie the Oct. 28 arrest to the thefts (APD calls it a separate incident).
