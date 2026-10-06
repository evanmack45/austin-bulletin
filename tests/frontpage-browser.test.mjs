import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const chrome = [
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
].find((executable) => existsSync(executable));

async function serveBuiltSite() {
	const root = path.resolve("_site");
	const server = createServer((request, response) => {
		const pathname = new URL(request.url, "http://localhost").pathname;
		const file = path.join(root, pathname.endsWith("/") ? pathname + "index.html" : pathname);
		if (!file.startsWith(root + path.sep)) {
			response.writeHead(404).end();
			return;
		}
		try {
			const type = file.endsWith(".css")
				? "text/css"
				: file.endsWith(".png")
					? "image/png"
					: file.endsWith(".html")
						? "text/html"
						: "application/octet-stream";
			response.writeHead(200, { "Content-Type": type }).end(readFileSync(file));
		} catch {
			response.writeHead(404).end();
		}
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	return server;
}

async function measureFirstFold(page) {
	return page.evaluate(() => {
		const rect = (selector) => {
			const element = document.querySelector(selector);
			const box = element?.getBoundingClientRect();
			if (!box) return null;
			return {
				top: box.top,
				bottom: box.bottom,
				width: box.width,
				height: box.height,
				outerHeight: box.height + parseFloat(getComputedStyle(element).marginBottom),
			};
		};
		return {
			viewport: innerHeight,
			neutral: document.querySelector(".edited-front").dataset.neutral === "true",
			actionHref: document.querySelector(".front-lead .front-action").getAttribute("href"),
			documentWidth: document.documentElement.scrollWidth,
			header: rect(".front-masthead"),
			warning: rect(".front-weather-warning"),
			lead: rect("h1"),
			action: rect(".front-lead .front-action"),
			source: rect(".front-lead .front-sources"),
			access: rect(".front-access h2 a"),
			photo: rect(".front-access .story-photo img"),
            art: rect(".cover-art img"),
			h1s: document.querySelectorAll("h1").length,
			fonts: [...document.fonts]
				.filter((font) => font.status === "loaded")
				.map((font) => font.family),
			sourceName: document.querySelector(".front-lead .front-sources")?.textContent ?? "",
			nav: [...document.querySelectorAll(".front-masthead nav a")]
                .filter(link => link.getBoundingClientRect().height > 0).map((link) => ({
				label: link.textContent,
				href: link.getAttribute("href"),
				height: link.getBoundingClientRect().height,
			})),
			title: document.querySelector("h1").textContent,
			actionColor: getComputedStyle(document.querySelector(".front-action")).color,
			actionBg: getComputedStyle(document.querySelector(".front-action")).backgroundColor,
		};
	});
}

function assertMobileCover(result, height) {
 assert.ok(result.header.height <= 140, JSON.stringify(result));
 assert.ok(result.action.bottom <= height, JSON.stringify(result));
 if (result.art) assert.ok(result.art.height >= 200 && result.art.height <= 210);
}

function assertFirstFold(result, width, height) {
 assert.equal(result.h1s, 1);
 assert.ok(result.documentWidth <= width, JSON.stringify(result));
 assert.ok(result.fonts.some(font => font.includes("Bricolage")), "local display font loads");
 assert.ok(result.fonts.some(font => font.includes("Hanken")), "local body font loads");
 assert.ok(result.lead.width > 200);
 assert.ok(result.action.height >= 44);
 assert.ok(result.nav.every(link => link.height >= 44));
 if (!result.neutral) assert.ok(result.sourceName.trim(), "factual leads need attribution");
 if (width === 390 && !result.warning) assertMobileCover(result, height);
 if (width >= 1400 && !result.warning) {
  for (const key of ["lead", "action", "source"]) {
   assert.ok(result[key].bottom <= height, `${key}: ${JSON.stringify(result)}`);
  }
 }
 assert.equal(result.actionColor, "rgb(243, 239, 229)");
 assert.equal(result.actionBg, "rgb(22, 51, 43)");
}

async function reachByKeyboard(page, targets) {
	for (const target of targets) {
		let reached = false;
		for (let tab = 0; tab < 20; tab++) {
			await page.keyboard.press("Tab");
			reached = await page.evaluate(
				(href) => document.activeElement?.getAttribute("href") === href,
				target,
			);
			if (reached) break;
		}
		assert.ok(reached, `keyboard cannot reach ${target}`);
	}
}

test("edited homepage keeps the selected lead and action visible with real fonts", {
	skip: !chrome && "an installed Chromium is required for layout regression",
}, async () => {
	const server = await serveBuiltSite();
	const browser = await puppeteer.launch({
		executablePath: chrome,
		headless: true,
		args: process.platform === "linux" ? ["--no-sandbox"] : [],
	});
	try {
		for (const [width, height] of [
			[1440, 900],
			[1165, 747],
			[390, 844],
			[360, 800],
			[320, 800],
		]) {
			const page = await browser.newPage();
			await page.setViewport({ width, height });
			await page.setJavaScriptEnabled(false);
			await page.goto(`http://127.0.0.1:${server.address().port}/`, {
				waitUntil: "networkidle0",
			});
			await page.evaluate(() => document.fonts.ready);
			const result = await measureFirstFold(page);
			assertFirstFold(result, width, height);
			const targets = [...result.nav.map((link) => link.href), result.actionHref];
			await reachByKeyboard(page, targets);
			if (!result.warning) {
				await page.evaluate(() => {
					const warning = document.createElement("aside");
					warning.className = "front-weather-warning";
					warning.innerHTML =
						"<h2>NWS alerts in the dated forecast</h2>" +
						"<p>Flood Watch until Sunday evening</p>" +
						'<p class="front-asof">Gathered with this edition. ' +
						'<a href="https://www.weather.gov/ewx/">Check current NWS notices</a>.</p>';
					document.querySelector(".edited-front").prepend(warning);
				});
				const withWarning = await measureFirstFold(page);
				assert.ok(withWarning.warning, "populated warning case must render");
				assertFirstFold(withWarning, width, height);
			}
			await page.close();
		}
	} finally {
		await browser.close();
		await new Promise((resolve) => server.close(resolve));
	}
});

test("guide action fragments reach the answer by keyboard without JavaScript", {
	skip: !chrome && "an installed Chromium is required for browser regression",
}, async () => {
	const server = await serveBuiltSite();
	const browser = await puppeteer.launch({
		executablePath: chrome,
		headless: true,
		args: process.platform === "linux" ? ["--no-sandbox"] : [],
	});
	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 390, height: 844 });
		await page.setJavaScriptEnabled(false);
		const home = `http://127.0.0.1:${server.address().port}/`;
		await page.goto(home, { waitUntil: "networkidle0" });
		const actions = await page.evaluate(() =>
			[...document.querySelectorAll(".front-lead .front-action, .front-access .front-action")]
				.map((link) => link.getAttribute("href"))
				.filter((href) => href.startsWith("/") && href.includes("#")),
		);
		for (const target of actions) {
			await page.goto(home, { waitUntil: "networkidle0" });
			await reachByKeyboard(page, [target]);
			// Register before activation so the focus check targets the new document.
			await Promise.all([
				page.waitForNavigation({ waitUntil: "networkidle0" }),
				page.keyboard.press("Enter"),
			]);
			await page.waitForFunction(
				(expected) => {
					const heading = document.getElementById(expected.split("#")[1]);
					return location.pathname + location.hash === expected &&
						document.readyState === "complete" && document.activeElement === heading;
				},
				{},
				target,
			);
			const result = await page.evaluate((fragment) => {
				const heading = document.getElementById(fragment);
				const box = heading?.getBoundingClientRect();
				return {
					found: !!heading,
					text: heading?.textContent,
					top: box?.top,
					bottom: box?.bottom,
					focused: document.activeElement === heading,
				};
			}, target.split("#")[1]);
			assert.ok(result.found && result.focused, JSON.stringify(result));
			// Fragment scrolling rounds fractional heading offsets to whole CSS pixels.
			assert.ok(result.top >= -1 && result.bottom <= 844, JSON.stringify(result));
			await page.keyboard.press("Tab");
			const answerLink = await page.evaluate(() =>
				document.activeElement?.getAttribute("href"),
			);
			assert.match(answerLink, /^https:\/\//, "next Tab reaches a source within the answer");
		}
		const accessTitle = await page.goto(home, { waitUntil: "networkidle0" });
		assert.ok(accessTitle.ok());
		assert.equal(
			await page.$eval(".front-access h2 a", (link) => link.getAttribute("href")),
			"/zilker-park-access/",
		);
	} finally {
		await browser.close();
		await new Promise((resolve) => server.close(resolve));
	}
});

