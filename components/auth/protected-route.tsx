"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: pathname }
      });
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="text-xl font-semibold">Loading...</div>
          <p className="text-muted-foreground mt-2">Authenticating your session...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
