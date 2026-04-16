// src/app/(main)/groups/[groupId]/page.tsx
import { GroupHeader } from "@/components/groups/group-header";
import { GroupFeedClient } from "./group-client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ groupId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params;
  return { title: `Group · ${groupId}` };
}

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  return (
    <div className="max-w-[800px] mx-auto">
      <GroupHeader id={groupId} name={""} memberCount={0} postCount={0} isPrivate={false} isMember={false} myRole={null} createdBy={{
              id: "",
              username: "",
              avatarUrl: null
          }} members={[]} />
      <div className="px-4 py-4">
        <GroupFeedClient groupId={groupId} />
      </div>
    </div>
  );
}