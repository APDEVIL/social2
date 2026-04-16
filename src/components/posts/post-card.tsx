"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { MoreHorizontal, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { PostActions } from "./post-actions";
import { CommentSheet } from "./comment-sheet";
import { cn, formatTimeAgo, truncate } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface PostMedia {
  url: string;
  type: string;
  width?: number | null;
  height?: number | null;
}

interface PostAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface PostCardProps {
  postId: string;
  author: PostAuthor;
  caption?: string | null;
  location?: string | null;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: Date | string;
  isOwnPost?: boolean;
}

export function PostCard({
  postId,
  author,
  caption,
  location,
  media,
  likeCount,
  commentCount,
  isLiked,
  isSaved,
  createdAt,
  isOwnPost = false,
}: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentSlide, setCurrentSlide] = useState(0);

  const utils = api.useUtils();
  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      void utils.post.getFeed.invalidate();
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
    setCurrentSlide((s) => Math.max(0, s - 1));
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
    setCurrentSlide((s) => Math.min(media.length - 1, s + 1));
  }, [emblaApi, media.length]);

  // Double-tap to like
  const [lastTap, setLastTap] = useState(0);
  const like = api.post.like.useMutation();
  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked) like.mutate({ postId });
    }
    setLastTap(now);
  }

  const showCaption = caption && caption.trim().length > 0;
  const captionText = captionExpanded ? caption! : truncate(caption ?? "", 120);
  const isLong = (caption?.length ?? 0) > 120;

  return (
    <>
      <article className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/${author.username}`}>
            <UserAvatar
              src={author.avatarUrl}
              username={author.username}
              size="md"
              isVerified={author.isVerified}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/${author.username}`} className="hover:underline">
              <p className="text-sm font-semibold leading-tight">{author.username}</p>
            </Link>
            {location && (
              <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{formatTimeAgo(createdAt)}</span>
            {isOwnPost && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deletePost.mutate({ postId })}
                    disabled={deletePost.isPending}
                  >
                    {deletePost.isPending ? "Deleting…" : "Delete post"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Media carousel */}
        <div className="relative bg-black" onClick={handleDoubleTap}>
          {media.length > 1 ? (
            <>
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {media.map((m, i) => (
                    <div key={i} className="relative flex-[0_0_100%] min-w-0">
                      <MediaItem media={m} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Prev / Next buttons */}
              {currentSlide > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); scrollPrev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-md transition-opacity"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {currentSlide < media.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); scrollNext(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-md"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full transition-all",
                      i === currentSlide
                        ? "h-2 w-4 bg-white"
                        : "h-2 w-2 bg-white/50",
                    )}
                  />
                ))}
              </div>
            </>
          ) : media[0] ? (
            <MediaItem media={media[0]} />
          ) : null}
        </div>

        {/* Actions */}
        <div className="px-3 pt-2">
          <PostActions
            postId={postId}
            likeCount={likeCount}
            commentCount={commentCount}
            isLiked={isLiked}
            isSaved={isSaved}
            onCommentClick={() => setCommentsOpen(true)}
          />
        </div>

        {/* Caption */}
        {showCaption && (
          <div className="px-4 pb-3">
            <p className="text-sm leading-relaxed">
              <Link href={`/${author.username}`} className="font-semibold mr-1.5 hover:underline">
                {author.username}
              </Link>
              {captionText}
              {isLong && !captionExpanded && (
                <button
                  onClick={() => setCaptionExpanded(true)}
                  className="ml-1 text-muted-foreground hover:text-foreground text-sm font-medium"
                >
                  more
                </button>
              )}
            </p>
          </div>
        )}

        {/* View comments link */}
        {commentCount > 0 && (
          <button
            onClick={() => setCommentsOpen(true)}
            className="px-4 pb-3 text-sm text-muted-foreground hover:text-foreground transition-colors block"
          >
            View all {commentCount} comments
          </button>
        )}
      </article>

      <CommentSheet
        postId={postId}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </>
  );
}

// ─── Media renderer ───────────────────────────────────────────────────────────
function MediaItem({ media }: { media: PostMedia }) {
  if (media.type === "video") {
    return (
      <video
        src={media.url}
        className="w-full max-h-[600px] object-contain"
        controls
        playsInline
        preload="metadata"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      alt=""
      className="w-full max-h-[600px] object-contain"
      loading="lazy"
    />
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="px-4 py-3 space-y-2">
        <div className="flex gap-3">
          <div className="h-6 w-16 rounded bg-muted animate-pulse" />
          <div className="h-6 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}