import { z } from "zod";
import { eq, and, like, ne, not, inArray, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  users,
  follows,
  blocks,
  posts,
  reels,
  notifications,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({

  // Get own profile (used for auth'd user header/sidebar)
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),

  // Get any user's profile by username
  getProfile: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.username),
        with: {
          posts: { limit: 12, orderBy: (p, { desc }) => [desc(p.createdAt)] },
          reels: { limit: 12, orderBy: (r, { desc }) => [desc(r.createdAt)] },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const [followerRow] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.followingId, user.id));

      const [followingRow] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.followerId, user.id));

      let isFollowing = false;
      let isBlocked = false;
      if (ctx.session?.user.id) {
        const follow = await ctx.db.query.follows.findFirst({
          where: and(
            eq(follows.followerId, ctx.session.user.id),
            eq(follows.followingId, user.id),
          ),
        });
        isFollowing = !!follow;

        const block = await ctx.db.query.blocks.findFirst({
          where: and(
            eq(blocks.blockerId, ctx.session.user.id),
            eq(blocks.blockedId, user.id),
          ),
        });
        isBlocked = !!block;
      }

      return {
        ...user,
        followerCount: Number(followerRow?.count ?? 0),
        followingCount: Number(followingRow?.count ?? 0),
        isFollowing,
        isBlocked,
      };
    }),

  // Update own profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        username: z.string().min(3).max(30).optional(),
        bio: z.string().max(300).optional(),
        avatarUrl: z.string().url().optional(),
        isPrivate: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.username) {
        const existing = await ctx.db.query.users.findFirst({
          where: and(
            eq(users.username, input.username),
            ne(users.id, ctx.session.user.id),
          ),
        });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Username taken" });
      }

      const [updated] = await ctx.db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id))
        .returning();

      return updated;
    }),

  // Follow a user
  follow: protectedProcedure
    .input(z.object({ targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.targetId === ctx.session.user.id)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });

      const existing = await ctx.db.query.follows.findFirst({
        where: and(
          eq(follows.followerId, ctx.session.user.id),
          eq(follows.followingId, input.targetId),
        ),
      });
      if (existing) return { alreadyFollowing: true };

      await ctx.db.insert(follows).values({
        followerId: ctx.session.user.id,
        followingId: input.targetId,
      });

      // Notification
      await ctx.db.insert(notifications).values({
        recipientId: input.targetId,
        actorId: ctx.session.user.id,
        type: "follow",
      });

      return { alreadyFollowing: false };
    }),

  // Unfollow
  unfollow: protectedProcedure
    .input(z.object({ targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, ctx.session.user.id),
            eq(follows.followingId, input.targetId),
          ),
        );
      return { success: true };
    }),

  // Block
  block: protectedProcedure
    .input(z.object({ targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.targetId === ctx.session.user.id)
        throw new TRPCError({ code: "BAD_REQUEST" });

      // Unfollow both ways when blocking
      await ctx.db.delete(follows).where(
        and(eq(follows.followerId, ctx.session.user.id), eq(follows.followingId, input.targetId))
      );
      await ctx.db.delete(follows).where(
        and(eq(follows.followerId, input.targetId), eq(follows.followingId, ctx.session.user.id))
      );

      await ctx.db
        .insert(blocks)
        .values({ blockerId: ctx.session.user.id, blockedId: input.targetId })
        .onConflictDoNothing();

      return { success: true };
    }),

  // Unblock
  unblock: protectedProcedure
    .input(z.object({ targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(blocks)
        .where(
          and(
            eq(blocks.blockerId, ctx.session.user.id),
            eq(blocks.blockedId, input.targetId),
          ),
        );
      return { success: true };
    }),

  // Search users by username/name
  search: publicProcedure
    .input(z.object({ query: z.string().min(1), limit: z.number().max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.users.findMany({
        where: like(users.username, `%${input.query}%`),
        limit: input.limit,
        columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true },
      });
      return results;
    }),

  // Suggested users to follow (people you don't follow, not blocked)
  getSuggestions: protectedProcedure
    .input(z.object({ limit: z.number().max(20).default(8) }))
    .query(async ({ ctx }) => {
      const myFollowing = await ctx.db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, ctx.session.user.id));

      const myBlocked = await ctx.db
        .select({ id: blocks.blockedId })
        .from(blocks)
        .where(eq(blocks.blockerId, ctx.session.user.id));

      const excludeIds = [
        ctx.session.user.id,
        ...myFollowing.map((f) => f.id),
        ...myBlocked.map((b) => b.id),
      ];

      const suggestions = await ctx.db.query.users.findMany({
        where: not(inArray(users.id, excludeIds)),
        limit: 8,
        columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true },
        orderBy: (u, { desc }) => [desc(u.createdAt)],
      });

      return suggestions;
    }),

  // Get followers list
  getFollowers: publicProcedure
    .input(z.object({ userId: z.string(), cursor: z.string().optional(), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.follows.findMany({
        where: eq(follows.followingId, input.userId),
        limit: input.limit,
        with: { follower: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
        orderBy: (f, { desc }) => [desc(f.createdAt)],
      });
      return rows.map((r) => r.follower);
    }),

  // Get following list
  getFollowing: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.follows.findMany({
        where: eq(follows.followerId, input.userId),
        limit: input.limit,
        with: { following: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
        orderBy: (f, { desc }) => [desc(f.createdAt)],
      });
      return rows.map((r) => r.following);
    }),
});