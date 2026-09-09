# Trizen Photo Ops — Frontend

Next.js (App Router, JavaScript) frontend for the Photo Sharing Platform
challenge. Built against `docs/API_SPEC.md` from the project docs — **no
backend is bundled here**; this repo is the client only, wired to talk to
the Express API once it's deployed.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · axios ·
react-hook-form · yet-another-react-lightbox · self-hosted fonts via
`@fontsource` (IBM Plex Sans/Mono, Fraunces — no Google Fonts network
dependency, so it builds and renders identically offline).

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Without a backend running, every screen still renders — API calls fail
gracefully into empty states / toasts, so you can review the UI on its own.

## Connecting the real backend

This is the part that matters. Every network call in the app goes through
**one file**: `lib/api.js`. Nothing else touches axios or fetch directly.
To connect the deployed backend:

1. Set `NEXT_PUBLIC_API_URL` in `.env.local` (or your host's env vars) to
   the backend's base URL, e.g. `https://trizen-photo-api.onrender.com/api`.
2. On the backend, make sure `CLIENT_ORIGIN` / CORS allows this frontend's
   origin **with credentials** — auth is an httpOnly JWT cookie
   (`withCredentials: true` is already set in `lib/api.js`), so a wildcard
   CORS origin won't work with cookies.

That's it — no code changes needed if the backend matches `API_SPEC.md`.
`lib/api.js` documents every route/payload it expects, and the interceptor
unwraps the `{ success, data, message }` envelope from `RULES.md` so
screens just get plain data or a plain `Error` with `.message` and
`.status`.

### Where the frontend is defensive about shape

A couple of response fields aren't pinned down to an exact key in
`API_SPEC.md`, so the frontend normalizes rather than assuming one shape:

- **`lib/idOf.js`** reads `id` or `_id`, since Mongoose docs use `_id` but
  a controller might serialize to `id`.
- **Publish gallery response** (`app/admin/events/[id]/page.jsx`) reads
  `slug`/`pin` from the top level or a nested `gallery` object, and builds
  the share URL from `slug` if no full `url`/`link` field is returned.
- **Photo URLs** (`components/PhotoGrid.jsx`) read `storageUrl`, `url`, or
  `secure_url` — covers both "raw Mongoose doc" and "Cloudinary-shaped"
  responses.

If the real backend returns something outside these, it's a one-line
change in the relevant file, not a rewrite.

## Structure

Mirrors `docs/FRONTEND_STRUCTURE.md`:

```
app/
├── (auth)/login, register       — public, paper theme
├── admin/                        — guarded: role !== 'admin' → redirect
│   ├── page.jsx                  — dashboard, create event
│   ├── team/page.jsx             — add/list team members
│   └── events/[id]/page.jsx      — assign team, select photos, publish
├── team/                         — guarded: role !== 'team_member' → redirect
│   ├── page.jsx                  — assigned events
│   └── events/[id]/page.jsx      — upload, own uploads only
└── gallery/[slug]/page.jsx       — public, no auth, PIN-gated
components/                       — PhotoGrid, PhotoUploadForm, PinEntryForm,
                                     EventCard, Navbar, + shared primitives
lib/
├── api.js                        — the integration seam (see above)
├── useAuth.js                    — AuthProvider + useAuth(), one /auth/me fetch
└── useToast.js                   — lightweight toast context
```

Route guards live in `admin/layout.jsx` and `team/layout.jsx`: each calls
`useAuth()` and redirects to `/login` (unauthenticated) or the other panel
(wrong role), per `FRONTEND_STRUCTURE.md`.

## Design

Two registers, tied to who's using the screen: a dark, functional "ink"
theme for the admin/team tools (dense, contact-sheet-inspired — frame
numbers on thumbnails, hairline borders instead of card shadows), and a
warm "paper" theme for the moments a customer sees — login/register and
the gallery reveal. Tokens are in `app/globals.css`.

## Known limitations (by design, matches the docs)

- **Gallery session**: per `CUSTOMER_GALLERY.md`, PIN verification returns
  the photo list directly with no follow-up session token. Refreshing the
  gallery page re-prompts for the PIN.
- **Team assignment is add-only**: `API_SPEC.md` only documents
  `POST /events/:id/team-members` to assign someone — there's no unassign
  route, so the UI doesn't offer one.
- **Upload progress is per-batch, not per-file**: the backend accepts
  multiple files in a single multipart request, so there's one progress
  bar for the whole upload rather than one per file.
- **Photos render as plain `<img>`, not `next/image`**: the Cloudinary
  (or other) domain isn't known ahead of time, so using `next/image` would
  require config that breaks until someone edits `next.config.mjs`. Plain
  `<img>` needs zero configuration regardless of storage provider.
