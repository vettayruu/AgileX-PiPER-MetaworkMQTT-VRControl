import * as React from 'react';

export default function LocalWebcam({ onVideoStream1, onVideoStream2 }) {
  const leftRef = React.useRef(null);
  const rightRef = React.useRef(null);

  React.useEffect(() => {
    // When video elements are loaded, create MediaStreams and pass to callbacks
    const handleLoaded1 = () => {
      if (leftRef.current && onVideoStream1) {
        const stream = leftRef.current.captureStream();
        onVideoStream1(stream);
      }
    };
    const handleLoaded2 = () => {
      if (rightRef.current && onVideoStream2) {
        const stream = rightRef.current.captureStream();
        onVideoStream2(stream);
      }
    };

    const left = leftRef.current;
    const right = rightRef.current;
    if (left) left.addEventListener('loadeddata', handleLoaded1);
    if (right) right.addEventListener('loadeddata', handleLoaded2);

    return () => {
      if (left) left.removeEventListener('loadeddata', handleLoaded1);
      if (right) right.removeEventListener('loadeddata', handleLoaded2);
    };
  }, [onVideoStream1, onVideoStream2]);

  return (
    <>
      <video
        ref={leftRef}
        src="https://192.168.197.52:5000/left_feed"
        autoPlay
        playsInline
        muted
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      <video
        ref={rightRef}
        src="https://192.168.197.52:5000/right_feed"
        autoPlay
        playsInline
        muted
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
    </>
  );
}