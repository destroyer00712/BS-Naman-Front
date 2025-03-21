import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const MediaViewer = ({ url, type }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const mediaRef = React.useRef(null);

  const handlePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const progress = (mediaRef.current.currentTime / mediaRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (mediaRef.current) {
      const progressBar = e.currentTarget;
      const clickPosition = e.nativeEvent.offsetX;
      const progressBarWidth = progressBar.offsetWidth;
      const newTime = (clickPosition / progressBarWidth) * duration;
      mediaRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="media-viewer">
      {type === 'audio' ? (
        <div className="audio-player p-3 bg-light rounded">
          <div className="d-flex align-items-center gap-3">
            <button 
              className="btn btn-primary rounded-circle p-2"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <div className="flex-grow-1">
              <div 
                className="progress" 
                style={{ height: '4px', cursor: 'pointer' }}
                onClick={handleProgressClick}
              >
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="d-flex justify-content-between mt-1">
                <small>{formatTime(mediaRef.current?.currentTime || 0)}</small>
                <small>{formatTime(duration)}</small>
              </div>
            </div>

            <button 
              className="btn btn-light rounded-circle p-2"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          <audio
            ref={mediaRef}
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            muted={isMuted}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="video-player">
          <video
            ref={mediaRef}
            src={url}
            controls
            className="w-100 rounded"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            muted={isMuted}
          />
        </div>
      )}
    </div>
  );
};

export default MediaViewer; 