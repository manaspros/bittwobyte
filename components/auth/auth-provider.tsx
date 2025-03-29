"use client";

import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Define the auth context shape
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any; // Auth0 user profile
  login: () => void;
  logout: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: () => {},
  logout: () => {},
});

// Export the useAuth hook
export const useAuth = () => useContext(AuthContext);

// Auth Context Provider that uses Auth0
function AuthContextProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();
  const router = useRouter();
  const [redirectInProgress, setRedirectInProgress] = useState(false);

  // Log auth state changes to help with debugging
  useEffect(() => {
    console.log("Auth state updated:", {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userId: user?.sub,
    });
  }, [isAuthenticated, isLoading, user]);

  // When auth state changes and user is available, store in localStorage
  useEffect(() => {
    if (isAuthenticated && user) {
      try {
        localStorage.setItem("auth_user", JSON.stringify(user));
      } catch (error) {
        console.error("Error storing auth user in localStorage:", error);
      }
    }
  }, [isAuthenticated, user]);

  // Auth0 login wrapper
  const login = () => {
    setRedirectInProgress(true);
    try {
      console.log("Initiating Auth0 login redirect...");
      loginWithRedirect({
        appState: { returnTo: "/username-setup" }, // Explicitly set redirect to username-setup
      }).catch((error) => {
        console.error("Login redirect error:", error);
        setRedirectInProgress(false);
      });
    } catch (error) {
      console.error("Error during login:", error);
      setRedirectInProgress(false);
    }
  };

  // Auth0 logout wrapper
  const logout = () => {
    // Clear any saved username data for this user
    if (user && user.sub) {
      localStorage.removeItem(`username_${user.sub}`);
    }

    // Log out from Auth0
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        // Treat as loading if Auth0 is loading OR if a redirect is in progress
        isLoading: isLoading || redirectInProgress,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Main Auth Provider that wraps the application
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  // Set client-side state once component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auth0 config
  const auth0Domain =
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "your-auth0-domain.auth0.com";
  const auth0ClientId =
    process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "your-auth0-client-id";
  const redirectUri =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  // Show loading spinner for SSR
  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      // Add cacheLocation to improve persistence across page reloads
      cacheLocation="localstorage"
      useRefreshTokens={true}
      // Add a session check interval to keep the session alive
      sessionCheckExpiryDays={1}
    >
      <AuthContextProvider>{children}</AuthContextProvider>
    </Auth0Provider>
  );
}
