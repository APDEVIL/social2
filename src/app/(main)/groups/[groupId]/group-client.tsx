"use client";

import { api } from "@/trpc/react";
import { PostCard } from "@/components/posts/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquareDashed } from "lucide-react";

interface GroupFeedClientProps {
  groupId: string;
}

export function GroupFeedClient({ groupId }: GroupFeedClientProps) {
  // Queries the group router for posts belonging to this specific group
  const { data: posts, isLoading } = api.group.getPosts.useQuery({ groupId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <MessageSquareDashed className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="mb-1 text-lg font-bold" style={{ fontFamily: "var(--font-syne)" }}>
          No posts yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          It's quiet in here. Be the first to start a conversation or share a photo with the group!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 pb-20">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          postId={post.id}
          author={post.author}
          caption={post.caption}
          location={post.location}
          media={post.media}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          isLiked={false} // Group posts need to be checked for likes, defaulting to false
          isSaved={false}
          createdAt={post.createdAt}
        />
      ))}
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="flex flex-col space-y-3 border border-border rounded-xl p-4 bg-card">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </div>
      <Skeleton className="h-[300px] w-full rounded-lg mt-4" />
      <div className="flex gap-4 mt-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}