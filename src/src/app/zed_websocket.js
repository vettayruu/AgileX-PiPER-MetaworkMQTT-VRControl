import { useEffect, useRef } from 'react';

export default function ZEDCanvasStream() {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const socket = new WebSocket('ws://<your-ip>:8765');

    socket.binaryType = 'arraybuffer';

    socket.onmessage = (event) => {
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      img.src = URL.createObjectURL(blob);
    };

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    return () => socket.close();
  }, []);

  return (
    <>
      <a-assets>
        <canvas id="zed-canvas" ref={canvasRef} width="1280" height="720" />
      </a-assets>

      <a-video
        src="#zed-canvas"
        width="1.6"
        height="0.9"
        position="-1.0 0.5 -1.0"
        rotation="0 45 0"
      ></a-video>
    </>
  );
}
