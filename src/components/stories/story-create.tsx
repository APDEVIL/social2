"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MediaUpload } from "@/components/shared-primitives/media-upload";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface StoryCreateProps {
  /** Optionally controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If true, renders an "Add story" button as the trigger */
  showTrigger?: boolean;
}

export function StoryCreate({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: StoryCreateProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const utils = api.useUtils();

  const createStory = api.story.create.useMutation({
    onSuccess: () => {
      toast.success("Story posted!");
      setUploadedUrl(null);
      setOpen(false);
      void utils.story.getFeed.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUploadComplete = (urls: string[]) => {
    const url = urls[0];
    if (!url) return;
    setUploadedUrl(url);
    // Detect type from extension
    const isVideo = /\.(mp4|webm|mov)$/i.test(url);
    setMediaType(isVideo ? "video" : "image");
  };

  const handlePost = () => {
    if (!uploadedUrl) return;
    createStory.mutate({ mediaUrl: uploadedUrl, type: mediaType });
  };

  const handleReset = () => {
    setUploadedUrl(null);
  };

  return (
    <>
      {showTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1.5"
          aria-label="Add story"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-brand bg-brand/10 transition-colors hover:bg-brand/20">
            <Plus className="h-6 w-6 text-brand" />
          </div>
          <span className="max-w-[56px] truncate text-xs font-medium text-muted-foreground">
            Add story
          </span>
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>

          {!uploadedUrl ? (
            <MediaUpload
              endpoint="story"
              onUploadComplete={handleUploadComplete}
              accept="both"
              maxFiles={1}
            />
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative aspect-[9/16] max-h-72 overflow-hidden rounded-xl bg-black">
                {mediaType === "video" ? (
                  <video
                    src={uploadedUrl}
                    className="h-full w-full object-contain"
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadedUrl}
                    alt="Story preview"
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                  disabled={createStory.isPending}
                >
                  Change
                </Button>
                <Button
                  className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={handlePost}
                  disabled={createStory.isPending}
                >
                  {createStory.isPending ? "Posting…" : "Post Story"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}