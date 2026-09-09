"use client";

import { useRef, useState } from "react";
import { photosAPI } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import Button from "./Button";

function formatBytes(bytes) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export default function PhotoUploadForm({ eventId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (incoming.length !== fileList.length) {
      toast.error("Only image files are accepted — some files were skipped.");
    }
    setFiles((prev) => [...prev, ...incoming]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await photosAPI.upload(eventId, files, setProgress);
      toast.success(`Uploaded ${files.length} photo${files.length > 1 ? "s" : ""}.`);
      setFiles([]);
      onUploaded?.(uploaded);
    } catch (err) {
      toast.error(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
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
        className={`rounded-[var(--radius-proof)] border border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-safelight bg-safelight-tint/5" : "border-line"
        }`}
      >
        <p className="font-display text-lg">Drop photos here</p>
        <p className="mt-1 text-sm text-ash">or select files from your device</p>
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
          <p className="mb-2 text-sm text-ash">{files.length} selected</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-[var(--radius-proof)] border border-line bg-ink-soft px-3 py-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <span className="ml-3 flex shrink-0 items-center gap-3 font-mono text-xs text-ash">
                  {formatBytes(file.size)}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={uploading}
                    className="text-ash transition-colors hover:text-safelight disabled:opacity-40"
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {uploading && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-soft">
              <div
                className="h-full bg-safelight transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <Button
            type="button"
            className="mt-4"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? `Uploading ${progress}%` : `Upload ${files.length} photo${files.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
