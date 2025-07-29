import * as React from 'react';
import Script from 'next/script';

export default function RemoteWebcam({ onVideoStream1, onVideoStream2 }) {
  const [soraReady, setSoraReady] = React.useState(false);

  React.useEffect(() => {
    if (soraReady && window.Sora) {
      // Video streaming setup
      const signalingUrl = 'wss://sora.uclab.jp/signaling';
      const sora = window.Sora.connection(signalingUrl);

      const options = {
        role: 'recvonly',
        multistream: true,
        video: { codecType: 'VP9', resolution: 'HD', bitrate: 1500 },
        audio: false,
      };

      // Webcam 1
      const recvonly_webcam1 = sora.recvonly('sora_liust', options);
      recvonly_webcam1.on('track', event => {
        if (event.track.kind === 'video') {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(event.track);
          if (onVideoStream1) onVideoStream1(mediaStream);
        }
      });
      recvonly_webcam1.connect();

      // Webcam 2
      const recvonly_webcam2 = sora.recvonly('sora_liust_2', options);
      recvonly_webcam2.on('track', event => {
        if (event.track.kind === 'video') {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(event.track);
          if (onVideoStream2) onVideoStream2(mediaStream);
        }
      });
      recvonly_webcam2.connect();
    }
  }, [soraReady, onVideoStream1, onVideoStream2]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/sora-js-sdk@2021.1.1/dist/sora.min.js"
        strategy="lazyOnload"
        onLoad={() => setSoraReady(true)}
      />
    </>
  );
}