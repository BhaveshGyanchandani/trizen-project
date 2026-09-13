# Trizen Photo Ops

Full-stack submission for the TrizenAI Full Stack Internship Challenge —
a photo-sharing platform. One Next.js app serves both the UI (App Router
pages) and the API (`app/api/*` route handlers), backed by MongoDB via
Mongoose. Same-origin by design, so there's no CORS to configure.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in your own MONGODB_URL
npm run seed                        # creates demo accounts + a sample gallery
npm run dev                         # runs on http://localhost:5000
```

`.env.local.example` already has a freshly generated `JWT_SECRET` and the
right `NEXT_PUBLIC_API_URL` — the only value you need to supply is your own
`MONGODB_URL` (e.g. an Atlas connection string).

## Demo credentials

After `npm run seed` (safe to re-run — everything is upserted):

| Role        | Email                | Password           |
|-------------|-----------------------|---------------------|
| Admin       | admin@trizen.demo     | Trizen@Admin123     |
| Team member | team@trizen.demo      | Trizen@Team123      |

The seed also creates one event ("Arjun & Priya Wedding" — the PDF's own
example) with 3 generated sample photos already uploaded and selected, and
publishes its gallery at:

- **Link**: `http://localhost:5000/gallery/abc123`
- **PIN**: `482917`

(Both values are the exact example ones from section 5 of the challenge
PDF.) Log in as the team member to upload more photos, or the admin to
select/publish — the seed just gets you a working starting point.

## Architecture

```
app/
├── api/                    — backend route handlers
│   ├── auth/                 register, login, logout, me (JWT in an httpOnly cookie)
│   ├── team-members/         admin adds/lists their team
│   ├── events/                create/list events; [id] for detail, team-members, photos, gallery
│   ├── photos/[id]/select     admin toggles a photo's gallery selection
│   └── gallery/[slug]         public metadata + PIN verification, no auth
├── (auth)/, admin/, team/, gallery/  — the frontend pages
components/, lib/            — shared UI + the API client (lib/api.js), auth
                                context, and DB/storage helpers
models/                       — Mongoose schemas: User, Event, Photo
scripts/seed.js               — standalone demo-data script (see above)
```

Auth is a JWT in an httpOnly cookie set by `/api/auth/login`; every
protected route reads it via `getAuthUser()` in `lib/authHelper.js`.
Role and event-ownership/assignment checks happen server-side on every
event-scoped route (not just in the UI) — see "Security" below.

## Design system

UI is built on real shadcn/ui primitives (ported to plain JS under
`components/ui/`, since this project doesn't use TypeScript) — Button,
Card, Table, Badge, Dialog, Tabs, Sidebar, etc. — styled with one shared
token set in `app/globals.css` (a neutral stone paper background, ink
text, and a single muted slate-teal accent). The same tokens drive all
three surfaces (admin, team, customer gallery) rather than switching
typefaces or color registers between them. App-level components like
`Button.jsx` and `Badge.jsx` are thin compatibility wrappers over the
`components/ui/*` primitives, mapping this app's existing prop names
(`variant="danger"`, `tone="published"`, etc.) onto shadcn's variants.

## Photo storage

Photos are saved to MongoDB itself via GridFS — not local disk, and not a
third-party object store. Photo documents only ever hold a reference
(`gridfsId` + `contentType`), never the bytes themselves; reads go through
`GET /api/photos/[id]/file`, which streams the bucket's download stream
back as the response. This works identically in local dev and on
serverless hosts like Vercel, since both just need a MongoDB connection
string — no bucket/IAM setup, no ephemeral-filesystem surprises.

This is intentionally isolated to one file, `lib/storage.js` — it's the
only place that writes a photo anywhere, so swapping in a different
backend later (S3, Cloudinary, etc.) only touches that file.

## Security

- Passwords are hashed with bcrypt; never stored or returned in plaintext.
- The gallery PIN is bcrypt-hashed at rest (`galleryPinHash`) and only
  ever exists in plaintext in the single publish response — not stored,
  not returned again by the status endpoint, freshly regenerated on every
  publish (so a republish after unpublishing issues a new PIN).
- Every event-scoped route checks that the requesting admin owns the
  event, or the requesting team member is assigned to it — an admin can't
  see another admin's events/photos, and a team member can't upload to or
  view an event they're not on.
- Assigning a team member to an event verifies that person was actually
  created by the requesting admin (can't assign an arbitrary user ID).
- Publishing requires at least one selected photo (enforced server-side,
  not just via the disabled button in the UI).

## Known limitations

- **No unassign-from-event route** — matches the documented API surface;
  the UI doesn't offer removing an assignment either.
- **Upload progress is per-batch**, not per-file — one multipart request
  handles the whole selection.
- **Gallery PIN has no session/token after verification** — refreshing
  the gallery page re-prompts for the PIN, matching the documented design.
