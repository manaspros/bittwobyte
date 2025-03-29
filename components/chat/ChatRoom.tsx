"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { Message, User, TypingIndicator } from "@/types/chat";

interface ChatRoomProps {
  username: string;
  room: string;
  isPrivate?: boolean;
  recipient?: User;
}

export function ChatRoom({
  username,
  room,
  isPrivate = false,
  recipient,
}: ChatRoomProps) {
  const { socket } = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isWaitingForRoom, setIsWaitingForRoom] = useState(false);
  const [waitingTimeout, setWaitingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [joinAttempts, setJoinAttempts] = useState(0);
  const [isMounted, setIsMounted] = useState(true); // Track component mount state

  // Load message history when component mounts
  useEffect(() => {
    const fetchMessageHistory = async () => {
      try {
        console.log(`Fetching message history for room: ${room}`);
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

        // Direct fetch for message history
        const response = await fetch(`${backendUrl}/api/messages/${room}`);
        if (response.ok) {
          const history = await response.json();
          console.log(`Fetched ${history.length} messages for room ${room}`);

          // Validate each message has the required fields
          const validMessages = history.filter((msg) => {
            const hasRequiredFields = msg.user && msg.text && msg.timestamp;
            if (!hasRequiredFields) {
              console.warn("Invalid message format:", msg);
            }
            return hasRequiredFields;
          });

          // Only update state if component is still mounted
          if (isMounted) {
            setMessages(validMessages);
          }
        } else {
          console.warn(`Error fetching message history: ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching message history:", error);
      }
    };

    if (room && !room.startsWith("waiting-")) {
      fetchMessageHistory();
    }

    // Cleanup function
    return () => {
      setIsMounted(false);
    };
  }, [room]);

  useEffect(() => {
    if (room && room.startsWith("waiting-")) {
      setIsWaitingForRoom(true);
      console.log(`Waiting for private chat room assignment: ${room}`);

      // Set a timeout to retry joining the private chat if it doesn't connect in 5 seconds
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }

      const timeoutId = setTimeout(() => {
        if (
          isWaitingForRoom &&
          socket &&
          isPrivate &&
          recipient &&
          joinAttempts < 3 &&
          isMounted
        ) {
          console.log(
            `Retrying private chat connection with ${
              recipient.username
            }, attempt ${joinAttempts + 1}/3`
          );
          socket.emit("joinPrivateChat", {
            currentUserId: socket.id,
            targetUserId: recipient.id,
          });
          setJoinAttempts((prev) => prev + 1);
        }
      }, 5000);

      setWaitingTimeout(timeoutId);
    } else {
      setIsWaitingForRoom(false);
      // Clear timeout when room is set or component unmounts
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
        setWaitingTimeout(null);
      }
      setJoinAttempts(0);
    }

    return () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
    };
  }, [
    room,
    socket,
    isPrivate,
    recipient,
    isWaitingForRoom,
    joinAttempts,
    isMounted,
  ]);

  useEffect(() => {
    // Skip if socket is not available yet
    if (!socket || !isMounted) return;

    // Reset messages when room changes
    setMessages([]);

    // Join room when component mounts or room changes
    if (!isPrivate) {
      socket.emit("join", { username, room });
    } else if (isPrivate && recipient && room.startsWith("waiting-")) {
      console.log("Emitting joinPrivateChat event:", {
        currentUserId: socket.id,
        targetUserId: recipient.id,
      });
      socket.emit("joinPrivateChat", {
        currentUserId: socket.id,
        targetUserId: recipient.id,
      });
    }

    // Listen for message history
    socket.on("messageHistory", (history: Message[]) => {
      if (isMounted) {
        setMessages(history);
      }
    });

    // Listen for incoming messages
    socket.on("message", (newMessage: Message) => {
      if (!isMounted) return;

      console.log("Received new message:", newMessage);
      if (newMessage && newMessage.user && newMessage.text) {
        // Add additional uniqueness to message ID
        if (!newMessage.id) {
          newMessage.id = `msg-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        }

        // Check for duplicates before adding
        setMessages((prevMessages) => {
          // Don't add if the message is already in the list
          if (prevMessages.some((msg) => msg.id === newMessage.id)) {
            console.log("Skipping duplicate message:", newMessage.id);
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      } else {
        console.warn("Received invalid message format:", newMessage);
      }
    });

    // Listen for private messages - similar improvement
    socket.on("privateMessage", (newMessage: Message) => {
      if (!isMounted) return;

      // Add additional uniqueness to message ID
      if (!newMessage.id) {
        newMessage.id = `private-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      // Check for duplicates before adding
      setMessages((prevMessages) => {
        // Don't add if the message is already in the list
        if (prevMessages.some((msg) => msg.id === newMessage.id)) {
          console.log("Skipping duplicate private message:", newMessage.id);
          return prevMessages;
        }
        return [...prevMessages, { ...newMessage, isPrivate: true }];
      });
    });

    // Listen for message reaction updates
    socket.on("messageReactionUpdated", ({ messageId, reactions }) => {
      if (!isMounted) return;

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, reactions } : msg
        )
      );
    });

    // Listen for room users updates
    socket.on("roomUsers", ({ users }: { users: User[] }) => {
      if (isMounted) {
        setUsers(users);
      }
    });

    // Listen for typing indicators
    socket.on("userTyping", (typingInfo: TypingIndicator) => {
      if (!isMounted) return;

      if (typingInfo.isTyping) {
        setTypingUsers((prev) => {
          // Add user to typing list if not already there
          if (!prev.some((u) => u.userId === typingInfo.userId)) {
            return [...prev, typingInfo];
          }
          return prev;
        });
      } else {
        setTypingUsers((prev) =>
          prev.filter((user) => user.userId !== typingInfo.userId)
        );
      }
    });

    if (isPrivate && recipient) {
      console.log("Private chat component with recipient:", recipient);
      console.log("Current room:", room);
    }

    socket?.on("privateChatJoined", ({ room: newRoom, withUser }) => {
      if (!isMounted) return;

      console.log("Private chat joined:", newRoom, withUser);
      setIsWaitingForRoom(false);

      // If we get a new room, we might need to request message history
      if (newRoom && newRoom !== room) {
        console.log("Requesting message history for new room:", newRoom);
        socket.emit("getMessageHistory", { room: newRoom });
      }
    });

    // Clean up listeners on unmount or room change
    return () => {
      socket.off("messageHistory");
      socket.off("message");
      socket.off("privateMessage");
      socket.off("messageReactionUpdated");
      socket.off("roomUsers");
      socket.off("userTyping");
      socket?.off("privateChatJoined");
    };
  }, [socket, username, room, isPrivate, recipient, isMounted]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isMounted && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMounted]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
      setIsMounted(false);
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && socket && isMounted) {
      if (isPrivate && recipient) {
        socket.emit("sendPrivateMessage", {
          recipientId: recipient.id,
          text: message,
        });
      } else {
        socket.emit("sendMessage", { text: message, room });
      }

      setMessage("");

      // Clear typing indicator
      socket.emit("typing", { room, isTyping: false });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Handle typing indicator
    if (socket && isMounted) {
      socket.emit("typing", { room, isTyping: true });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socket && isMounted) {
          socket.emit("typing", { room, isTyping: false });
        }
      }, 2000);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (socket && isMounted) {
      socket.emit("addReaction", { messageId, reaction: emoji });
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);

    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, yyyy h:mm a");
    }
  };

  const formatLastSeen = (date: string) => {
    if (!date) return "Unknown";
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "MMMM d, yyyy");
  };

  // Renders message reactions if any
  const renderReactions = (msg: Message) => {
    if (!msg.reactions || Object.keys(msg.reactions).length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(msg.reactions).map(([emoji, users]) => (
          <button
            key={emoji}
            className="flex items-center bg-muted/50 rounded-full px-2 py-0.5 text-xs hover:bg-muted"
            onClick={() => handleAddReaction(msg.id!, emoji)}
          >
            <span className="mr-1">{emoji}</span>
            <span>{users.length}</span>
          </button>
        ))}
      </div>
    );
  };

  // Remove duplicate users by ID
  const uniqueUsers = React.useMemo(() => {
    return Array.from(new Map(users.map((user) => [user.id, user])).values());
  }, [users]);

  // Safe rendering with guards against removed nodes
  return (
    <div
      className={
        isPrivate
          ? ""
          : "grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-80px)]"
      }
    >
      {/* Chat Messages */}
      <div
        className={
          isPrivate ? "w-full" : "col-span-1 lg:col-span-3 flex flex-col h-full"
        }
      >
        {!isPrivate && (
          <div className="mb-4 flex items-center gap-2 p-2 border-b">
            <span className="text-xl font-bold flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              {room}
            </span>
            <span className="text-sm text-muted-foreground">
              {uniqueUsers.length}{" "}
              {uniqueUsers.length === 1 ? "member" : "members"}
            </span>
          </div>
        )}

        <div className="flex-grow overflow-hidden bg-background border rounded-lg">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4 p-4">
              {isWaitingForRoom ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="animate-pulse">
                    Connecting to private chat...
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No messages yet. Send a message to start the conversation!
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const isCurrentUser = msg.user === username;
                    const isSystem = msg.user === "system";

                    // Generate a truly unique key for each message
                    const messageKey =
                      msg.id || `msg-${msg.timestamp}-${index}`;

                    // Group messages by date
                    const showDateSeparator =
                      index === 0 ||
                      new Date(messages[index - 1].timestamp).toDateString() !==
                        new Date(msg.timestamp).toDateString();

                    // Check if message is from same user as previous message (for grouping)
                    const isConsecutiveMessage =
                      index > 0 &&
                      messages[index - 1].user === msg.user &&
                      !isSystem &&
                      new Date(msg.timestamp).getTime() -
                        new Date(messages[index - 1].timestamp).getTime() <
                        5 * 60 * 1000; // 5 minutes

                    return (
                      <React.Fragment key={messageKey}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-muted h-px flex-grow"></div>
                            <span className="px-2 text-xs text-muted-foreground">
                              {formatDateSeparator(msg.timestamp)}
                            </span>
                            <div className="bg-muted h-px flex-grow"></div>
                          </div>
                        )}

                        <div
                          className={cn(
                            "group",
                            isSystem
                              ? "flex justify-center my-2"
                              : "hover:bg-muted/50 py-1 px-2 -mx-2 rounded",
                            isConsecutiveMessage ? "pt-0 mt-0" : "pt-2 mt-1"
                          )}
                        >
                          {isSystem ? (
                            <div className="px-4 py-1 bg-muted/30 rounded-md text-sm text-muted-foreground">
                              {msg.text}
                            </div>
                          ) : (
                            <div className="flex gap-x-3">
                              {/* Only show avatar for the first message in a group */}
                              {!isConsecutiveMessage && (
                                <Avatar className="h-10 w-10 mt-0.5 flex-shrink-0">
                                  <AvatarFallback>
                                    {getInitials(msg.user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={cn(
                                  "flex-1",
                                  isConsecutiveMessage && "pl-[3.25rem]"
                                )}
                              >
                                {/* Only show username for the first message in a group */}
                                {!isConsecutiveMessage && (
                                  <div className="flex gap-2 items-baseline">
                                    <span className="font-medium">
                                      {msg.user}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatMessageTime(msg.timestamp)}
                                    </span>
                                  </div>
                                )}
                                <div className="text-sm mt-1">{msg.text}</div>
                                {renderReactions(msg)}
                              </div>

                              {/* Reaction button - only show on hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                <EmojiPicker
                                  onEmojiSelect={(emoji) =>
                                    handleAddReaction(msg.id!, emoji)
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {typingUsers.length > 0 && (
                <div className="text-sm text-muted-foreground italic">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].username} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </div>
              )}

              <div ref={messageEndRef} />
            </div>
          </ScrollArea>
        </div>

        <div className="mt-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder={`Type your message to ${
                isPrivate ? recipient?.username : "the room"
              }...`}
              className="flex-grow"
              disabled={isWaitingForRoom}
            />
            <Button type="submit" disabled={isWaitingForRoom}>
              Send
            </Button>
          </form>
        </div>
      </div>

      {/* Online Users - Only show in public chat rooms */}
      {!isPrivate && (
        <div className="col-span-1 h-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Online Users</h2>
          </div>
          <div className="bg-background border rounded-lg overflow-hidden h-[calc(100vh-150px)]">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {uniqueUsers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No users in this room
                  </div>
                ) : (
                  <>
                    {uniqueUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getInitials(user.username)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          <span className="font-medium">{user.username}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Display recipient info in private chat */}
      {isPrivate && recipient && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(recipient.username)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{recipient.username}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    recipient.isOnline ? "bg-green-500" : "bg-gray-400"
                  )}
                />
                {recipient.isOnline
                  ? "Online"
                  : recipient.lastSeen
                  ? `Last seen ${formatLastSeen(recipient.lastSeen)}`
                  : "Offline"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
