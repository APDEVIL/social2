import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { groups, groupMembers, posts, notifications } from "@/server/db/schema";

export const groupRouter = createTRPCRouter({

  // Discover groups (public)
  discover: publicProcedure
    .input(z.object({ limit: z.number().max(30).default(12) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.groups.findMany({
        where: eq(groups.isPrivate, false),
        orderBy: [desc(groups.memberCount), desc(groups.createdAt)],
        limit: input.limit,
        columns: { id: true, name: true, description: true, avatarUrl: true, coverUrl: true, memberCount: true, postCount: true, isPrivate: true },
      });
    }),

  // Get group details
  getGroup: publicProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
        with: {
          createdBy: { columns: { id: true, username: true, avatarUrl: true } },
          members: {
            limit: 12,
            with: {
              user: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
            },
          },
        },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      let isMember = false;
      let myRole: "owner" | "admin" | "member" | null = null;
      if (ctx.session?.user.id) {
        const membership = await ctx.db.query.groupMembers.findFirst({
          where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
        });
        isMember = !!membership;
        myRole = membership?.role ?? null;
      }

      return { ...group, isMember, myRole };
    }),

  // Get groups the current user is in
  getMyGroups: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, ctx.session.user.id),
      with: {
        group: { columns: { id: true, name: true, avatarUrl: true, memberCount: true, isPrivate: true } },
      },
    });
    return memberships.map((m) => ({ ...m.group, role: m.role }));
  }),

  // Create group
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      coverUrl: z.string().url().optional(),
      isPrivate: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const [group] = await ctx.db
        .insert(groups)
        .values({ ...input, createdById: ctx.session.user.id })
        .returning();

      if (!group) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Creator is owner
      await ctx.db.insert(groupMembers).values({
        groupId: group.id,
        userId: ctx.session.user.id,
        role: "owner",
      });

      return group;
    }),

  // Update group (owner/admin only)
  update: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      coverUrl: z.string().url().optional(),
      isPrivate: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
      });
      if (!membership || (membership.role !== "owner" && membership.role !== "admin"))
        throw new TRPCError({ code: "FORBIDDEN" });

      const { groupId, ...data } = input;
      const [updated] = await ctx.db
        .update(groups)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(groups.id, groupId))
        .returning();

      return updated;
    }),

  // Join group
  join: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({ where: eq(groups.id, input.groupId) });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await ctx.db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
      });
      if (existing) return { alreadyMember: true };

      await ctx.db.insert(groupMembers).values({
        groupId: input.groupId,
        userId: ctx.session.user.id,
        role: "member",
      });

      await ctx.db.update(groups)
        .set({ memberCount: sql`${groups.memberCount} + 1` })
        .where(eq(groups.id, input.groupId));

      // Notify owner
      await ctx.db.insert(notifications).values({
        recipientId: group.createdById,
        actorId: ctx.session.user.id,
        type: "group_invite",
        groupId: input.groupId,
      }).onConflictDoNothing();

      return { alreadyMember: false };
    }),

  // Leave group
  leave: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
      });
      if (!membership) throw new TRPCError({ code: "BAD_REQUEST", message: "Not a member" });
      if (membership.role === "owner") throw new TRPCError({ code: "BAD_REQUEST", message: "Owner cannot leave — transfer ownership first" });

      await ctx.db.delete(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)));

      await ctx.db.update(groups)
        .set({ memberCount: sql`GREATEST(${groups.memberCount} - 1, 0)` })
        .where(eq(groups.id, input.groupId));

      return { success: true };
    }),

  // Kick member (owner/admin only)
  kick: protectedProcedure
    .input(z.object({ groupId: z.string(), targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const myMembership = await ctx.db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
      });
      if (!myMembership || (myMembership.role !== "owner" && myMembership.role !== "admin"))
        throw new TRPCError({ code: "FORBIDDEN" });

      const targetMembership = await ctx.db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)),
      });
      if (!targetMembership) throw new TRPCError({ code: "NOT_FOUND" });
      if (targetMembership.role === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot kick owner" });

      await ctx.db.delete(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)));

      await ctx.db.update(groups)
        .set({ memberCount: sql`GREATEST(${groups.memberCount} - 1, 0)` })
        .where(eq(groups.id, input.groupId));

      return { success: true };
    }),

  // Change member role (owner only)
  setRole: protectedProcedure
    .input(z.object({ groupId: z.string(), targetUserId: z.string(), role: z.enum(["admin", "member"]) }))
    .mutation(async ({ ctx, input }) => {
      const myMembership = await ctx.db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
      });
      if (!myMembership || myMembership.role !== "owner")
        throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.update(groupMembers)
        .set({ role: input.role })
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.targetUserId)));

      return { success: true };
    }),

  // Get group posts
  getPosts: publicProcedure
    .input(z.object({ groupId: z.string(), limit: z.number().max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({ where: eq(groups.id, input.groupId) });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      // Private group: must be a member
      if (group.isPrivate && ctx.session?.user.id) {
        const membership = await ctx.db.query.groupMembers.findFirst({
          where: and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, ctx.session.user.id)),
        });
        if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      } else if (group.isPrivate) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db.query.posts.findMany({
        where: and(eq(posts.groupId, input.groupId), eq(posts.isArchived, false)),
        orderBy: [desc(posts.createdAt)],
        limit: input.limit,
        with: {
          author: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
          media: { limit: 1, orderBy: (m, { asc }) => [asc(m.order)] },
        },
      });
    }),

  // Get members list
  getMembers: publicProcedure
    .input(z.object({ groupId: z.string(), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, input.groupId),
        limit: input.limit,
        orderBy: (m, { asc }) => [asc(m.joinedAt)],
        with: {
          user: { columns: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
        },
      });
      return members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt }));
    }),
});