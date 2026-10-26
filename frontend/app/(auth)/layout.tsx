"use client";

import { AuthGuard } from "@/components/auth-guard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard mode="public">{children}</AuthGuard>;
}
