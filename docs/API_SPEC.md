# API Specification — Trizen Photo Ops

This document is the contract between the Next.js frontend (`lib/api.js`)
and the backend route handlers under `app/api/*`. Both live in the same
Next.js project and deploy together — there is no separate backend
service, and no CORS configuration is required.

If you change a request/response shape in a route handler, update this
document in the same change. `lib/api.js` references this file directly
in its header comment.

## Conventions

- **Base URL.** All paths below are relative to `/api`.
- **Auth.** Session auth is an httpOnly `token` cookie set by
  `POST /auth/login` and `POST /auth/register`, and read by every
  protected route via `getAuthUser()` (`lib/authHelper.js`). There is no
  bearer-token option — the frontend's axios client sends
  `withCredentials: true` and never handles the token directly.
- **Roles.** Two account roles exist: `admin` and `team_member`. Route
  descriptions below note which roles may call them. Anything not
  marked "Public" requires a valid session cookie.
- **Response envelope.** Success responses return the resource directly
  as JSON (an object or array) with HTTP 2xx. Error responses return
  `{ "message": "..." }` with an appropriate 4xx/5xx status. The
  frontend's response interceptor in `lib/api.js` unwraps a `data` field
  when present and otherwise uses the body as-is, and turns any non-2xx
  response into a thrown `Error` whose `.message` is the body's
  `message` field and whose `.status` is the HTTP status code.
- **IDs.** MongoDB ObjectIds are serialized as strings. Some responses
  use `id`, others use `_id` — the frontend normalizes both via
  `lib/idOf.js`.
- **File uploads.** Any endpoint that accepts a file expects
  `multipart/form-data`, not JSON.

---

## Auth — `/api/auth/*`

### `POST /auth/login`
Authenticates a user and starts a session.

- **Auth:** Public.
- **Body:** `{ email: string, password: string }`
- **Response `200`:** `{ id, name, email, role }` — also sets the
  session cookie.
- **Errors:** `401` invalid credentials.

### `POST /auth/logout`
Ends the current session.

- **Auth:** Any authenticated user.
- **Body:** none.
- **Response `200`:** `{ success: true }` — clears the session cookie.

### `GET /auth/me`
Returns the current session's user profile.

- **Auth:** Any authenticated user.
- **Response `200`:** `{ id, name, email, role, phone, bio, avatarUrl }`
- **Errors:** `401` if not logged in.

### `GET /auth/register`
Reports registration-flow state so the frontend can decide which
registration UI to show.

- **Auth:** Public.
- **Response `200`:** `{ adminExists: boolean, isAdmin: boolean, user: object|null }`

### `POST /auth/register`
Creates a new account.

- **Auth:** Public **only** if no admin account exists yet (first-run
  setup, which creates the initial admin and logs them in). Once an
  admin exists, this requires an authenticated admin session, and does
  not change the caller's own session.
- **Body:** `{ name, email, password, role?: "admin"|"team_member", eventIds?: string[] }`
  — `eventIds` optionally assigns a new `team_member` to existing
  events owned by the creating admin.
- **Response `201`:** `{ id, name, email, role }`
- **Errors:** `403` if an admin exists and the caller isn't an admin;
  `409` if the email is already registered.

### `GET /auth/profile`
Returns the caller's own profile (identical payload to `GET /auth/me`;
kept as a separate route for the profile page's own semantics).

- **Auth:** Any authenticated user.
- **Response `200`:** `{ id, name, email, role, phone, bio, avatarUrl }`

### `PATCH /auth/profile`
Updates the caller's own profile. Every field is optional.

- **Auth:** Any authenticated user (self only — there is no target user
  id, so this can never touch another account).
- **Body:** `{ name?, email?, phone?, bio?, currentPassword?, newPassword? }`
  — a password change requires both `currentPassword` and
  `newPassword` together; `currentPassword` is verified against the
  stored hash.
- **Response `200`:** the updated profile.
- **Errors:** `400` invalid input; `401` wrong `currentPassword`.

### `POST /auth/avatar`
Uploads or replaces the caller's own avatar image.

- **Auth:** Any authenticated user (self only).
- **Body:** `multipart/form-data` with an `avatar` file field (JPEG,
  PNG, WebP, or GIF; ≤20 MB).
- **Response `200`:** the updated profile. Any previous avatar is
  deleted from storage after the new one saves successfully.

### `DELETE /auth/avatar`
Removes the caller's own avatar.

- **Auth:** Any authenticated user (self only).
- **Response `200`:** the updated profile (avatar fields cleared).

### `GET /auth/avatar/[userId]`
Streams another user's avatar image bytes.

- **Auth:** Any authenticated user. Avatars carry the same trust level
  as a name shown in a team list, so any logged-in user may view any
  other user's avatar. Not reachable by anonymous gallery visitors.
