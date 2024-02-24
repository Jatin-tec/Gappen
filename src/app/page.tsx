// pages/index.tsx
import React from 'react';
import VideoCall from './components/VideoCall';
import Chat from './components/Chat';
import SkipButton from './components/SkipButton';
import ReportButton from './components/ReportButton';

const Home: React.FC = () => (
  <div className="flex h-screen">
      {/* VideoCall Component */}
      <VideoCall />

      {/* Chat Component */}
      <Chat />
    </div>
);

export default Home;