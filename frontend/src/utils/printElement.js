/**
 * Prints one element on its own, cleanly.
 *
 * Printing the live page with "visibility: hidden" tricks keeps the app layout (sidebar, fixed-height
 * shell), so the document gets shifted right and cut off at the screen height. Instead, this copies the
 * element plus the page's stylesheets into a hidden iframe and prints that iframe.
 *
 * @param {HTMLElement} element  The element to print.
 * @param {object} [opts]
 * @param {string} [opts.title]        Document title (used as the default PDF file name).
 * @param {"portrait"|"landscape"} [opts.orientation="landscape"]
 * @param {string} [opts.margin="10mm"]
 * @param {"strip"|"keep"} [opts.frame="strip"]  "keep" preserves the element's own border/padding (certificates).
 */
export function printElement(element, { title = document.title, orientation = "landscape", margin = "10mm", frame = "strip" } = {}) {
  if (!element) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);

  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
    .map((node) => node.outerHTML)
    .join("\n");

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${String(title).replace(/</g, "&lt;")}</title>
${styles}
<style>
  @page { size: ${orientation}; margin: ${margin}; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; height: auto !important; overflow: visible !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Undo the live page's print tricks: everything in this document is meant to print. */
  body * { visibility: visible !important; }
  .print-root { width: 100%; }
  .print-root > * {
    position: static !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    min-height: 0 !important;
  }
  .print-root.strip > * {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    min-height: 0 !important;
  }
  /* Certificates: keep their own border/padding, but fill the page width and stay on one page. */
  .print-root.keep > * {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-root div { overflow: visible !important; max-height: none !important; }
  .no-print { display: none !important; }
  table { width: 100% !important; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr, .signatory-container { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body><div class="print-root ${frame === "keep" ? "keep" : "strip"}">${element.outerHTML}</div></body>
</html>`);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  const run = () => {
    const win = iframe.contentWindow;
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    // Fallback for browsers that do not fire afterprint on iframes.
    setTimeout(cleanup, 60_000);
  };

  // Let stylesheets, fonts and images (logos) load before printing.
  const ready = doc.fonts?.ready ?? Promise.resolve();
  Promise.all([
    ready,
    ...[...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
  ]).then(() => setTimeout(run, 150));
}
