// Types for website/agent-text.mjs (Markdown twins of the public pages).
export function twinPath(file: string): string;
export function alternateLink(file: string, base: string | null): string;
export function stripAlternate(html: string): string;
export const KEY_FACTS: string[];
export function homeMarkdown(home: typeof import("./build.mjs").HOME): string;
export function sourceMarkdown(md: string): string;
export function mainBlocks(html: string): string[];
export function demoMarkdown(html: string): string;
export function markdownPlain(md: string): string;
export function outsideCode(md: string): string;
export function llmsFull(base: string, pages: { url: string; md: string }[]): string;
