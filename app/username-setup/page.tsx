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
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RegistrationSuccess } from "@/components/user/RegistrationSuccess";
import { DiagnosticTool } from "@/components/user/DiagnosticTool";

export default function UsernameSetupPage() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    setUsername: saveUsername,
    user: contextUser,
    isUserLoading,
  } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isAuthenticated, user: authUser, isLoading: authLoading } = useAuth();

  // Set client-side flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Log important state changes
  useEffect(() => {
    console.log("Username setup state:", {
      isAuthenticated,
      authLoading,
      isUserLoading,
      hasAuthUser: !!authUser,
      contextUser,
    });
  }, [isAuthenticated, authLoading, isUserLoading, authUser, contextUser]);

  // Set initial username based on Auth0 profile if available
  useEffect(() => {
    if (authUser) {
      // Use the nickname from Auth0 or email username as a suggested value
      const suggestedName =
        contextUser?.username || // Use context user if available
        authUser.nickname ||
        authUser.name ||
        (authUser.email ? authUser.email.split("@")[0] : "");

      if (suggestedName && !username) {
        setUsername(suggestedName);
      }
    }
  }, [authUser, contextUser, username]);

  // Redirect if not authenticated
  useEffect(() => {
    // Only check after auth has finished loading and we're on the client
    if (!isClient || authLoading) return;

    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to home");
      router.push("/");
    }
  }, [isAuthenticated, authLoading, isClient, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }

    // Validate username format (alphanumeric and some special chars)
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and _ . -");
      return;
    }

    try {
      setIsSubmitting(true);

      if (!authUser?.sub) {
        setError("Your Auth0 profile is missing. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      // Save username to context
      saveUsername(username);

      // Save to backend via direct API call first
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

      let backendSaved = false;
      let retryCount = 0;
      const maxRetries = 3;

      // Retry logic for backend save
      while (!backendSaved && retryCount < maxRetries) {
        try {
          console.log(
            `Saving user to backend (attempt ${
              retryCount + 1
            }/${maxRetries})...`
          );
          const response = await fetch(`${backendUrl}/api/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: authUser.sub,
              username,
              authProvider: "auth0",
              auth0Id: authUser.sub,
              email: authUser.email,
              picture: authUser.picture,
            }),
          });

          if (response.ok) {
            console.log("User saved to backend successfully!");
            const userData = await response.json();
            console.log("Backend response:", userData);
            backendSaved = true;
          } else {
            console.error(`Failed to save user to backend: ${response.status}`);
            const errorText = await response.text();
            console.error(`Error details: ${errorText}`);
            retryCount++;

            if (retryCount < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retryCount)
              );
            }
          }
        } catch (error) {
          console.error("Error saving to backend:", error);
          retryCount++;

          if (retryCount < maxRetries) {
            // Wait before retrying
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
          }
        }
      }

      // Verify the user was created
      if (backendSaved) {
        console.log("User verified in backend - proceeding to success screen");
      } else {
        console.warn(
          "Could not verify user in backend - proceeding anyway and will try to sync later"
        );
      }

      // Show success dialog
      setShowSuccess(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error saving username:", error);
      setError("Failed to save username. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Show a skeleton UI during loading
  if (!isClient || authLoading || !authUser || isUserLoading) {
    return (
      <div className="container flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Please wait while we set up your account
            </CardDescription>
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
    <>
      <div className="container flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                {authUser.picture ? (
                  <AvatarImage
                    src={authUser.picture}
                    alt={authUser.name || "User"}
                  />
                ) : (
                  <AvatarFallback>
                    {authUser.name?.charAt(0) || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <CardTitle>Welcome to Bit2Byte, {authUser.name}</CardTitle>
            <CardDescription>
              Please choose a username to continue
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  This is how other users will see you in the chat.
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up your account...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Add diagnostic tool in development mode */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 w-full max-w-md">
            <DiagnosticTool />
          </div>
        )}
      </div>

      {showSuccess && (
        <RegistrationSuccess
          username={username}
          onComplete={() => router.push("/chat")}
        />
      )}
    </>
  );
}
