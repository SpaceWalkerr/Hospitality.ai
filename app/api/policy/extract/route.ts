import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * PDF text extraction. Runs server-side so no parser ships to the browser,
 * and so an uploaded document never has to leave the request that carried it.
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
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const clean = String(text).replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (clean.length < 200) {
      return NextResponse.json(
        {
          error:
            "We could not read any text from that PDF. It may be a scan — try pasting the text instead.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: clean, pages: totalPages, name: file.name });
  } catch {
    return NextResponse.json(
      { error: "That PDF could not be opened. Try pasting the text instead." },
      { status: 422 },
    );
  }
}
