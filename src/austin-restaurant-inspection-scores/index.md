---
layout: layout.njk
title: "What an Austin restaurant inspection score tells you"
eleventyComputed:
  description: "{{ featureInspections.description }}"
permalink: "/austin-restaurant-inspection-scores/"
---
{%- set d = featureInspections -%}

<div class="data-feature">
{% set artName = "inspections" %}{% set artAlt = "Illustration: a restaurant counter still life with a clean plate, fork and knife, a large magnifying glass, an inspector's clipboard with blank checkboxes, a thermometer, a chef's hat, a gold badge and a bowl of lemons." %}{% include "art-lead.njk" %}

## What an Austin restaurant inspection score tells you

**An original Austin Bulletin data analysis. Data: [City of Austin food establishment inspection scores]({{ d.dataset }}), every routine inspection dated {{ d.fromLabel }} through {{ d.toLabel }}, pulled {{ d.generatedLabel }}. The newest inspection in the City's file is dated {{ d.latestLabel }}.** The file lists a date, a score, a score band and the type of each inspection. It does not list what the inspector found. No business is named on this page.

<figure class="data-feature-chart">
<picture>
<source media="(max-width: 700px)" srcset="/images/features/austin-restaurant-inspection-scores-phone-780.webp?v={{ d.generated }}">
<img src="/images/features/austin-restaurant-inspection-scores-desktop-1600.webp?v={{ d.generated }}" width="1600" height="1067" alt="{{ d.chartAlt }}" loading="eager" decoding="async">
</picture>
<figcaption>Routine inspections by score. Follow-up inspections are left out. Chart: The Austin Bulletin, from <a href="{{ d.dataset }}">City of Austin inspection data</a>.</figcaption>
</figure>

### The short version

- The City recorded **[{{ d.routine | commas }} routine inspections]({{ d.routineQuery }})** in the 12 months. The middle score was **{{ d.median }}** out of 100.
- **[{{ d.greenPct }}%]({{ d.categoryQuery }})** scored 90 or higher, which the City labels Green. **[{{ d.yellowPct }}%]({{ d.categoryQuery }})** landed in the Yellow band, 70 to 89.
- **[{{ d.redN }} inspections]({{ d.failingQuery }})** scored under 70, the City's Red band. That is about 1 in {{ d.redOneIn }}.
- After a score between 1 and 69, the same place was inspected again a median of **{{ d.next.medianDays | round }} days** later in the City's file. {% if d.next.passed == d.next.withNext %}Every one of those {{ d.next.withNext }} next scores was 70 or higher.{% else %}{{ d.next.passed }} of those {{ d.next.withNext }} next scores were 70 or higher.{% endif %}
- Across the {{ d.zips | length }} ZIP codes with at least {{ d.minZip }} routine inspections, the middle score ran from **{{ d.spread.lo }}** to **{{ d.spread.hi }}**.

### What this means for you

