/* Plausible analytics queue shim (moved out of index.html so the Content-
 * Security-Policy can forbid inline scripts entirely). Queues events until the
 * async plausible script loads. Sends only event names + non-PII props. */
window.plausible = window.plausible || function () { (plausible.q = plausible.q || []).push(arguments); };
plausible.init = plausible.init || function (i) { plausible.o = i || {}; };
plausible.init();
