"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCirclePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { cn, formatTimeAgo, truncate } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useState } from "react";
import { NewConversation } from "./new-conversation";

export function ConversationList() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const { data: conversations = [], isLoading } = api.chat.getConversations.useQuery(
    undefined,
    { refetchInterval: 15_000 },
  );

  const filtered = conversations.filter((c) =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h1 className="text-xl font-black">Messages</h1>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={() => setShowNew(true)}
          >
            <MessageCirclePlus className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-full bg-muted border-0 text-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ConversationSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MessageCirclePlus className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Send a message to get started
              </p>
              <Button
                size="sm"
                className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => setShowNew(true)}
              >
                New message
              </Button>
            </div>
          ) : (
            filtered.map((conv) => {
              const href = `/messages/${conv.id}`;
              const isActive = pathname === href;
              const lastMsg = conv.lastMessage;

              return (
                <Link
                  key={conv.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                    isActive && "bg-muted",
                  )}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={conv.avatarUrl}
                      username={conv.name ?? "chat"}
                      size="md"
                    />
                    {conv.isGroup && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[8px] font-bold text-brand-foreground">
                        {conv.members.length}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight truncate">
                        {conv.name}
                      </p>
                      {conv.lastMessageAt && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatTimeAgo(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p
                        className={cn(
                          "text-xs mt-0.5 truncate",
                          lastMsg.isDeleted
                            ? "italic text-muted-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {lastMsg.isDeleted
                          ? "Message deleted"
                          : truncate(lastMsg.content ?? "📎 Media", 42)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {showNew && <NewConversation onClose={() => setShowNew(false)} />}
    </>
  );
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-48 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}