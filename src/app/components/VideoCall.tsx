import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import Peer from 'simple-peer';

const VideoCall: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Function to initialize the webcam and set up the peer connection
    const initializeWebcam = async () => {
      const userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userMedia);

      // Initialize the peer connection
      const peer = new Peer({ initiator: true, trickle: false, stream: userMedia });

      peer.on('signal', (data) => {
        // Send the signal data to the peer on the other end (via signaling server)
        // In a real-world scenario, you would use a signaling server for this purpose
        console.log('Signal data to send to the other peer:', data);
      });

      peerRef.current = peer;
    };

    initializeWebcam();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []); // Run only on mount

  return (
    <div className="w-3/5 p-4">
      {stream && <Webcam ref={webcamRef} mirrored={true} style={{ width: '100%', height: '100%' }} />}
    </div>
  );
};

export default VideoCall;
