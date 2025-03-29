"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/auth-provider";
import { Loader2 } from "lucide-react";

export function DiagnosticTool() {
  const { user: authUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    if (!authUser?.sub) {
      setResults({ error: "No authenticated user" });
      return;
    }

    setIsRunning(true);
    setResults(null);

    try {
      // Check user in backend
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

      // Try direct backend check
      try {
        const response = await fetch(`${backendUrl}/api/users/${authUser.sub}`);

        if (response.ok) {
          const userData = await response.json();
          setResults({
            success: true,
            message: "User found in database",
            userData,
          });
        } else {
          // Try to create/update the user
          try {
            const username =
              localStorage.getItem(`username_${authUser.sub}`) ||
              authUser.nickname ||
              authUser.name ||
              authUser.email?.split("@")[0] ||
              "user";

            const createResponse = await fetch(`${backendUrl}/api/users`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: authUser.sub,
                username,
                authProvider: "auth0",
                auth0Id: authUser.sub,
                email: authUser.email,
                picture: authUser.picture,
              }),
            });

            if (createResponse.ok) {
              const createdUser = await createResponse.json();
              setResults({
                success: true,
                message: "User was missing but has been created",
                userData: createdUser,
              });
            } else {
              setResults({
                success: false,
                message: `Failed to create user: ${createResponse.status}`,
                error: await createResponse.text(),
              });
            }
          } catch (createError) {
            setResults({
              success: false,
              message: "Error creating user",
              error:
                createError instanceof Error
                  ? createError.message
                  : String(createError),
            });
          }
        }
      } catch (error) {
        setResults({
          success: false,
          message: "Error checking user in backend",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      setResults({
        success: false,
        message: "Error running diagnostics",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-background">
      <h3 className="font-medium mb-2">Account Diagnostics</h3>

      <Button
        onClick={runDiagnostics}
        disabled={isRunning || !authUser?.sub}
        size="sm"
        className="mb-4"
      >
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          "Check Account"
        )}
      </Button>

      {results && (
        <Alert
          variant={results.success ? "default" : "destructive"}
          className="mt-4"
        >
          <AlertDescription>
            <div className="font-medium">{results.message}</div>
            {results.userData && (
              <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(results.userData, null, 2)}
              </pre>
            )}
            {results.error && (
              <div className="text-xs mt-2 text-red-500">{results.error}</div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
