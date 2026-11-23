// Plugin Check treats "WordPress" in the Plugin Name header as a trademark.
// The display name in docs/copy.md and the header have to match, and neither may contain that word.
// tests/plugin-name.test.ts keeps a sample of a header and a display name that contain WordPress.

export function nameUsesWordPress(name) {
  return typeof name === "string" && /\bWordPress\b/.test(name);
}

export function pluginNameHeader(php) {
  return /^\s*\*\s*Plugin Name:\s*(.+?)\s*$/m.exec(php)?.[1] ?? null;
}

/** The first `display name "..."` in docs/copy.md. The parenthetical history is not the name. */
export function copyDisplayName(copy) {
  return /display name "([^"]+)"/.exec(copy)?.[1] ?? null;
}

/** @returns {string[]} problems. Empty means the names agree and neither contains WordPress. */
export function pluginNameProblems(php, copy) {
  const header = pluginNameHeader(php);
  const display = copyDisplayName(copy);
  const problems = [];
  if (!header) problems.push('attackfee.php has no "Plugin Name" header');
  if (!display) problems.push('docs/copy.md has no display name "..."');
  if (header && nameUsesWordPress(header)) problems.push(`Plugin Name "${header}" contains WordPress. Use the docs/copy.md display name (Attackfee). Plugin Check flags WordPress in that header as a trademark.`);
  if (display && nameUsesWordPress(display)) problems.push(`docs/copy.md display name "${display}" contains WordPress. The Plugins-list name is Attackfee.`);
  if (header && display && header !== display) problems.push(`Plugin Name header "${header}" is not the copy.md display name "${display}"`);
  return problems;
}
