"use client";

import { useState } from "react";
import { Grid3x3, Film, Bookmark, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { PostGridItem, PostGridItemSkeleton } from "@/components/posts/post-grid-item";

type Tab = "posts" | "reels" | "saved";

interface ProfileTabsProps {
  userId: string;
  username: string;
  isOwnProfile: boolean;
  isPrivate: boolean;
  isFollowing: boolean;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "posts", label: "Posts", icon: Grid3x3 },
  { id: "reels", label: "Reels", icon: Film },
  { id: "saved", label: "Saved", icon: Bookmark },
];

export function ProfileTabs({
  userId,
  username,
  isOwnProfile,
  isPrivate,
  isFollowing,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  // Only show saved tab to own profile
  const visibleTabs = isOwnProfile ? TABS : TABS.filter((t) => t.id !== "saved");

  // Private account guard — if private and not following, show locked state
  const isLocked = isPrivate && !isFollowing && !isOwnProfile;

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-1">
        {isLocked ? (
          <LockedProfile username={username} />
        ) : (
          <>
            {activeTab === "posts" && <PostsGrid userId={userId} />}
            {activeTab === "reels" && <ReelsGrid userId={userId} />}
            {activeTab === "saved" && isOwnProfile && <SavedGrid />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Posts grid ───────────────────────────────────────────────────────────────
function PostsGrid({ userId }: { userId: string }) {
  const { data: posts, isLoading } = api.post.getUserPosts.useQuery(
    { userId, limit: 18 },
    { staleTime: 30_000 },
  );

  if (isLoading) return <GridSkeleton />;

  if (!posts?.length) {
    return (
      <EmptyState
        icon={<Grid3x3 className="h-10 w-10 text-muted-foreground/40" />}
        title="No posts yet"
        subtitle="When you share photos, they'll appear here"
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((post) => (
        <PostGridItem
          key={post.id}
          postId={post.id}
          mediaUrl={post.media?.[0]?.url ?? ""}
          mediaType={post.media?.[0]?.type ?? "image"}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          isMultiMedia={(post.media?.length ?? 0) > 1}
        />
      ))}
    </div>
  );
}

// ─── Reels grid ───────────────────────────────────────────────────────────────
function ReelsGrid({ userId }: { userId: string }) {
  const { data: reels, isLoading } = api.reel.getUserReels.useQuery(
    { userId, limit: 18 },
    { staleTime: 30_000 },
  );

  if (isLoading) return <GridSkeleton />;

  if (!reels?.length) {
    return (
      <EmptyState
        icon={<Film className="h-10 w-10 text-muted-foreground/40" />}
        title="No reels yet"
        subtitle="Share short videos and they'll appear here"
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {reels.map((reel) => (
        <PostGridItem
          key={reel.id}
          postId={reel.id}
          mediaUrl={reel.thumbnailUrl ?? reel.videoUrl}
          mediaType="video"
          likeCount={reel.likeCount}
          commentCount={reel.commentCount}
          viewCount={reel.viewCount}
          isReel
          href={`/reels?id=${reel.id}`}
        />
      ))}
    </div>
  );
}

// ─── Saved grid (own profile only) ───────────────────────────────────────────
function SavedGrid() {
  const { data: saved, isLoading } = api.post.getSaved.useQuery(
    { limit: 18 },
    { staleTime: 30_000 },
  );

  if (isLoading) return <GridSkeleton />;

  if (!saved?.length) {
    return (
      <EmptyState
        icon={<Bookmark className="h-10 w-10 text-muted-foreground/40" />}
        title="No saved posts"
        subtitle="Save posts to come back to them later"
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {saved.map((post: any) => (
        post && (
          <PostGridItem
            key={post.id}
            postId={post.id}
            mediaUrl={post.media?.[0]?.url ?? post.thumbnailUrl ?? ""}
            mediaType={post.media?.[0]?.type ?? "image"}
            likeCount={post.likeCount ?? 0}
            commentCount={post.commentCount}
            isMultiMedia={(post.media?.length ?? 0) > 1}
          />
        )
      ))}
    </div>
  );
}

// ─── Private / locked state ───────────────────────────────────────────────────
function LockedProfile({ username }: { username: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-bold text-lg mb-1">This account is private</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Follow @{username} to see their photos and videos
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <PostGridItemSkeleton key={i} />
      ))}
    </div>
  );
}