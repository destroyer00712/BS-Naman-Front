import React from 'react';

const AudioViewer = ({ audioUrl }) => {
  if (!audioUrl) return null;

  return (
    <div className="audio-viewer">
      <audio controls>
        <source src={audioUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default AudioViewer;
