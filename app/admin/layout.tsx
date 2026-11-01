import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminShellHeader } from "@/components/admin/admin-shell-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login");

  return (
    <div className="min-h-screen bg-background">
      <AdminShellHeader name={session.name} email={session.email} />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
