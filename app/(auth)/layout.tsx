import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-backdrop flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Wealthfolio. Built for tracking, not for
        trading advice.
      </footer>
    </div>
  );
}
