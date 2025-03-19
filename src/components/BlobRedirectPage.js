import React from 'react';

const BlobRedirectPage = ({ blobUrl }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100">
      <h3>Audio Playback</h3>
      {blobUrl ? (
        <audio controls className="w-100">
          <source src={blobUrl} type="audio/mp3" />
          Your browser does not support the audio element.
        </audio>
      ) : (
        <p>No audio available.</p>
      )}
    </div>
  );
};

export default BlobRedirectPage; 