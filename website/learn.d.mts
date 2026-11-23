export const LEARN_HUBS: [string, string][];
export const LEARN_TYPES: string[];

export interface LearnPage {
  file: string;
  path: string;
  title: string;
  description: string;
  hub: string;
  slug: string;
  type: string;
  order: number;
  orderRaw?: string;
  related: string[] | null;
  audience: string;
  status: string;
  schema: string;
  updated: string;
  faq: { q: string; a: string }[] | null;
  body: string;
  has: (key: string) => boolean;
}

export function learnPublicPath(rel: string): string;
export function parseLearnFile(rel: string, text: string): { errors: string[]; page: LearnPage };
export function validateLearnFiles(files: { rel: string; text: string }[], ctx: { knownPaths?: string[]; lastmod?: (fileId: string) => string; today?: string }): string[];
export function validateLearnDir(dir: string, ctx: { knownPaths?: string[]; lastmod?: (fileId: string) => string; today?: string }): string[];
export function loadLearnPages(dir?: string): LearnPage[];
export function learnSourceFiles(dir?: string): string[];
export function useGuide(fns: {
  guideHtml: (md: string) => string;
  siteNav: (current?: string) => string;
  ICON_TAGS: string;
  FOOTER: string;
  socialTags: (file: string, title: string, description: string, base: string | null) => string;
}): void;
export function renderLearnPage(page: LearnPage, opts: { base: string | null; lastmod: string; labels?: Record<string, string>; hubPages?: Iterable<string> }): { html: string; markdown: string };
export const LLMS_BYTE_CAP: number;
export const LEARN_CATALOG_LINE: string;
export function namesPath(text: string, path: string): boolean;
export function learningLines(base: string, pages: { path: string; file: string; title: string; description: string; slug?: string }[]): string[];
export function llmsLearnText(base: string, pages: { path: string; file: string; title: string; description: string; hub: string }[]): string;
export function listingGaps(pages: { file: string; path: string; markdown: string }[], artifacts: { files: string[]; sitemap: string; llms: string; full: string; base: string; learn?: string }): string[];
export function learnIndexGaps(llms: string, base: string): string[];
