"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useSocket } from "./SocketContext";

interface User {
  id: string;
  username: string;
}

interface UserContextType {
  user: User | null;
  setUsername: (username: string) => void;
  isFirstLogin: boolean;
  setIsFirstLogin: (isFirst: boolean) => void;
  isUserLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUsername: () => {},
  isFirstLogin: false,
  setIsFirstLogin: () => {},
  isUserLoading: false,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    isAuthenticated,
    user: authUser,
    logout,
    isLoading: authLoading,
  } = useAuth();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [user, setUser] = useState<User | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [hasCheckedBackend, setHasCheckedBackend] = useState(false);
  const [backendRetryAttempts, setBackendRetryAttempts] = useState(0);

  // Log user context changes
  useEffect(() => {
    console.log("User context state:", {
      isAuthenticated,
      authLoading,
      hasAuthUser: !!authUser,
      contextUser: user,
      isFirstLogin,
      isUserLoading,
      hasCheckedBackend,
      backendRetryAttempts,
    });
  }, [
    isAuthenticated,
    authLoading,
    authUser,
    user,
    isFirstLogin,
    isUserLoading,
    hasCheckedBackend,
    backendRetryAttempts,
  ]);

  // Direct API call to save user data to MongoDB - updated to use frontend API as fallback
  const saveUserToBackend = async (userData: {
    userId: string;
    username: string;
    authProvider?: string;
    auth0Id?: string;
    email?: string;
    picture?: string;
  }) => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

      console.log(
        `Saving user to backend via direct API call: ${userData.userId}`
      );

      // First try direct backend API
      try {
        const directResponse = await fetch(`${backendUrl}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (directResponse.ok) {
          console.log("User saved to backend successfully via direct API");
          return true;
        }

        console.log(`Direct API failed with status: ${directResponse.status}`);
      } catch (directError) {
        console.log("Error with direct backend API:", directError);
      }

      // If direct backend call fails, try the frontend API that has fallback logic
      console.log("Trying to save user via frontend API fallback...");
      const frontendResponse = await fetch(`/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (frontendResponse.ok || frontendResponse.status === 207) {
        const data = await frontendResponse.json();
        if (data._cached) {
          console.log("User saved in local cache only - backend unreachable");
          // It's not a failure, just a different storage mechanism
          return true;
        }
        console.log("User saved to backend successfully via frontend API");
        return true;
      }

      console.error(
        `Failed to save user with frontend API: ${frontendResponse.status}`
      );
      return false;
    } catch (error) {
      console.error("Error saving user to backend:", error);
      return false;
    }
  };

  // Check if user has a username in localStorage and backend when Auth0 authenticates
  useEffect(() => {
    // Skip on server
    if (typeof window === "undefined") return;

    // Skip if auth is still loading
    if (authLoading) return;

    // Only proceed if authenticated with Auth0
    if (isAuthenticated && authUser) {
      console.log("Auth0 user detected:", authUser.sub);
      setIsUserLoading(true);

      // Store both raw and encoded user IDs for compatibility
      const rawUserId = authUser.sub;
      const encodedUserId = encodeURIComponent(authUser.sub);

      console.log("Raw user ID:", rawUserId);
      console.log("Auth0 profile:", authUser);

      // First check if this user already exists in backend
      const checkExistingUser = async () => {
        try {
          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

          console.log(
            `Checking for existing user in backend with ID: ${rawUserId}`
          );
          // Use the raw ID for API requests
          const response = await fetch(`${backendUrl}/api/users/${rawUserId}`);

          if (response.ok) {
            const userData = await response.json();
            console.log("Found existing user in database:", userData);
            setHasCheckedBackend(true);

            // Use username from database
            setUser({
              id: rawUserId, // Always use raw ID internally
              username: userData.username,
            });

            // Update localStorage to match database
            localStorage.setItem(`username_${rawUserId}`, userData.username);

            // If socket is connected, emit authenticated event
            if (socket && isConnected) {
              console.log("Emitting authenticated event for existing user");
              socket.emit("authenticated", {
                userId: rawUserId,
                username: userData.username,
                authProvider: "auth0",
                auth0Id: rawUserId,
                email: authUser.email,
                picture: authUser.picture,
              });
            }

            setIsUserLoading(false);
            setIsFirstLogin(false);
            return true; // User exists
          }

          if (response.status === 404) {
            console.log("User not found in database - new Auth0 user");
            setHasCheckedBackend(true);

            // For Auth0 users, we could use their nickname or email username as a default
            const defaultUsername =
              authUser.nickname ||
              authUser.name ||
              (authUser.email ? authUser.email.split("@")[0] : null);

            if (defaultUsername) {
              console.log(
                `Using Auth0 profile info for username: ${defaultUsername}`
              );

              // Set user in state
              setUser({
                id: rawUserId, // Always use raw ID internally
                username: defaultUsername,
              });

              // Attempt to create the user in the backend immediately
              const savedToBackend = await saveUserToBackend({
                userId: rawUserId,
                username: defaultUsername,
                authProvider: "auth0",
                auth0Id: rawUserId,
                email: authUser.email,
                picture: authUser.picture,
              });

              // Store in localStorage regardless of backend success
              localStorage.setItem(`username_${rawUserId}`, defaultUsername);

              if (savedToBackend) {
                console.log("New user created in backend successfully");
              } else {
                console.warn(
                  "Failed to create user in backend, will try again later"
                );
              }

              // Set first login flag to show username setup
              setIsFirstLogin(true);
              setIsUserLoading(false);
              return false;
            }

            setIsFirstLogin(true);
            setIsUserLoading(false);
            return false;
          }

          // Handle other error states
          console.error(
            `Backend returned unexpected status: ${response.status}`
          );

          // Retry a few times if we get an unexpected response
          if (backendRetryAttempts < 3) {
            console.log(
              `Retrying backend check (attempt ${
                backendRetryAttempts + 1
              }/3)...`
            );
            setBackendRetryAttempts((prev) => prev + 1);
            // Wait 1 second before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return checkExistingUser(); // Recursive retry
          }

          setIsUserLoading(false);
          return false; // User doesn't exist
        } catch (error) {
          console.error("Error checking for existing user:", error);

          // Retry a few times if we get a connection error
          if (backendRetryAttempts < 3) {
            console.log(
              `Retrying backend check after error (attempt ${
                backendRetryAttempts + 1
              }/3)...`
            );
            setBackendRetryAttempts((prev) => prev + 1);
            // Wait 1 second before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return checkExistingUser(); // Recursive retry
          }

          setIsUserLoading(false);
          setHasCheckedBackend(true);
          return false;
        }
      };

      // Check if user has a saved username in localStorage
      const checkLocalUser = () => {
        const savedUsername = localStorage.getItem(`username_${rawUserId}`);

        if (savedUsername) {
          console.log("Found username in localStorage:", savedUsername);
          setUser({
            id: rawUserId, // Always use raw ID internally
            username: savedUsername,
          });

          // Try to save user to backend too
          saveUserToBackend({
            userId: rawUserId,
            username: savedUsername,
            authProvider: "auth0",
            auth0Id: rawUserId,
            email: authUser.email,
            picture: authUser.picture,
          });

          // Emit authenticated event
          if (socket && isConnected) {
            socket.emit("authenticated", {
              userId: rawUserId,
              username: savedUsername,
              authProvider: "auth0",
              auth0Id: rawUserId,
              email: authUser.email,
              picture: authUser.picture,
            });
          }

          return true;
        }

        return false;
      };

      // Check existing user then fall back to local storage
      const initUser = async () => {
        const existsInDb = await checkExistingUser();
        if (!existsInDb) {
          const existsLocally = checkLocalUser();
          if (!existsLocally) {
            console.log("First login detected - username setup needed");
            setIsFirstLogin(true);
          }
        }
        setIsUserLoading(false);
      };

      initUser();
    } else if (!isAuthenticated && !authLoading) {
      // Clear user state if not authenticated
      console.log("Not authenticated, clearing user state");
      setUser(null);
      setIsFirstLogin(false);
      setIsUserLoading(false);
      setHasCheckedBackend(false);
      setBackendRetryAttempts(0);
    }
  }, [
    isAuthenticated,
    authUser,
    socket,
    isConnected,
    authLoading,
    backendRetryAttempts,
  ]);

  // Redirect to appropriate page based on authentication state
  useEffect(() => {
    // Don't redirect while auth is loading or user data is loading
    if (authLoading || isUserLoading) {
      console.log("Skipping redirection - still loading");
      return;
    }

    // Only proceed with redirection for authenticated users
    if (isAuthenticated && hasCheckedBackend) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      console.log(
        `Current path: ${currentPath}, isFirstLogin: ${isFirstLogin}, user: ${user?.username}`
      );

      if (isFirstLogin) {
        // New user needs to set up a username
        if (currentPath !== "/username-setup") {
          console.log("Redirecting to username setup");
          router.push("/username-setup");
        }
      } else if (user) {
        // User has a username, send to chat instead of feed
        if (currentPath === "/" || currentPath === "/username-setup") {
          console.log("Redirecting to chat");
          router.push("/chat");
        }
      }
    }
  }, [
    isAuthenticated,
    user,
    isFirstLogin,
    router,
    authLoading,
    isUserLoading,
    hasCheckedBackend,
  ]);

  // Save username to localStorage and backend
  const setUsername = (username: string) => {
    if (authUser) {
      // Use raw user ID for consistent localStorage keys
      const rawUserId = authUser.sub;
      console.log(`Setting username for user ${rawUserId}: ${username}`);
      localStorage.setItem(`username_${rawUserId}`, username);

      setUser({
        id: rawUserId, // Always use raw ID internally
        username,
      });
      setIsFirstLogin(false);

      // Save to backend using direct API call (more reliable than socket)
      saveUserToBackend({
        userId: rawUserId,
        username,
        authProvider: "auth0",
        auth0Id: rawUserId,
        email: authUser.email,
        picture: authUser.picture,
      });

      // Emit authenticated event with all required info (as backup)
      if (socket && isConnected) {
        console.log(
          `Emitting authenticated event for new username: ${username}`
        );
        socket.emit("authenticated", {
          userId: rawUserId,
          username,
          authProvider: "auth0",
          auth0Id: rawUserId,
          email: authUser.email,
          picture: authUser.picture,
        });
      }
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUsername,
        isFirstLogin,
        setIsFirstLogin,
        isUserLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
