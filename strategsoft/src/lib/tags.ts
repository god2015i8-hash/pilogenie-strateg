import type { NamedColor } from "../types/models";

export function parseHashtag(title: string, categories: NamedColor[]): { title: string; categoryId: string | null; tag: string | null } {
  const trimmed = title.trim();
  const match = trimmed.match(/#([^\s#]+)/);
  if (!match) return { title: trimmed, categoryId: null, tag: null };
  const tag = match[1];
  const cat = categories.find((c) => c.name.toLowerCase() === tag.toLowerCase());
  return { title: trimmed, categoryId: cat?.id ?? null, tag };
}

export function withCategoryTag(title: string, category?: NamedColor | null): string {
  const cleaned = title.replace(/#[^\s#]+/g, "").trim();
  if (!category) return cleaned;
  return `${cleaned} #${category.name.toLowerCase()}`;
}

export function splitTitleTag(title: string): { text: string; tag: string | null } {
  const match = title.match(/#([^\s#]+)/);
  return {
    text: title.replace(/#[^\s#]+/g, "").trim(),
    tag: match ? match[1] : null,
  };
}

export function progressBar(percent: number, width = 20): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}
