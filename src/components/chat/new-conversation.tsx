"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useDebounce } from "@/lib/hooks";

interface NewConversationProps {
  onClose: () => void;
}

export function NewConversation({ onClose }: NewConversationProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isFetching } = api.user.search.useQuery(
    { query: debouncedQuery, limit: 10 },
    { enabled: debouncedQuery.length >= 1 },
  );

  const getOrCreateDM = api.chat.getOrCreateDM.useMutation({
    onSuccess: (data) => {
      router.push(`/messages/${data.conversationId}`);
      onClose();
    },
    onError: () => {
      toast.error("Failed to open conversation");
      setStarting(null);
    },
  });

  function handleSelectUser(userId: string) {
    setStarting(userId);
    getOrCreateDM.mutate({ targetUserId: userId });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold text-center">New message</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            {isFetching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Search people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9 h-10 rounded-full bg-muted border-0 text-sm"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {!debouncedQuery && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Search for a person
            </div>
          )}
          {debouncedQuery && results.length === 0 && !isFetching && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No users found for "{debouncedQuery}"
            </div>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
              onClick={() => handleSelectUser(user.id)}
              disabled={starting === user.id}
            >
              <UserAvatar src={user.avatarUrl} username={user.username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
              {starting === user.id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}