// Kit's official embed is the morning-edition signup. The hosted form is
// the no-JavaScript path. Double opt-in stays on at Kit.
import { CONFIGURED_NOTE, contentSecurityPolicy, KIT_EMBED_SRC, KIT_FORM_URL,
  KIT_UID, VALUE_LINE } from "../js/signup.js";

export default {
  uid: KIT_UID,
  embedSrc: KIT_EMBED_SRC,
  formUrl: KIT_FORM_URL,
  valueLine: VALUE_LINE,
  note: CONFIGURED_NOTE,
  barNote: CONFIGURED_NOTE,
  csp: contentSecurityPolicy()
};
