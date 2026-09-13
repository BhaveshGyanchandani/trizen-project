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

Set `MONGODB_URL`, `JWT_SECRET`, and the three server-only Cloudinary values
from `.env.local.example`. Never commit real credentials. For an existing
GridFS-backed database, run `npm run migrate:cloudinary` first, verify the
app, then run `npm run migrate:cloudinary -- --purge-gridfs` to remove the
legacy database file bytes. The migration reads both `.env.local` and `.env`
so local MongoDB and Cloudinary configuration can remain separate.

## Demo credentials

After `npm run seed` (safe to re-run — everything is upserted):

| Role        | Account              | Password           |
|-------------|-----------------------|---------------------|
| Admin       | Priya Shah — `admin@trizen.demo` | `Trizen@Admin123` |
| Team member | Rohit Mehta — `team@trizen.demo` | `Trizen@Team123` |

The seed also creates one event ("Arjun & Priya Wedding" — the PDF's own
example) with 3 generated sample photos already uploaded and selected, and
publishes its gallery at:

- **Local link**: `http://localhost:5000/gallery/abc123`
- **Deployed link**: `https://trizen-project-beta.vercel.app/gallery/abc123`
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

### Request and storage flow

```text
Browser -> Next.js UI/API -> MongoDB (users, events, photo metadata)
                           -> Cloudinary (authenticated image bytes)

Admin/team/gallery PIN checks -> /api/photos/:id/file -> signed Cloudinary asset
```

### Database design

| Collection | Purpose | Key relationships |
|---|---|---|
| `users` | Admin and team-member accounts | Team members record their creating admin. |
| `events` | Event owner, assigned team, gallery status/link/PIN hash, optional cover metadata | Owned by one admin; contains team references. |
| `photos` | Filename, file size, Cloudinary asset identifiers, selection state, uploader, and event reference | One photo belongs to one event and uploader. Image bytes stay in Cloudinary. |
| `customerphotofeedbacks` | One customer-session rating/comment per photo | Unique `photoId + customerSessionId`. |
| `photochangerequests` | Customer removal/change requests | Belongs to an event and photo. |

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

Cloudinary stores all new image bytes as authenticated assets. MongoDB stores
only photo metadata and Cloudinary identifiers (`cloudinaryPublicId`,
`cloudinaryAssetId`, version, format, filename, size, event, uploader, and
gallery state). The existing `GET /api/photos/[id]/file` route still enforces
admin/team/gallery-PIN access, then proxies a server-generated signed
Cloudinary URL so the signed URL is never exposed in page markup.

`scripts/migrate-gridfs-to-cloudinary.js` safely copies legacy GridFS files
to Cloudinary and updates their existing MongoDB records in place. GridFS is
read only as a temporary fallback until the explicit purge command succeeds.

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
- Cloudinary credentials remain server-only; authenticated Cloudinary assets
  require a signed delivery URL and are fetched only after app authorization.

## Testing

```bash
npm test
```

The built-in Node test suite covers event ownership/assignment authorization,
team-member photo visibility, PIN format validation, and the gallery-publish
policy. Route handlers apply these same policies before database or storage
operations.

## Deployment (Vercel)

1. Import the Git repository into Vercel and deploy it as a Next.js project.
2. Add `MONGODB_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to Vercel Production,
   Preview, and Development environments. Alternatively use `CLOUDINARY_URL`.
3. Redeploy after changing environment variables.
4. Run `npm run seed` only against the intended demo database, then confirm
   the admin, team, and gallery login flows using the credentials above.
5. For legacy deployments, run the Cloudinary migration before removing
   GridFS data; use the explicit purge command only after visual verification.

## Known limitations

- **Upload progress is per-batch**, not per-file — one multipart request
  handles the whole selection.
- **Gallery feedback is browser-session based** — it persists through
  refreshes of the same browser but is not tied to a customer account.
