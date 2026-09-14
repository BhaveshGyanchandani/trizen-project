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
