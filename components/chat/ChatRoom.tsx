"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import { Message, User, TypingIndicator } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmojiPicker } from "@/components/chat/EmojiPicker";

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

          setMessages(validMessages);
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
          joinAttempts < 3
        ) {
          console.log(
            `Retrying private chat connection with ${
              recipient.username
            }, attempt ${joinAttempts + 1}/3`
          );
          socket.emit("joinPrivateChat", {
            currentUserId: socket.id, // Make sure we're passing the right ID
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
  }, [room, socket, isPrivate, recipient, isWaitingForRoom, joinAttempts]);

  useEffect(() => {
    // Skip if socket is not available yet
    if (!socket) return;

    // Reset messages when room changes
    setMessages([]);

    // Join room when component mounts or room changes
    if (!isPrivate) {
      socket.emit("join", { username, room });
    } else if (isPrivate && recipient && room.startsWith("waiting-")) {
      console.log("Emitting joinPrivateChat event:", {
        currentUserId: socket.id, // This might be the issue - we need the actual user ID, not socket ID
        targetUserId: recipient.id,
      });
      socket.emit("joinPrivateChat", {
        currentUserId: socket.id, // Make sure we're passing the right ID
        targetUserId: recipient.id,
      });
    }

    // Listen for message history
    socket.on("messageHistory", (history: Message[]) => {
      setMessages(history);
    });

    // Listen for incoming messages
    socket.on("message", (newMessage: Message) => {
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
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, reactions } : msg
        )
      );
    });

    // Listen for room users updates
    socket.on("roomUsers", ({ users }: { users: User[] }) => {
      setUsers(users);
    });

    // Listen for typing indicators
    socket.on("userTyping", (typingInfo: TypingIndicator) => {
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
  }, [socket, username, room, isPrivate, recipient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && socket) {
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
    if (socket) {
      socket.emit("typing", { room, isTyping: true });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { room, isTyping: false });
      }, 2000);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (socket) {
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
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl font-bold flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              {room}
            </span>
            <span className="text-sm text-muted-foreground">
              {users.length} {users.length === 1 ? "member" : "members"}
            </span>
          </div>
        )}

        <div className="flex-grow overflow-hidden bg-background border rounded-lg">
          <ScrollArea className="h-[calc(100vh-250px)]" ref={scrollAreaRef}>
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

                    return (
                      <React.Fragment key={messageKey}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-muted px-3 py-1 rounded-full text-xs">
                              {format(new Date(msg.timestamp), "MMMM d, yyyy")}
                            </div>
                          </div>
                        )}

                        <div
                          className={cn(
                            "relative group",
                            isSystem && "flex justify-center",
                            !isSystem && "max-w-[80%]",
                            isCurrentUser && !isSystem && "ml-auto"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-start gap-2 p-3 rounded-lg",
                              isCurrentUser && !isSystem
                                ? "flex-row-reverse bg-primary/10"
                                : isSystem
                                ? "justify-center text-center italic text-muted-foreground bg-transparent"
                                : "bg-muted",
                              msg.isPrivate &&
                                "border border-yellow-500/50 bg-yellow-500/10"
                            )}
                          >
                            {!isSystem && (
                              <Avatar className="h-8 w-8 mt-0.5">
                                <AvatarFallback>
                                  {getInitials(msg.user)}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className="flex flex-col">
                              {!isSystem && !isCurrentUser && (
                                <span className="text-xs font-medium text-muted-foreground mb-1">
                                  {msg.user}
                                </span>
                              )}

                              <div className="flex flex-col">
                                <p className={isSystem ? "text-sm" : ""}>
                                  {msg.isPrivate && !isPrivate && (
                                    <span className="text-xs mr-1 text-yellow-600">
                                      [Private]{" "}
                                    </span>
                                  )}
                                  {msg.text}
                                </p>

                                {renderReactions(msg)}

                                <span className="text-xs text-muted-foreground mt-1">
                                  {formatMessageTime(msg.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Emoji reaction button (not for system messages) */}
                          {!isSystem && (
                            <div
                              className={cn(
                                "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                isCurrentUser
                                  ? "left-0 -translate-x-full -ml-2"
                                  : "right-0 translate-x-full mr-2"
                              )}
                            >
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full bg-muted/50 hover:bg-muted"
                                  >
                                    <span className="text-xs">😀</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-full p-1"
                                  align="end"
                                >
                                  <EmojiPicker
                                    onEmojiSelect={(emoji) =>
                                      msg.id && handleAddReaction(msg.id, emoji)
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
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
            <h2 className="text-xl font-bold">Online Users ({users.length})</h2>
          </div>
          <div className="bg-background border rounded-lg overflow-hidden h-[calc(100vh-150px)]">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No users in this room
                  </div>
                ) : (
                  <>
                    {users.map((user) => (
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
                          <span
                            className={
                              user.username === username ? "font-bold" : ""
                            }
                          >
                            {user.username}{" "}
                            {user.username === username && "(You)"}
                          </span>
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
