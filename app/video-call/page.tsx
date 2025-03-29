"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  UID,
} from "agora-rtc-sdk-ng";
import {
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  AlertTriangle,
} from "lucide-react";
import { generateToken } from "@/utils/agora-token";
import { toast } from "sonner";

// Agora app settings
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;

export default function VideoCallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [localTracks, setLocalTracks] = useState<
    [IMicrophoneAudioTrack | null, ICameraVideoTrack | null]
  >([null, null]);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isJoining, setIsJoining] = useState(true);
  const [participants, setParticipants] = useState<{ [key: string]: string }>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(true);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const channelName = searchParams.get("channel") || "main";
  const localVideoRef = useRef<HTMLDivElement>(null);

  // Check if Agora configuration is valid
  useEffect(() => {
    if (!APP_ID || APP_ID === "your-agora-app-id") {
      console.error("Missing or invalid Agora App ID");
      setIsConfigValid(false);
      setError("Agora App ID is not configured properly.");
      setIsJoining(false);
    }
  }, []);

  // Initialize and join the channel when component mounts
  useEffect(() => {
    if (!user || !isConfigValid) {
      return;
    }

    // Create and configure Agora client
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    // Event listeners for remote users
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-joined", handleUserJoined);
    client.on("user-left", handleUserLeft);
    client.on("connection-state-change", (state) => {
      console.log("Connection state changed to:", state);
    });
    client.on("exception", (evt) => {
      console.warn("Agora exception:", evt);
    });

    // Join the channel and initialize local tracks
    const initializeCall = async () => {
      try {
        setIsJoining(true);
        setError(null);

        console.log("Joining channel:", channelName);
        console.log("Using app ID:", APP_ID);

        // Generate a token for the channel
        const uid = Math.floor(Math.random() * 1000000);
        let token = null;

        try {
          token = await generateToken(channelName, uid);
          console.log("Token generated:", token ? "Success" : "Failed");
        } catch (tokenError) {
          console.warn("Token generation failed:", tokenError);
          // Continue without token for testing/development
        }

        // Join the channel
        await client.join(APP_ID!, channelName, token, uid);
        console.log("Successfully joined channel");

        // Create local tracks
        const [microphoneTrack, cameraTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalTracks([microphoneTrack, cameraTrack]);

        // Publish local tracks
        await client.publish([microphoneTrack, cameraTrack]);
        console.log("Published local tracks");

        // Display local video
        if (localVideoRef.current) {
          cameraTrack.play(localVideoRef.current);
        }

        // Add local user to participants with username
        setParticipants((prev) => ({
          ...prev,
          [uid.toString()]: user.username || "You",
        }));

        setIsJoining(false);
        toast.success("You've joined the video call");
      } catch (error: any) {
        console.error("Error joining video call:", error);

        let errorMessage = "Failed to join video call.";

        // Handle specific error cases
        if (error.message && error.message.includes("invalid vendor key")) {
          errorMessage = "Invalid Agora App ID configuration.";
        } else if (error.message && error.message.includes("network")) {
          errorMessage = "Network issue connecting to Agora servers.";
        }

        setError(errorMessage);
        toast.error(errorMessage);
        setIsJoining(false);
      }
    };

    initializeCall();

    // Clean up when component unmounts
    return () => {
      leaveChannel();
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-joined", handleUserJoined);
      client.off("user-left", handleUserLeft);
      client.off("connection-state-change");
      client.off("exception");
    };
  }, [user, channelName, router, isConfigValid]);

  // Handle remote user publishing tracks
  const handleUserPublished = async (
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) => {
    try {
      await clientRef.current?.subscribe(user, mediaType);
      console.log(`Subscribed to ${mediaType} from user:`, user.uid);

      setRemoteUsers((prevUsers) => {
        // Only add if not already in the list
        if (!prevUsers.find((u) => u.uid === user.uid)) {
          return [...prevUsers, user];
        }
        return prevUsers;
      });

      if (mediaType === "video" && user.videoTrack) {
        // Let the SDK handle rendering by finding the element with the user's UID
        setTimeout(() => {
          const videoContainer = document.getElementById(
            `remote-video-${user.uid}`
          );
          if (videoContainer && user.videoTrack) {
            user.videoTrack.play(videoContainer);
            console.log(`Playing video from user ${user.uid}`);
          } else {
            console.warn(
              `Container for user ${user.uid} not found or no video track`
            );
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error subscribing to user:", error);
    }
  };

  // Handle remote user unpublishing tracks
  const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
    // We keep the user in our list since they may republish, but we stop the track
  };

  // Handle remote user joined
  const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
    console.log("User joined:", user.uid);
    // Add to participants list with a placeholder name
    setParticipants((prev) => ({
      ...prev,
      [user.uid.toString()]: `Participant ${user.uid}`,
    }));
  };

  // Handle remote user left
  const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
    setRemoteUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
    setParticipants((prev) => {
      const updated = { ...prev };
      delete updated[user.uid.toString()];
      return updated;
    });
  };

  // Leave the channel and clean up
  const leaveChannel = async () => {
    // Stop local tracks
    localTracks[0]?.close();
    localTracks[1]?.close();

    // Leave the channel
    await clientRef.current?.leave();
    setRemoteUsers([]);
    setParticipants({});
  };

  // Handle leaving the call
  const handleLeaveCall = async () => {
    await leaveChannel();
    router.back();
  };

  // Toggle microphone
  const toggleMic = () => {
    if (localTracks[0]) {
      localTracks[0].setEnabled(!audioEnabled);
      setAudioEnabled(!audioEnabled);
    }
  };

  // Toggle camera
  const toggleVideo = () => {
    if (localTracks[1]) {
      localTracks[1].setEnabled(!videoEnabled);
      setVideoEnabled(!videoEnabled);
    }
  };

  // Show error state with troubleshooting info
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container py-6">
          <Card className="border-none shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Video Call Error
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Failed to join video call</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">Troubleshooting:</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Verify your Agora App ID in the environment variables</li>
                  <li>Check your network connection</li>
                  <li>
                    Make sure your camera and microphone are working and have
                    permissions
                  </li>
                  <li>Try using a different browser</li>
                </ul>

                <h3 className="font-semibold mt-6">For Developers:</h3>
                <p className="text-sm text-muted-foreground">
                  Add your Agora credentials in <code>.env.local</code>:
                </p>
                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                  NEXT_PUBLIC_AGORA_APP_ID=your_app_id_here
                  <br />
                  AGORA_APP_CERTIFICATE=your_certificate_here
                </pre>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => router.back()}>Return to Chat</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container py-6">
        <Card className="border-none shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Video Call: {channelName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {Object.keys(participants).length} Participants
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Loading state */}
            {isJoining && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Joining video call...</p>
                </div>
              </div>
            )}

            {/* Video call grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {/* Local video */}
              <div className="relative bg-black rounded-md overflow-hidden aspect-video">
                <div ref={localVideoRef} className="w-full h-full"></div>
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
                  {user?.username || "You"} {!audioEnabled && "(muted)"}
                </div>
              </div>

              {/* Remote videos */}
              {remoteUsers.map((remoteUser) => (
                <div
                  key={remoteUser.uid}
                  className="relative bg-black rounded-md overflow-hidden aspect-video"
                >
                  <div
                    id={`remote-video-${remoteUser.uid}`}
                    className="w-full h-full"
                  ></div>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
                    {participants[remoteUser.uid.toString()] ||
                      `User ${remoteUser.uid}`}
                  </div>
                </div>
              ))}

              {/* Empty slot placeholders */}
              {remoteUsers.length === 0 && !isJoining && (
                <div className="bg-muted/20 rounded-md flex items-center justify-center aspect-video">
                  <p className="text-muted-foreground">
                    Waiting for others to join...
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-4 py-4 px-4 border-t">
              <Button
                size="icon"
                variant={audioEnabled ? "outline" : "destructive"}
                onClick={toggleMic}
              >
                {audioEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>

              <Button
                size="icon"
                variant={videoEnabled ? "outline" : "destructive"}
                onClick={toggleVideo}
              >
                {videoEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>

              <Button
                size="icon"
                variant="destructive"
                onClick={handleLeaveCall}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
