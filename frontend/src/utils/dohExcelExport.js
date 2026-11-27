import * as XLSX from "xlsx";

/**
 * Builds one organized worksheet from a rendered DOH report (the #report-table element):
 *   facility letterhead → form title / period → each section caption + its table → signatories.
 * Merged header cells (colSpan/rowSpan) are kept, indented rows stay indented, numbers are real
 * numbers, and column widths are sized to the content so labels are not cut off.
 */

const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();

function cellValue(text) {
  const t = clean(text);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

// Indentation from the inline padding the on-screen form uses (24px ≈ one level).
function indentPrefix(td) {
  const pad = parseInt(td.style?.paddingLeft || "0", 10);
  if (!pad) return "";
  return "    ".repeat(Math.max(1, Math.round(pad / 20)));
}

/** Converts an HTML table into a 2-D array plus merge ranges (relative to the table's top-left). */
function tableToGrid(table) {
  const grid = [];
  const merges = [];
  const rows = [...table.rows];
  rows.forEach((tr, r) => {
    grid[r] = grid[r] || [];
    let c = 0;
    [...tr.cells].forEach((cell, idx) => {
      while (grid[r][c] !== undefined) c++;
      const colSpan = Math.max(1, cell.colSpan || 1);
      const rowSpan = Math.max(1, cell.rowSpan || 1);
      const prefix = idx === 0 ? indentPrefix(cell) : "";
      const v = cellValue(cell.textContent);
      grid[r][c] = typeof v === "string" && prefix ? prefix + v : v;
      for (let rr = 0; rr < rowSpan; rr++) {
        grid[r + rr] = grid[r + rr] || [];
        for (let cc = 0; cc < colSpan; cc++) {
          if (rr === 0 && cc === 0) continue;
          grid[r + rr][c + cc] = "";
        }
      }
      if (colSpan > 1 || rowSpan > 1) {
        merges.push({ s: { r, c }, e: { r: r + rowSpan - 1, c: c + colSpan - 1 } });
      }
      c += colSpan;
    });
  });
  const width = Math.max(0, ...grid.map((row) => row.length));
  return { grid: grid.map((row) => Array.from({ length: width }, (_, i) => (row[i] === undefined ? "" : row[i]))), merges, width };
}

export function exportDohReportToExcel(root, { fileName, sheetName = "DOH Report" } = {}) {
  if (!root) return false;
  const tables = [...root.querySelectorAll("table")];
  if (!tables.length) return false;

  const converted = tables.map((t) => ({ table: t, ...tableToGrid(t) }));
  const totalCols = Math.max(4, ...converted.map((t) => t.width));

  const aoa = [];
  const merges = [];
  const fullRow = (text) => {
    const r = aoa.length;
    aoa.push([text, ...Array(totalCols - 1).fill("")]);
    if (totalCols > 1) merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
  };
  const blank = () => aoa.push(Array(totalCols).fill(""));
  const text = (sel) => clean(root.querySelector(sel)?.textContent);

  // 1. Letterhead and form identification
  [".republic-text", ".doh-text", ".facility-title", ".facility-sub"].forEach((sel) => {
    const t = text(sel);
    if (t) fullRow(sel === ".facility-title" || sel === ".republic-text" ? t.toUpperCase() : t);
  });
  blank();
  [".form-heading", ".form-subheading", ".form-period"].forEach((sel) => {
    const t = text(sel);
    if (t) fullRow(t);
  });
  blank();

  // 2. Each table, preceded by its section caption ("A. OUTPATIENT SERVICE", …)
  converted.forEach(({ table, grid, merges: tMerges }, i) => {
    const section = table.closest(".report-section");
    const captionEl = section?.querySelector(".table-caption");
    const caption = captionEl
      ? clean(captionEl.querySelector("span")?.textContent || captionEl.textContent)
      : "";
    if (caption) fullRow(caption.toUpperCase());

    const startRow = aoa.length;
    grid.forEach((row) => aoa.push([...row, ...Array(totalCols - row.length).fill("")]));
    tMerges.forEach((m) => merges.push({ s: { r: m.s.r + startRow, c: m.s.c }, e: { r: m.e.r + startRow, c: m.e.c } }));
    if (i < converted.length - 1) blank();
  });

  // 3. Signatories, stacked in the wide first column so names are never cut off by narrow number columns
  const sigCols = [...root.querySelectorAll(".signatory-col")];
  if (sigCols.length) {
    const one = (v) => aoa.push([v, ...Array(totalCols - 1).fill("")]);
    blank();
    sigCols.forEach((col) => {
      blank();
      one(clean(col.querySelector(".signatory-label")?.textContent));
      blank();
      one("________________________________________");
      one(clean(col.querySelector(".signatory-name")?.textContent));
      one(clean(col.querySelector(".signatory-role")?.textContent));
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;

  // Column widths: first column fits the longest row label; numeric columns stay compact.
  // Text that spans several merged columns (titles, captions) is ignored when sizing.
  const mergedStarts = new Set(merges.filter((m) => m.e.c > m.s.c).map((m) => `${m.s.r}:${m.s.c}`));
  const widths = Array(totalCols).fill(8);
  aoa.forEach((row, r) => row.forEach((v, c) => {
    if (v === "" || mergedStarts.has(`${r}:${c}`)) return;
    widths[c] = Math.max(widths[c], String(v).length + 2);
  }));
  // Merged table headers (e.g. "Separated/Annulled" over M | F): widen the spanned columns until the
  // header fits. Full-width title rows are skipped, they have the whole sheet width anyway.
  merges.forEach((m) => {
    const span = m.e.c - m.s.c + 1;
    if (span <= 1 || span >= totalCols) return;
    const need = String(aoa[m.s.r]?.[m.s.c] ?? "").length + 2;
    let have = 0;
    for (let c = m.s.c; c <= m.e.c; c++) have += widths[c];
    if (have >= need) return;
    const extra = Math.ceil((need - have) / span);
    for (let c = m.s.c; c <= m.e.c; c++) widths[c] += extra;
  });
  ws["!cols"] = widths.map((w, c) => ({ wch: Math.min(c === 0 ? 70 : 34, w) }));
  ws["!margins"] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName || "MTRC_DOH_Report.xlsx");
  return true;
}
