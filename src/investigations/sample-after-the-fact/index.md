---
# Copy this folder to src/investigations/<slug>/ for a new story.
# Edit the front matter, replace the body, and add data.json beside this file.
# The index lists any file here with investigation: true.
# To list the section on the site, set public: true in src/_data/investigations.js.
layout: investigation.njk
investigation: true
sample: true
title: "Sample story: after-the-fact contracts"
dek: "A template page with a dummy chart and dummy documents. Nothing here is a finding about city contracts."
description: "A template page with a dummy chart and dummy documents. Nothing here is a finding about city contracts."
byline: "Austin Investigative Journalism Team"
date: 2026-03-04
updated: "2026-03-18"
permalink: "/investigations/sample-after-the-fact/"
image: "/images/investigations/sample-share.webp"
imageAlt: "Sample graphic. Placeholder bars and the words dummy data, not a city record."
imageWidth: 1200
imageHeight: 630
dataset: "/investigations/sample-after-the-fact/data.json"
findings:
  - value: "8"
    label: "made-up rows"
    detail: "The sample file lists eight fake agreements."
  - value: "4"
    label: "fake departments"
    detail: "Parks, water, fleet, and library are labels, not city counts."
  - value: "$0"
    label: "city dollars"
    detail: "No real contract amount is in this file."
methods:
  - "The chart and the table both read the JSON file linked under the chart."
  - "A reported story would name the records request, what was counted, and what was left out. This box is that note."
responses:
  - who: "Sample Department"
    asked: "2026-02-02"
    deadline: "2026-02-16"
    statement: "Did not respond by February 16, 2026."
  - who: "Example Vendor"
    asked: "2026-02-02"
    deadline: "2026-02-12"
    statement: "Sample reply, sent February 12, 2026: no comment on a placeholder."
documents:
  - id: sample-log
    label: "Sample ratification log"
    url: "https://example.com/sample-ratification-log"
    detail: "A made-up spreadsheet. The link goes to example.com."
  - id: sample-agreement
    label: "Sample agreement A"
    url: "https://example.com/sample-agreement-a"
    detail: "A placeholder file, not a city contract."
updates:
  - date: "2026-03-18"
    text: "Sample note. A real correction would say what changed. Nothing on this page was corrected."
---

This paragraph is placeholder copy for the template. It points at the chart and at the [sample agreement](#doc-sample-agreement), which is not a real file.

The [sample log](#doc-sample-log) is the other citation. Swap these sentences for the reported story when one is ready to run.
