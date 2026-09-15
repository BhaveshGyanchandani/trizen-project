/**
 * lib/api.js — single integration seam between the UI and the backend.
 *
 * Every request the frontend makes goes through the grouped API objects
 * below; screens never call axios directly. The app is same-origin (the
 * `app/api/*` route handlers live in this same Next.js project), so
 * `API_BASE_URL` defaults to the relative `/api` path and no CORS setup
 * is required. `NEXT_PUBLIC_API_URL` is only needed if the API is ever
 * split out to a separately deployed origin.
 *
 * Every endpoint's request/response contract is documented in
 * `docs/API_SPEC.md` — the shapes referenced in comments below match it.
 */

import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api";

export const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // backend sets the JWT as an httpOnly cookie
});

/**
 * Normalizes both success and failure into predictable shapes so screens
 * never have to think about axios error objects. The backend's own shape
 * is `{ success, data?, message? }` (see docs/API_SPEC.md) — this unwraps
 * `data` on success and surfaces `message` as a plain Error on failure.
 */
client.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong. Please try again.";
    const status = error.response?.status;
    const normalized = new Error(message);
    normalized.status = status;
    return Promise.reject(normalized);
  }
);

/** Registration, login/logout, and session lookup (`/api/auth/*`). */
export const authAPI = {
  register: (payload) => client.post("/auth/register", payload), // { name, email, password, role?, eventIds? }
  login: (payload) => client.post("/auth/login", payload), // { email, password }
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
  checkRegisterStatus: () => client.get("/auth/register"),
};

/** Self-service profile read/update and avatar management — identical for both admin and team_member roles. */
export const profileAPI = {
  get: () => client.get("/auth/profile"),
  // { name?, email?, phone?, bio?, currentPassword?, newPassword? } — every
  // field optional, send only what changed. Password change requires both
  // currentPassword and newPassword together.
  update: (payload) => client.patch("/auth/profile", payload),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("avatar", file);
    return client.post("/auth/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  removeAvatar: () => client.delete("/auth/avatar"),
};

/** Admin-only management of the team-member roster (`/api/team-members`). */
export const teamMembersAPI = {
  create: (payload) => client.post("/team-members", payload), // { name, email, password, eventId? }
  list: () => client.get("/team-members"),
  remove: (memberId) => client.delete(`/team-members/${memberId}`),
};

/** Event creation, listing, detail, and team assignment. */
export const eventsAPI = {
  create: (payload) => client.post("/events", payload), // { name }
  list: () => client.get("/events"), // server filters by role
  getById: (id) => client.get(`/events/${id}`),
  addTeamMember: (id, userId) =>
    client.post(`/events/${id}/team-members`, { userId }),
  removeTeamMember: (id, userId) =>
    client.delete(`/events/${id}/team-members`, { data: { userId } }),
  // Admin-only: rename and/or replace the cover photo. Always sent as
  // multipart so a single call can carry either field or both — the name
  // input is included even when there's no new file.
  update: (id, { name, coverPhotoFile } = {}) => {
    const form = new FormData();
    if (name !== undefined) form.append("name", name);
    if (coverPhotoFile) form.append("coverPhoto", coverPhotoFile);
    return client.patch(`/events/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

/** Photo upload, listing, gallery-selection toggling, and deletion. */
export const photosAPI = {
  upload: (eventId, files, onProgress) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("photos", file));
    return client.post(`/events/${eventId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
  },
  uploadOne: (eventId, file, onProgress) => {
    const form = new FormData();
    form.append("photos", file);
    return client.post(`/events/${eventId}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  listAllForEvent: (eventId, filters = {}) => client.get(`/events/${eventId}/photos`, { params: filters }), // admin
  listMineForEvent: (eventId) =>
    client.get(`/events/${eventId}/photos/mine`), // team_member
  toggleSelect: (photoId, selected) =>
    client.patch(`/photos/${photoId}/select`, { selected }),
  remove: (photoId) => client.delete(`/photos/${photoId}`),
};

/** Admin-side gallery lifecycle: publish, status, unpublish, PIN regeneration. */
export const galleryAdminAPI = {
  publish: (eventId) => client.post(`/events/${eventId}/gallery/publish`),
  getStatus: (eventId) => client.get(`/events/${eventId}/gallery`),
  unpublish: (eventId) => client.post(`/events/${eventId}/gallery/unpublish`),
  // Explicit reset: invalidates the current PIN and issues a new one
  // without touching photo selections or publish state.
  regeneratePin: (eventId) => client.post(`/events/${eventId}/gallery/regenerate-pin`),
};

/** Public, unauthenticated endpoints used by customers on a published gallery page. */
export const galleryPublicAPI = {
  getMeta: (slug) => client.get(`/gallery/${slug}`),
  verifyPin: (slug, pin) => client.post(`/gallery/${slug}/verify-pin`, { pin }),
  createRequest: (slug, payload) => client.post(`/gallery/${slug}/requests`, payload),
  saveFeedback: (slug, payload) => client.post(`/gallery/${slug}/feedback`, payload),
  listFeedback: (slug) => client.get(`/gallery/${slug}/feedback`),
};

/** Admin/team read access to customer star ratings and comments left on an event's photos. */
export const photoFeedbackAPI = {
  listForEvent: (eventId) => client.get(`/events/${eventId}/photo-feedback`),
};

/** Admin review queue for customer photo-removal requests. */
export const photoRequestsAPI = {
  listForEvent: (eventId, status = "all") => client.get(`/events/${eventId}/photo-requests`, { params: { status } }),
  review: (requestId, status) => client.patch(`/photo-requests/${requestId}`, { status }),
};
