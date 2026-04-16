import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";

interface ProfilePageProps {
  params: { username: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const profile = await api.user.getProfile({ username: params.username }).catch(() => null);

  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <ProfileHeader
              name={profile.name}
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              bio={profile.bio}
              followerCount={profile.followerCount}
              followingCount={profile.followingCount}
              isFollowing={profile.isFollowing} userId={""} isVerified={false} isPrivate={false} postCount={0} isOwnProfile={false} isBlocked={false}      />
      <div className="mt-6">
        <ProfileTabs username={params.username} isPrivate={profile.isPrivate} userId={""} isOwnProfile={false} isFollowing={false} />
      </div>
    </div>
  );
}