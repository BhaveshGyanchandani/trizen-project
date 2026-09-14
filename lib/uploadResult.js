export function summarizeUploadResults(results = []) {
  const uploadedCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const success = uploadedCount > 0;

  const data = { uploadedCount, failedCount, results };
  const message = failedCount > 0 && uploadedCount > 0 ? "Some photos could not be uploaded." : undefined;

  return { success, data, message };
}

export function buildUploadFailure({ filename, stored, error, cleanupFailed }) {
  const name = filename || "photo";
  const stage = stored ? "database_failed" : "storage_failed";
  let message = error?.message || String(error || "Upload failed");
  if (cleanupFailed) {
    message = `${message} Cloudinary cleanup also failed; please contact an admin.`;
  }
  return {
    filename: name,
    success: false,
    stage,
    error: error?.message || String(error || "Upload failed"),
    message,
    cleanupFailed: Boolean(cleanupFailed),
  };
}