- **Response `200`:** image bytes with the appropriate `Content-Type`.
- **Errors:** `404` if the user has no avatar.

---

## Events — `/api/events/*`

### `GET /events`
Lists events scoped to the caller.

- **Auth:** Any authenticated user. Admins see events they created;
  team members see events they're assigned to.
- **Response `200`:** array of event summaries, each including a live
  `photoCount`.

### `POST /events`
Creates a new event.

- **Auth:** Admin only.
- **Body:** `{ name: string }`
- **Response `201`:** the created event summary.

### `GET /events/[id]`
Fetches one event's detail.

- **Auth:** Owning admin, or a team member assigned to the event.
- **Response `200`:** `{ id, name, teamMembers, gallery: { status, slug }, coverPhotoUrl, ... }`
- **Errors:** `403`/`404` if the caller has no access.

### `PATCH /events/[id]`
Renames the event and/or replaces its cover photo.

- **Auth:** The event's owning admin only.
- **Body:** JSON `{ name }`, or `multipart/form-data` with a `name`
  field and/or a `coverPhoto` file. A previous cover photo is deleted
  from storage only after the new one saves successfully.
- **Response `200`:** the updated event detail.

### `GET /events/[id]/cover`
Streams the event's cover photo image bytes.

- **Auth:** Owning admin or an assigned team member.
- **Response `200`:** image bytes.
- **Errors:** `404` if no cover photo is set.

### `POST /events/[id]/team-members`
Assigns a team member to the event.

- **Auth:** The event's owning admin only, and only for team members the
  admin created. Idempotent — assigning an already-assigned member is a
  no-op.
- **Body:** `{ userId: string }`
- **Response `200`:** `{ id, name, teamMembers }`

### `DELETE /events/[id]/team-members`
Unassigns a team member from the event. Does not delete the member
account or any photos they uploaded.

- **Auth:** The event's owning admin only.
- **Body:** `{ userId: string }`
- **Response `200`:** `{ id, name, teamMembers }`

---

## Photos — `/api/events/[id]/photos/*`, `/api/photos/[id]/*`

### `GET /events/[id]/photos`
Lists an event's photos.

- **Auth:** Owning admin (sees every photo, filterable) or an assigned
  team member (sees their own uploads plus already-published gallery
  photos from the whole team).
- **Query params (admin only):** `status` (`all`|`selected`|`unselected`),
  `uploadedBy` (a user id or `all`).
- **Response `200`:** `{ photos: [...], summary: { total, selected, unselected, status, uploadedBy } }`

### `POST /events/[id]/photos`
Uploads one or more photos to the event.

- **Auth:** Owning admin or an assigned team member.
- **Body:** `multipart/form-data` with one or more `photos` file fields
  (JPEG, PNG, WebP, or GIF; ≤20 MB each).
- **Response `200`:** `{ results: [...], uploadedCount, failedCount }` —
  each file is processed independently, so a failure on one does not
  block the others.

### `GET /events/[id]/photos/mine`
Lists only the photos the calling team member uploaded to this event
(narrower than `GET /photos`, which for team members also includes
already-published photos from the whole team).

- **Auth:** An assigned team member.
- **Response `200`:** `{ photos: [...] }`

### `DELETE /photos/[id]`
Permanently deletes a photo: its stored image asset, any customer
feedback/change-request records tied to it, and the Photo document.

- **Auth:** The owning event's admin only (team members can upload but
  not delete).
- **Response `200`:** `{ success: true }`

### `PATCH /photos/[id]/select`
Toggles whether a photo is selected for the gallery.

- **Auth:** The owning event's admin only.
- **Body:** `{ selected: boolean }`
- **Response `200`:** the updated photo.
- **Errors:** `409` if the photo is already published (unselecting a
  live photo requires unpublishing first) or excluded by an approved
  customer removal request.

### `GET /photos/[id]/file`
Streams a photo's image bytes.

- **Auth:** Three audiences, resolved in order:
  1. The owning admin.
  2. An assigned team member, for their own uploads (or any photo once
     published).
  3. **Public/no auth** — but only for a photo that is currently
     `selectedForGallery` on an event whose gallery is currently
     published. This is the one unauthenticated read path in the photo
     API, scoped tightly to what a customer is meant to see.
- **Response `200`:** image bytes.
- **Errors:** `403`/`404` otherwise.

---

## Team members — `/api/team-members/*`

### `GET /team-members`
Lists the team-member and admin accounts the caller has created.

- **Auth:** Admin only.
- **Response `200`:** `{ teamMembers: [...] }`

### `POST /team-members`
Creates a new team-member (or admin) account under the caller's studio.

- **Auth:** Admin only.
- **Body:** `{ name, email, password, role?: "admin"|"team_member" }`
- **Response `201`:** the created account's public fields.

### `DELETE /team-members/[id]`
Removes a team-member account: unassigns them from every event owned
by the calling admin, then deletes the account. Event photos are
retained.

