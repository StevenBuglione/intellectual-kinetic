import { NextResponse } from "next/server";
import { compileCanonicalDocumentToPdf } from "@/lib/latex/compiler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await compileCanonicalDocumentToPdf(body.document);

  return NextResponse.json(result, {
    status: result.status === "compiled" ? 200 : 422,
  });
}
