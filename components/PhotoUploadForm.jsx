"use client";

import { useRef, useState } from "react";
import { CheckCircle2, RefreshCw, UploadCloud, X } from "lucide-react";
import { photosAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import Button from "./Button";

/** Formats a byte count as a short human-readable size (KB or MB). */
function formatBytes(bytes) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

/**
 * Drag-and-drop / file-picker upload widget for team members adding
 * photos to an event. Queues selected files locally (filtering out
 * non-images), uploads them one at a time with per-file progress and
 * retry-on-failure, and calls `onUploaded` after any successful upload
 * so the parent can refresh its photo list.
 */
export default function PhotoUploadForm({ eventId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (incoming.length !== fileList.length) {
      toast.error("Only image files are accepted — some files were skipped.");
    }
    setFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`, file, state: "waiting", progress: 0, error: "" })),
    ]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadItem = async (item) => {
    setFiles((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, state: "uploading", progress: 0, error: "" } : entry));
    try {
      const payload = await photosAPI.uploadOne(eventId, item.file, (progress) => {
        setFiles((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, progress } : entry));
      });
      const result = payload?.results?.[0];
      if (!result?.success) throw new Error(result?.message || "Upload failed before the photo record was created.");
      setFiles((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, state: "complete", progress: 100, photo: result.photo } : entry));
      return true;
    } catch (err) {
      setFiles((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, state: "failed", error: err.message || "Upload failed. Try again." } : entry));
      return false;
    }
  };

  const handleUpload = async (onlyItem) => {
    const queue = onlyItem ? [onlyItem] : files.filter((item) => item.state === "waiting" || item.state === "failed");
    if (queue.length === 0) return;
    setUploading(true);
    const outcomes = await Promise.all(queue.map(uploadItem));
    const succeeded = outcomes.filter(Boolean).length;
    if (succeeded) onUploaded?.();
    if (succeeded === queue.length) toast.success(`${succeeded} photo${succeeded === 1 ? "" : "s"} fully uploaded.`);
    else toast.error(`${succeeded} uploaded, ${queue.length - succeeded} failed. Retry only the failed photos.`);
    setUploading(false);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <UploadCloud className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="text-[15px] font-medium">Drop photos here</p>
        <p className="mt-1 text-sm text-muted-foreground">or select files from your device</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
        >
          Choose photos
        </Button>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted-foreground">{files.length} selected</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {files.map((item, i) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate">{item.file.name}</p>
                    <p className={`mt-0.5 text-xs ${item.state === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.state === "waiting" && "Waiting to upload"}
                      {item.state === "uploading" && `Uploading… ${item.progress}%`}
                      {item.state === "complete" && "Storage uploaded ✓ Database record created ✓"}
                      {item.state === "failed" && item.error}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {formatBytes(item.file.size)}
                  {item.state === "complete" && <CheckCircle2 className="size-4 text-success" aria-label="Upload complete" />}
                  {item.state === "failed" && (
                    <button type="button" onClick={() => handleUpload(item)} disabled={uploading} className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-40" aria-label={`Retry ${item.file.name}`}>
                      <RefreshCw className="size-3.5" /> Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={uploading || item.state === "complete"}
                    className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                  </span>
                </div>
                {item.state === "uploading" && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <Button type="button" className="mt-4" onClick={() => handleUpload()} disabled={uploading || !files.some((item) => item.state === "waiting" || item.state === "failed")}>
            {uploading ? "Uploading…" : `Upload pending photos`}
          </Button>
        </div>
      )}
    </div>
  );
}
