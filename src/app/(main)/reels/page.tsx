"use client";

import { useState, useEffect, useRef } from "react";
import { ReelPlayer, ReelPlayerSkeleton } from "@/components/reels/reel-player";
import { CommentSheet } from "@/components/posts/comment-sheet";
import { api } from "@/trpc/react";

export default function ReelsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage } =
    api.reel.getFeed.useInfiniteQuery(
      { limit: 5 },
      { getNextPageParam: (last) => last.nextCursor }
    );

  const reels = data?.pages.flatMap((p) => p.items) ?? [];

  // Load more when near end
  useEffect(() => {
    if (activeIndex >= reels.length - 2 && hasNextPage) {
      void fetchNextPage();
    }
  }, [activeIndex, reels.length, hasNextPage, fetchNextPage]);

  // Snap scroll — track which slide is visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const slides = container.querySelectorAll("[data-index]");
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [reels.length]);

  return (
    <>
      <div
        ref={containerRef}
        className="h-dvh overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-dvh snap-start snap-always flex items-center justify-center bg-black"
              >
                <ReelPlayerSkeleton />
              </div>
            ))
          : reels.map((reel, i) => (
              <div
                key={reel.id}
                data-index={i}
                className="h-dvh snap-start snap-always relative"
              >
                <ReelPlayer
                  reel={{
                    ...reel,
                    user: {
                      id: reel.author.id,
                      name: reel.author.name,
                      username: reel.author.username,
                      image: reel.author.avatarUrl,
                      isFollowing: reel.isFollowingAuthor,
                    },
                  }}
                  globalMuted={false}
                  onMuteToggle={() => {}}
                  isActive={activeIndex === i}
                  onOpenComments={setCommentReelId}
                />
              </div>
            ))}

        {/* Loading more indicator */}
        {hasNextPage && (
          <div className="h-dvh snap-start snap-always flex items-center justify-center bg-black">
            <ReelPlayerSkeleton />
          </div>
        )}
      </div>

      {/* Comments sheet */}
      <CommentSheet
        postId={commentReelId ?? ""}
        open={!!commentReelId}
        onOpenChange={(o) => !o && setCommentReelId(null)}
      />
    </>
  );
}