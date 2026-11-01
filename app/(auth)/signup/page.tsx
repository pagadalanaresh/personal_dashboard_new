import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account — Wealthfolio" };

export default function SignupPage() {
  return <SignupForm />;
}
