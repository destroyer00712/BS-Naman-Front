import React, { useEffect } from 'react';

const BlobRedirectPage = ({ blobUrl }) => {
  useEffect(() => {
    if (blobUrl) {
      // Redirect to the blob URL
      window.location.href = blobUrl;
    }
  }, [blobUrl]);

  return (
    <div>
      <h3>Redirecting...</h3>
      <p>If you are not redirected automatically, <a href={blobUrl}>click here</a>.</p>
    </div>
  );
};

export default BlobRedirectPage; 