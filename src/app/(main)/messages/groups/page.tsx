import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Group Messages",
};

export default function MessageGroupsPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full max-w-[600px] mx-auto border-x border-border bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Users className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-syne)" }}>
        Group Chats
      </h2>
      <p className="text-sm text-muted-foreground max-w-[250px]">
        Select a group conversation from your messages list to start chatting.
      </p>
    </div>
  );
}