"use client";

import { api } from "@/trpc/react";
import { PostCard, PostCardSkeleton } from "@/components/posts/post-card";
import { InfiniteScroll } from "@/components/shared-primitives/infinite-scroll";
import { Sparkles } from "lucide-react";

export function FeedClient() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.post.getFeed.useInfiniteQuery(
      { limit: 10 },
      { getNextPageParam: (last) => last.nextCursor }
    );

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-[hsl(43,96%,56%)]" />
        <h1
          className="text-xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Your Feed
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <InfiniteScroll
          hasMore={hasNextPage ?? false}
          isLoading={isFetchingNextPage}
          onLoadMore={() => void fetchNextPage()}
          className="space-y-5"
        >
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
              isLiked={post.isLiked}
              isSaved={post.isSaved}
              createdAt={post.createdAt}
            />
          ))}
        </InfiniteScroll>
      )}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[hsl(43,96%,56%)]/10 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-[hsl(43,96%,56%)]" />
      </div>
      <div>
        <p className="font-bold text-lg" style={{ fontFamily: "var(--font-syne)" }}>
          Nothing here yet
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Follow people to see their posts in your feed
        </p>
      </div>
    </div>
  );
}