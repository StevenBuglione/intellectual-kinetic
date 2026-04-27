import modulesJson from "./modules.json";

export type LyxModuleSupport = "supported" | "unsupported";
export type LyxModuleEffect =
  | "packages"
  | "multicol"
  | "landscape"
  | "headers-footers"
  | "theorems";

type LyxModuleJsonEntry = {
  id: string;
  label: string;
  category: string;
  description: string;
  packages: string[];
};

export type LyxModuleEntry = {
  id: string;
  label: string;
  category: string;
  description: string;
  packages: string[];
  support: LyxModuleSupport;
  effect: LyxModuleEffect;
};

const SUPPORTED_LYX_MODULE_OVERRIDES: Record<string, { packages?: string[]; effect: LyxModuleEffect }> = {
  customHeadersFooters: {
    packages: ["fancyhdr"],
    effect: "headers-footers",
  },
  landscape: {
    effect: "landscape",
  },
  multicol: {
    effect: "multicol",
  },
  soul: {
    packages: ["soul"],
    effect: "packages",
  },
  "theorems-ams": {
    effect: "theorems",
  },
};

const lyxModuleJsonEntries = modulesJson as LyxModuleJsonEntry[];

export const lyxModules: LyxModuleEntry[] = lyxModuleJsonEntries.map((entry) => {
  const supportedOverride = SUPPORTED_LYX_MODULE_OVERRIDES[entry.id];
  return {
    ...entry,
    packages: supportedOverride?.packages ?? entry.packages,
    support: supportedOverride ? "supported" : "unsupported",
    effect: supportedOverride?.effect ?? "packages",
  };
});

const lyxModuleMap = new Map(lyxModules.map((entry) => [entry.id, entry]));

export const supportedLyxModules = lyxModules.filter((entry) => entry.support === "supported");

export const supportedLyxModulesByCategory = [...new Set(supportedLyxModules.map((entry) => entry.category))]
  .map((category) => ({
    category,
    options: supportedLyxModules.filter((entry) => entry.category === category),
  }));

export function getLyxModuleEntry(moduleId: string): LyxModuleEntry | undefined {
  return lyxModuleMap.get(moduleId);
}

export function getSupportedLyxModuleEntry(moduleId: string): LyxModuleEntry | undefined {
  const entry = getLyxModuleEntry(moduleId);
  return entry?.support === "supported" ? entry : undefined;
}

export function resolveEnabledSupportedLyxModules(moduleIds: string[] | undefined): LyxModuleEntry[] {
  return [...new Set(moduleIds ?? [])]
    .map((moduleId) => getSupportedLyxModuleEntry(moduleId))
    .filter((entry): entry is LyxModuleEntry => Boolean(entry));
}
