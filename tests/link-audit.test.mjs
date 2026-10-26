import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLink, externalLink, externalLinksIn } from "../scripts/link-audit.mjs";

const page = "https://theaustinbulletin.com/2026/10/26/";

test("2xx and 3xx finals are OK", () => {
  assert.equal(classifyLink({ status: 200 }).kind, "OK");
  assert.equal(classifyLink({ status: 204 }).kind, "OK");
  assert.equal(classifyLink({ status: 301 }).kind, "OK");
  assert.equal(classifyLink({ status: 302 }).kind, "OK");
  assert.equal(classifyLink({ status: 308 }).kind, "OK");
  assert.equal(classifyLink({ status: 200 }).status, "200");
});

test("404, 410, and DNS failure are BROKEN", () => {
  assert.equal(classifyLink({ status: 404 }).kind, "BROKEN");
  assert.equal(classifyLink({ status: 410 }).kind, "BROKEN");
  assert.equal(classifyLink({ status: 410 }).status, "410");
  assert.deepEqual(classifyLink({ status: null, code: "ENOTFOUND" }), {
    kind: "BROKEN",
    status: "DNS"
  });
  assert.equal(classifyLink({ code: "EAI_AGAIN" }).kind, "BROKEN");
  assert.equal(classifyLink({ code: "ENODATA" }).status, "DNS");
});

test("401, 403, and 429 are BLOCKED, including bot walls", () => {
  assert.equal(classifyLink({ status: 401 }).kind, "BLOCKED");
  assert.equal(classifyLink({ status: 403 }).kind, "BLOCKED");
  assert.equal(classifyLink({ status: 403 }).status, "403");
  assert.equal(classifyLink({ status: 429 }).kind, "BLOCKED");
});

test("timeouts, 5xx, and other failures are ERROR", () => {
  assert.deepEqual(classifyLink({ status: null, code: "AbortError" }), {
    kind: "ERROR",
    status: "timeout"
  });
  assert.equal(classifyLink({ code: "ETIMEDOUT" }).kind, "ERROR");
  assert.equal(classifyLink({ code: "UND_ERR_CONNECT_TIMEOUT" }).status, "timeout");
  assert.equal(classifyLink({ status: 500 }).kind, "ERROR");
  assert.equal(classifyLink({ status: 503 }).kind, "ERROR");
  assert.equal(classifyLink({ status: 500 }).status, "500");
  assert.equal(classifyLink({ status: 400 }).kind, "ERROR");
  assert.equal(classifyLink({ status: 418 }).kind, "ERROR");
  assert.equal(classifyLink({ code: "ECONNREFUSED" }).kind, "ERROR");
  assert.equal(classifyLink({ code: "ECONNREFUSED" }).status, "ECONNREFUSED");
  assert.equal(classifyLink({}).kind, "ERROR");
  assert.equal(classifyLink({}).status, "error");
});

test("outbound links skip the publication, mailto, and fragments", () => {
  const html = [
    '<a href="/archive/">Archive</a>',
    '<a href="https://theaustinbulletin.com/about/">About</a>',
    '<a href="mailto:contact@theaustinbulletin.com">Mail</a>',
    '<a href="https://www.kvue.com/article/story">KVUE</a>',
    '<a href="https://www.kvue.com/article/story#video">KVUE again</a>',
    '<a href="https://example.com/a?b=1&amp;c=2">Example</a>',
    "<script>var x = '<a href=\"https://ignored.example/no\">no</a>';</script>"
  ].join("\n");
  assert.deepEqual(externalLinksIn(html, page), [
    "https://www.kvue.com/article/story",
    "https://example.com/a?b=1&c=2"
  ]);
  assert.equal(externalLink("https://www.theaustinbulletin.com/feed.xml", page), null);
  assert.equal(externalLink("https://yallcityhall.org/", page), "https://yallcityhall.org/");
});
