import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

/** Two text items belong to the same line if their baselines are this close. */
const LINE_TOLERANCE_PT = 2.2;

/** Horizontal gap wide enough to be a deliberate column break, in points. */
const COLUMN_GAP_PT = 12;

type TextItem = { str: string; transform: number[]; width: number };

/**
 * PDF text extraction.
 *
 * Runs server-side so no parser ships to the browser, and so an uploaded
 * document never leaves the request that carried it.
 *
 * Text is rebuilt line by line from glyph positions rather than taken as a
 * flat string. This matters more here than it would elsewhere: every coverage
 * claim in this app cites a line range in the source document, so a PDF that
 * collapses into one giant paragraph would leave every citation pointing at
 * "line 1" and make the whole traceability story worthless.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 12 MB. Try a smaller PDF." },
      { status: 413 },
    );
  }

  try {
    const { getDocumentProxy } = await import("unpdf");
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);

    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(
        linesFromTextItems(content.items as unknown as TextItem[]).join("\n"),
      );
    }

    const clean = pages
      .join("\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (clean.length < 200) {
      return NextResponse.json(
        {
          error:
            "We could not read any text from that PDF. It may be a scan — try pasting the text instead.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text: clean,
      pages: pdf.numPages,
      name: file.name,
    });
  } catch {
    return NextResponse.json(
      { error: "That PDF could not be opened. Try pasting the text instead." },
      { status: 422 },
    );
  }
}

/**
 * Groups positioned glyph runs back into visual lines.
 *
 * Items arrive in content-stream order, which is not reading order, so they are
 * bucketed by baseline (transform[5]) and then sorted left to right.
 */
function linesFromTextItems(items: TextItem[]): string[] {
  const rows: { y: number; items: TextItem[] }[] = [];

  for (const item of items) {
    if (!item?.str || !item.transform) continue;
    if (!item.str.trim()) continue;

    const y = item.transform[5];
    const row = rows.find((r) => Math.abs(r.y - y) <= LINE_TOLERANCE_PT);
    if (row) {
      row.items.push(item);
      // Keep the bucket anchored to its first baseline rather than drifting.
    } else {
      rows.push({ y, items: [item] });
    }
  }

  rows.sort((a, b) => b.y - a.y); // PDF origin is bottom-left

  return rows.map((row) => {
    const sorted = row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    let line = "";
    let cursorEnd: number | null = null;

    for (const item of sorted) {
      const x = item.transform[4];
      if (cursorEnd != null) {
        const gap = x - cursorEnd;
        // pdf.js often splits a word across items with no gap at all; only
        // insert a space when the glyphs are actually apart.
        if (gap > COLUMN_GAP_PT) line += "   ";
        else if (gap > 0.6 && !line.endsWith(" ")) line += " ";
      }
      line += item.str;
      cursorEnd = x + (item.width ?? 0);
    }
    return line.replace(/\s+$/, "");
  });
}
