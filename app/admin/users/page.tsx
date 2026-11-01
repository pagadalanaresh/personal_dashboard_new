import { getSession } from "@/lib/auth";
import { AdminUsersView } from "@/components/admin/admin-users-view";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) return null;
  return <AdminUsersView currentUserId={session.userId} />;
}
