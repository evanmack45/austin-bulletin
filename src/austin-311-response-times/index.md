---
layout: layout.njk
title: "How long Austin takes to close your 311 request"
eleventyComputed:
  description: "{{ feature311.description }}"
permalink: "/austin-311-response-times/"
---
{%- set d = feature311 -%}
{%- set k = d.byKey -%}
{%- macro dur(days) -%}{%- if days * 24 < 0.5 -%}under 1 hour{%- elif days * 24 < 1.5 -%}1 hour{%- elif days < 1 -%}{{ (days * 24) | round }} hours{%- elif days < 1.05 -%}1 day{%- else -%}{{ days | round(1) }} days{%- endif -%}{%- endmacro -%}
{%- macro q(t, text) -%}<a href="{{ t.query }}">{{ text }}</a>{%- endmacro -%}

<div class="data-feature">

## How long Austin takes to close your 311 request

**An original Austin Bulletin data analysis. Data: [City of Austin 311 public data]({{ d.dataset }}), every service request created from {{ d.fromLabel }} through {{ d.toLabel }}, pulled {{ d.generatedLabel }}.** This page measures how long requests stayed open in the City's system. It does not measure whether the work was done well. The City updates the dataset every day, so a live query can differ slightly from the figures here.

<figure class="data-feature-chart">
<picture>
<source media="(max-width: 700px)" srcset="/images/features/austin-311-response-times-phone-780.webp?v={{ d.generated }}">
<img src="/images/features/austin-311-response-times-desktop-1600.webp?v={{ d.generated }}" width="1600" height="1067" alt="{{ d.chartAlt }}" loading="eager" decoding="async">
</picture>
<figcaption>Median time from report to "closed." Requests marked duplicate and requests still open are left out. Chart: The Austin Bulletin, from <a href="{{ d.dataset }}">City of Austin 311 data</a>.</figcaption>
</figure>

### The short version

- Austin logged **[{{ d.total | commas }} service requests]({{ d.totalQuery }})** in the 12 months, about {{ (d.total / 365) | round | commas }} a day.
- Half of all **pothole** reports were marked closed within **{{ q(k.pothole, dur(k.pothole.medianDays)) }}**. Nine in 10 were closed within **{{ q(k.pothole, dur(k.pothole.p90Days)) }}**.
- Half of all **abandoned-vehicle** reports took **{{ q(k.vehicle, dur(k.vehicle.medianDays)) }}** or longer. One in 10 took more than **{{ q(k.vehicle, dur(k.vehicle.p90Days)) }}**.
- A request for a **code officer** usually closed in **{{ q(k.code, dur(k.code.medianDays)) }}**, but the slowest 1 in 10 took more than **{{ q(k.code, dur(k.code.p90Days)) }}**.
- **Bulk-item** requests had a median of **{{ q(k.bulk, dur(k.bulk.medianDays)) }}**, and **brush** requests **{{ q(k.brush, dur(k.brush.medianDays)) }}**. **Trash** requests closed in a median of **{{ q(k.garbage, dur(k.garbage.medianDays)) }}**.
- **[{{ d.duplicates | commas }} requests]({{ d.statusQuery }})** were marked duplicates of a report someone had already filed.

### What this means for you

