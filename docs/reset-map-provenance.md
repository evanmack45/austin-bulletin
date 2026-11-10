# Provenance: Austin council district base map
Retrieved 2026-11-09, about 8:01 PM CT, by Kiln (Art Director), from official City of Austin ArcGIS Online services (org id 0L95CJ0VTaxqcmED, "City of Austin", urlKey austin).

## Districts
- Item: BOUNDARIES_single_member_districts, owner CTM.Publisher (City of Austin Communications and Technology Management). Item page: https://www.arcgis.com/home/item.html?id=8251869f87e24d3abff3d7a36fc7c4f4
- Layer queried: https://services.arcgis.com/0L95CJ0VTaxqcmED/arcgis/rest/services/BOUNDARIES_single_member_districts/FeatureServer/0 ("Council Districts Fill"), `where=1=1&outFields=COUNCIL_DISTRICT,MODIFIED_DATE&outSR=4326&f=geojson`. 10 features, COUNCIL_DISTRICT 1-10. Feature MODIFIED_DATE 2022-02-25 (post-2021 redistricting lines); layer lastEditDate 2026-11 (service metadata).
- Terms (licenseInfo on the item, quoted): "This product is for informational purposes and may not have been prepared for or be suitable for legal, engineering, or surveying purposes... produced by the Communications and Technology Management Department for the sole purpose of geographic reference. No warranty is made by the City of Austin regarding specific accuracy or completeness."
- Credit requested (accessInformation): "Acknowledgment of the following organizations would be appreciated in products derived from this data: Citygate GIS; Travis County Clerk – Elections Division; City of Austin – Communications and Technology Management Department."
- No explicit open-data license (e.g., Public Domain/CC) is stated on this ArcGIS item. Public reuse with credit is the reading here; it is not a verified license. Suggested source line: "MAP · Source: City of Austin (CTM), Travis County Clerk Elections Division, Citygate GIS."

## Water (optional layer)
- Item: Lakes, City of Austin (https://www.arcgis.com/home/item.html?id=6cfcee47aee74cac84eb1f54247d0576), layer https://services.arcgis.com/0L95CJ0VTaxqcmED/arcgis/rest/services/Lakes/FeatureServer/0, features "Lady Bird Lake", "Lake Austin", "Colorado River", server generalized with maxAllowableOffset=0.0003°.
- Terms: "maintained by the City of Austin for the purpose of planning, modeling and GIS based analysis. It is not warranted for any other use... Please credit the City of Austin with any use of this data."

## Processing
- Raw downloads in raw/ (districts_raw.geojson 1.7 MB, water_raw.geojson).
- mapshaper 0.6.x: `-simplify 4% keep-shapes planar -clean`, properties reduced to `district` (1-10), `id` ("d1"-"d10"), `name`; coordinates rounded to 1e-5° (~1 m). Output austin-council-districts.geojson (49 KB) and .topojson (20 KB, object name "districts"). Water clipped to the district bounding box, simplified 15%.
- Label points: mapshaper `-points inner` (raw/labels.geojson).
- SVG projection (build_map.py, projection.json): equirectangular corrected by cos(30.296°), viewBox 0 0 800 991. x=(lon-lon0)*cosLat*k+pad, y=(lat1-lat)*k+pad. Distortion at city scale is negligible. The same formula is in demo.html as `project(lat, lon)`.
- Simplification is visual only. Do not use these shapes to decide which district an address is in; use the City's address lookup or the raw file.
- Spot check: Austin City Hall (30.2650, -97.7470) falls in District 9 in the simplified file, as expected.

## Files
austin-council-districts.geojson, .topojson, .svg (31 KB, fallback, no JS), austin-water.geojson, projection.json, demo.html (+ bricolage.woff2, OFL), demo-390.png, demo-1280.png, build_map.py, build_demo.py, shot.py.
