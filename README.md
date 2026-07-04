# A Curated Tonkatsu

The personal site of Chris Kerwell Gresla — [chriskerwellgresla.net](https://chriskerwellgresla.net/).

Built with [Hugo](https://gohugo.io/) (yes, this README used to say "I don't
like hugo" — org-mode support won). Content is authored in Markdown or
[Org](https://orgmode.org/) side by side; Hugo renders both natively. The
layout is a small, single-grid design in the spirit of
[rsms.me](https://rsms.me/): one 6-column grid, Inter/Inter Display, everything
on an 8px unit with whole-pixel type metrics.

## Working on it

Install Hugo (extended): `brew install hugo`

See the `justfile`:

- `just dev` — dev server with live reload
- `just build` — production build into `./public`
- `just lint` — [Vale](https://vale.sh/docs) over the napkins

Deploys to GitHub Pages via `.github/workflows/pages.yml` on push to `main`.

## Layout

- `content/` — pages, `napkins/` (posts), `bangers/` (songs); `.md` or `.org`
- `layouts/` — one `baseof.html` shell + thin per-section templates
- `assets/css/main.scss` — the whole design system, one file
- `static/` — images, pdfs, favicon, CNAME (copied verbatim)
