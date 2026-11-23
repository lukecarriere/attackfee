/** Types for website/build.mjs. NodeNext resolves a .mjs import to this .d.mts file. */

export interface Page {
  file: string;
  nav: string;
  description: string;
  closingLine?: boolean;
}

/** Page lists. `find` returns the page: callers look up a row the list always contains. */
export interface PageList {
  length: number;
  [index: number]: Page;
  map<U>(callback: (page: Page, index: number, list: PageList) => U): U[];
  find(predicate: (page: Page, index: number, list: PageList) => boolean): Page;
  some(predicate: (page: Page, index: number, list: PageList) => boolean): boolean;
  [Symbol.iterator](): Iterator<Page>;
}

export const PAGES: PageList;
export const DOC_PAGES: PageList;
export const LEGAL_PAGES: PageList;

/** One block of a homepage section: a paragraph, or an ordered or unordered list. */
export type HomeBlock = string | { ol: string[] } | { ul: string[] };

export const HOME: {
  title: string;
  description: string;
  kicker: string;
  h1: string;
  lede: string;
  /** Definition paragraph under the lede (Marketing SEO brief, Nov 18, 2026). */
  definition: string;
  buttons: [string, string][];
  facts: string[];
  alt: string;
  sections: { id: string; h: string; body: HomeBlock[] }[];
  /** Questions section: [question, answer] pairs, also the FAQPage JSON-LD. */
  faq: [string, string][];
  closing: string;
};

/** Former mission pages and the homepage section each one now redirects to. */
export const MOVED_PAGES: Readonly<Record<string, string>>;
export const SITE_NAV: [string, string][];
export const FOOTER_LINE: string;
export const DEMO_DESCRIPTION: string;
export const OG_IMAGE: string;
export const OG_ALT: string;
export const LLMS_SUMMARY: string;
export const LLMS_BODY: string;
export const LLMS_SITE: string;
/** Every visible homepage string, in page order, with **bold** and `code` marks removed. */
export function homeStrings(): string[];

export function pagePath(file: string): string;
export function discoveryFiles(): string[];
export function cliSiteRaw(env?: NodeJS.ProcessEnv): string | undefined;
export function build(out?: string, site?: string | null, warn?: (message: string) => void): string;
/** Last commit date (YYYY-MM-DD) of a page's source, or "" without git history. */
export function sourceLastmod(file: string): string;
export function sitemapXml(base: string, lastmod?: (file: string) => string): string;
/** RFC 9116 Expires for /.well-known/security.txt. */
export const SECURITY_TXT_EXPIRES: string;
/** Body of /.well-known/security.txt. */
export function securityTxt(): string;
