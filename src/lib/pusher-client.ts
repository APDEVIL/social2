import PusherClient from "pusher-js";

// Singleton — one Pusher connection for the whole app
let pusherInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") {
    throw new Error("getPusherClient() must be called in the browser");
  }

  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/trpc/chat.pusherAuth", // tRPC mutation used as auth
        // Custom authorizer so we can pass tRPC headers
        authorizer: (channel) => ({
          authorize: async (socketId, callback) => {
            try {
              const res = await fetch("/api/trpc/chat.pusherAuth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  json: { socketId, channelName: channel.name },
                }),
              });
              const data = await res.json() as { result?: { data?: { json?: unknown } } };
              const auth = data?.result?.data?.json;
              callback(null, auth as Parameters<typeof callback>[1]);
            } catch (err) {
              callback(new Error("Pusher auth failed"), null);
            }
          },
        }),
      },
    );
  }

  return pusherInstance;
}

// Disconnect (call on logout)
export function disconnectPusher() {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

// ─── Typed channel helpers ────────────────────────────────────────────────────

// Subscribe to a conversation channel and listen for new messages
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: unknown) => void,
  onMessageDeleted: (data: { messageId: string }) => void,
  onMessagesRead: (data: { userId: string }) => void,
) {
  const client = getPusherClient();
  const channel = client.subscribe(`conversation-${conversationId}`);

  channel.bind("new-message", onMessage);
  channel.bind("message-deleted", onMessageDeleted);
  channel.bind("messages-read", onMessagesRead);

  return () => {
    channel.unbind_all();
    client.unsubscribe(`conversation-${conversationId}`);
  };
}

// Subscribe to personal user channel (notifications badge, incoming DM alerts)
export function subscribeToUserChannel(
  userId: string,
  onNewMessageNotification: (data: { conversationId: string; senderId: string }) => void,
) {
  const client = getPusherClient();
  const channel = client.subscribe(`user-${userId}`);

  channel.bind("new-message-notification", onNewMessageNotification);

  return () => {
    channel.unbind_all();
    client.unsubscribe(`user-${userId}`);
  };
}