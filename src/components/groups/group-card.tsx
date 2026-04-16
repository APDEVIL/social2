"use client";

import Link from "next/link";
import { Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCount, getInitials, userColor } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface GroupCardProps {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  memberCount: number;
  postCount?: number;
  isPrivate: boolean;
  isMember?: boolean;
  className?: string;
}

export function GroupCard({
  id,
  name,
  description,
  avatarUrl,
  coverUrl,
  memberCount,
  postCount,
  isPrivate,
  isMember = false,
  className,
}: GroupCardProps) {
  const utils = api.useUtils();

  const join = api.group.join.useMutation({
    onSuccess: (data) => {
      if (data.alreadyMember) {
        toast.info("You're already a member");
      } else {
        toast.success(`Joined ${name}!`);
        void utils.group.discover.invalidate();
        void utils.group.getMyGroups.invalidate();
      }
    },
    onError: () => toast.error("Failed to join group"),
  });

  const leave = api.group.leave.useMutation({
    onSuccess: () => {
      toast.success(`Left ${name}`);
      void utils.group.discover.invalidate();
      void utils.group.getMyGroups.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to leave group"),
  });

  const fallbackColor = userColor(name);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5",
        className,
      )}
    >
      {/* Cover image */}
      <Link href={`/groups/${id}`} className="block">
        <div className="relative h-28 w-full overflow-hidden bg-muted">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(135deg, ${fallbackColor}33, ${fallbackColor}88)`,
              }}
            />
          )}

          {/* Private badge */}
          {isPrivate && (
            <Badge
              variant="secondary"
              className="absolute right-2 top-2 gap-1 text-xs backdrop-blur-sm bg-background/80"
            >
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Group avatar + name */}
        <div className="flex items-start gap-3">
          <Link href={`/groups/${id}`}>
            <div className="relative -mt-8 h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-background shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: fallbackColor }}
                >
                  {getInitials(name)}
                </div>
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0 pt-1">
            <Link href={`/groups/${id}`}>
              <h3 className="font-semibold text-sm leading-tight line-clamp-1 hover:text-brand transition-colors">
                {name}
              </h3>
            </Link>
            {/* Stats */}
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {formatCount(memberCount)} members
              </span>
              {postCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {formatCount(postCount)} posts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {/* Join / Leave button */}
        <div className="mt-auto">
          {isMember ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => leave.mutate({ groupId: id })}
              disabled={leave.isPending}
            >
              {leave.isPending ? "Leaving…" : "Joined"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
              onClick={() => join.mutate({ groupId: id })}
              disabled={join.isPending}
            >
              {join.isPending ? "Joining…" : isPrivate ? "Request to Join" : "Join Group"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function GroupCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-28 w-full bg-muted animate-pulse" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="-mt-8 h-14 w-14 rounded-xl bg-muted animate-pulse shrink-0" />
          <div className="flex-1 pt-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-muted animate-pulse mt-auto" />
      </div>
    </div>
  );
}