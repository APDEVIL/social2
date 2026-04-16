import { z } from "zod";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { stories, storyViews, follows, notifications } from "@/server/db/schema";

export const storyRouter = createTRPCRouter({

  // Get stories from people you follow (grouped by user, only non-expired)
  getFeed: protectedProcedure.query(async ({ ctx }) => {
    const myFollowing = await ctx.db
      .select({ id: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, ctx.session.user.id));

    const authorIds = [ctx.session.user.id, ...myFollowing.map((f) => f.id)];
    const now = new Date();

    const allStories = await ctx.db.query.stories.findMany({
      where: and(
        inArray(stories.authorId, authorIds),
        gt(stories.expiresAt, now), // filter expired — no cron needed
      ),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
      with: {
        author: { columns: { id: true, username: true, name: true, avatarUrl: true } },
        views: {
          where: eq(storyViews.userId, ctx.session.user.id),
          columns: { id: true },
        },
      },
    });

    // Group by author
    const grouped = new Map<string, typeof allStories>();
    for (const story of allStories) {
      const key = story.authorId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(story);
    }

    return Array.from(grouped.entries()).map(([authorId, userStories]) => ({
      author: userStories[0]!.author,
      stories: userStories.map((s) => ({ ...s, isViewed: s.views.length > 0 })),
      hasUnviewed: userStories.some((s) => s.views.length === 0),
    }));
  }),

  // Create a story
  create: protectedProcedure
    .input(
      z.object({
        mediaUrl: z.string().url(),
        type: z.enum(["image", "video"]),
        duration: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

      const [story] = await ctx.db
        .insert(stories)
        .values({
          authorId: ctx.session.user.id,
          mediaUrl: input.mediaUrl,
          type: input.type,
          duration: input.duration,
          expiresAt,
        })
        .returning();

      return story;
    }),

  // Delete story (own only)
  delete: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const story = await ctx.db.query.stories.findFirst({
        where: eq(stories.id, input.storyId),
      });
      if (!story) throw new TRPCError({ code: "NOT_FOUND" });
      if (story.authorId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.delete(stories).where(eq(stories.id, input.storyId));
      return { success: true };
    }),

  // Mark story as viewed
  markViewed: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const story = await ctx.db.query.stories.findFirst({
        where: and(eq(stories.id, input.storyId), gt(stories.expiresAt, new Date())),
      });
      if (!story) return { success: false };

      const existing = await ctx.db.query.storyViews.findFirst({
        where: and(
          eq(storyViews.storyId, input.storyId),
          eq(storyViews.userId, ctx.session.user.id),
        ),
      });

      if (!existing) {
        await ctx.db.insert(storyViews).values({
          storyId: input.storyId,
          userId: ctx.session.user.id,
        });

        await ctx.db.update(stories)
          .set({ viewCount: sql`${stories.viewCount} + 1` })
          .where(eq(stories.id, input.storyId));

        // Notify author if not self
        if (story.authorId !== ctx.session.user.id) {
          await ctx.db.insert(notifications).values({
            recipientId: story.authorId,
            actorId: ctx.session.user.id,
            type: "story_view",
            storyId: input.storyId,
          }).onConflictDoNothing();
        }
      }

      return { success: true };
    }),

  // Get viewers of own story
  getViewers: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const story = await ctx.db.query.stories.findFirst({
        where: eq(stories.id, input.storyId),
      });
      if (!story) throw new TRPCError({ code: "NOT_FOUND" });
      if (story.authorId !== ctx.session.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });

      const views = await ctx.db.query.storyViews.findMany({
        where: eq(storyViews.storyId, input.storyId),
        orderBy: (v, { desc }) => [desc(v.createdAt)],
        with: {
          user: { columns: { id: true, username: true, name: true, avatarUrl: true } },
        },
      });

      return views.map((v) => v.user);
    }),
});