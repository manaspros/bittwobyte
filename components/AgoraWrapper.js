// components/AgoraWrapper.js
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamically import Agora UI Kit to prevent SSR issues
const AgoraUIKit = dynamic(
  () => import('agora-react-uikit'),
  { ssr: false } // Disable server-side rendering
);

export default function AgoraWrapper({ 
  channelName = 'default-channel',
  token = null,
  uid = undefined, 
  role = 'host',
  layout = 'grid',
  onCallEnd = () => {},
  enableVideo = true,
  enableAudio = true,
}) {
  const [isCallActive, setIsCallActive] = useState(false); // Start as false to ensure proper initialization
  const [appId, setAppId] = useState(process.env.NEXT_PUBLIC_AGORA_APP_ID || '');
  const [clientInitialized, setClientInitialized] = useState(false);
  const [participants, setParticipants] = useState([]);
  const router = useRouter();
  const clientRef = useRef(null);

  // Initialize the Agora client
  useEffect(() => {
    // Ensure we have the appId from environment variables
    if (!appId) {
      console.error('Agora App ID not found in environment variables');
      return;
    }

    // Set a small delay to ensure client-side rendering is complete
    const timer = setTimeout(() => {
      setClientInitialized(true);
      setIsCallActive(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Clean up any Agora resources if needed
      if (clientRef.current) {
        // Perform any cleanup needed
      }
    };
  }, [appId]);

  // Track participants
  useEffect(() => {
    if (participants.length > 1) {
      console.log('Other users are in the call:', participants.filter(id => id !== uid));
    } else if (participants.length === 1 && participants[0] === uid) {
      console.log('You are alone in the call');
    }
  }, [participants, uid]);

  const rtcProps = {
    appId: appId,
    channel: channelName,
    token: token, 
    uid: uid,
    role: role, // host or audience
    layout: layout, // grid, pinned, or custom
  };

  const callbacks = {
    EndCall: () => {
      setIsCallActive(false);
      onCallEnd();
    },
    // Add RTM initialization success/error handlers
    RtmInitialized: (rtmClient) => {
      console.log('RTM client initialized successfully');
      clientRef.current = rtmClient;
    },
    RtmError: (error) => {
      console.error('RTM client error:', error);
    },
    // Track users joining and leaving
    UserJoined: (user) => {
      console.log('User joined:', user);
      setParticipants(prev => [...prev.filter(id => id !== user), user]);
    },
    UserLeft: (user) => {
      console.log('User left:', user);
      setParticipants(prev => prev.filter(id => id !== user));
    },
    JoinChannelSuccess: (channel, uid) => {
      console.log('Successfully joined channel:', channel, 'as user:', uid);
      setParticipants(prev => [...prev.filter(id => id !== uid), uid]);
    }
  };

  const styleProps = {
    localBtnContainer: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    remoteBtnContainer: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    maxViewContainer: { 
      width: '100%', 
      height: '100%',
      minHeight: '300px',
      background: '#1a1a1a'
    },
  };

  if (!clientInitialized) {
    return (
      <div className="flex items-center justify-center" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing video call...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      {isCallActive && appId && (
        <>
          <AgoraUIKit
            rtcProps={rtcProps}
            callbacks={callbacks}
            styleProps={styleProps}
            config={{
              initialVideoState: enableVideo,
              initialAudioState: enableAudio,
            }}
          />
          
          {/* Participants indicator */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded z-10">
            {participants.length > 1 ? (
              <span>{participants.length} users in call</span>
            ) : (
              <span>Waiting for others to join...</span>
            )}
          </div>
        </>
      )}
      {!isCallActive && (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="mb-4">Call ended</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setIsCallActive(true)}
          >
            Rejoin Call
          </button>
        </div>
      )}
    </div>
  );
}