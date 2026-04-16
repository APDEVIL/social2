"use client";

import { Check, CheckCheck, Trash2, CornerUpLeft } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";

interface MessageBubbleProps {
  id: string;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  status: "sent" | "delivered" | "read";
  createdAt: Date | string;
  isDeleted: boolean;
  isMine: boolean;
  sender: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    content?: string | null;
    senderName: string;
  } | null;
  showAvatar?: boolean;
  isGroupConversation?: boolean;
  onReply?: () => void;
  onDelete?: () => void;
}

export function MessageBubble({
  content,
  mediaUrl,
  mediaType,
  status,
  createdAt,
  isDeleted,
  isMine,
  sender,
  replyTo,
  showAvatar = true,
  isGroupConversation = false,
  onReply,
  onDelete,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "group flex items-end gap-2 max-w-[85%]",
        isMine ? "ml-auto flex-row-reverse" : "mr-auto",
      )}
    >
      {/* Avatar — only for others in group chats */}
      {!isMine && isGroupConversation && (
        <div className="shrink-0 mb-1">
          {showAvatar ? (
            <UserAvatar src={sender.avatarUrl} username={sender.username} size="xs" />
          ) : (
            <div className="w-7" />
          )}
        </div>
      )}

      <div className={cn("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}>
        {/* Sender name in group chats */}
        {!isMine && isGroupConversation && showAvatar && (
          <span className="text-[11px] font-semibold text-muted-foreground px-1">
            {sender.name || sender.username}
          </span>
        )}

        {/* Reply preview */}
        {replyTo && !isDeleted && (
          <div
            className={cn(
              "flex flex-col rounded-xl px-3 py-1.5 text-xs border-l-2 mb-0.5 max-w-full",
              isMine
                ? "bg-muted border-brand/50 items-end"
                : "bg-muted border-muted-foreground/30",
            )}
          >
            <span className="font-semibold text-brand">{replyTo.senderName}</span>
            <span className="text-muted-foreground line-clamp-1">{replyTo.content}</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-sm break-words max-w-full",
            isMine
              ? "bg-brand text-brand-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md",
            isDeleted && "opacity-50 italic",
          )}
        >
          {isDeleted ? (
            <span className="flex items-center gap-1.5 text-xs">
              <Trash2 className="h-3 w-3" /> Message deleted
            </span>
          ) : (
            <>
              {/* Media */}
              {mediaUrl && (
                <div className="mb-2 -mx-1">
                  {mediaType === "video" ? (
                    <video
                      src={mediaUrl}
                      className="max-w-[260px] rounded-xl"
                      controls
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt="media"
                      className="max-w-[260px] rounded-xl object-cover"
                    />
                  )}
                </div>
              )}
              {/* Text */}
              {content && <p className="whitespace-pre-wrap leading-relaxed">{content}</p>}
            </>
          )}

          {/* Action buttons — appear on hover */}
          {!isDeleted && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isMine ? "-left-20" : "-right-20",
              )}
            >
              {onReply && (
                <button
                  onClick={onReply}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  title="Reply"
                >
                  <CornerUpLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {isMine && onDelete && (
                <button
                  onClick={onDelete}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Time + status */}
        <div className={cn("flex items-center gap-1 px-1", isMine ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(createdAt)}</span>
          {isMine && !isDeleted && (
            <span className="text-[10px] text-muted-foreground">
              {status === "read" ? (
                <CheckCheck className="h-3 w-3 text-brand" />
              ) : status === "delivered" ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}