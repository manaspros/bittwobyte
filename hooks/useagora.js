// components/VideoCall.js
import { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk';

export default function VideoCall({ channelName }) {
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const client = useRef(null);

  useEffect(() => {
    // Initialize Agora client
    client.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });

    // Join channel
    client.current.init('db305fe72cb64892b1f907b01c9382dd', () => {
      client.current.join(null, channelName, null, (uid) => {
        // Create local tracks
        AgoraRTC.createStream({ audio: true, video: true }, (stream) => {
          stream.init(() => {
            setLocalAudioTrack(stream.getAudioTrack());
            setLocalVideoTrack(stream.getVideoTrack());
            client.current.publish(stream);
          });
        });
      });
    });

    // Handle remote users
    client.current.on('stream-added', (evt) => {
      const stream = evt.stream;
      client.current.subscribe(stream);
    });

    client.current.on('stream-subscribed', (evt) => {
      setRemoteUsers(prev => [...prev, evt.stream]);
    });

    return () => {
      // Cleanup
      if (client.current) client.current.leave();
      if (localVideoTrack) localVideoTrack.stop();
      if (localAudioTrack) localAudioTrack.stop();
    };
  }, []);

  return (
    <div className="video-container">
      <div className="local-video">
        {localVideoTrack && (
          <video
            autoPlay
            muted
            ref={node => node && node.srcObject instanceof MediaStream && node.srcObject.addTrack(localVideoTrack)}
          />
        )}
      </div>
      {remoteUsers.map((stream, i) => (
        <div key={i} className="remote-video">
          <video
            autoPlay
            ref={node => node && (node.srcObject = stream)}
          />
        </div>
      ))}
    </div>
  );
}