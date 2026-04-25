import { NextResponse } from "next/server";
import {
  getDefaultCanonicalDocument,
  saveCanonicalDocument,
} from "@/lib/persistence/document-repository";

export const runtime = "nodejs";

export async function GET() {
  const document = await getDefaultCanonicalDocument();
  return NextResponse.json({ document });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const document = await saveCanonicalDocument(body.document);
  return NextResponse.json({ document });
}
