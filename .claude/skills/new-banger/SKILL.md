---
name: new-banger
description: Turn a spotify/youtube link (optionally with pasted lyrics) into a completed, staged bangers page — resolve metadata, fetch lyrics, romanize, translate, format to the house org standard, build-verify, and stage on a branch ready to land. Use whenever the user shares a song link or lyrics for the bangers collection.
argument-hint: <spotify-or-youtube-url> [pasted lyrics]
---

# new-banger: link → staged bangers page

Take a song link (and optionally pasted lyrics) to a finished, render-verified
`content/bangers/<slug>.org` staged on its own branch. The user's interaction
should collapse to: paste a link → eyeball a screenshot → say "land it".

## 0. Duplicate gate

Before anything else, check the song isn't already in the collection:
`grep -ril '<native title>' content/bangers/` and grep for the spotify track id
(the path segment after `/track/`, ignoring `?si=` which varies per share).
If it exists, say so and stop — do not re-add.

## 1. Resolve the song

WebFetch the spotify/youtube page and read the `og:title` / `og:description`
meta tags — no API keys needed (spotify's og:title looks like
"<track> - song and lyrics by <artist> | Spotify"). Extract native title and
artist. If the user pasted title/artist alongside the link, their version wins.

## 2. Get the lyrics

- **If the user pasted lyrics** (table or plain lines): use them verbatim.
  This is a first-class path, not a fallback.
- **Otherwise**: WebSearch the original-language lyrics (Korean: search
  "<title> <artist> 가사", prefer Bugs/Melon/Genie/Genius), WebFetch the best
  hit, and note the source in your message to the user (not in the file).
  Fetched lyrics are the fallible stage — pick the canonical studio version,
  keep verse order, and say where they came from so the user can judge.

## 3. Romanize and translate

- **Romanization**: Revised Romanization, lowercase; leave English words in the
  lyric as-is ("you", "All right"). Line-by-line, mirroring the original rows.
- **Translation**: natural line-by-line English in the voice of the existing
  pages — first person, plain punctuation, no literalism for its own sake.
  Parenthetical echoes like "(먼 훗날)" stay parenthesized in all three columns.
- The user reviews both in the render; if they supplied either column, theirs
  wins verbatim.

## 4. Write the org file

Path: `content/bangers/<slug>.org` — slug is the kebab-cased romanized title
(e.g. 사랑이 가득한 이 밤 → `sarangi-gadeukhan-i-bam`).

```org
#+title: <native title only>
#+title_en: <English translation only — no romanization>
#+artist: <native> (<Romanization>)
#+sort_artist: <Romanization>
#+language: Korean
#+spotify: <link as given>
#+year: <current year>

#+attr_html: :class lyrics
| Original | Romanization | English |
|------+------+------|
| <line> | <rr> | <english> |
```

House rules, non-negotiable:
- **Artist string reuse**: `grep -h '#+artist' content/bangers/*.org | sort -u`
  first — if the artist exists, reuse the exact `#+artist`/`#+sort_artist`
  strings so the accordion never splits a group. Established English band
  names beat romanization: 쿨 (Cool), 빛과 소금 (Light & Salt), 쥬얼리 (Jewelry).
- **Duets/features**: `A (Rom) & B (Rom)`; `sort_artist` is the primary artist.
- **Table**: one continuous table — no title row, no artist row, no blank
  spacer rows (go-org drops empty rows anyway; stanza breaks are not kept).
- **Body text** (a blurb line above the table, e.g. "Ouch"): only when the
  user asks for it, placed between front matter and the table.
- Non-Korean songs follow the same shape (`#+language:` accordingly); songs
  without useful romanization may drop the middle column only if existing
  same-language pages do.

## 5. Verify the build

Never present an unrendered page:
1. `hugo --minify` (extended; if not on PATH, fetch the version pinned in
   `.github/workflows/` into a temp bin dir).
2. Serve `public/` (`python3 -m http.server -d public <port>`) and screenshot
   `/bangers/<slug>/` with a headless browser; actually look at the image —
   header stack (title, straight English subtitle, "by <artist>", listen
   links), dimmed romanization column, table intact.
3. Check the index: the song's `data-search` entry exists and the artist group
   counts it — `grep -o '<native artist>[^<]*' public/bangers/index.html`.
   Beware minified HTML drops attribute quotes; grep loosely.

## 6. Stage

- Branch `banger-<slug>` cut from freshly-fetched `origin/main`; commit just
  the song file (message: `bangers: <native title> (<Artist romanization>)`),
  push the branch.
- If other banger commits are already staged-but-unlanded, consolidate: cut
  one fresh branch from origin/main, restore all pending song files, single
  commit, delete the superseded staging branches (local and remote). The user
  prefers batches to land as one commit.
- Show the user the screenshot and a one-line summary. Offer to land.

## 7. Landing — explicit word only

Never push to main without the user explicitly saying so in this conversation
("land it", "push to main", "ship it"). A new song request is not a landing
request. When the word comes:
1. `git fetch origin main`; confirm the staging branch fast-forwards
   (`git log HEAD..origin/main` empty). If main moved, rebase or re-cut first.
2. `git push origin <branch>:main`.
3. Watch the "Deploy site to GitHub Pages" run; transient Pages failures are
   rerun with `gh run rerun --failed`.
4. `curl` the live page for 200 and report the URL.
