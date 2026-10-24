// Build-time slot for a mail-list endpoint. No provider is wired in this
// repo. Set NEWSLETTER_ENDPOINT to a URL that accepts POST field `email`
// (or NEWSLETTER_EMAIL_FIELD) and returns 2xx only after the address is saved.
// Leave it unset and the forms stay honest: nothing is stored.
import { CONFIGURED_NOTE, resolveSignup, safeFieldName, UNCONFIGURED_BAR_NOTE,
  UNCONFIGURED_NOTE, VALUE_LINE } from "../js/signup.js";

const plan = resolveSignup(process.env.NEWSLETTER_ENDPOINT || "");

export default {
  configured: plan.configured,
  action: plan.action,
  mode: plan.mode,
  emailField: safeFieldName(process.env.NEWSLETTER_EMAIL_FIELD),
  valueLine: VALUE_LINE,
  note: plan.configured ? CONFIGURED_NOTE : UNCONFIGURED_NOTE,
  barNote: plan.configured ? CONFIGURED_NOTE : UNCONFIGURED_BAR_NOTE
};
