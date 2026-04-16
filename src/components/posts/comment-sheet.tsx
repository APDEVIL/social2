"use client";

import { useState, useRef, useEffect } from "react";
import { X, Heart, CornerDownRight, Loader2, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { cn, formatTimeAgo } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface CommentSheetProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentSheet({ postId, open, onOpenChange }: CommentSheetProps) {
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const { data: comments = [], isLoading } = api.post.getComments.useQuery(
    { postId, limit: 50 },
    { enabled: open, staleTime: 10_000 },
  );

  const addComment = api.post.addComment.useMutation({
    onSuccess: () => {
      setContent("");
      setReplyTo(null);
      void utils.post.getComments.invalidate({ postId });
      void utils.post.getFeed.invalidate();
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const likeComment = api.post.likeComment.useMutation();
  const unlikeComment = api.post.unlikeComment.useMutation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate({
      postId,
      content: content.trim(),
      parentId: replyTo?.id,
    });
  }

  function handleReply(commentId: string, username: string) {
    setReplyTo({ id: commentId, username });
    setContent(`@${username} `);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function clearReply() {
    setReplyTo(null);
    setContent("");
  }

  // Auto-focus input when replying
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col rounded-t-2xl p-0 gap-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm font-semibold text-center">Comments</SheetTitle>
        </SheetHeader>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base font-semibold">No comments yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to comment</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onLike={(id) => likeComment.mutate({ commentId: id })}
                onUnlike={(id) => unlikeComment.mutate({ commentId: id })}
              />
            ))
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background pb-safe">
          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 text-xs text-muted-foreground">
              <span>
                Replying to <span className="font-semibold text-brand">@{replyTo.username}</span>
              </span>
              <button onClick={clearReply}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
            <Input
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 h-10 rounded-full bg-muted border-0 text-sm focus-visible:ring-1 focus-visible:ring-brand"
              maxLength={1000}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!content.trim() || addComment.isPending}
              className="h-10 w-10 rounded-full bg-brand text-brand-foreground hover:bg-brand/90 shrink-0"
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Comment item ─────────────────────────────────────────────────────────────
function CommentItem({
  comment,
  onReply,
  onLike,
  onUnlike,
}: {
  comment: {
    id: string;
    content: string;
    likeCount: number;
    createdAt: Date | string;
    author: { id: string; username: string; name?: string; avatarUrl: string | null; isVerified: boolean };
    replies?: typeof comment[];
  };
  onReply: (id: string, username: string) => void;
  onLike: (id: string) => void;
  onUnlike: (id: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount);
  const [showReplies, setShowReplies] = useState(false);

  function handleLike() {
    if (liked) {
      setLiked(false);
      setLocalLikeCount((n) => Math.max(0, n - 1));
      onUnlike(comment.id);
    } else {
      setLiked(true);
      setLocalLikeCount((n) => n + 1);
      onLike(comment.id);
    }
  }

  const replies = comment.replies ?? [];

  return (
    <div className="flex gap-3">
      <UserAvatar
        src={comment.author.avatarUrl}
        username={comment.author.username}
        size="sm"
        isVerified={comment.author.isVerified}
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="text-sm font-semibold mr-1.5">{comment.author.username}</span>
            <span className="text-sm leading-snug">{comment.content}</span>
          </div>
          {/* Like button */}
          <button onClick={handleLike} className="flex flex-col items-center shrink-0 pt-0.5">
            <Heart
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                liked ? "fill-rose-500 text-rose-500" : "text-muted-foreground",
              )}
            />
            {localLikeCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{localLikeCount}</span>
            )}
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
          <button
            onClick={() => onReply(comment.id, comment.author.username)}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <CornerDownRight className="h-3 w-3" />
            Reply
          </button>
          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="text-[11px] font-semibold text-brand"
            >
              {showReplies ? "Hide replies" : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>

        {/* Nested replies */}
        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-border">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onLike={onLike}
                onUnlike={onUnlike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}