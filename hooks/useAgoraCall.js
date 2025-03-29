// hooks/useAgoraCall.js
import { useState, useEffect, useCallback } from 'react';

export default function useAgoraCall(initialChannelName = 'default-channel') {
  const [channelName, setChannelName] = useState(initialChannelName);
  const [token, setToken] = useState(null);
  const [uid, setUid] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callActive, setCallActive] = useState(false);

  // Function to fetch token from your backend
  const fetchToken = useCallback(async (channel = channelName) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For development/testing without token authentication
      // Just set token to null and finish loading
      setToken(null);
      
      // Uncomment below to fetch a token from your backend:
      /*
      const response = await fetch(`/api/agora/token?channel=${channel}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token');
      }
      const data = await response.json();
      setToken(data.token);
      */
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error fetching Agora token:', err);
      setError('Failed to get call access. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, [channelName]);

  // Initialize call with a specific channel
  const initializeCall = useCallback(async (channel) => {
    if (channel && channel !== channelName) {
      setChannelName(channel);
    }
    
    const success = await fetchToken(channel || channelName);
    if (success) {
      setCallActive(true);
    }
    return success;
  }, [channelName, fetchToken]);

  // End call
  const endCall = useCallback(() => {
    setCallActive(false);
  }, []);

  // Join a new channel
  const joinChannel = useCallback(async (newChannel) => {
    setCallActive(false);
    return initializeCall(newChannel);
  }, [initializeCall]);

  // Initialize token on component mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return {
    channelName,
    token,
    uid,
    isLoading,
    error,
    callActive,
    setUid,
    initializeCall,
    endCall,
    joinChannel,
  };
}