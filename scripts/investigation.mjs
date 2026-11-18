// Investigations stories: one markdown file plus a JSON dataset beside it.
// The chart and the table are drawn from that file. The file is also the download.
import { readFileSync } from "node:fs";
import path from "node:path";

const GROUP_ID = /^[a-z0-9-]+$/;
const REQUIRED = ["title", "dek", "byline", "dataset", "description", "image", "imageAlt"];

export function isInvestigationRoute(route) {
  return typeof route === "string" && (route === "/investigations/"
    || route.startsWith("/investigations/"));
}

export function isInvestigationStory(route) {
  return typeof route === "string" && /^\/investigations\/.+\/$/.test(route);
}

export function datasetFile(publicUrl) {
  const ok = typeof publicUrl === "string"
    && publicUrl.startsWith("/investigations/")
    && publicUrl.endsWith(".json")
    && !publicUrl.includes("..");
  if (!ok) throw new Error("dataset must be a /investigations/ file ending in .json");
  return `src${publicUrl}`;
}

function findingOk(item) {
  return Boolean(item?.value && item.label && item.detail);
}

function assertFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    throw new Error("investigation story needs findings");
  }
  if (findings.some((item) => !findingOk(item))) {
    throw new Error("each finding needs a value, a label, and a detail");
  }
}

export function assertStoryFields(fields) {
  const missing = REQUIRED.filter((key) => !fields?.[key]);
  if (missing.length) throw new Error(`investigation story is missing ${missing.join(", ")}`);
  datasetFile(fields.dataset);
  assertFindings(fields.findings);
  return "";
}

function seriesValue(item) {
  const value = Number(item?.value);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function checkSeriesItem(item, label) {
  if (!item?.label || seriesValue(item) == null) {
    throw new Error(`${label} has a series item without a label and a number`);
  }
  if (item.group && !GROUP_ID.test(item.group)) {
    throw new Error(`${label} group ids use lowercase letters, numbers, and hyphens`);
  }
}

function checkSeries(series, label) {
  if (!Array.isArray(series) || series.length === 0) throw new Error(`${label} needs a series`);
  for (const item of series) checkSeriesItem(item, label);
}

function prepareSeries(series) {
  const max = Math.max(...series.map((item) => Number(item.value)));
  return series.map((item) => {
    const value = Number(item.value);
    const percent = max ? Math.round((value / max) * 1000) / 10 : 0;
    return { ...item, value, percent, peak: value === max && max > 0 };
  });
}

function prepareChart(chart) {
  if (!chart || !GROUP_ID.test(chart.id || "")) {
    throw new Error("each chart needs an id of lowercase letters, numbers, and hyphens");
  }
  if (!chart.title) throw new Error(`${chart.id} needs a title`);
  checkSeries(chart.series, chart.id);
  return { ...chart, series: prepareSeries(chart.series) };
}

function checkRow(row, columns) {
  if (row.group && !GROUP_ID.test(row.group)) {
    throw new Error("table group ids use lowercase letters, numbers, and hyphens");
  }
  for (const column of columns) {
    if (!column?.key || !column.label) throw new Error("each column needs a key and a label");
    if (!(column.key in row)) throw new Error(`a row is missing ${column.key}`);
  }
}

function prepareTable(table) {
  if (!table) return null;
  if (!Array.isArray(table.columns) || table.columns.length === 0) {
    throw new Error("table needs columns");
  }
  if (!Array.isArray(table.rows)) throw new Error("table needs rows");
  for (const row of table.rows) checkRow(row, table.columns);
  return table;
}

function filterIdOk(filter) {
  return filter?.id !== "all" && GROUP_ID.test(filter?.id || "") && Boolean(filter?.label);
}

function knownGroups(filters) {
  const ids = new Set();
  for (const filter of filters) {
    if (!filterIdOk(filter)) {
      throw new Error("each filter needs a label and a slug id other than all");
    }
    if (ids.has(filter.id)) throw new Error(`duplicate filter ${filter.id}`);
    ids.add(filter.id);
  }
  return ids;
}

function usesGroup(charts, table) {
  const chartGroup = charts.some((chart) => chart.series.some((item) => item.group));
  const rowGroup = (table?.rows || []).some((row) => row.group);
  return chartGroup || rowGroup;
}

function assertKnown(ids, group, label) {
  if (group && !ids.has(group)) throw new Error(`${label} uses an unknown group ${group}`);
}

function assertChartGroups(charts, ids) {
  for (const chart of charts) {
    for (const item of chart.series) assertKnown(ids, item.group, chart.id);
  }
}

function assertRowGroups(table, ids) {
  for (const row of table?.rows || []) assertKnown(ids, row.group, "table");
}

function requireGroups(charts, table, ids) {
  if (usesGroup(charts, table) && ids.size === 0) throw new Error("grouped data needs filters");
}

export function prepareInvestigation(data) {
  if (!data || typeof data !== "object") throw new Error("dataset must be an object");
  const charts = (data.charts || []).map(prepareChart);
  const table = prepareTable(data.table);
  if (charts.length === 0 && !table) throw new Error("dataset needs a chart or a table");
  const filters = Array.isArray(data.filters) ? data.filters : [];
  const ids = knownGroups(filters);
  requireGroups(charts, table, ids);
  assertChartGroups(charts, ids);
  assertRowGroups(table, ids);
  return { ...data, charts, table, filters };
}

export function loadInvestigationDataset(publicUrl, root = process.cwd()) {
  const relative = datasetFile(publicUrl);
  const full = path.resolve(root, relative);
  const allowed = path.resolve(root, "src/investigations");
  const inside = full === allowed || full.startsWith(`${allowed}${path.sep}`);
  if (!inside) throw new Error("dataset path leaves src/investigations");
  return prepareInvestigation(JSON.parse(readFileSync(full, "utf8")));
}

export function formatCell(value, format) {
  if (value == null || value === "") return "—";
  if (format === "dollars" || format === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (format === "dollars") {
      return new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD", maximumFractionDigits: 0
      }).format(number);
    }
    return new Intl.NumberFormat("en-US").format(number);
  }
  return String(value);
}
