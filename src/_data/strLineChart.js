import { readFileSync } from "node:fs";
import { lineChartHtml } from "./str-line-chart.mjs";

const csv = readFileSync(new URL("./charts/str-daily-total.csv", import.meta.url), "utf8");

export default lineChartHtml(csv);
