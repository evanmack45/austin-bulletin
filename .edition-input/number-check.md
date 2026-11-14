# Number check, 2026-11-14 (Marrow desk recompute, dataset fdj4-gpfu live)
Re-ran each query below just before READY; results recorded verbatim. Not independently checked by Tally/Plumb.
Run at 7:38 AM CT. Dataset: https://data.austintexas.gov/d/fdj4-gpfu (Crime Reports), endpoint https://data.austintexas.gov/resource/fdj4-gpfu.json

Jan–Oct 2020: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2020-01-01T00:00:00' and occ_date<'2020-11-01T00:00:00'
[{"n":"220","d":"220"}]
Jan–Oct 2021: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2021-01-01T00:00:00' and occ_date<'2021-11-01T00:00:00'
[{"n":"1522","d":"1522"}]
Jan–Oct 2022: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2022-01-01T00:00:00' and occ_date<'2022-11-01T00:00:00'
[{"n":"1763","d":"1763"}]
Jan–Oct 2023: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2023-01-01T00:00:00' and occ_date<'2023-11-01T00:00:00'
[{"n":"438","d":"438"}]
Jan–Oct 2024: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2024-01-01T00:00:00' and occ_date<'2024-11-01T00:00:00'
[{"n":"29","d":"29"}]
Jan–Oct 2025: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2025-01-01T00:00:00' and occ_date<'2025-11-01T00:00:00'
[{"n":"32","d":"32"}]
Jan–Oct 2026: $select=count(*) as n,count(distinct incident_report_number) as d $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2026-01-01T00:00:00' and occ_date<'2026-11-01T00:00:00'
[{"n":"297","d":"297"}]

Henry sector 2026 by occ month (APD release says Aug 17, Sep 4, Oct 10): $where=crime_type='THEFT CATALYTIC CONVERTER' and occ_date>='2026-08-01' and sector='HE' group by month
[{"m":"8","n":"17"},{"m":"9","n":"4"},{"m":"10","n":"10"}]
Location type 2026 Jan–Oct (parking lot/garage printed):
[{"location_type":"PARKING /DROP LOT/ GARAGE","n":"161"},{"location_type":"RESIDENCE / HOME","n":"98"},{"location_type":"COMMERCIAL / OFFICE BUILDING","n":"16"},{"location_type":"HOTEL / MOTEL / ETC.","n":"5"},{"location_type":"HWY / ROAD / ALLEY/ STREET/ SIDEWALK","n":"5"},{"location_type":"OTHER / UNKNOWN","n":"3"},{"location_type":"GOVERNMENT / PUBLIC BUILDING","n":"2"},{"location_type":"DRUG STORE / DOCTOR'S OFFICE / HOSPITAL","n":"2"},{"location_type":"SHOPPING MALL","n":"1"},{"location_type":"AUTO DEALERSHIP NEW / USED","n":"1"},{"location_type":"DOCK / WHARF / FREIGHT / MODAL TERMINAL","n":"1"},{"location_type":"RENTAL STORAGE FACILITY","n":"1"},{"location_type":"AIR / BUS / TRAIN TERMINAL","n":"1"}]
Dataset max dates:
[{"max_occ_date":"2026-11-07T00:00:00.000","max_rep_date":"2026-11-08T00:00:00.000"}]

Arithmetic: 297/32 = 9.28x; 297 vs 2022 1763 = -83.2%. Hornsby Bend: 22,420,200 + 32,906,529 + 3,213,452 = 58,540,181. Agenda figures re-read from final agenda 485293.
