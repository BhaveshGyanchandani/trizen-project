/**
 * Shared serializers that convert Mongoose documents into the plain JSON
 * shapes returned by the API, decoupling response payloads from internal
 * schema/storage details (e.g. Cloudinary vs. legacy GridFS fields).
 */
/**
 * Serializes an Event document for API responses: resolves the cover
 * photo to a fetchable URL (or null), normalizes `createdBy` and
 * `assignedTeam` to plain ids/objects, and attaches the event's photo
 * count from a pre-computed count map.
 */
export function serializeEvent(event, photoCountsMap = new Map()) {
  const eventId = String(event._id);
  const photoCount = photoCountsMap.get(eventId) || photoCountsMap.get(event._id) || 0;
  const hasCover = Boolean(
    event.coverPhotoCloudinaryPublicId ||
    event.coverPhotoGridfsId ||
    event.coverPhotoStorageProvider
  );

  const teamMembers = (event.assignedTeam || []).map((m) => {
    if (m && typeof m === "object" && m._id) {
      return { id: String(m._id), name: m.name, email: m.email };
    }
    return m;
  });

  return {
    id: eventId,
    name: event.name,
    createdBy:
      typeof event.createdBy === "object" && event.createdBy !== null
        ? String(event.createdBy._id)
        : String(event.createdBy || ""),
    galleryStatus: event.galleryPublished ? "published" : "draft",
    gallerySlug: event.gallerySlug || null,
    coverPhotoUrl: hasCover ? `/api/events/${eventId}/cover` : null,
    photoCount,
    teamMembers,
    createdAt: event.createdAt,
  };
}

/**
 * Serializes a Photo document for API responses: normalizes `uploadedBy`
 * to a plain `{ id, name }` and exposes a stable, storage-agnostic URL
 * for fetching the image bytes regardless of whether they live in
 * Cloudinary or the legacy GridFS store.
 */
export function serializePhoto(photo) {
  const photoId = String(photo._id);
  let uploadedBy = photo.uploadedBy;
  if (uploadedBy && typeof uploadedBy === "object" && uploadedBy._id) {
    uploadedBy = { id: String(uploadedBy._id), name: uploadedBy.name };
  }

  return {
    id: photoId,
    filename: photo.filename,
    fileSize: photo.fileSize,
    selectedForGallery: Boolean(photo.selectedForGallery),
    publishedForGallery: Boolean(photo.publishedForGallery),
    excludedFromGallery: Boolean(photo.excludedFromGallery),
    eventId: photo.eventId,
    uploadedBy,
    storageUrl: `/api/photos/${photoId}/file`,
    createdAt: photo.createdAt,
  };
}