- **"Closed" is the City's status, not a promise that the problem is gone.** A ticket can close because a crew fixed it, because it was passed to another system, or because staff found nothing to do. Traffic-signal reports, for example, show a median of {{ q(k.signal, dur(k.signal.medianDays)) }}. If the problem is still there after your ticket closes, file again and mention the old request number.
- **Use the 9-in-10 column as your "too long" line.** If your request has been open longer than the time in the table below, it is slower than 9 in 10 of the same kind. That is a fair point to [check its status](https://austin-cwiprod.motorolasolutions.com/cwi/search) or call 3-1-1 with your request number.
- **Some requests are slow by design.** In this data, half of bulk-item and brush requests took about a week or longer to close. A request of that kind that is still open after a few days is typical.
- **Abandoned-vehicle and code cases take longest.** Plan on weeks, not days. Keep your request number and note the dates you see the problem.
- **Check before you report.** Thousands of reports each year are duplicates. A duplicate does not hurt, but checking the [City's request search](https://austin-cwiprod.motorolasolutions.com/cwi/search) can tell you whether a report already exists.
- **How to file:** call 3-1-1 or 512-974-2000. Starting November 1, 2026, phone service runs 7 a.m. to 9 p.m., seven days a week. You can file any time with the Austin 3-1-1 mobile app or the [Citizen Web Portal](https://austin-cwiprod.motorolasolutions.com/cwi/select), the [City says](https://www.austintexas.gov/3-1-1). 311 is for non-emergencies. Call 911 in an emergency.

### The 25 most common requests

Ranked by number of requests. "Median" is the time by which half of the closed requests of that kind were closed. "9 in 10" is the time by which 90% were closed. Each "City data" link opens the City's own records for that request type and window.

<div class="data-table-wrap" tabindex="0" role="region" aria-label="The 25 most common 311 requests">
<table class="data-table">
<thead><tr><th scope="col">Request</th><th scope="col">Requests</th><th scope="col">Median</th><th scope="col">9 in 10</th><th scope="col">Still open</th><th scope="col">Source</th></tr></thead>
<tbody>
{%- for t in d.types %}
<tr><th scope="row">{{ t.label }}<span class="data-table-code">{{ t.type }}</span></th><td><a href="{{ t.countQuery }}">{{ t.total | commas }}</a></td><td>{{ dur(t.medianDays) }}</td><td>{{ dur(t.p90Days) }}</td><td>{{ t.open | commas }}</td><td><a href="{{ t.query }}">City data</a></td></tr>
{%- endfor %}
</tbody>
</table>
</div>

The prefix on each City name is the department that handles it: ARR is Austin Resource Recovery, DSD is Development Services, TPW is Transportation and Public Works, APD is the Austin Police Department and AE is Austin Energy.

### What each Council district reports most

Districts are where the request was located. {{ d.noDistrict | commas }} requests had no district in the data. Each district's count links to the City's query for its top request types.

<div class="data-table-wrap" tabindex="0" role="region" aria-label="311 requests by Council district">
<table class="data-table">
<thead><tr><th scope="col">District</th><th scope="col">Requests</th><th scope="col">Top three requests</th></tr></thead>
<tbody>
{%- for x in d.districts %}
<tr><th scope="row">District {{ x.district }}</th><td><a href="{{ x.query }}">{{ x.total | commas }}</a></td><td>{% for t in x.top %}{{ t.label }} ({{ t.n | commas }}){% if not loop.last %}, {% endif %}{% endfor %}</td></tr>
{%- endfor %}
</tbody>
</table>
</div>

{{ d.districtSentence }} To find your district, use the City's [district lookup](https://www.austintexas.gov/council/district-map). For what the City Council decided about your district, see [Y'all, City Hall](https://yallcityhall.org/).

### How people reach 311, and when

{%- set phone = d.methods[0] %}
- **By phone:** [{{ phone.n | commas }} requests]({{ d.methodQuery }}), or {{ ((phone.n / d.total) * 100) | round }}% of the total.
{%- for m in d.methods.slice(1, 5) %}
- **{{ m.method }}** (the City's label): [{{ m.n | commas }}]({{ d.methodQuery }})
{%- endfor %}

The busiest month was **[{{ (d.months | sort(true, false, "n") | first).label }}]({{ d.monthQuery }})** with {{ (d.months | sort(true, false, "n") | first).n | commas }} requests. The quietest was **[{{ (d.months | sort(false, false, "n") | first).label }}]({{ d.monthQuery }})** with {{ (d.months | sort(false, false, "n") | first).n | commas }}.

<div class="data-months" role="img" aria-label="311 requests by month, {{ d.period }}">
{%- set maxMonth = (d.months | sort(true, false, "n") | first).n %}
{%- for m in d.months %}
<div class="data-month"><span class="data-month-label">{{ m.short }}</span><span class="data-month-bar" style="--w: {{ ((m.n / maxMonth) * 100) | round(1) }}%"></span><span class="data-month-n">{{ m.n | commas }}</span></div>
{%- endfor %}
</div>

### How we did this

- **Data:** the City of Austin's [311 public data]({{ d.dataset }}), public domain. The City says the data comes from its 311 production system and refreshes every day.
- **Window:** every request created from {{ d.fromLabel }} through {{ d.toLabel }}, by the date the City recorded.
- **Time to close:** the City's closed time minus its created time. Only requests with a "Closed" status count. Duplicates and open requests are left out, so a type with many open requests may look faster than it really is. The "Still open" column shows how many were open on {{ d.generatedLabel }}.
- **Code:** the [script that builds every number on this page](https://github.com/evanmack45/austin-bulletin/blob/main/scripts/data-311.mjs) is public. Anyone can rerun it.
- The Austin Bulletin is produced with AI and reviewed against the source data. It takes no position on City services or budgets. [Corrections](/corrections/)

</div>
