"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getToken } from "@/lib/session";

/**
 * UX guard only. Data is protected server-side: every API route verifies the Bearer token.
 * mode "private": redirect to /login when signed out.
 * mode "public":  redirect to / when already signed in (login / signup pages).
 */
export function AuthGuard({ mode, children }: { mode: "private" | "public"; children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const signedIn = !!getToken();
    if (mode === "private" && !signedIn) {
      router.replace("/login");
    } else if (mode === "public" && signedIn) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [mode, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
