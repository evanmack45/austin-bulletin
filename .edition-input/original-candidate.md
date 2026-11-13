# Bulletin original — Fri Nov. 13, 2026 (Marrow, daily desk)
Source: City of Austin, Issued Construction Permits (3syk-w9eu), https://data.austintexas.gov/d/3syk-w9eu. Dataset max issue_date 2026-11-12. Queried live ~7:29 a.m. CT Nov. 13.

## Finding
Austin issued 1,845 building permits for new single-family houses in January through October 2026, up from 1,743 in the same months of 2025 (+5.9%), 1,498 in 2024 and 1,348 in 2023 (+36.9% vs 2023). Third straight year up for Jan.–Oct.

## Query (each year Y)
$select=count(*), count(distinct permit_number), count(distinct original_address1)
$where=issue_date>='Y-01-01T00:00:00' and issue_date<'Y-11-01T00:00:00' and permittype='BP' and work_class='New' and permit_class='R- 101 Single Family Houses'
Results: 2023 1,348 (distinct permits 1,348; addresses 1,338) · 2024 1,498 (1,498; 1,471) · 2025 1,743 (1,743; 1,733) · 2026 1,845 (1,845; 1,812).
Full-year context (not for print): 2023 1,571 · 2024 1,804 · 2025 1,981. Nov. 1–12, 2026: 69.
Arithmetic: 1845/1743 = 1.0585 → +5.9%; 1845/1348 = 1.3687 → +36.9%.

## Chart
Bars, Jan.–Oct. by year: original-data/chart_data_jan_oct_by_year.csv (sha f06ada62…). Optional monthly 2025 vs 2026: original-data/chart_data_monthly_sf_permits.csv (sha 51d24d40…). Raw pull: original-data/raw/3syk-w9eu_sf_monthly_pulled_20261113.json.

## Method / caveats (keep on page)
These are permits issued by the City of Austin for new single-family houses, not homes finished or sold. Duplexes, apartments and accessory units are not included. A few addresses carry more than one permit (1,812 distinct addresses). Recent months can be revised. The data does not say why permits rose.

## Not used, and why (desk note for Bodkin/Tally)
- Started on housing *units* (open-data C07, number sheet: 2,523 → 2,226 Jan–Sep, −11.8%). Dropped: the dataset's housing_units field repeats the whole project's unit count on each phase permit. Example: 512 Sabine St, permits 2026-006049/50/51 BP, each lists 232 units for one 232-unit project (3× counted). So sum(housing_units) overstates multi-permit projects, and C07's "Residential" filter also leaves out apartment buildings (C-105, classed Commercial: 6,396 units listed Jan–Oct 2026). Do not publish C07 unit totals or any sum(housing_units) without de-duplicating by project. Flag for Tally/Plumb.
- Two-family (duplex) permits fell to 125 from 323 (Jan–Oct). Not printed; cause unknown and it would need its own check.
