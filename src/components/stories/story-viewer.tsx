"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { formatTimeAgo } from "@/lib/utils";

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  createdAt: Date;
  viewCount: number;
  user: {
    id: string;
    name: string;
    username: string;
    image?: string | null;
  };
}

interface StoryGroup {
  userId: string;
  user: Story["user"];
  stories: Story[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5s per image story

export function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);

  const group = groups[groupIdx]!;
  const story = group.stories[storyIdx]!;
  const isVideo = story.mediaType === "video";

  const markViewed = api.story.markViewed.useMutation();

  // Mark story as viewed
  useEffect(() => {
    markViewed.mutate({ storyId: story.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  const goNext = useCallback(() => {
    setProgress(0);
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, group.stories.length, groupIdx, groups.length, onClose]);

  const goPrev = () => {
    setProgress(0);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStoryIdx(0);
    }
  };

  // Progress timer
  useEffect(() => {
    if (isVideo) return; // video drives its own progress
    if (paused) return;

    setProgress(0);
    startTimeRef.current = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 50);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [story.id, paused, isVideo, goNext]);

  // Video progress
  const handleVideoTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleVideoEnded = () => goNext();

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev group */}
      {groupIdx > 0 && (
        <button
          onClick={() => { setGroupIdx((i) => i - 1); setStoryIdx(0); setProgress(0); }}
          className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Story card */}
      <div
        className="relative mx-auto flex h-full max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-black"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-2 z-20 flex w-full gap-1 px-2">
          {group.stories.map((s, i) => (
            <div
              key={s.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white transition-none"
                style={{
                  width:
                    i < storyIdx
                      ? "100%"
                      : i === storyIdx
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute top-6 z-20 flex w-full items-center gap-3 px-3 pt-2">
          <UserAvatar
            src={group.user.image}
            username={group.user.username}
            size="sm"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white drop-shadow">
              {group.user.username}
            </span>
            <span className="text-xs text-white/70">
              {formatTimeAgo(story.createdAt)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-white/70">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs">{story.viewCount}</span>
          </div>
          {isVideo && (
            <button
              onClick={() => setMuted((m) => !m)}
              className="ml-1 text-white/80"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Media */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={story.mediaUrl}
            className="h-full w-full object-cover"
            autoPlay
            muted={muted}
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.mediaUrl}
            alt="Story"
            className="h-full w-full object-cover"
          />
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <div className="h-full w-1/3" onClick={goPrev} />
          <div className="h-full w-2/3" onClick={goNext} />
        </div>
      </div>

      {/* Next group */}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={() => { setGroupIdx((i) => i + 1); setStoryIdx(0); setProgress(0); }}
          className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}