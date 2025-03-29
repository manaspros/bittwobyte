// components/VideoCallComponent.js
import { useState } from 'react';
import AgoraWrapper from './AgoraWrapper';
import useAgoraCall from '../hooks/useAgoraCall';

export default function VideoCallComponent({ initialChannel = 'default-channel' }) {
  const [customChannel, setCustomChannel] = useState('');
  const {
    channelName,
    token,
    isLoading,
    error,
    callActive,
    joinChannel,
    endCall
  } = useAgoraCall(initialChannel);

  const handleJoinChannel = (e) => {
    e.preventDefault();
    if (customChannel.trim()) {
      joinChannel(customChannel.trim());
    }
  };

  const handleCallEnd = () => {
    endCall();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Setting up your video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!callActive) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] p-6">
        <h2 className="text-2xl font-bold mb-6">Join Video Call</h2>
        <form onSubmit={handleJoinChannel} className="w-full max-w-md mb-6">
          <div className="flex flex-col space-y-4">
            <label htmlFor="channel" className="font-medium">
              Channel Name
            </label>
            <input
              id="channel"
              type="text"
              value={customChannel}
              onChange={(e) => setCustomChannel(e.target.value)}
              placeholder="Enter channel name"
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Join Channel
            </button>
          </div>
        </form>
        <div className="text-gray-500 text-sm">
          <p>Or use a default channel: <strong>{initialChannel}</strong></p>
          <button
            onClick={() => joinChannel(initialChannel)}
            className="mt-2 px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Join Default Channel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-gray-900 text-white px-4 py-2 flex justify-between items-center">
        <span>Channel: {channelName}</span>
        <button 
          onClick={handleCallEnd}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Leave Call
        </button>
      </div>
      <AgoraWrapper
        channelName={channelName}
        token={token}
        onCallEnd={handleCallEnd}
        layout="grid"
        enableVideo={true}
        enableAudio={true}
      />
    </div>
  );
}