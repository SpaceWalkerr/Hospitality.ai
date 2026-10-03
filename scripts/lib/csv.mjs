/**
 * Minimal RFC 4180 CSV — enough for spreadsheets exported from Excel, Google
 * Sheets or LibreOffice: quoted fields, doubled quotes, commas and newlines
 * inside quotes, CRLF or LF line endings, an optional UTF-8 BOM. No
 * dependencies, so the data pipeline runs anywhere Node does.
 */

/** Parses CSV text into rows of string cells, each tagged with its line number. */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === "") { quoted = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") {
      row.push(cell);
      rows.push({ line: rowLine, cells: row });
      row = []; cell = ""; line++; rowLine = line;
      continue;
    }
    cell += ch;
  }
  if (quoted) throw new Error(`Unclosed quote starting on line ${rowLine}`);
  if (cell !== "" || row.length) { row.push(cell); rows.push({ line: rowLine, cells: row }); }

  // Drop rows that are entirely blank (trailing newlines, spacer rows).
  return rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
}

/** Rows as objects keyed by the header row, with the source line kept. */
export function readTable(text) {
  const [head, ...body] = parseCsv(text);
  if (!head) return { columns: [], records: [] };
  const columns = head.cells.map((c) => c.trim());
  const records = body.map(({ line, cells }) => {
    const rec = { __line: line };
    columns.forEach((c, i) => { rec[c] = (cells[i] ?? "").trim(); });
    if (cells.length > columns.length) rec.__extra = cells.length - columns.length;
    return rec;
  });
  return { columns, records };
}

function quote(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialises objects to CSV in the given column order. */
export function writeTable(columns, records) {
  return [columns.join(","), ...records.map((r) => columns.map((c) => quote(r[c])).join(","))].join("\n") + "\n";
}