- **Auth:** The admin who created the account, only.
- **Response `200`:** `{ success: true }`

---

## Customer photo-removal requests

### `GET /events/[id]/photo-requests`
Lists customer photo-removal requests for an event.

- **Auth:** The event's owning admin only.
- **Query params:** `status` (`all`|`PENDING`|`APPROVED`|`REJECTED`)
- **Response `200`:** `{ requests: [...], pendingCount }`

### `PATCH /photo-requests/[id]`
Reviews a pending request.

- **Auth:** The owning event's admin only, and only while the request
  is still `PENDING`.
- **Body:** `{ status: "APPROVED" | "REJECTED" }`
- **Response `200`:** the updated request. Approving immediately
  excludes the photo from the gallery (keeps the asset, clears its
  selection/published flags).

---

## Customer photo feedback

### `GET /events/[id]/photo-feedback`
Lists customer star ratings/comments on an event's photos.

- **Auth:** Owning admin (all feedback) or an assigned team member
  (only feedback on their own uploads).
- **Response `200`:** `{ feedback: [...] }`

---

## Public gallery — `/api/gallery/[slug]/*`

No session cookie is used on this surface. Access is instead governed
by a short-lived signed cookie issued after a successful PIN check
(`createGalleryAccessToken`, `lib/authHelper.js`).

### `GET /gallery/[slug]`
Returns minimal metadata so the landing page can render before the PIN
is entered.

- **Auth:** Public.
- **Response `200`:** `{ eventName, photoCount }`
- **Errors:** `404` if the gallery doesn't exist or isn't published.

### `POST /gallery/[slug]/verify-pin`
Verifies a PIN and unlocks the gallery.

- **Auth:** Public.
- **Rate limited:** 8 attempts per 10 minutes, keyed by `slug + IP`
  (`lib/rateLimit.js`). Wrong guesses count against the limit; a
  correct guess does not need to, since it ends the attempt.
- **Body:** `{ pin: string }` (6 digits)
- **Response `200`:** `{ eventName, photos: [...] }` — also sets the
  gallery-access cookie.
- **Errors:** `401` wrong PIN; `429` rate limited (with a `Retry-After`
  header).

### `GET /gallery/[slug]/feedback`
Returns the calling visitor's own previously submitted feedback for
this gallery.

- **Auth:** Requires a valid gallery-access cookie for this slug.
- **Response `200`:** `{ feedback: [...] }` — entries for photos since
  removed from the gallery are filtered out.

### `POST /gallery/[slug]/feedback`
Submits or updates a rating/comment on a photo.

- **Auth:** Requires a valid gallery-access cookie for this slug.
- **Body:** `{ photoId: string, rating: 1-5, comment?: string }`
- **Response `200`:** the saved feedback entry. A repeat submission for
  the same photo by the same visitor updates their existing entry
  rather than creating a new one.
- **Errors:** `403` if the photo isn't currently visible in this
  published gallery.

### `POST /gallery/[slug]/requests`
Submits a request to remove a photo from the gallery.

- **Auth:** Requires a valid gallery-access cookie for this slug.
- **Body:** `{ photoId: string, reason?: string }`
- **Response `201`:** `{ id, photoId, status: "PENDING", createdAt }`
- **Errors:** `403` if the photo isn't currently visible in this
  published gallery; `409` if the visitor already has a pending
  request for this photo.

---

## Gallery administration — `/api/events/[id]/gallery/*`

### `GET /events/[id]/gallery`
Returns the gallery's publish status for the admin dashboard. Never
returns the PIN — the PIN is shown exactly once, in the publish or
regenerate-PIN response.

- **Auth:** The event's owning admin only.
- **Response `200`:** `{ status: "draft"|"published", slug: string|null }`

### `POST /events/[id]/gallery/publish`
Publishes or republishes the gallery.

- **Auth:** The event's owning admin only.
- **Requires:** at least one photo currently selected for the gallery.
- **Response `200`:** `{ status, slug, url, pin, isFirstPublish }` —
  `pin` is non-null only on first publish (republishing intentionally
  reuses the existing PIN so previously shared links/PINs keep
  working). Every currently-selected, non-excluded photo is marked
  `publishedForGallery: true`.

### `POST /events/[id]/gallery/unpublish`
Takes the gallery offline.

- **Auth:** The event's owning admin only.
- **Response `200`:** `{ status: "draft" }` — clears
  `publishedForGallery` on every photo. The PIN hash is left untouched;
  republishing later reuses it.

### `POST /events/[id]/gallery/regenerate-pin`
Issues a new PIN without touching photo selections or publish state.
Use when a PIN has leaked or the admin just wants a fresh one.

- **Auth:** The event's owning admin only.
- **Requires:** the gallery must already be published.
- **Response `200`:** `{ pin: string }` — shown once; not retrievable
  again after this response.
