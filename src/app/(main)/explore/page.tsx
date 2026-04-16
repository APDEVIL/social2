"use client";

import { useState, useTransition } from "react";
import { Search, TrendingUp, Hash, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PostGridItem } from "@/components/posts/post-grid-item";
import { InfiniteScroll } from "@/components/shared-primitives/infinite-scroll";
import { PostCard } from "@/components/posts/post-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { useDebounce } from "use-debounce";
import type { Metadata } from "next";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [debouncedQuery] = useDebounce(query, 400);

  const isSearching = debouncedQuery.length > 0 || !!activeTag;

  const { data: trending } = api.post.getFeed.useQuery(
    { limit: 30 },
    { enabled: !isSearching }
  );
  const { data: searchResults, isLoading: searchLoading } =
    api.user.search.useQuery(
      { query: debouncedQuery },
      { enabled: debouncedQuery.length >= 2 }
    );

  const trendingTags = [
    "photography", "travel", "food", "fitness", "art",
    "music", "tech", "nature", "fashion", "gaming",
  ];

  const explorePosts = trending?.items ?? [];

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl font-black tracking-tight mb-4"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Explore
        </h1>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveTag(null);
            }}
            placeholder="Search people, hashtags..."
            className="pl-10 pr-10 h-11 rounded-2xl bg-muted/60 border-border/40 text-sm focus:border-[hsl(43,96%,56%)] focus:bg-background transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Trending tags */}
        {!isSearching && (
          <div className="flex flex-wrap gap-2 mt-3">
            {trendingTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/60 hover:bg-[hsl(43,96%,56%)]/10 hover:text-[hsl(43,96%,46%)] dark:hover:text-[hsl(43,96%,60%)] text-xs font-medium text-muted-foreground border border-border/40 hover:border-[hsl(43,96%,56%)]/30 transition-all"
              >
                <Hash className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Active tag */}
        {activeTag && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1.5 text-sm rounded-full">
              <Hash className="w-3.5 h-3.5" />
              {activeTag}
              <button
                onClick={() => setActiveTag(null)}
                className="hover:text-destructive transition-colors ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* Search results — user cards */}
      {debouncedQuery.length >= 2 && searchResults && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            People
          </p>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found for "{debouncedQuery}"</p>
          ) : (
            searchResults.map((user) => (
              <a
                key={user.id}
                href={`/${user.username}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                  {user.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {/* Explore grid */}
      {!debouncedQuery && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[hsl(43,96%,56%)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {activeTag ? `#${activeTag}` : "Trending"}
            </p>
          </div>

          {explorePosts.length === 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {explorePosts.map((post, i) => (
                <PostGridItem
                  key={post.id}
                  postId={post.id}
                  mediaUrl={post.media?.[0]?.url ?? ""}
                  mediaType={post.media?.[0]?.type ?? "image"}
                  likeCount={post.likeCount}
                  commentCount={post.commentCount}
                  href={`/p/${post.id}`}
                  className={
                    // Every 7th item spans 2 cols and 2 rows for visual rhythm
                    i % 7 === 0
                      ? "col-span-2 row-span-2"
                      : ""
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Post detail dialog */}
      <Dialog
        open={!!selectedPostId}
        onOpenChange={(o) => !o && setSelectedPostId(null)}
      >
        <DialogContent className="max-w-[520px] p-0 rounded-2xl overflow-hidden">
          {selectedPostId && (
            <ExplorePostDetail postId={selectedPostId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExplorePostDetail({ postId }: { postId: string }) {
  const { data, isLoading } = api.post.getPost.useQuery({ postId });
  if (isLoading || !data) return <PostCardSkeleton />;
  return (
    <PostCard
      postId={data.id}
      author={data.author}
      caption={data.caption}
      location={data.location}
      media={data.media}
      likeCount={data.likeCount}
      commentCount={data.commentCount}
      isLiked={false}
      isSaved={false}
      createdAt={data.createdAt}
    />
  );
}

function PostCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}