export function validateImageFile(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!file || !allowedTypes.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are accepted.");
  }
  const maxSize = 20 * 1024 * 1024; // 20 MB
  if (file.size > maxSize) {
    throw new Error("Photo file size must be 20 MB or smaller.");
  }
  return true;
}
