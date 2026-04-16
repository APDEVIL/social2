"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface PostActionsProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  onCommentClick?: () => void;
}

export function PostActions({
  postId,
  likeCount,
  commentCount,
  isLiked: initialLiked,
  isSaved: initialSaved,
  onCommentClick,
}: PostActionsProps) {
  const utils = api.useUtils();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [isAnimating, setIsAnimating] = useState(false);

  const like = api.post.like.useMutation({
    onMutate: () => {
      setLiked(true);
      setLocalLikeCount((n) => n + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 400);
    },
    onError: () => {
      setLiked(false);
      setLocalLikeCount((n) => n - 1);
      toast.error("Failed to like");
    },
    onSuccess: () => void utils.post.getFeed.invalidate(),
  });

  const unlike = api.post.unlike.useMutation({
    onMutate: () => {
      setLiked(false);
      setLocalLikeCount((n) => Math.max(0, n - 1));
    },
    onError: () => {
      setLiked(true);
      setLocalLikeCount((n) => n + 1);
      toast.error("Failed to unlike");
    },
    onSuccess: () => void utils.post.getFeed.invalidate(),
  });

  const save = api.post.save.useMutation({
    onMutate: () => setSaved(true),
    onError: () => setSaved(false),
  });

  const unsave = api.post.unsave.useMutation({
    onMutate: () => setSaved(false),
    onError: () => setSaved(true),
  });

  function handleLike() {
    if (liked) {
      unlike.mutate({ postId });
    } else {
      like.mutate({ postId });
    }
  }

  function handleSave() {
    if (saved) {
      unsave.mutate({ postId });
    } else {
      save.mutate({ postId });
    }
  }

  function handleShare() {
    void navigator.clipboard.writeText(`${window.location.origin}/p/${postId}`);
    toast.success("Link copied!");
  }

  return (
    <div className="flex items-center px-1">
      {/* Like */}
      <button
        onClick={handleLike}
        disabled={like.isPending || unlike.isPending}
        className="group flex items-center gap-1.5 py-2 pr-3"
      >
        <Heart
          className={cn(
            "h-6 w-6 transition-all",
            liked
              ? "fill-rose-500 text-rose-500 scale-110"
              : "text-foreground group-hover:text-rose-400",
            isAnimating && "scale-125",
          )}
        />
        <span
          className={cn(
            "text-sm font-semibold tabular-nums transition-colors",
            liked ? "text-rose-500" : "text-muted-foreground",
          )}
        >
          {formatCount(localLikeCount)}
        </span>
      </button>

      {/* Comment */}
      <button
        onClick={onCommentClick}
        className="group flex items-center gap-1.5 py-2 pr-3"
      >
        <MessageCircle className="h-6 w-6 text-foreground group-hover:text-brand transition-colors" />
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {formatCount(commentCount)}
        </span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="group flex items-center gap-1.5 py-2 pr-3"
      >
        <Send className="h-6 w-6 text-foreground group-hover:text-brand transition-colors -rotate-12" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save */}
      <button onClick={handleSave} disabled={save.isPending || unsave.isPending} className="group py-2 pl-3">
        <Bookmark
          className={cn(
            "h-6 w-6 transition-all",
            saved
              ? "fill-foreground text-foreground"
              : "text-foreground group-hover:text-brand",
          )}
        />
      </button>
    </div>
  );
}