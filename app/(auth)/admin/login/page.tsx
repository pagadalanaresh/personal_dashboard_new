import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Admin sign in — Wealthfolio" };

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
