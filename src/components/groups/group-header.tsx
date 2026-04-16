"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Lock,
  Globe,
  Settings,
  UserPlus,
  LogOut,
  MoreHorizontal,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCount, getInitials, userColor } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface GroupHeaderProps {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  memberCount: number;
  postCount: number;
  isPrivate: boolean;
  isMember: boolean;
  myRole: "owner" | "admin" | "member" | null;
  createdBy: { id: string; username: string; avatarUrl: string | null };
  members: GroupMember[]; // preview members (first 8)
}

export function GroupHeader({
  id,
  name,
  description,
  avatarUrl,
  coverUrl,
  memberCount,
  postCount,
  isPrivate,
  isMember,
  myRole,
  createdBy,
  members,
}: GroupHeaderProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [showFullDesc, setShowFullDesc] = useState(false);

  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin" || isOwner;

  const join = api.group.join.useMutation({
    onSuccess: () => {
      toast.success(`Joined ${name}!`);
      void utils.group.getGroup.invalidate({ groupId: id });
      void utils.group.getMyGroups.invalidate();
    },
    onError: () => toast.error("Failed to join"),
  });

  const leave = api.group.leave.useMutation({
    onSuccess: () => {
      toast.success(`Left ${name}`);
      void utils.group.getGroup.invalidate({ groupId: id });
      void utils.group.getMyGroups.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to leave"),
  });

  const fallbackColor = userColor(name);
  const descShort = description && description.length > 120;
  const displayDesc =
    description && descShort && !showFullDesc
      ? description.slice(0, 120) + "…"
      : description;

  return (
    <div className="w-full">
      {/* Cover */}
      <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-t-2xl bg-muted">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${fallbackColor}44, ${fallbackColor}cc)`,
            }}
          />
        )}
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
      </div>

      {/* Main info row */}
      <div className="relative px-4 pb-4">
        {/* Avatar — overlaps cover */}
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-background shadow-xl">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-white text-2xl font-black"
                style={{ backgroundColor: fallbackColor }}
              >
                {getInitials(name)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-1">
            {isMember ? (
              <>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9"
                    onClick={() => router.push(`/groups/${id}/settings`)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Invite friends
                    </DropdownMenuItem>
                    {!isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => leave.mutate({ groupId: id })}
                          disabled={leave.isPending}
                        >
                          <LogOut className="h-4 w-4" />
                          {leave.isPending ? "Leaving…" : "Leave group"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                className="h-9 bg-brand text-brand-foreground hover:bg-brand/90 font-semibold gap-1.5"
                onClick={() => join.mutate({ groupId: id })}
                disabled={join.isPending}
              >
                <UserPlus className="h-4 w-4" />
                {join.isPending ? "Joining…" : isPrivate ? "Request to Join" : "Join Group"}
              </Button>
            )}
          </div>
        </div>

        {/* Name + badges */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h1 className="text-2xl font-black tracking-tight">{name}</h1>
          {isPrivate ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Lock className="h-3 w-3" /> Private
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" /> Public
            </Badge>
          )}
          {myRole && (
            <Badge
              className={cn(
                "gap-1 text-xs",
                myRole === "owner"
                  ? "bg-brand text-brand-foreground"
                  : myRole === "admin"
                  ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {myRole === "owner" || myRole === "admin" ? (
                <Shield className="h-3 w-3" />
              ) : null}
              {myRole}
            </Badge>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center">
            <p className="text-base font-bold">{formatCount(memberCount)}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <p className="text-base font-bold">{formatCount(postCount)}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {displayDesc}
            </p>
            {descShort && (
              <button
                onClick={() => setShowFullDesc((v) => !v)}
                className="text-xs text-brand font-medium mt-0.5"
              >
                {showFullDesc ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* Member preview avatars */}
        {members.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="h-7 w-7 overflow-hidden rounded-full border-2 border-background"
                  title={m.name || m.username}
                >
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt={m.username} className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-white text-[9px] font-bold"
                      style={{ backgroundColor: userColor(m.username) }}
                    >
                      {getInitials(m.name || m.username)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {members.slice(0, 3).map((m) => m.name?.split(" ")[0] ?? m.username).join(", ")}
              </span>
              {memberCount > 3 && ` and ${formatCount(memberCount - 3)} others`}
            </p>
          </div>
        )}
      </div>

      <Separator />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function GroupHeaderSkeleton() {
  return (
    <div className="w-full">
      <div className="h-48 md:h-64 w-full bg-muted animate-pulse rounded-t-2xl" />
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="h-20 w-20 rounded-2xl bg-muted animate-pulse border-4 border-background" />
          <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}