"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// Define the user type
interface AuthUser {
  sub: string; // Auth0 user ID
  name?: string;
  email?: string;
  picture?: string;
}

// Define the auth context shape
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
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

// Create the auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  // Simulate checking auth status on mount
  useEffect(() => {
    const checkAuthStatus = () => {
      // Check if there's a user in localStorage
      const storedUser = localStorage.getItem("auth_user");

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          // Invalid stored user, clear it
          localStorage.removeItem("auth_user");
          setUser(null);
          setIsAuthenticated(false);
        }
      }

      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Mock login function
  const login = () => {
    // Create a mock user
    const mockUser: AuthUser = {
      sub: `user_${Math.random().toString(36).substring(2, 15)}`, // Generate random ID
      name: "Demo User",
      email: "demo@example.com",
      picture: "https://via.placeholder.com/150",
    };

    // Store the user in localStorage
    localStorage.setItem("auth_user", JSON.stringify(mockUser));

    // Update state
    setUser(mockUser);
    setIsAuthenticated(true);

    // Redirect to feed or username setup
    router.push("/feed");
  };

  // Mock logout function
  const logout = () => {
    // Remove user from localStorage
    localStorage.removeItem("auth_user");

    // Update state
    setUser(null);
    setIsAuthenticated(false);

    // Redirect to home
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
