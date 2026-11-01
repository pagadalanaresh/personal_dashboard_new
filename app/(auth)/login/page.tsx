import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in — Wealthfolio" };

export default function LoginPage() {
  return <LoginForm />;
}
