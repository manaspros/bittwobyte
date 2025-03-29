'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the VideoCallComponent with SSR disabled
const VideoCallComponent = dynamic(
  () => import('../../components/VideoCallComponent'),
  { ssr: false }
);

export default function VideoCallPage() {
  return (
    <div className="container mx-auto py-6">
      <VideoCallComponent />
    </div>
  );
}