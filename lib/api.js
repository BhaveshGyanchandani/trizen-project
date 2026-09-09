// lib/api.js
//
// Single integration seam. Every request this frontend makes goes through
// here, and every route/shape below is taken verbatim from the backend's
// docs/API_SPEC.md. When the real API is live, integration is:
//
//   1. Set NEXT_PUBLIC_API_URL in .env.local to the deployed backend origin
//      (e.g. https://trizen-photo-api.onrender.com/api).
//   2. Make sure the backend's CLIENT_ORIGIN / CORS allow-list includes
//      this frontend's origin, with credentials enabled.
//
// Nothing else in the app needs to change — every screen calls the
// functions exported here, never axios directly.

import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api";

export const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // backend sets the JWT as an httpOnly cookie
});

// Normalizes both success and failure into predictable shapes so screens
// never have to think about axios error objects. Backend's own shape is
// { success, data?, message? } per API_SPEC.md — we unwrap `data` here and
// surface `message` as a plain Error.
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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authAPI = {
  register: (payload) => client.post("/auth/register", payload), // { name, email, password }
  login: (payload) => client.post("/auth/login", payload), // { email, password }
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
};

// ---------------------------------------------------------------------------
// Team members (admin only)
// ---------------------------------------------------------------------------
export const teamMembersAPI = {
  create: (payload) => client.post("/team-members", payload), // { name, email, password, eventId? }
  list: () => client.get("/team-members"),
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export const eventsAPI = {
  create: (payload) => client.post("/events", payload), // { name }
  list: () => client.get("/events"), // server filters by role
  getById: (id) => client.get(`/events/${id}`),
  addTeamMember: (id, userId) =>
    client.post(`/events/${id}/team-members`, { userId }),
};

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
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
  listAllForEvent: (eventId) => client.get(`/events/${eventId}/photos`), // admin
  listMineForEvent: (eventId) =>
    client.get(`/events/${eventId}/photos/mine`), // team_member
  toggleSelect: (photoId, selected) =>
    client.patch(`/photos/${photoId}/select`, { selected }),
};

// ---------------------------------------------------------------------------
// Gallery — admin management
// ---------------------------------------------------------------------------
export const galleryAdminAPI = {
  publish: (eventId) => client.post(`/events/${eventId}/gallery/publish`),
  getStatus: (eventId) => client.get(`/events/${eventId}/gallery`),
  unpublish: (eventId) => client.post(`/events/${eventId}/gallery/unpublish`),
};

// ---------------------------------------------------------------------------
// Gallery — public, customer-facing, no auth
// ---------------------------------------------------------------------------
export const galleryPublicAPI = {
  getMeta: (slug) => client.get(`/gallery/${slug}`),
  verifyPin: (slug, pin) => client.post(`/gallery/${slug}/verify-pin`, { pin }),
};
