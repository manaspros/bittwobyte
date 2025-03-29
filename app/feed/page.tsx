"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { UserList } from "@/components/chat/UserList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { fetchAllUsers } from "@/utils/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  id: string;
  username: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export default function FeedPage() {
  const { user, isUserLoading } = useUser();
  const { socket, isConnected, connectionError } = useSocket();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Add a client-side state flag to handle hydration
  const [isClient, setIsClient] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("online");
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // Set client state on mount
  useEffect(() => {
    setIsClient(true);
    // Set a short timeout to allow Auth0 to finish loading
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Log important state for debugging
  useEffect(() => {
    console.log("Feed page state:", {
      isAuthenticated,
      authLoading,
      isUserLoading,
      pageLoading,
      hasUser: !!user,
      socketConnected: isConnected,
      connectionError,
      userCount: allUsers.length,
      onlineCount: onlineUsers.length,
    });
  }, [
    isAuthenticated,
    authLoading,
    isUserLoading,
    pageLoading,
    user,
    isConnected,
    connectionError,
    allUsers,
    onlineUsers,
  ]);

  // Redirect if not authenticated
  useEffect(() => {
    // Only redirect if we're sure auth is finished loading and not authenticated
    if (!authLoading && !isAuthenticated && isClient && !pageLoading) {
      console.log("User not authenticated, redirecting to login page");
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router, isClient, pageLoading]);

  // Verify user exists in backend
  useEffect(() => {
    if (isAuthenticated && user && isClient && !isUserLoading) {
      const checkUserExists = async () => {
        try {
          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

          console.log(`Verifying user exists in backend: ${user.id}`);
          const response = await fetch(`${backendUrl}/api/users/${user.id}`);

          if (response.status === 404) {
            console.log("User not found in database, attempting to create...");

            // Try to create the user instead of immediately redirecting
            try {
              const createResponse = await fetch(`${backendUrl}/api/users`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: user.id,
                  username: user.username,
                  authProvider: "auth0",
                  auth0Id: user.id,
                }),
              });

              if (createResponse.ok) {
                console.log(
                  "Successfully created missing user:",
                  await createResponse.json()
                );
              } else {
                console.error(
                  "Failed to create user:",
                  await createResponse.text()
                );
                setError(
                  "Your account couldn't be found or created. Please log in again."
                );

                // Log out after a short delay
                setTimeout(() => {
                  if (typeof logout === "function") {
                    logout();
                  }
                  router.push("/");
                }, 3000);
              }
            } catch (createError) {
              console.error("Error creating user:", createError);
              setError("Your account was not found. Please log in again.");

              // Log out after a short delay
              setTimeout(() => {
                if (typeof logout === "function") {
                  logout();
                }
                router.push("/");
              }, 3000);
            }
          } else if (response.ok) {
            console.log("User verified in database");
          }
        } catch (error) {
          console.error("Error checking user existence:", error);
        }
      };

      checkUserExists();
    }
  }, [isAuthenticated, user, isClient, router, logout, isUserLoading]);

  // Fetch all users
  const loadAllUsers = async () => {
    if (!user) return;

    try {
      setIsRefreshingUsers(true);
      const users = await fetchAllUsers();
      if (Array.isArray(users)) {
        setAllUsers(users.filter((u) => u.id !== user.id));
      } else {
        console.error("Unexpected response format from fetchAllUsers:", users);
        setAllUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAllUsers([]);
    } finally {
      setIsRefreshingUsers(false);
    }
  };

  // Fetch all users on component mount
  useEffect(() => {
    if (!user || !isClient) return;
    loadAllUsers();
  }, [user, isClient]);

  // Listen for user list updates
  useEffect(() => {
    if (!socket || !user) return;

    socket.on("userList", (users: User[]) => {
      // Filter out current user
      const filteredUsers = users.filter((u) => u.id !== user.id);
      console.log(`Received updated user list: ${filteredUsers.length} users`);
      setOnlineUsers(filteredUsers);

      // Update online status in allUsers list
      setAllUsers((prev) => {
        const userMap = new Map(filteredUsers.map((u) => [u.id, u]));

        return prev.map((u) => {
          const onlineUser = userMap.get(u.id);
          if (onlineUser) {
            return { ...u, isOnline: true, lastSeen: new Date().toISOString() };
          }
          return u;
        });
      });
    });

    socket.on("privateChatJoined", ({ room, withUser }) => {
      console.log(`Joined private chat room: ${room} with user:`, withUser);
      setActiveRoom(room);
      setSelectedUser(withUser);
    });

    return () => {
      socket.off("userList");
      socket.off("privateChatJoined");
    };
  }, [socket, user]);

  // Start private chat with a user
  const startPrivateChat = (targetUser: User) => {
    if (!socket || !user) return;

    console.log("Starting private chat with:", targetUser);
    console.log("Current user:", user);

    // Set loading or pending state
    setSelectedUser(targetUser);

    // Store the actual user ID (raw, non-encoded)
    const userId = user.id;

    if (socket.connected) {
      console.log(`Emitting joinPrivateChat with currentUserId: ${userId}`);

      // Send the actual user ID, not socket.id
      socket.emit("joinPrivateChat", {
        currentUserId: userId,
        targetUserId: targetUser.id,
      });

      // Debug logging
      console.log("joinPrivateChat event emitted with:", {
        currentUserId: userId,
        targetUserId: targetUser.id,
      });
    } else {
      console.warn("Cannot start private chat - socket disconnected");
      setError("Chat server not connected. Please try again later.");
    }
  };

  // Go back to user list
  const backToUserList = () => {
    setSelectedUser(null);
    setActiveRoom(null);
  };

  // Prevent rendering authentication-dependent UI during SSR or loading
  if (!isClient || authLoading || pageLoading || isUserLoading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading</h2>
          <p className="text-muted-foreground">
            Please wait while we prepare your feed
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state while checking auth or if user not loaded yet
  if (!user) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">Loading user data...</h1>
        <p className="text-muted-foreground mt-2">
          This may take a moment as we set up your account
        </p>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome, {user.username}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/chat?autoJoin=true")}
          >
            Public Chat
          </Button>
          {selectedUser ? null : (
            <Button
              variant="outline"
              onClick={loadAllUsers}
              disabled={isRefreshingUsers}
            >
              {isRefreshingUsers ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Users"
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {!selectedUser ? (
          // Show user list when no user is selected
          <Card className="col-span-1">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Click on a user to start a private chat
                  </CardDescription>
                </div>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="online">
                      Online ({onlineUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="all">
                      All Users ({allUsers.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === "online" ? (
                <UserList users={onlineUsers} onSelectUser={startPrivateChat} />
              ) : (
                <UserList users={allUsers} onSelectUser={startPrivateChat} />
              )}
            </CardContent>
          </Card>
        ) : (
          // Show chat interface when a user is selected
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Chat with {selectedUser.username}</CardTitle>
                <CardDescription>Private Chat</CardDescription>
              </div>
              <Button variant="ghost" onClick={backToUserList}>
                Back to User List
              </Button>
            </CardHeader>
            <CardContent>
              {selectedUser && (
                <ChatRoom
                  username={user.username}
                  room={activeRoom || `waiting-${selectedUser.id}`}
                  isPrivate={true}
                  recipient={selectedUser}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
