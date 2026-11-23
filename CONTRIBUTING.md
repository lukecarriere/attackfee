# Contributing

- Run `npm test` before opening a change. Node 22.18 or newer. For the PHP checks, PHP 8.1 or newer with the sodium, xml, and mbstring extensions, then `composer install` in `packages/server-php`. Browser tests need Playwright Chromium: `npx playwright install --with-deps chromium`.
- Public wording follows `docs/copy.md`. The copy lint keeps vendor names off public surfaces.
- `docs/copy.md`, `docs/adapters.md`, `docs/positioning.md`, and `docs/catalogs.md` are contributor docs. They are not pages for the public site.
- Tests and local runs use the stub backend and local test mints only, never real money or a live mint.
- Do not deploy, publish, change DNS, or change repository visibility.
- Report security issues privately to the maintainers, not in a public issue. See [SECURITY.md](SECURITY.md).

The repository and the Node packages are MIT (`LICENSE`). The WordPress plugin (`packages/wp-attackfee`) and `packages/server-php` are GPL-2.0-or-later.
