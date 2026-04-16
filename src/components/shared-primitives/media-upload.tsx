"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";

type UploadEndpoint = "postImage" | "reel" | "story" | "avatar" | "chatMedia" | "groupCover";

interface MediaUploadProps {
  endpoint: UploadEndpoint;
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
  accept?: "image" | "video" | "both";
  className?: string;
  /** If provided, shows as a custom trigger instead of the default drop zone */
  trigger?: React.ReactNode;
}

interface FilePreview {
  file: File;
  preview: string;
  type: "image" | "video";
}

export function MediaUpload({
  endpoint,
  onUploadComplete,
  maxFiles = 1,
  accept = "image",
  className,
  trigger,
}: MediaUploadProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { startUpload } = useUploadThing(endpoint, {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setIsUploading(false);
      setProgress(0);
      const urls = res.map((r) => r.url);
      onUploadComplete(urls);
      toast.success(
        urls.length === 1 ? "File uploaded" : `${urls.length} files uploaded`
      );
    },
    onUploadError: (err) => {
      setIsUploading(false);
      setProgress(0);
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const acceptMap: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    video: ["video/mp4", "video/webm", "video/quicktime"],
    both: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
    ],
  };

  const onDrop = useCallback(
    (accepted: File[]) => {
      const newPreviews = accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        type: (file.type.startsWith("video") ? "video" : "image") as
          | "image"
          | "video",
      }));
      setPreviews((prev) => [...prev, ...newPreviews].slice(0, maxFiles));
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap[accept]?.reduce(
      (acc, mime) => ({ ...acc, [mime]: [] }),
      {}
    ),
    maxFiles,
    disabled: isUploading,
  });

  const removeFile = (idx: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]!.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;
    setIsUploading(true);
    await startUpload(previews.map((p) => p.file));
  };

  if (trigger && previews.length === 0) {
    return (
      <div {...getRootProps()} className={cn("cursor-pointer", className)}>
        <input {...getInputProps()} />
        {trigger}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      {previews.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
            isDragActive
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/50 hover:bg-muted/40"
          )}
        >
          <input {...getInputProps()} />
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {accept === "video" ? (
              <Film className="h-6 w-6 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm font-medium">
            {isDragActive ? "Drop here" : "Drag & drop or click to select"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {accept === "image" && "JPG, PNG, GIF, WEBP"}
            {accept === "video" && "MP4, WEBM up to 512MB"}
            {accept === "both" && "Images or videos"}
            {maxFiles > 1 && ` · up to ${maxFiles} files`}
          </p>
        </div>
      )}

      {/* Previews grid */}
      {previews.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            previews.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {previews.map((p, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {p.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.preview}
                  alt={`preview ${i}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={p.preview}
                  className="h-full w-full object-cover"
                  muted
                />
              )}
              {!isUploading && (
                <button
                  onClick={() => removeFile(i)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload progress / button */}
      {previews.length > 0 && (
        <div className="space-y-2">
          {isUploading ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
            >
              <Upload className="h-4 w-4" />
              Upload {previews.length > 1 ? `${previews.length} files` : "file"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}