test("dated edition navigation stays within a 320px viewport", {
	skip: !chrome && "an installed Chromium is required for browser regression",
}, async () => {
	const edition = readFileSync("_site/index.html", "utf8")
		.match(/href="(\/\d{4}\/\d{2}\/\d{2}\/)/)?.[1];
	assert.ok(edition, "the homepage links to its dated edition");
	const server = await serveBuiltSite();
	const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
		args: process.platform === "linux" ? ["--no-sandbox"] : [] });
	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 320, height: 800 });
		await page.setJavaScriptEnabled(false);
		await page.goto(`http://127.0.0.1:${server.address().port}${edition}`, {
			waitUntil: "networkidle0",
		});
		await page.evaluate(() => document.fonts.ready);
		const links = await page.evaluate(() => [...document.querySelectorAll(".folio-nav a")]
			.map(link => ({ text: link.textContent, href: link.getAttribute("href"),
				left: link.getBoundingClientRect().left,
				right: link.getBoundingClientRect().right })));
		assert.ok(links.length >= 4);
		for (const link of links) {
			assert.ok(link.left >= 0 && link.right <= 320, JSON.stringify(link));
		}
		await reachByKeyboard(page, links.map(link => link.href));
	} finally {
		await browser.close();
		await new Promise(resolve => server.close(resolve));
	}
});


test("previous edition is direct keyboard navigation independent of optional comparison", {
  skip: !chrome && "an installed Chromium is required for browser regression",
}, async () => {
  const dates = readdirSync("src/bulletins").filter(name => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .sort().reverse();
  const prior = dates[1]?.slice(0, 10);
  if (!prior) return;
  const href = `/${prior.replaceAll("-", "/")}/`;
  const server = await serveBuiltSite();
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : [] });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 320, height: 800 });
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle0" });
    const link = await page.$eval(".front-masthead p a", element => ({
      href: element.getAttribute("href"), text: element.textContent,
      context: element.parentElement.textContent,
    }));
    assert.equal(link.href, href);
    assert.ok(link.context.includes("Previous edition:"));
    assert.ok(!link.context.includes("Since"), "ordinary dateline makes no change claim");
    await reachByKeyboard(page, [href]);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.keyboard.press("Enter")]);
    assert.equal(new URL(page.url()).pathname, href);
    assert.ok((await page.content()).includes(prior.split("-")[2].replace(/^0/, "")));
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
});
