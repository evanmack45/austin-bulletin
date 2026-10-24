// Kit's public form is the default list. NEWSLETTER_ENDPOINT overrides the
// URL. NEWSLETTER_EMAIL_FIELD overrides the field name (Kit uses email_address).
// A blank secret in deploy keeps this default. Double opt-in stays on at Kit.
import { CONFIGURED_NOTE, contentSecurityPolicy, KIT_ENDPOINT, KIT_FIELD,
  resolveSignup, safeFieldName, UNAVAILABLE_NOTE, VALUE_LINE } from "../js/signup.js";

const override = String(process.env.NEWSLETTER_ENDPOINT || "").trim();
const plan = resolveSignup(override || KIT_ENDPOINT);
const fieldSource = process.env.NEWSLETTER_EMAIL_FIELD || KIT_FIELD;

export default {
  configured: plan.configured,
  action: plan.action,
  mode: plan.mode,
  emailField: safeFieldName(fieldSource),
  valueLine: VALUE_LINE,
  note: plan.configured ? CONFIGURED_NOTE : UNAVAILABLE_NOTE,
  barNote: plan.configured ? CONFIGURED_NOTE : UNAVAILABLE_NOTE,
  csp: contentSecurityPolicy(plan.action)
};
