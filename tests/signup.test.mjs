import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import newsletter from "../src/_data/newsletter.js";
import {
  actionClearOfBar, barShouldShow, CONFIGURED_NOTE, contentSecurityPolicy,
  KIT_EMBED_SRC, KIT_FORM_ID, KIT_FORM_URL, KIT_ORIGIN, KIT_UID, VALUE_LINE
} from "../src/js/signup.js";

test("the value line is the morning-edition offer", () => {
  assert.equal(VALUE_LINE, "Austin's news in 5 minutes, every morning");
  assert.equal(newsletter.valueLine, VALUE_LINE);
  assert.equal(newsletter.note, CONFIGURED_NOTE);
  assert.equal(newsletter.barNote, CONFIGURED_NOTE);
});

test("the signup data points at Kit's official embed", () => {
  assert.equal(newsletter.uid, KIT_UID);
  assert.equal(newsletter.formId, KIT_FORM_ID);
  assert.equal(newsletter.action, "https://app.kit.com/forms/10083630/subscriptions");
  assert.equal(newsletter.embedSrc, KIT_EMBED_SRC);
  assert.equal(newsletter.formUrl, KIT_FORM_URL);
  assert.equal(KIT_UID, "e956043af1");
  assert.equal(KIT_FORM_ID, "10083630");
  assert.equal(KIT_EMBED_SRC, "https://the-austin-bulletin.kit.com/e956043af1/index.js");
  assert.equal(KIT_FORM_URL, "https://the-austin-bulletin.kit.com/e956043af1");
  assert.equal(newsletter.csp, contentSecurityPolicy());
});

test("the content security policy allows Kit, its assets, fonts, and analytics", () => {
  const policy = contentSecurityPolicy();
  assert.match(policy, /script-src[^;]*https:\/\/the-austin-bulletin\.kit\.com/);
  assert.match(policy, /script-src[^;]*https:\/\/app\.kit\.com/);
  assert.match(policy, /script-src[^;]*https:\/\/f\.convertkit\.com/);
  assert.match(policy, /script-src[^;]*https:\/\/static\.cloudflareinsights\.com/);
  assert.match(policy, /connect-src[^;]*https:\/\/app\.kit\.com/);
  assert.match(policy, /connect-src[^;]*https:\/\/the-austin-bulletin\.kit\.com/);
  assert.match(policy, /connect-src[^;]*https:\/\/pages\.convertkit\.com/);
  assert.match(policy, /form-action[^;]*https:\/\/app\.kit\.com/);
  assert.match(policy, /img-src[^;]*https:\/\/pages\.convertkit\.com/);
  assert.match(policy, /img-src[^;]*data:/);
  assert.match(policy, /style-src[^;]*'unsafe-inline'/);
  assert.match(policy, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(policy, /https:\/\/fonts\.googleapis\.com/);
  assert.equal(policy.includes(KIT_ORIGIN), true);
});

test("the mobile bar stays hidden after dismiss, over the lead, and off a phone", () => {
  const visible = {
    mobile: true, dismissed: false, inlineInView: false, actionClear: true
  };
  assert.equal(barShouldShow(visible), true);
  assert.equal(barShouldShow({ ...visible, mobile: false }), false);
  assert.equal(barShouldShow({ ...visible, dismissed: true }), false);
  assert.equal(barShouldShow({ ...visible, inlineInView: true }), false);
  assert.equal(barShouldShow({ ...visible, actionClear: false }), false);
});

test("the lead action blocks the bar only while it sits in the bar's band", () => {
  assert.equal(actionClearOfBar(null, 800), true);
  assert.equal(actionClearOfBar({ top: 700, bottom: 760 }, 800, 300), false);
  assert.equal(actionClearOfBar({ top: 400, bottom: 460 }, 800, 300), true);
  assert.equal(actionClearOfBar({ top: 900, bottom: 940 }, 800, 300), true);
});

test("the signup button is Bulletin red and the beach photo is hidden", () => {
  const css = readFileSync(new URL("../src/css/style.css", import.meta.url), "utf8");
  const hidden = new RegExp(
    "\\.signup \\.formkit-background,\\s*"
    + "\\.signup \\.formkit-header \\{ display: none !important; \\}"
  );
  const button = new RegExp(
    "\\.signup \\.formkit-submit \\{\\s*background-color: var\\(--accent\\) !important;\\s*"
    + "color: #fff !important;\\s*\\}"
  );
  const field = /\.signup-email\s*\{[^}]*min-height:\s*44px;/;
  const ownButton = new RegExp(
    "\\.signup-form button\\[type=\"submit\"\\]\\s*\\{[^}]*"
    + "background:\\s*var\\(--accent\\);[^}]*color:\\s*#fff;"
  );
  assert.match(css, hidden);
  assert.match(css, button);
  assert.match(css, field);
  assert.match(css, ownButton);
});

test("the signup script does not post an address or nag", () => {
  const source = readFileSync(new URL("../src/js/signup.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /confirm\(|are you sure|you'll miss|last chance|countdown/i);
  assert.doesNotMatch(source, /not saved|No signup|does not save/i);
  assert.doesNotMatch(source, /subscriptions/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.match(source, /preventScroll:\s*true/);
  assert.match(source, /DISMISS_KEY/);
  assert.match(source, /KIT_EMBED_SRC/);
});
