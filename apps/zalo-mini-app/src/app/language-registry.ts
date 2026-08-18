import type { ContentBundle, LocalizedText } from "../../../../packages/content-schema/src/index";

/**
 * Registry of language packs available to the learner client.
 *
 * The UI only knows language ids and metadata. Each pack is loaded lazily so
 * adding Japanese or Korean later does not require hardcoding imports across
 * screens or downloading every language at startup.
 */
export interface LanguageRegistryEntry {
  id: string;
  label: LocalizedText;
  endonym: string;
  flag: string;
  /** Reading aids enabled after onboarding for a new learner. */
  beginnerSupportLayers: readonly string[];
  load(): Promise<ContentBundle>;
}

export const DEFAULT_LANGUAGE = "zh-CN";

const entries: readonly LanguageRegistryEntry[] = [
  {
    id: "zh-CN",
    label: { "vi-VN": "Tiếng Trung", "en-US": "Chinese (Mandarin)" },
    endonym: "中文",
    flag: "🇨🇳",
    beginnerSupportLayers: ["pinyin"],
    async load() {
      const pack = await import("../../../../language-packs/zh-CN/src/index");
      return pack.chineseBundle;
    }
  }
];

const byId = new Map(entries.map((entry) => [entry.id, entry]));

export function supportedLanguages(): readonly LanguageRegistryEntry[] {
  return entries;
}

export function languageEntry(language: string): LanguageRegistryEntry | undefined {
  return byId.get(language);
}

export async function loadLanguageBundle(language: string): Promise<ContentBundle> {
  const entry = byId.get(language) ?? byId.get(DEFAULT_LANGUAGE);
  if (!entry) throw new Error(`No language pack registered for "${language}".`);
  return entry.load();
}
