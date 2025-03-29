"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">Protected Page</h1>
        <p className="text-muted-foreground mb-6">
          This page is only visible to authenticated users.
        </p>
        
        <div className="flex gap-4">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          
          <Link href="/profile">
            <Button>View Profile</Button>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
