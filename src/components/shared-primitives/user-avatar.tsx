"use client";

import { CheckCircle2 } from "lucide-react";
import { cn, getInitials, userColor } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE: Record<AvatarSize, { avatar: string; ring: string; badge: string; text: string }> = {
  xs:  { avatar: "h-7 w-7",   ring: "p-[2px] -m-[2px]", badge: "h-3.5 w-3.5 -bottom-0.5 -right-0.5", text: "text-[10px]" },
  sm:  { avatar: "h-8 w-8",   ring: "p-[2px] -m-[2px]", badge: "h-4 w-4 -bottom-0.5 -right-0.5",     text: "text-xs" },
  md:  { avatar: "h-10 w-10", ring: "p-[2px] -m-[2px]", badge: "h-4 w-4 -bottom-0.5 -right-0.5",     text: "text-sm" },
  lg:  { avatar: "h-14 w-14", ring: "p-[2.5px] -m-[2.5px]", badge: "h-5 w-5 -bottom-1 -right-1",     text: "text-base" },
  xl:  { avatar: "h-20 w-20", ring: "p-[3px] -m-[3px]",     badge: "h-6 w-6 -bottom-1 -right-1",     text: "text-lg" },
  "2xl": { avatar: "h-28 w-28", ring: "p-[3px] -m-[3px]",   badge: "h-7 w-7 -bottom-1 -right-1",     text: "text-2xl" },
};

interface UserAvatarProps {
  src?: string | null;
  username: string;
  size?: AvatarSize;
  isVerified?: boolean;
  showVerified?: boolean;
  hasStory?: boolean;
  showStoryRing?: boolean;
  className?: string;
  onClick?: () => void;
}

export function UserAvatar({
  src,
  username,
  size = "md",
  isVerified = false,
  showVerified = true,
  hasStory = false,
  showStoryRing = false,
  className,
  onClick,
}: UserAvatarProps) {
  const s = SIZE[size];
  const fallbackBg = userColor(username);
  const initials = getInitials(username);

  const avatarEl = (
    <div
      className={cn(
        "relative overflow-hidden rounded-full shrink-0",
        s.avatar,
        className,
      )}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={username}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-white",
            s.text,
          )}
          style={{ backgroundColor: fallbackBg }}
        >
          {initials}
        </div>
      )}
    </div>
  );

  // Story ring — gradient border when user has active story
  const withRing = showStoryRing && hasStory ? (
    <div
      className={cn(
        "relative rounded-full shrink-0",
        s.ring,
      )}
      style={{
        background: "linear-gradient(135deg, #F59E0B, #EF4444, #8B5CF6)",
        padding: "2.5px",
      }}
    >
      <div className="rounded-full bg-background" style={{ padding: "2px" }}>
        {avatarEl}
      </div>
    </div>
  ) : avatarEl;

  // Verified badge
  if (isVerified && showVerified) {
    return (
      <div className="relative inline-flex shrink-0">
        {withRing}
        <CheckCircle2
          className={cn(
            "absolute fill-brand text-background",
            s.badge,
          )}
        />
      </div>
    );
  }

  return <div className="relative inline-flex shrink-0">{withRing}</div>;
}