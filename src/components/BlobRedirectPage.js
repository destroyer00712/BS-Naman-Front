import React from 'react';
import { useLocation } from 'react-router-dom';

const BlobRedirectPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const blobUrl = decodeURIComponent(params.get('blobUrl'));

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