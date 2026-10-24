import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import newsletter from "../src/_data/newsletter.js";
import {
  actionClearOfBar, barShouldShow, classifyEmail, CONFIGURED_NOTE,
  contentSecurityPolicy, deliverSignup, KIT_ENDPOINT, KIT_FIELD, messageFor, MESSAGES,
  resolveSignup, safeFieldName, submitDecision, VALUE_LINE
} from "../src/js/signup.js";

const SUCCESS = "Almost done — check your inbox to confirm.";

test("the value line is the morning-edition offer", () => {
  assert.equal(VALUE_LINE, "What matters in Austin, in your inbox each morning. Free.");
  assert.equal(newsletter.valueLine, VALUE_LINE);
});

test("a blank endpoint slot uses the public Kit form", () => {
  const override = String(process.env.NEWSLETTER_ENDPOINT || "").trim();
  const expected = resolveSignup(override || KIT_ENDPOINT);
  const field = process.env.NEWSLETTER_EMAIL_FIELD || KIT_FIELD;
  assert.equal(newsletter.configured, expected.configured);
  assert.equal(newsletter.action, expected.action);
  assert.equal(newsletter.mode, "fetch");
  assert.equal(newsletter.emailField, safeFieldName(field));
  assert.equal(newsletter.note, expected.configured ? CONFIGURED_NOTE : newsletter.note);
  if (!override) {
    assert.equal(newsletter.action, KIT_ENDPOINT);
    assert.equal(newsletter.emailField, KIT_FIELD);
    assert.equal(newsletter.configured, true);
  }
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
  assert.deepEqual(resolveSignup(KIT_ENDPOINT), {
    configured: true, action: KIT_ENDPOINT, mode: "fetch"
  });
});

test("email field names stay a single token and default to Kit's field", () => {
  assert.equal(safeFieldName(undefined), KIT_FIELD);
  assert.equal(safeFieldName("email_address"), "email_address");
  assert.equal(safeFieldName("EMAIL"), "EMAIL");
  assert.equal(safeFieldName("a b"), KIT_FIELD);
  assert.equal(safeFieldName("email@home"), KIT_FIELD);
  assert.equal(safeFieldName("9field"), KIT_FIELD);
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

test("a configured submit stays on the page and posts with fetch", () => {
  assert.deepEqual(submitDecision({ configured: false, mode: "unavailable", email: "a@b.co" }), {
    type: "unavailable", prevent: true
  });
  assert.equal(submitDecision({ configured: true, mode: "fetch", email: "nope" }).type, "invalid");
  const posted = submitDecision({ configured: true, mode: "fetch", email: "a@b.co" });
  assert.equal(posted.type, "fetch");
  assert.equal(posted.prevent, true);
  assert.equal(posted.email, "a@b.co");
});

test("status copy asks the reader to confirm and never claims a saved address", () => {
  assert.equal(messageFor("success"), SUCCESS);
  assert.match(messageFor("error"), /Please try again/);
  assert.match(messageFor("unavailable"), /Please try again/);
  assert.doesNotMatch(JSON.stringify(MESSAGES), /not saved|No signup|You're in|Nothing was sent/i);
});

test("deliverSignup posts form-encoded email_address through the injected fetch", async () => {
  const calls = [];
  const body = new URLSearchParams({ email_address: "reader@example.com" });
  const ok = await deliverSignup({
    action: KIT_ENDPOINT,
    body,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true };
    }
  });
  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, KIT_ENDPOINT);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.equal(String(calls[0].options.body), "email_address=reader%40example.com");
});

test("a failed or thrown Kit response is not treated as success", async () => {
  const failed = await deliverSignup({
    action: KIT_ENDPOINT,
    body: "email_address=reader%40example.com",
    fetchImpl: async () => ({ ok: false })
  });
  const thrown = await deliverSignup({
    action: KIT_ENDPOINT,
    body: "email_address=reader%40example.com",
    fetchImpl: async () => {
      throw new Error("offline");
    }
  });
  assert.equal(failed, false);
  assert.equal(thrown, false);
});

test("the content security policy allows Kit and keeps fonts and analytics", () => {
  const policy = contentSecurityPolicy(KIT_ENDPOINT);
  assert.match(policy, /connect-src[^;]*https:\/\/app\.kit\.com/);
  assert.match(policy, /form-action[^;]*https:\/\/app\.kit\.com/);
  assert.match(policy, /https:\/\/cloudflareinsights\.com/);
  assert.match(policy, /https:\/\/fonts\.googleapis\.com/);
  assert.equal(policy.split("https://app.kit.com").length - 1, 2);
  const overridden = contentSecurityPolicy("https://lists.example/join");
  assert.match(overridden, /https:\/\/lists\.example/);
  assert.doesNotMatch(contentSecurityPolicy("javascript:alert(1)"), /javascript/);
  assert.equal(newsletter.csp, contentSecurityPolicy(newsletter.action));
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
  assert.doesNotMatch(source, /not saved|No signup|does not save/i);
  assert.match(source, /credentials:\s*"omit"/);
  assert.match(source, /preventScroll:\s*true/);
  assert.match(source, /DISMISS_KEY/);
});
