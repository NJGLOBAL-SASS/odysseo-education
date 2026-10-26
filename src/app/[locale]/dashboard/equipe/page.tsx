import { auth } from "@/lib/auth";
import { listMembers } from "@/lib/team";
import { TeamPanel } from "@/components/dashboard/team-panel";

export default async function TeamPage() {
  const session = await auth();
  const members = await listMembers();

  return (
    <div className="max-w-4xl">
      <TeamPanel
        members={members.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          inviteExpiresAt: m.inviteExpiresAt?.toISOString() ?? null,
        }))}
        currentUserId={session?.user?.id ?? ""}
        isAdmin={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
