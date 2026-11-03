import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { PageActionProvider } from "@/lib/page-action-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PageActionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Header name={session.name} email={session.email} />
          {session.impersonatedBy && (
            <ImpersonationBanner name={session.name} email={session.email} />
          )}
          {/* Extra bottom padding on mobile only, so content doesn't sit
              under the fixed bottom tab bar (see MobileBottomNav). */}
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </PageActionProvider>
  );
}
