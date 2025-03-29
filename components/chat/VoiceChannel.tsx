"use client";

import { Button } from "@/components/ui/button";
import { useSocket } from "@/context/SocketContext";
import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";
import { PhoneCall, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { VideoCall } from "./VideoCall";

interface VoiceChannelProps {
  name: string;
  channelId: string;
}

export function VoiceChannel({ name, channelId }: VoiceChannelProps) {
  const { socket } = useSocket();
  const { user } = useUser();
  const [participants, setParticipants] = useState<any[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  // Listen for voice channel updates
  useEffect(() => {
    if (!socket) return;

    // Handle voice channel updates
    socket.on(
      "voiceChannelParticipants",
      ({ channelId: cId, participants: p }) => {
        if (cId === channelId) {
          setParticipants(p);

          // Check if current user is in the call
          const isUserInCall = p.some(
            (participant: any) => participant.id === user?.id
          );
          setIsJoined(isUserInCall);
        }
      }
    );

    // Initial request for participants
    socket.emit("getVoiceChannelParticipants", { channelId });

    return () => {
      socket.off("voiceChannelParticipants");
    };
  }, [socket, channelId, user]);

  const handleJoinLeaveChannel = () => {
    if (!socket || !user) return;

    if (isJoined) {
      // Leave the channel
      socket.emit("leaveVoiceChannel", { channelId, userId: user.id });
      setIsJoined(false);
    } else {
      // Join the channel
      socket.emit("joinVoiceChannel", {
        channelId,
        userId: user.id,
        username: user.username,
      });
      setIsJoined(true);
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={cn(
        "p-2 rounded-md",
        isJoined ? "bg-accent/30" : "hover:bg-accent/10"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{name}</span>
          {participants.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {participants.length}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant={isJoined ? "default" : "outline"}
          className="h-7 px-2"
          onClick={handleJoinLeaveChannel}
        >
          {isJoined ? "Leave" : "Join"}
        </Button>
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <div className="mt-2 space-y-1 pl-6">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-2 text-xs"
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {getInitials(participant.username)}
                </AvatarFallback>
              </Avatar>
              <span>{participant.username}</span>
              {participant.id === user?.id && (
                <span className="text-[10px] text-muted-foreground">(you)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Video call interface */}
      {isJoined && !isCallMinimized && (
        <div className="mt-2 border rounded-md h-[300px] overflow-hidden bg-background shadow-sm">
          <VideoCall
            room={`voice-${channelId}`}
            onMinimize={() => setIsCallMinimized(true)}
            onEnd={handleJoinLeaveChannel}
          />
        </div>
      )}

      {isJoined && isCallMinimized && (
        <VideoCall
          room={`voice-${channelId}`}
          minimized={true}
          onMaximize={() => setIsCallMinimized(false)}
          onEnd={handleJoinLeaveChannel}
        />
      )}
    </div>
  );
}
