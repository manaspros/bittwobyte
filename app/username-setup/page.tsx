"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function UsernameSetupPage() {
  const [username, setUsername] = useState("");
  const { setUsername: saveUsername } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      saveUsername(username);
      router.push("/feed");
    }
  };

  // Show a skeleton UI during SSR
  if (!isClient) {
    return (
      <div className="container flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="h-7 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-full bg-gray-100 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex justify-center items-center min-h-[calc(100vh-80px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Bit2Byte</CardTitle>
          <CardDescription>
            Please choose a username to continue
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This is how other users will see you in the chat.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
