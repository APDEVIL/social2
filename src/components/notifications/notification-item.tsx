"use client";

import Link from "next/link";
import { Heart, MessageCircle, UserPlus, AtSign, Users, Mail, Film, Eye, ThumbsUp } from "lucide-react";
import { cn, formatTimeAgo, profileUrl } from "@/lib/utils";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { api } from "@/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────
type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "group_invite"
  | "message"
  | "reel_like"
  | "story_view"
  | "comment_like";

interface Actor {
  id: string;
  username: string;
  name: string | null; // Drizzle usually returns name as nullable
  avatarUrl: string | null;
  isVerified: boolean;
}

// FIXED: We now wrap the properties in a `notification` object to match page.tsx
interface NotificationItemProps {
  notification: {
    id: string;
    type: string; // Accepts string from DB, we will cast it below
    actor: Actor;
    isRead: boolean;
    createdAt: Date | string;
    post?: { id: string; media: { url: string; type: string }[] } | null;
    reel?: { id: string; thumbnailUrl: string | null } | null;
    comment?: { id: string; content: string } | null;
    story?: { id: string; mediaUrl: string } | null;
    group?: { id: string; name: string; avatarUrl: string | null } | null;
  }
}

// ─── Icon + color per notification type ──────────────────────────────────────
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  like: { icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
  reel_like: { icon: Film, color: "text-rose-500", bg: "bg-rose-500/10" },
  comment: { icon: MessageCircle, color: "text-brand", bg: "bg-brand/10" },
  comment_like: { icon: ThumbsUp, color: "text-brand", bg: "bg-brand/10" },
  follow: { icon: UserPlus, color: "text-violet-500", bg: "bg-violet-500/10" },
  mention: { icon: AtSign, color: "text-blue-500", bg: "bg-blue-500/10" },
  group_invite: { icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  message: { icon: Mail, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  story_view: { icon: Eye, color: "text-purple-500", bg: "bg-purple-500/10" },
};

function getNotificationText(type: NotificationType, actor: Actor, comment?: { content: string } | null, group?: { name: string } | null): string {
  switch (type) {
    case "like": return "liked your post";
    case "reel_like": return "liked your reel";
    case "comment": return comment ? `commented: "${comment.content.slice(0, 40)}${comment.content.length > 40 ? "…" : ""}"` : "commented on your post";
    case "comment_like": return "liked your comment";
    case "follow": return "started following you";
    case "mention": return "mentioned you in a comment";
    case "group_invite": return group ? `joined your group ${group.name}` : "joined your group";
    case "message": return "sent you a message";
    case "story_view": return "viewed your story";
    default: return "interacted with you";
  }
}

function getNotificationHref(
  type: NotificationType,
  actor: Actor,
  post?: { id: string } | null,
  reel?: { id: string } | null,
  group?: { id: string } | null,
): string {
  switch (type) {
    case "follow": return profileUrl(actor.username);
    case "message": return "/messages";
    case "group_invite": return group ? `/groups/${group.id}` : "/groups";
    case "like":
    case "comment":
    case "comment_like":
    case "mention":
      return post ? `/p/${post.id}` : profileUrl(actor.username);
    case "reel_like": return reel ? `/reels?id=${reel.id}` : "/reels";
    case "story_view": return profileUrl(actor.username);
    default: return "/";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationItem({ notification }: NotificationItemProps) {
  // Destructure from the new nested object
  const { id, type, actor, isRead, createdAt, post, reel, comment, story, group } = notification;
  
  const utils = api.useUtils();
  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => void utils.notification.getAll.invalidate(),
  });

  // Safely cast the string type from the DB to our strict NotificationType
  const notifType = type as NotificationType;
  
  // Fallback to 'like' if a new type is added to the DB but not yet configured
  const config = TYPE_CONFIG[notifType] || TYPE_CONFIG.like; 
  const Icon = config.icon;
  const href = getNotificationHref(notifType, actor, post, reel, group);
  const text = getNotificationText(notifType, actor, comment, group);

  // Thumbnail (post image or reel thumbnail)
  const thumbnail =
    post?.media?.[0]?.url ?? reel?.thumbnailUrl ?? story?.mediaUrl ?? null;

  function handleClick() {
    if (!isRead) markRead.mutate({ notificationId: id });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 rounded-xl",
        !isRead && "bg-brand/5 hover:bg-brand/10",
      )}
    >
      {/* Actor avatar with notification icon badge */}
      <div className="relative shrink-0">
        <UserAvatar
          src={actor.avatarUrl}
          username={actor.username}
          size="md"
          isVerified={actor.isVerified}
          showVerified={false}
        />
        {/* Type icon badge */}
        <span
          className={cn(
            "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background",
            config.bg,
          )}
        >
          <Icon className={cn("h-2.5 w-2.5", config.color)} />
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold">{actor.name || actor.username}</span>{" "}
          <span className="text-muted-foreground">{text}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatTimeAgo(createdAt)}
        </p>
      </div>

      {/* Thumbnail preview */}
      {thumbnail && (
        <div className="shrink-0 ml-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt=""
            className="h-12 w-12 rounded-lg object-cover border border-border"
          />
        </div>
      )}

      {/* Unread dot */}
      {!isRead && (
        <div className="shrink-0 h-2 w-2 rounded-full bg-brand self-center" />
      )}
    </Link>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
export function NotificationItemSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-12 w-12 rounded-lg bg-muted animate-pulse shrink-0" />
    </div>
  );
}