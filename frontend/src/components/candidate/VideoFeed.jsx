import Webcam from 'react-webcam';
import { forwardRef } from 'react';

const VideoFeed = forwardRef(function VideoFeed(props, ref) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Webcam
        ref={ref}
        audio={false}
        width="100%"
        height="100%"
        videoConstraints={{ facingMode: 'user' }}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
      />
    </div>
  );
});

export default VideoFeed;
