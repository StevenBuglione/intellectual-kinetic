export type ParityCapabilityStatus = "verified" | "partial" | "unsupported";

export type ParityCapability = {
  id: string;
  family: string;
  status: ParityCapabilityStatus;
  gate: "gate-1" | "future";
  fixtureFamilies: string[];
};

export const parityCapabilityRegistry: ParityCapability[] = [
  {
    id: "sectioning-hierarchy",
    family: "document structure and semantic blocks",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["document hierarchy fixtures", "gate-one-structure"],
  },
  {
    id: "inline-and-display-math",
    family: "math and theorem-like structures",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["math and theorem fixtures", "gate-one-structure"],
  },
  {
    id: "theorem-like-environments",
    family: "math and theorem-like structures",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["math and theorem fixtures"],
  },
  {
    id: "list-structures",
    family: "document structure and semantic blocks",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["gate-one-structure"],
  },
  {
    id: "table-insert-edit",
    family: "tables",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["table and float fixtures", "gate-one-structure"],
  },
  {
    id: "figure-caption-placeholders",
    family: "figures, images, floats, and captions",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["table and float fixtures", "gate-one-structure"],
  },
  {
    id: "cross-reference-insert",
    family: "references, labels, and cross-references",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["citation and reference fixtures", "gate-one-structure"],
  },
  {
    id: "page-breaks-and-flow-breaks",
    family: "page, layout, and flow control",
    status: "verified",
    gate: "gate-1",
    fixtureFamilies: ["gate-one-structure"],
  },
  {
    id: "bibliography-insert-manage",
    family: "bibliography and citations",
    status: "partial",
    gate: "future",
    fixtureFamilies: [],
  },
  {
    id: "cjk-and-rtl-support",
    family: "language, encoding, and multilingual text features",
    status: "unsupported",
    gate: "future",
    fixtureFamilies: [],
  },
];

export function getCapability(id: string): ParityCapability | undefined {
  return parityCapabilityRegistry.find((capability) => capability.id === id);
}

export function verifiedParityCapabilityIds(): string[] {
  return parityCapabilityRegistry
    .filter((capability) => capability.status === "verified")
    .map((capability) => capability.id);
}
