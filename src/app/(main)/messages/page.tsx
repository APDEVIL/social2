import { ConversationList } from "@/components/chat/conversation-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesPage() {
  return (
    // We restrict the height to the viewport minus the navbar height 
    // so the chat list can scroll independently
    <div className="h-[calc(100vh-4rem)] w-full max-w-[600px] mx-auto border-x border-border bg-background">
      <ConversationList />
    </div>
  );
}