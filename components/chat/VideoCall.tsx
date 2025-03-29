"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  MonitorUp,
  PhoneCall,
  AlertTriangle,
} from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface VideoCallProps {
  room: string;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onEnd?: () => void;
}

export function VideoCall({
  room,
  minimized = false,
  onMinimize,
  onMaximize,
  onEnd,
}: VideoCallProps) {
  const { socket } = useSocket();
  const { user } = useUser();
  const router = useRouter();
  const [participants, setParticipants] = useState<string[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [channelId, setChannelId] = useState(room);
  const [showConfigError, setShowConfigError] = useState(false);

  // Join and leave the channel
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for room participants
    socket.on(
      "voiceChannelParticipants",
      ({ channelId: cId, participants: p }) => {
        if (cId === room) {
          setParticipants(p.map((participant: any) => participant.username));
        }
      }
    );

    // Request current participants
    socket.emit("getVoiceChannelParticipants", { channelId: room });

    // Clean up on unmount
    return () => {
      socket.off("voiceChannelParticipants");
    };
  }, [socket, user, room]);

  // Handle the case when minimized (show floating UI)
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-30">
        <Card className="p-2 bg-primary/10 backdrop-blur-sm border border-primary/30 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-20 h-16 bg-background rounded overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <PhoneCall className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium">Video Call</span>
              <span className="text-xs text-muted-foreground">
                {participants.length} participants
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={onMaximize}>
                <MonitorUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={handleEndCall}>
                <Phone className="h-4 w-4 rotate-135" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Join the Agora video call
  const handleJoinCall = () => {
    // Check if Agora is configured
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    if (!appId || appId === "your-agora-app-id") {
      setShowConfigError(true);
      return;
    }

    setIsCallActive(true);
    // Navigate to the video call page with the channel ID
    router.push(`/video-call?channel=${encodeURIComponent(channelId)}`);
  };

  // End the call
  const handleEndCall = () => {
    setIsCallActive(false);
    if (onEnd) onEnd();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center">
        {isCallActive ? (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Call in progress</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your call is active in another window.
            </p>
            <Button variant="outline" onClick={handleEndCall}>
              End Call
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Start Video Call</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Join a video call with {participants.length} participants in this
              channel.
            </p>
            <Button onClick={handleJoinCall}>
              <Video className="h-4 w-4 mr-2" />
              Join Video Call
            </Button>
          </div>
        )}
      </div>

      {/* Configuration Error Dialog */}
      <AlertDialog open={showConfigError} onOpenChange={setShowConfigError}>
        <AlertDialogContent>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Video Call Not Available</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            The video call feature is not properly configured. Please contact
            the administrator to set up Agora credentials.
          </AlertDialogDescription>
          <div className="flex justify-end mt-4">
            <AlertDialogAction>Close</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Minimization controls */}
      <div className="p-2 flex items-center justify-between border-t">
        <div className="text-sm text-muted-foreground">
          {participants.length > 0
            ? `${participants.length} participant${
                participants.length !== 1 ? "s" : ""
              }`
            : "No participants"}
        </div>
        {onMinimize && (
          <Button size="sm" variant="ghost" onClick={onMinimize}>
            <MonitorUp className="h-4 w-4 rotate-180" />
            Minimize
          </Button>
        )}
      </div>
    </div>
  );
}
