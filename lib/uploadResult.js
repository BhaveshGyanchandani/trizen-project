/**
 * Shapes the per-file outcomes of a batch photo upload into the
 * standardized response objects the photo-upload API route and its
 * frontend caller both rely on.
 */
/**
 * Rolls a batch of individual upload results into one response envelope:
 * overall `success` (true if at least one file uploaded), counts, and a
 * user-facing `message` when the batch was partially successful.
 */
export function summarizeUploadResults(results = []) {
  const uploadedCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const success = uploadedCount > 0;

  const data = { uploadedCount, failedCount, results };
  const message = failedCount > 0 && uploadedCount > 0 ? "Some photos could not be uploaded." : undefined;

  return { success, data, message };
}

/**
 * Builds a single failed-upload result entry, distinguishing whether the
 * failure happened before or after the file record was persisted
 * (`storage_failed` vs. `database_failed`), and noting when Cloudinary
 * cleanup of an orphaned upload also failed.
 */
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
