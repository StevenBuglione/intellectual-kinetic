import { EditorWorkspace } from "@/components/workspace/EditorWorkspace";
import { getDefaultCanonicalDocument } from "@/lib/persistence/document-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const document = await getDefaultCanonicalDocument();

  return <EditorWorkspace initialDocument={document} />;
}
