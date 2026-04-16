"use client";

import Link from "next/link";
import { Heart, MessageCircle, Film, Copy, Eye } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

interface PostGridItemProps {
  postId: string;
  mediaUrl: string;
  mediaType: string;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  isMultiMedia?: boolean;
  isReel?: boolean;
  href?: string;
  className?: string;
}

export function PostGridItem({
  postId,
  mediaUrl,
  mediaType,
  likeCount,
  commentCount,
  viewCount,
  isMultiMedia = false,
  isReel = false,
  href,
  className,
}: PostGridItemProps) {
  const destination = href ?? `/p/${postId}`;

  return (
    <Link
      href={destination}
      className={cn("group relative block aspect-square overflow-hidden bg-muted", className)}
    >
      {/* Media */}
      {mediaType === "video" || isReel ? (
        <video
          src={mediaUrl}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Multi-media / reel indicator */}
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        {isMultiMedia && !isReel && (
          <Copy className="h-4 w-4 text-white drop-shadow-md" />
        )}
        {isReel && (
          <Film className="h-4 w-4 text-white drop-shadow-md" />
        )}
      </div>

      {/* Hover overlay with stats */}
      <div className="absolute inset-0 flex items-center justify-center gap-5 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 text-white font-semibold text-sm drop-shadow">
          <Heart className="h-5 w-5 fill-white" />
          {formatCount(likeCount)}
        </span>
        {isReel && viewCount !== undefined ? (
          <span className="flex items-center gap-1.5 text-white font-semibold text-sm drop-shadow">
            <Eye className="h-5 w-5 fill-white" />
            {formatCount(viewCount)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-white font-semibold text-sm drop-shadow">
            <MessageCircle className="h-5 w-5 fill-white" />
            {formatCount(commentCount)}
          </span>
        )}
      </div>
    </Link>
  );
}

export function PostGridItemSkeleton() {
  return (
    <div className="aspect-square bg-muted animate-pulse" />
  );
}