- **A score in the 80s is not a warning sign by itself.** About {{ d.yellowPct }}% of routine inspections land in the 70-to-89 Yellow band, so Yellow is common. A score of 90 or more is the usual result, not an exceptional one.
- **Look at a place's last few scores, not one.** An inspection is one visit on one day. The City's [open data]({{ d.dataset }}) keeps about three years of scores, so you can see whether a low score was a one-time slip or a pattern.
- **Under 70 is rare, and the City follows up.** City Code says a place scoring under 70 must start correcting the violations within 48 hours, and the City charges a [$134 re-inspection fee](https://www.austintexas.gov/health/programs/fixed-food-establishments). In this data, the next inspection after a failing score came a median of {{ d.next.medianDays | round }} days later.
- **Your ZIP code is a weak guide.** The middle score differs by only a few points between ZIP codes, and a ZIP can include places that Austin Public Health inspects outside the city limits. Pick a place by its own record.
- **The file cannot tell you why.** It has no list of violations. For the findings behind a score, ask the place for its inspection report or contact the Environmental Health Services Division at 512-978-0300, the number [Austin Public Health lists](https://www.austintexas.gov/health/programs/fixed-food-establishments) for that division.

### How the score works

Under the City's [City Code section 10-3-153](https://library.municode.com/tx/austin/codes/code_of_ordinances/469236?nodeId=TIT10PUHESESA_CH10-3FOFOHA), an inspector records a weighted point value for each violation of a critical requirement. The score is 100 minus those points. If the score is under 70, the person in charge must begin correcting the violations within 48 hours. The City's data sorts each score into one of three bands, which are the labels the City publishes: 90+ (Green), 70-89 (Yellow) and Under 70 (Red). The [counts by band]({{ d.categoryQuery }}) on this page match the City's own band labels.

### Scores by band

<div class="data-table-wrap" tabindex="0" role="region" aria-label="Routine inspections by score">
<table class="data-table">
<thead><tr><th scope="col">Score</th><th scope="col">Routine inspections</th><th scope="col">Share</th></tr></thead>
<tbody>
{%- for b in d.bands %}
<tr><th scope="row">{{ b.label }}</th><td><a href="{{ b.query }}">{{ b.n | commas }}</a></td><td>{{ b.share }}%</td></tr>
{%- endfor %}
</tbody>
</table>
</div>

Shares are rounded, so they may not add to exactly 100%. The Under 70 row includes [{{ d.zeros }} inspections with a score of exactly 0]({{ d.zeroQuery }}). The City does not explain a score of 0 in the file, so this page does not treat it as a measure of anything.

### Scores by ZIP code

Only ZIP codes with at least {{ d.minZip }} routine inspections in the window are shown. That is {{ d.zips | length }} of the {{ d.zipCount }} ZIP codes in the file. "Median" is the middle score. Each count links to the City's query for that ZIP code.

<div class="data-table-wrap" tabindex="0" role="region" aria-label="Routine inspections by ZIP code">
<table class="data-table">
<thead><tr><th scope="col">ZIP code</th><th scope="col">Inspections</th><th scope="col">Median score</th><th scope="col">Scored 90+</th><th scope="col">Under 70</th></tr></thead>
<tbody>
{%- for z in d.zips %}
<tr><th scope="row">{{ z.zip }}</th><td><a href="{{ z.query }}">{{ z.n | commas }}</a></td><td>{{ z.median }}</td><td>{{ z.greenPct }}%</td><td>{{ z.redN }}</td></tr>
{%- endfor %}
</tbody>
</table>
</div>

A ZIP code is a mail route, not a city boundary. Austin Public Health's [permit page](https://www.austintexas.gov/health/programs/fixed-food-establishments) says it also handles unincorporated Travis County and several nearby cities, so some ZIP codes here include places outside Austin.

### What happened after a failing score

Of the **[{{ d.next.failing }} routine inspections]({{ d.failingQuery }})** dated {{ d.fromLabel }} through {{ d.next.cutoff }} with a score from 1 to 69, **{{ d.next.withNext }}** have a later inspection of the same place in the City's file. {% if d.next.passed == d.next.withNext %}All {{ d.next.passed }} of those later scores were 70 or higher{% else %}{{ d.next.passed }} of those later scores were 70 or higher{% endif %}. The later scores ran from **{{ d.next.minScore }}** to **{{ d.next.maxScore }}**. {{ d.next.within30 }} came within 30 days. The window stops {{ d.followDays }} days before its end so recent failures have time to show a next visit. A place with no later row may simply not be in the file yet.

### How we did this

- **Data:** the City of Austin's [food establishment inspection scores]({{ d.dataset }}), public domain, from Austin Public Health's Environmental Health Services Division. The City says the file holds inspections from the last three years and updates it as needed. Because the City updates the file, a live query can differ slightly from the figures here.
- **Window:** every inspection dated {{ d.fromLabel }} through {{ d.toLabel }}. Only the City's "Routine Inspection" type is counted in the score figures. The window also holds {{ d.followUps }} follow-up inspections, which are left out because they are not a place's regular visit.
- **Coverage:** [KUT reported in August 2026](https://www.kut.org/health/2026-08-13/austin-tx-restaurant-food-inspection-scores-texas-health) that Austin Public Health switched databases the year before and is missing some inspection locations. This page counts what is in the file, so a place may be missing from it.
- **Places:** the file has {{ d.facilities | commas }} distinct facility IDs with an inspection in the window. A facility ID is the City's number for one permitted location.
- **Code:** the [script that builds every number on this page](https://github.com/evanmack45/austin-bulletin/blob/main/scripts/data-inspections.mjs) is public. Anyone can rerun it.
- The Austin Bulletin is produced with AI and reviewed against the source data. It takes no position on any business. [Corrections](/corrections/)

</div>
