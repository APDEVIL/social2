"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Image as ImageIcon, X, Phone, Video, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { MessageBubble } from "./message-bubble";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { subscribeToConversation } from "@/lib/pusher-client";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "sonner";
import Link from "next/link";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; content: string | null; senderName: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const { data: me } = api.user.me.useQuery();

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = api.chat.getMessages.useInfiniteQuery(
    { conversationId, limit: 30 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  // Flatten pages into chronological order
  const allMessages = messagesData?.pages.flatMap((p) => p.items) ?? [];

  const sendMessage = api.chat.sendMessage.useMutation({
    onError: () => toast.error("Failed to send message"),
  });

  const deleteMessage = api.chat.deleteMessage.useMutation({
    onSuccess: () => void utils.chat.getMessages.invalidate({ conversationId }),
    onError: () => toast.error("Failed to delete message"),
  });

  const markRead = api.chat.markRead.useMutation();

  const { startUpload } = useUploadThing("chatMedia");

  // ─── Pusher real-time subscription ───────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToConversation(
      conversationId,
      // onMessage: append new message optimistically
      (message) => {
        void utils.chat.getMessages.invalidate({ conversationId });
        void utils.chat.getConversations.invalidate();
      },
      // onMessageDeleted
      () => void utils.chat.getMessages.invalidate({ conversationId }),
      // onMessagesRead
      () => void utils.chat.getMessages.invalidate({ conversationId }),
    );
    return unsubscribe;
  }, [conversationId, utils]);

  // Mark as read when window opens
  useEffect(() => {
    markRead.mutate({ conversationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  // ─── Send ─────────────────────────────────────────────────────────────────
  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim()) return;

    sendMessage.mutate(
      {
        conversationId,
        content: content.trim(),
        replyToId: replyTo?.id,
      },
      {
        onSuccess: () => {
          setContent("");
          setReplyTo(null);
          void utils.chat.getMessages.invalidate({ conversationId });
          void utils.chat.getConversations.invalidate();
          setTimeout(() => inputRef.current?.focus(), 50);
        },
      },
    );
  }

  // ─── Media upload ─────────────────────────────────────────────────────────
  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    try {
      const result = await startUpload([file]);
      if (!result?.[0]) throw new Error();
      sendMessage.mutate(
        {
          conversationId,
          mediaUrl: result[0].url,
          mediaType: file.type.startsWith("video") ? "video" : "image",
        },
        {
          onSuccess: () => {
            void utils.chat.getMessages.invalidate({ conversationId });
            void utils.chat.getConversations.invalidate();
          },
        },
      );
    } catch {
      toast.error("Media upload failed");
    } finally {
      setIsUploadingMedia(false);
      e.target.value = "";
    }
  }

  // ─── Get conversation name from members ──────────────────────────────────
  const { data: conversations = [] } = api.chat.getConversations.useQuery();
  const conversation = conversations.find((c) => c.id === conversationId);
  const convName = conversation?.name ?? "Chat";
  const convAvatar = conversation?.avatarUrl ?? null;
  const otherMember = conversation?.members?.[0];

  // ─── Group messages by date ───────────────────────────────────────────────
  function groupByDate(msgs: typeof allMessages) {
    const groups: { date: string; messages: typeof msgs }[] = [];
    let currentDate = "";
    for (const msg of msgs) {
      const d = new Date(msg.createdAt).toLocaleDateString();
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, messages: [] });
      }
      groups[groups.length - 1]!.messages.push(msg);
    }
    return groups;
  }

  const messageGroups = groupByDate(allMessages);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        {otherMember ? (
          <Link href={`/${otherMember.username}`}>
            <UserAvatar src={convAvatar ?? otherMember.avatarUrl} username={convName} size="md" />
          </Link>
        ) : (
          <UserAvatar src={convAvatar} username={convName} size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{convName}</p>
          {otherMember && (
            <p className="text-xs text-muted-foreground">@{otherMember.username}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => void fetchNextPage()}
            >
              Load older messages
            </Button>
          </div>
        )}

        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UserAvatar src={convAvatar} username={convName} size="lg" />
            </div>
            <p className="font-semibold">{convName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Say hi to start the conversation!
            </p>
          </div>
        )}

        {messageGroups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium px-2">
                {group.date === new Date().toLocaleDateString() ? "Today" : group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-1">
              {group.messages.map((msg, i) => {
                const isMine = msg.senderId === me?.id;
                const prevMsg = group.messages[i - 1];
                const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                  <MessageBubble
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    mediaUrl={msg.mediaUrl}
                    mediaType={msg.mediaType}
                    status={msg.status}
                    createdAt={msg.createdAt}
                    isDeleted={msg.isDeleted}
                    isMine={isMine}
                    sender={msg.sender}
                    showAvatar={showAvatar}
                    isGroupConversation={conversation?.isGroup ?? false}
                    onReply={() =>
                      setReplyTo({
                        id: msg.id,
                        content: msg.content,
                        senderName: msg.sender.name || msg.sender.username,
                      })
                    }
                    onDelete={isMine ? () => deleteMessage.mutate({ messageId: msg.id }) : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background pb-safe shrink-0">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 text-xs text-muted-foreground">
            <span>
              Replying to{" "}
              <span className="font-semibold text-foreground">{replyTo.senderName}</span>
              {replyTo.content && (
                <span className="ml-1 text-muted-foreground">· {replyTo.content.slice(0, 40)}</span>
              )}
            </span>
            <button onClick={() => setReplyTo(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3">
          {/* Media upload */}
          <label className="shrink-0 cursor-pointer flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors">
            {isUploadingMedia ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
            <input
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={handleMediaSelect}
              disabled={isUploadingMedia}
            />
          </label>

          <Input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message…"
            className="flex-1 h-10 rounded-full bg-muted border-0 text-sm focus-visible:ring-1 focus-visible:ring-brand"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <Button
            type="submit"
            size="icon"
            disabled={(!content.trim() && !isUploadingMedia) || sendMessage.isPending}
            className={cn(
              "h-10 w-10 rounded-full shrink-0 transition-all",
              content.trim()
                ? "bg-brand text-brand-foreground hover:bg-brand/90"
                : "bg-muted text-muted-foreground",
            )}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}