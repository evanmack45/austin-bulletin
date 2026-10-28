// The morning-edition signup posts to Kit's form. The same ids drive the
// hosted page. Double opt-in stays on at Kit.
import { CONFIGURED_NOTE, contentSecurityPolicy, KIT_EMBED_SRC, KIT_FORM_ID,
  KIT_FORM_URL, KIT_UID, VALUE_LINE } from "../js/signup.js";

export default {
  uid: KIT_UID,
  formId: KIT_FORM_ID,
  action: `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`,
  embedSrc: KIT_EMBED_SRC,
  formUrl: KIT_FORM_URL,
  valueLine: VALUE_LINE,
  note: CONFIGURED_NOTE,
  barNote: CONFIGURED_NOTE,
  csp: contentSecurityPolicy()
};
