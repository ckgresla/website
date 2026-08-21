# A Curated Tonkatsu

The personal site of Chris Kerwell Gresla — [chriskerwellgresla.net](https://chriskerwellgresla.net/).

Built with [Hugo](https://gohugo.io/) (extended); content in Markdown or
[Org](https://orgmode.org/).

## Working on it

- `just dev` — dev server with live reload
- `just build` — production build into `./public`
- `just lint` — [Vale](https://vale.sh/docs) over the napkins

Deploys to GitHub Pages via `.github/workflows/pages.yml` on push to `main`.

## Layout

- `content/` — pages, `napkins/` (posts), `bangers/` (songs); `.md` or `.org`
- `layouts/` — one `baseof.html` shell + thin per-section templates
- `assets/css/main.scss` — the whole design system, one file
- `static/` — images, pdfs, favicon, CNAME (copied verbatim)
