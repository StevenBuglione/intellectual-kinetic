import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { restorationFoundationFixture } from "@/fixtures/parity/restoration-foundation";
import { CanonicalDocumentAttributes, MathInline } from "../extensions";
import {
  canonicalToTiptapDocument,
  tiptapDocumentToCanonicalPatch,
  type TiptapNode,
} from "../projection";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("Tiptap canonical attribute schema", () => {
  it("keeps canonical block ids through real editor hydration so focus updates cannot duplicate blocks", () => {
    editor = new Editor({
      element: document.createElement("div"),
      extensions: [
        CanonicalDocumentAttributes,
        StarterKit,
        MathInline,
      ],
      content: canonicalToTiptapDocument(restorationFoundationFixture),
    });

    const patch = tiptapDocumentToCanonicalPatch(editor.getJSON() as TiptapNode);

    expect(patch.blocks.map((block) => block.id)).toEqual(
      restorationFoundationFixture.blocks.map((block) => block.id),
    );
    expect(patch.blocks).toHaveLength(restorationFoundationFixture.blocks.length);
  });
});
