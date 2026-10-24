import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import newsletter from "../src/_data/newsletter.js";
import {
  actionClearOfBar, barShouldShow, classifyEmail, CONFIGURED_NOTE, messageFor, MESSAGES,
  resolveSignup, safeFieldName, submitDecision, UNCONFIGURED_NOTE, VALUE_LINE
} from "../src/js/signup.js";

test("the value line is the morning-edition offer", () => {
  assert.equal(VALUE_LINE, "What matters in Austin, in your inbox each morning. Free.");
  assert.equal(newsletter.valueLine, VALUE_LINE);
});

test("newsletter data follows the endpoint slot and does not invent a provider", () => {
  const expected = resolveSignup(process.env.NEWSLETTER_ENDPOINT || "");
  assert.equal(newsletter.configured, expected.configured);
  assert.equal(newsletter.action, expected.action);
  assert.equal(newsletter.mode, expected.mode);
  assert.equal(newsletter.emailField, safeFieldName(process.env.NEWSLETTER_EMAIL_FIELD));
  assert.equal(newsletter.note, expected.configured ? CONFIGURED_NOTE : UNCONFIGURED_NOTE);
});

test("only a real http(s) or same-site path counts as an endpoint", () => {
  assert.deepEqual(resolveSignup(""), {
    configured: false, action: "/subscribe/", mode: "unavailable"
  });
  assert.equal(resolveSignup("   ").configured, false);
  assert.equal(resolveSignup("/subscribe/").configured, false);
  assert.equal(resolveSignup("/subscribe").configured, false);
  assert.equal(resolveSignup("//lists.example/join").configured, false);
  assert.equal(resolveSignup("javascript:alert(1)").configured, false);
  assert.equal(resolveSignup("data:text/html,hi").configured, false);
  assert.equal(resolveSignup("not a url").configured, false);
  assert.deepEqual(resolveSignup("/api/subscribe"), {
    configured: true, action: "/api/subscribe", mode: "fetch"
  });
  assert.deepEqual(resolveSignup("https://lists.example/join"), {
    configured: true, action: "https://lists.example/join", mode: "native"
  });
});

test("email field names stay a single token", () => {
  assert.equal(safeFieldName(undefined), "email");
  assert.equal(safeFieldName("email_address"), "email_address");
  assert.equal(safeFieldName("EMAIL"), "EMAIL");
  assert.equal(safeFieldName("a b"), "email");
  assert.equal(safeFieldName("email@home"), "email");
  assert.equal(safeFieldName("9field"), "email");
});

test("email checks trim and reject empty or shapeless values", () => {
  assert.equal(classifyEmail("  ").ok, false);
  assert.equal(classifyEmail("reader").reason, "invalid");
  assert.equal(classifyEmail("reader@example").reason, "invalid");
  assert.equal(classifyEmail(`${"a".repeat(250)}@b.co`).reason, "long");
  assert.deepEqual(classifyEmail("  Reader@Example.com "), {
    ok: true, email: "Reader@Example.com"
  });
});

test("submit stays on the page until a real endpoint can accept the address", () => {
  assert.deepEqual(submitDecision({ configured: false, mode: "unavailable", email: "a@b.co" }), {
    type: "unavailable", prevent: true
  });
  assert.equal(submitDecision({ configured: true, mode: "fetch", email: "nope" }).type, "invalid");
  const native = submitDecision({
    configured: true, mode: "native", email: "a@b.co"
  });
  assert.equal(native.prevent, false);
  assert.equal(native.email, "a@b.co");
  assert.equal(submitDecision({ configured: true, mode: "fetch", email: "a@b.co" }).type, "fetch");
});

test("status copy does not claim a subscription that did not happen", () => {
  assert.match(messageFor("unavailable"), /Nothing was sent/);
  assert.match(messageFor("error"), /not saved/);
  assert.doesNotMatch(MESSAGES.unavailable, /you're in|subscribed/i);
  assert.match(MESSAGES.success, /You're in/);
});

test("the mobile bar stays hidden after dismiss, after subscribe, and over the lead button", () => {
  const visible = {
    mobile: true, dismissed: false, subscribed: false, inlineInView: false, actionClear: true
  };
  assert.equal(barShouldShow(visible), true);
  assert.equal(barShouldShow({ ...visible, mobile: false }), false);
  assert.equal(barShouldShow({ ...visible, dismissed: true }), false);
  assert.equal(barShouldShow({ ...visible, subscribed: true }), false);
  assert.equal(barShouldShow({ ...visible, inlineInView: true }), false);
  assert.equal(barShouldShow({ ...visible, actionClear: false }), false);
});

test("the lead action blocks the bar only while it sits in the bar's band", () => {
  assert.equal(actionClearOfBar(null, 800), true);
  assert.equal(actionClearOfBar({ top: 700, bottom: 760 }, 800, 168), false);
  assert.equal(actionClearOfBar({ top: 400, bottom: 460 }, 800, 168), true);
  assert.equal(actionClearOfBar({ top: 900, bottom: 940 }, 800, 168), true);
});

test("the signup script does not nag, trap, or confirm a dismissal", () => {
  const source = readFileSync(new URL("../src/js/signup.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /confirm\(|are you sure|you'll miss|last chance|countdown/i);
  assert.match(source, /preventScroll:\s*true/);
  assert.match(source, /DISMISS_KEY/);
});
