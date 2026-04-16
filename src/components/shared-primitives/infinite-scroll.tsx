"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
  className?: string;
  /** Root margin to trigger earlier. Default "200px" */
  rootMargin?: string;
  loadingIndicator?: React.ReactNode;
  endMessage?: React.ReactNode;
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  children,
  className,
  rootMargin = "200px",
  loadingIndicator,
  endMessage,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, rootMargin]);

  const defaultLoader = (
    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin text-[hsl(43,96%,56%)]" />
      <span className="text-sm">Loading more...</span>
    </div>
  );

  const defaultEnd = (
    <div className="flex items-center justify-center py-8">
      <p className="text-sm text-muted-foreground">You're all caught up ✓</p>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {children}
      <div ref={sentinelRef} className="w-full h-px" aria-hidden />
      {isLoading && (loadingIndicator ?? defaultLoader)}
      {!hasMore && !isLoading && (endMessage ?? defaultEnd)}
    </div>
  );
}