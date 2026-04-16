import { z } from "zod";
import { and, desc, eq, inArray, not, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { reels, reelLikes, reelViews, follows, blocks, notifications } from "@/server/db/schema";

export const reelRouter = createTRPCRouter({

  // Reel feed: followed users + explore mixed
  getFeed: protectedProcedure
    .input(z.object({ limit: z.number().max(20).default(10), cursor: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const myFollowing = await ctx.db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, ctx.session.user.id));

      const myBlocked = await ctx.db
        .select({ id: blocks.blockedId })
        .from(blocks)
        .where(eq(blocks.blockerId, ctx.session.user.id));

      const blockedIds = myBlocked.map((b) => b.id);

      const feed = await ctx.db.query.reels.findMany({
        where: and(
          eq(reels.isArchived, false),
          blockedIds.length ? not(inArray(reels.authorId, blockedIds)) : undefined,
        ),
        orderBy: [desc(reels.createdAt)],
        limit: input.limit + 1,
        with: {
          author: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
        },
      });

      const reelIds = feed.map((r) => r.id);
      const likedRows = reelIds.length
        ? await ctx.db.select({ reelId: reelLikes.reelId }).from(reelLikes)
            .where(and(eq(reelLikes.userId, ctx.session.user.id), inArray(reelLikes.reelId, reelIds)))
        : [];

      const likedSet = new Set(likedRows.map((r) => r.reelId));

      const hasMore = feed.length > input.limit;
      const items = feed.slice(0, input.limit).map((r) => ({
        ...r,
        isLiked: likedSet.has(r.id),
        isFollowingAuthor: myFollowing.some((f) => f.id === r.authorId),
      }));

      return { items, hasMore, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
    }),

  // Single reel
  getReel: publicProcedure
    .input(z.object({ reelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reel = await ctx.db.query.reels.findFirst({
        where: eq(reels.id, input.reelId),
        with: {
          author: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
        },
      });
      if (!reel) throw new TRPCError({ code: "NOT_FOUND" });
      return reel;
    }),

  // Get user's reels
  getUserReels: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().max(30).default(12) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.reels.findMany({
        where: and(eq(reels.authorId, input.userId), eq(reels.isArchived, false)),
        orderBy: [desc(reels.createdAt)],
        limit: input.limit,
      });
    }),

  // Create reel (video uploaded via uploadthing first)
  create: protectedProcedure
    .input(
      z.object({
        videoUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        caption: z.string().max(2200).optional(),
        duration: z.number().min(1).max(90),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [reel] = await ctx.db
        .insert(reels)
        .values({ ...input, authorId: ctx.session.user.id })
        .returning();
      return reel;
    }),

  // Delete reel
  delete: protectedProcedure
    .input(z.object({ reelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reel = await ctx.db.query.reels.findFirst({ where: eq(reels.id, input.reelId) });
      if (!reel) throw new TRPCError({ code: "NOT_FOUND" });
      if (reel.authorId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.delete(reels).where(eq(reels.id, input.reelId));
      return { success: true };
    }),

  // Like reel
  like: protectedProcedure
    .input(z.object({ reelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(reelLikes)
        .values({ reelId: input.reelId, userId: ctx.session.user.id })
        .onConflictDoNothing();

      await ctx.db.update(reels)
        .set({ likeCount: sql`${reels.likeCount} + 1` })
        .where(eq(reels.id, input.reelId));

      const reel = await ctx.db.query.reels.findFirst({ where: eq(reels.id, input.reelId) });
      if (reel && reel.authorId !== ctx.session.user.id) {
        await ctx.db.insert(notifications).values({
          recipientId: reel.authorId,
          actorId: ctx.session.user.id,
          type: "reel_like",
          reelId: input.reelId,
        }).onConflictDoNothing();
      }

      return { success: true };
    }),

  // Unlike reel
  unlike: protectedProcedure
    .input(z.object({ reelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(reelLikes)
        .where(and(eq(reelLikes.reelId, input.reelId), eq(reelLikes.userId, ctx.session.user.id)));

      await ctx.db.update(reels)
        .set({ likeCount: sql`GREATEST(${reels.likeCount} - 1, 0)` })
        .where(eq(reels.id, input.reelId));

      return { success: true };
    }),

  // Increment view count (debounced on client — call once per unique view)
  incrementView: protectedProcedure
    .input(z.object({ reelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.reelViews.findFirst({
        where: and(eq(reelViews.reelId, input.reelId), eq(reelViews.userId, ctx.session.user.id)),
      });

      if (!existing) {
        await ctx.db.insert(reelViews)
          .values({ reelId: input.reelId, userId: ctx.session.user.id })
          .onConflictDoNothing();

        await ctx.db.update(reels)
          .set({ viewCount: sql`${reels.viewCount} + 1` })
          .where(eq(reels.id, input.reelId));
      }

      return { success: true };
    }),
});