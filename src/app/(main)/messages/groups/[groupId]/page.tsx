import { ChatWindow } from "@/components/chat/chat-window";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ groupId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  // Metadata can be dynamic based on the group, but we default to this:
  return { title: `Group Chat` };
}

export default async function GroupChatPage({ params }: Props) {
  const { groupId } = await params;

  return (
    <div className="h-[calc(100vh-4rem)] w-full max-w-[600px] mx-auto border-x border-border bg-background relative overflow-hidden">
      {/* We pass the groupId from the URL as the conversationId to the ChatWindow */}
      <ChatWindow conversationId={groupId} />
    </div>
  );
}