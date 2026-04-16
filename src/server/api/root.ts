import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./routers/user";
import { postRouter } from "./routers/post";
import { reelRouter } from "./routers/reel";
import { storyRouter } from "./routers/story";
import { chatRouter } from "./routers/chat";
import { groupRouter } from "./routers/group";
import { notificationRouter } from "./routers/notification";

export const appRouter = createTRPCRouter({
  user: userRouter,
  post: postRouter,
  reel: reelRouter,
  story: storyRouter,
  chat: chatRouter,
  group: groupRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);