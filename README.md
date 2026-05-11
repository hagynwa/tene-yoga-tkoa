# Tene Yoga Tkoa — Landing Page

Hebrew landing page for טנא יוגה משמחת — single-page invitation for a free intro yoga class in Tkoa.

**Live:** https://tene-yoga-tkoa.hag.ai

## Stack

- Single `index.html`, no build step
- Tailwind CSS (CDN, custom palette)
- GSAP + ScrollTrigger for scroll choreography
- Lenis for smooth scrolling
- Google Fonts: Frank Ruhl Libre, Assistant, Suez One

## Edit content

All copy lives in `index.html`. Search for the Hebrew text to find the section.

## Deploy (GitHub Pages)

1. Push to `main` on `hagynwa/tene-yoga-tkoa` (or whatever repo name you choose).
2. Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / root.
3. The `CNAME` file pins the custom domain to `tene-yoga-tkoa.hag.ai`.

## DNS (Spaceship)

In Spaceship → Manage `hag.ai` → Advanced DNS, add:

| Type  | Host                | Value                  | TTL    |
|-------|---------------------|------------------------|--------|
| CNAME | `tene-yoga-tkoa`    | `hagynwa.github.io`    | 1 hour |

After DNS propagates (5–30 min), in repo Settings → Pages, tick "Enforce HTTPS".
