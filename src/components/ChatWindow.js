import React, { useState, useEffect, useRef } from 'react';
import config from '../modules/config';
import { Info, Plus, Send, Mic, Forward } from 'lucide-react';
import WorkerModal from './WorkerModal';
import VoiceMessageDialog from './VoiceMessageDialog';
import MediaViewer from './MediaViewer';
import SendMessageModal from './SendMessageModal';
import 'bootstrap-icons/font/bootstrap-icons.css';

const ChatWindow = ({ selectedOrder, onInfoClick }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [clientName, setClientName] = useState('');
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [expandedForwardedMessage, setExpandedForwardedMessage] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedOrder) {
      fetchMessages(selectedOrder.order_id);
      fetchClientName(selectedOrder.client_details.phone);
    }
  }, [selectedOrder]);

  useEffect(() => {
    let intervalId;
    
    if (selectedOrder) {
      // Initial fetch
      fetchMessages(selectedOrder.order_id);
      
      // Set up polling every 5 seconds
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.ORDER_MESSAGES(selectedOrder.order_id)}`);
          const data = await response.json();
          
          // Only update messages and scroll if there are new messages
          if (JSON.stringify(data.messages) !== JSON.stringify(messages)) {
            const hasNewMessages = data.messages.length > messages.length;
            setMessages(data.messages);
            
            // Only scroll to bottom if there are new messages
            if (hasNewMessages) {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedOrder, messages]);

  const fetchClientName = async (phoneNumber) => {
    setIsLoadingClient(true);
    try {
      const response = await fetch(`${config.API_ROOT}/api/clients/${phoneNumber}`);
      const data = await response.json();
      setClientName(data.client.name);
    } catch (error) {
      console.error('Error fetching client name:', error);
      setClientName('');
    } finally {
      setIsLoadingClient(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (orderId) => {
    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.ORDER_MESSAGES(orderId)}`);
      const data = await response.json();
      
      // Only update messages if there are actual changes
      if (JSON.stringify(data.messages) !== JSON.stringify(messages)) {
        // Only show loading indicator on initial load or when there are new messages
        if (messages.length === 0 || data.messages.length > messages.length) {
          setIsLoading(true);
        }
        
        setMessages(data.messages);
        
        // Scroll to bottom only if there are new messages
        if (data.messages.length > messages.length) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMediaContent = async (mediaId) => {
    setIsLoadingMedia(true);
    try {
      // Get the media URL from WhatsApp API
      const detailsResponse = await fetch(`${config.ENDPOINTS.WHATSAPP_MEDIA(mediaId)}`, {
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`
        }
      });
      
      if (!detailsResponse.ok) {
        throw new Error(`WhatsApp API returned ${detailsResponse.status}: ${await detailsResponse.text()}`);
      }
      
      const mediaDetails = await detailsResponse.json();
      console.log('Media details response:', mediaDetails);
      
      if (!mediaDetails.url) {
        throw new Error('No media URL found in response');
      }

      // Use the proxy endpoint to fetch media content (avoids CORS issues)
      const proxyUrl = `https://bsgold-api.chatloom.in/api/proxy-fb-media?url=${encodeURIComponent(mediaDetails.url)}`;
      console.log('Fetching from proxy URL:', proxyUrl);
      
      const mediaResponse = await fetch(proxyUrl);
      
      if (!mediaResponse.ok) {
        throw new Error(`Proxy API returned ${mediaResponse.status}: ${await mediaResponse.text()}`);
      }
      
      const blob = await mediaResponse.blob();
      const mimeType = mediaDetails.mime_type || 'application/octet-stream';
      
      // Get file extension from mime type
      let fileExtension = '';
      switch (mimeType) {
        case 'image/jpeg':
          fileExtension = '.jpg';
          break;
        case 'image/png':
          fileExtension = '.png';
          break;
        case 'image/gif':
          fileExtension = '.gif';
          break;
        case 'image/webp':
          fileExtension = '.webp';
          break;
        case 'video/mp4':
          fileExtension = '.mp4';
          break;
        case 'video/quicktime':
          fileExtension = '.mov';
          break;
        case 'audio/mpeg':
          fileExtension = '.mp3';
          break;
        case 'audio/ogg':
          fileExtension = '.ogg';
          break;
        case 'audio/wav':
          fileExtension = '.wav';
          break;
        case 'audio/m4a':
          fileExtension = '.m4a';
          break;
        default:
          // For unknown types, try to extract extension from mime type
          const ext = mimeType.split('/')[1];
          if (ext) {
            fileExtension = `.${ext}`;
          }
      }
      
      // Upload to permanent storage
      const formData = new FormData();
      formData.append('file', blob, `media_${Date.now()}${fileExtension}`);
      formData.append('type', mimeType);
      
      console.log('Uploading media to permanent storage...');
      const uploadResponse = await fetch(`${config.API_ROOT}/api/media/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
      }
      
      const uploadResult = await uploadResponse.json();
      console.log('Upload successful:', uploadResult);
      
      if (!uploadResult.success || !uploadResult.permanentUrl) {
        throw new Error('Upload response missing permanent URL');
      }

      const permanentUrl = `${config.API_ROOT}${uploadResult.permanentUrl}`;

      // Verify the permanent URL is accessible before returning it
      try {
        console.log('Verifying permanent URL accessibility:', permanentUrl);
        const verifyResponse = await fetch(permanentUrl, { method: 'HEAD' });
        
        if (!verifyResponse.ok) {
          console.warn('Permanent URL not accessible, attempting re-upload...');
          throw new Error('Permanent URL not accessible');
        }
        
        // Return the media data with permanent URL
        return {
          url: permanentUrl,
          type: mimeType,
          isPermanent: true,
          filename: uploadResult.filename
        };
      } catch (verifyError) {
        console.error('Error verifying permanent URL:', verifyError);
        console.log('Attempting re-upload using Facebook URL...');
        
        // Fallback: Re-upload using the original Facebook URL
        try {
          // Fetch from Facebook URL again
          const fallbackResponse = await fetch(proxyUrl);
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback fetch failed: ${fallbackResponse.status}`);
          }
          
          const fallbackBlob = await fallbackResponse.blob();
          
          // Try uploading again with a different filename
          const fallbackFormData = new FormData();
          fallbackFormData.append('file', fallbackBlob, `media_fallback_${Date.now()}${fileExtension}`);
          fallbackFormData.append('type', mimeType);
          
          const fallbackUploadResponse = await fetch(`${config.API_ROOT}/api/media/upload`, {
            method: 'POST',
            body: fallbackFormData
          });
          
          if (!fallbackUploadResponse.ok) {
            throw new Error(`Fallback upload failed: ${fallbackUploadResponse.status}`);
          }
          
          const fallbackUploadResult = await fallbackUploadResponse.json();
          
          if (!fallbackUploadResult.success || !fallbackUploadResult.permanentUrl) {
            throw new Error('Fallback upload response missing permanent URL');
          }
          
          const fallbackPermanentUrl = `${config.API_ROOT}${fallbackUploadResult.permanentUrl}`;
          
          // Verify the fallback URL
          const fallbackVerifyResponse = await fetch(fallbackPermanentUrl, { method: 'HEAD' });
          
          if (!fallbackVerifyResponse.ok) {
            // If fallback also fails, use the original Facebook URL as last resort
            console.warn('Fallback upload also failed, using original Facebook URL');
            return {
              url: mediaDetails.url,
              type: mimeType,
              isPermanent: false,
              isTemporary: true
            };
          }
          
          console.log('Fallback upload successful:', fallbackPermanentUrl);
          return {
            url: fallbackPermanentUrl,
            type: mimeType,
            isPermanent: true,
            filename: fallbackUploadResult.filename
          };
        } catch (fallbackError) {
          console.error('Fallback upload failed:', fallbackError);
          // Use original Facebook URL as last resort
          console.log('Using original Facebook URL as last resort');
          return {
            url: mediaDetails.url,
            type: mimeType,
            isPermanent: false,
            isTemporary: true
          };
        }
      }
    } catch (error) {
      console.error('Error in fetchMediaContent:', error);
      throw error;
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleMediaClick = async (mediaId, mediaType) => {
    try {
      const mediaData = await fetchMediaContent(mediaId);
      if (mediaData) {
        setActiveMedia(mediaData);
      } else {
        alert('Failed to load media: No data returned');
      }
    } catch (error) {
      console.error('Error handling media click:', error);
      alert(`Failed to load media: ${error.message}`);
    }
  };

  const handleCloseMedia = () => {
    setActiveMedia(null);
  };

  useEffect(() => {
    return () => {
      // Only revoke blob URLs, not permanent URLs
      if (activeMedia?.url && activeMedia?.isBlob) {
        URL.revokeObjectURL(activeMedia.url);
      }
    };
  }, [activeMedia]);

  const getMessageStyle = (senderType) => {
    const baseStyle = {
      maxWidth: '70%',
      padding: '10px 15px',
      borderRadius: '12px',
      margin: '8px 0',
    };

    return {
      ...baseStyle,
      marginLeft: senderType === 'enterprise' ? 'auto' : '0',
      backgroundColor: config.SENDER_COLORS[senderType],
    };
  };

  const handleSend = () => {
    if (newMessage.trim()) {
      setShowSendModal(true);
    }
  };

  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format time to 12-hour format with AM/PM
    const timeString = messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Check if message is from today
    if (messageDate.toDateString() === today.toDateString()) {
      return timeString;
    }
    
    // Check if message is from yesterday
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeString}`;
    }
    
    // For older messages, show the full date
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    }) + ', ' + timeString;
  };

  // Add a function to handle blob URL clicks
  const handleBlobUrlClick = async (blobUrl) => {
    setIsLoadingMedia(true);
    try {
      // Create a media object similar to what fetchMediaContent returns
      const mediaData = {
        url: blobUrl,
        // Determine type based on URL or use a default
        type: blobUrl.includes('audio') ? 'audio/mpeg' : 'application/octet-stream'
      };
      
      setActiveMedia(mediaData);
    } catch (error) {
      console.error('Error handling blob URL:', error);
      alert('Failed to load media');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Function to check if message content contains a blob URL
  const containsBlobUrl = (content) => {
    return typeof content === 'string' && content.includes('blobUrl=');
  };

  // Function to extract blob URL from message content
  const extractBlobUrl = (content) => {
    if (containsBlobUrl(content)) {
      // For voice messages that have prefix text
      if (content.startsWith('Voice message: ')) {
        return content.substring('Voice message: '.length);
      }
      return content;
    }
    return null;
  };

  const MediaModal = ({ media, onClose }) => {
    const [mediaUrl, setMediaUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const handleMedia = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // For permanent URLs, use directly
          if (media.isPermanent) {
            console.log('Using permanent URL directly:', media.url);
            setMediaUrl(media.url);
          } else {
            // For other URLs, use directly
            console.log('Using media URL directly:', media.url);
            setMediaUrl(media.url);
          }
        } catch (err) {
          console.error('Error handling media:', err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      if (media?.url) {
        handleMedia();
      }

      // No cleanup needed for permanent URLs
      return () => {
        // Only revoke blob URLs, not permanent URLs
        if (media?.isBlob && media?.url) {
          URL.revokeObjectURL(media.url);
        }
      };
    }, [media]);

    return (
      <div 
        className="modal d-block" 
        tabIndex="-1" 
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Media Preview</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body text-center p-0">
              {isLoading ? (
                <div className="p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="p-5 text-danger">
                  Error loading media: {error}
                </div>
              ) : mediaUrl ? (
                media.type === config.MEDIA_TYPES.AUDIO ? (
                  <audio controls className="w-100 p-3">
                    <source src={mediaUrl} type={media.type} />
                    Your browser does not support the audio element.
                  </audio>
                ) : media.type?.startsWith('video/') ? (
                  <video controls className="w-100">
                    <source src={mediaUrl} type={media.type} />
                    Your browser does not support the video element.
                  </video>
                ) : (
                  <img 
                    src={mediaUrl} 
                    alt="Media content" 
                    className="img-fluid"
                    style={{ maxHeight: '70vh' }}
                  />
                )
              ) : (
                <div className="p-5">
                  No media to display
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const forwardMessage = async (message, targetType) => {
    setIsForwarding(true);
    try {
      const url = `${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MESSAGES}`;
      
      // Get the target phone number(s)
      let targetPhones = [];
      if (targetType === 'client') {
        targetPhones = [selectedOrder.client_details.phone];
      } else {
        // For worker, fetch all phone numbers associated with this worker
        const workerPhone = selectedOrder.jewellery_details['worker-phone'];
        if (!workerPhone) {
          throw new Error('Worker phone number not found in order details');
        }
        
        try {
          const workerResponse = await fetch(`${config.API_ROOT}/api/workers/${workerPhone}`);
          if (!workerResponse.ok) {
            throw new Error(`Failed to fetch worker data: ${workerResponse.status}`);
          }
          const workerData = await workerResponse.json();
          
          if (workerData.worker && workerData.worker.phones && Array.isArray(workerData.worker.phones)) {
            targetPhones = workerData.worker.phones.map(phone => phone.phone_number);
          } else {
            // Fallback to using just the primary worker phone if API structure is different
            console.warn('Worker phones array not found, using primary phone as fallback');
            targetPhones = [workerPhone];
          }
        } catch (error) {
          console.error('Error fetching worker phones:', error);
          // Fallback to using just the primary worker phone
          console.warn('Using primary worker phone as fallback due to API error');
          targetPhones = [workerPhone];
        }
      }

      let templateName = 'update_sending';
      let templateComponents = [{
        type: "body",
        parameters: [
          { type: "text", text: selectedOrder.order_id },
          { type: "text", text: message.content || '' }
        ]
      }];

      // Handle media messages
      if (message.media_id) {
        try {
          // Fetch media and upload to permanent storage
          const mediaData = await fetchMediaContent(message.media_id);
          
          if (!mediaData.url) {
            throw new Error('No permanent URL found for media');
          }

          // Use the permanent URL in the message
          templateComponents = [{
            type: "body",
            parameters: [
              { type: "text", text: selectedOrder.order_id },
              { type: "text", text: mediaData.url }
            ]
          }];
        } catch (error) {
          console.error('Error handling media:', error);
          throw new Error('Failed to process media for forwarding');
        }
      }

      // Send message to all target phones
      const sendPromises = targetPhones.map(async (phoneNumber) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber.replace(/\D/g, ''),
            type: "template",
            template: {
              name: templateName,
              language: { code: "en" },
              components: templateComponents
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to forward message to ${phoneNumber}`);
        }
        return response;
      });

      // Wait for all messages to be sent
      await Promise.all(sendPromises);
      
      // Save the forwarded message with more context
      const senderType = message.sender_type === 'client' ? 'Client' : 'Worker';
      await fetch(`${config.API_ROOT}${config.ENDPOINTS.MESSAGES}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: selectedOrder.order_id,
          content: `Forwarded from ${senderType}: ${message.content}`,
          sender_type: 'enterprise',
          forwarded_from: message.sender_type,
          original_message_id: message.message_id
        })
      });

      // Refresh messages
      fetchMessages(selectedOrder.order_id);
    } catch (error) {
      console.error('Error forwarding message:', error);
      alert('Failed to forward message');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleForwardedMessageClick = (message) => {
    if (message.original_message_id) {
      setHighlightedMessageId(message.original_message_id);
      // Scroll to the original message
      const originalMessageElement = document.getElementById(`message-${message.original_message_id}`);
      if (originalMessageElement) {
        originalMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 3000);
      }
    }
    setExpandedForwardedMessage(expandedForwardedMessage === message.message_id ? null : message.message_id);
  };

  return (
    <>
      <div className="d-flex flex-column vh-100 bg-white rounded-3 shadow-sm">
        {/* Chat Header */}
        <div className="p-2 p-md-3 border-bottom d-flex justify-content-between align-items-center" style={{ marginTop: '60px' }}>
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-light rounded-circle btn-sm"
              onClick={() => setShowWorkerModal(true)}
            >
              <Plus size={18} />
            </button>
            <h6 className="mb-0 fw-bold text-truncate" style={{ maxWidth: '200px' }}>
              {isLoadingClient ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : clientName || 'Unknown Client'} - {selectedOrder?.order_id || 'No Order ID'}
            </h6>
          </div>
          <button className="btn btn-light rounded-circle btn-sm" onClick={onInfoClick}>
            <Info size={18} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow-1 overflow-auto p-2 p-md-3" style={{ backgroundColor: '#f8f9fa', height: 'calc(100vh - 180px)' }}>
          {isLoading ? (
            <div className="text-center p-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const blobUrl = extractBlobUrl(message.content);
              const isClientMessage = message.sender_type === 'client';
              const isWorkerMessage = message.sender_type === 'worker';
              const isEnterpriseMessage = message.sender_type === 'enterprise';
              const isForwarded = message.content.startsWith('Forwarded from');
              const isHighlighted = message.message_id === highlightedMessageId;
              
              // Determine message header and styling based on sender and recipients
              const getMessageHeader = () => {
                // Debug logging to see what recipient data we have
                console.log('Message:', message.message_id, 'Recipients:', message.recipients, 'Sender:', message.sender_type);
                
                if (isClientMessage) {
                  return { text: 'From Client', bgColor: '#E3F2FD', textColor: '#1976D2', showHeader: true };
                } else if (isWorkerMessage) {
                  return { text: 'From Worker', bgColor: '#F3E5F5', textColor: '#7B1FA2', showHeader: true };
                } else if (isEnterpriseMessage) {
                  // For enterprise messages (sent from dashboard), don't show header but keep styling
                  return { text: '', bgColor: '#E8F5E8', textColor: '#2E7D32', showHeader: false };
                }
                return { text: 'Unknown', bgColor: '#FAFAFA', textColor: '#757575', showHeader: true };
              };

              const messageHeader = getMessageHeader();
              
              return (
                <div
                  key={message.message_id}
                  id={`message-${message.message_id}`}
                  className="message-container mb-2"
                  style={{
                    display: 'flex',
                    justifyContent: message.sender_type === 'enterprise' ? 'flex-end' : 'flex-start',
                    transition: 'all 0.3s ease',
                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                    backgroundColor: isHighlighted ? 'rgba(255, 255, 0, 0.1)' : 'transparent',
                    borderRadius: '8px',
                    padding: isHighlighted ? '4px' : '0'
                  }}
                >
                  <div 
                    style={{
                      ...getMessageStyle(message.sender_type),
                      backgroundColor: messageHeader.bgColor,
                      border: `1px solid ${messageHeader.textColor}20`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }} 
                    className="mw-75 position-relative"
                  >
                    {/* Message Header */}
                    {messageHeader.showHeader && (
                      <div 
                        className="message-header mb-2 px-2 py-1 rounded-top"
                        style={{
                          backgroundColor: messageHeader.textColor,
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          margin: '-10px -15px 8px -15px',
                          borderRadius: '11px 11px 0 0',
                          textAlign: 'center'
                        }}
                      >
                        {messageHeader.text}
                      </div>
                    )}

                    {isForwarded && (
                      <div 
                        className="forwarded-preview mb-1" 
                        style={{ 
                          fontSize: '0.8rem', 
                          color: '#666',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                        onClick={() => handleForwardedMessageClick(message)}
                      >
                        <span>
                          Forwarded from {message.forwarded_from === 'client' ? 'Client' : 'Worker'}
                        </span>
                        <span className="ms-2">
                          {expandedForwardedMessage === message.message_id ? '▼' : '▶'}
                        </span>
                      </div>
                    )}
                    {isForwarded && expandedForwardedMessage === message.message_id && (
                      <div 
                        className="original-message mb-2 p-2" 
                        style={{ 
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}
                      >
                        <div className="text-muted mb-1" style={{ fontSize: '0.8rem' }}>
                          Original Message:
                        </div>
                        {message.content.replace(/^Forwarded from (Client|Worker): /, '')}
                      </div>
                    )}
                    <div className="message-content">
                      {message.media_id ? (
                        <div>
                          <div className="mb-2">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleMediaClick(message.media_id, message.media_type)}
                              disabled={isLoadingMedia}
                            >
                              {isLoadingMedia ? (
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              ) : 'View Media'}
                            </button>
                          </div>
                          {message.content && (
                            <div className="text-muted small">
                              {message.content}
                            </div>
                          )}
                        </div>
                      ) : blobUrl ? (
                        <div>
                          <div className="mb-2">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleBlobUrlClick(message.content.substring(message.content.startsWith('Voice message: ') ? 'Voice message: '.length : 'Video message: '.length))}
                              disabled={isLoadingMedia}
                            >
                              {isLoadingMedia ? (
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              ) : `View ${message.content.startsWith('Voice message:') ? 'Voice' : 'Video'} Message`}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: messageHeader.textColor, fontWeight: '500' }}>
                          {message.content.replace(/^Forwarded from (Client|Worker): /, '')}
                        </div>
                      )}
                    </div>
                    
                    {/* Forward button for client messages */}
                    {isClientMessage && (
                      <button
                        className="btn btn-sm btn-light rounded-circle position-absolute"
                        style={{ top: '5px', right: '-35px' }}
                        onClick={() => forwardMessage(message, 'worker')}
                        disabled={isForwarding}
                        title="Forward to worker"
                      >
                        {isForwarding ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <Forward size={16} />
                        )}
                      </button>
                    )}
                    
                    {/* Forward button for worker messages */}
                    {!isClientMessage && message.sender_type !== 'enterprise' && (
                      <button
                        className="btn btn-sm btn-light rounded-circle position-absolute"
                        style={{ top: '5px', right: '-35px' }}
                        onClick={() => forwardMessage(message, 'client')}
                        disabled={isForwarding}
                        title="Forward to client"
                      >
                        {isForwarding ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <Forward size={16} />
                        )}
                      </button>
                    )}
                    
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                      {formatMessageTime(message.created_at)}
                    </small>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-top p-2 p-md-3">
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              className="btn btn-primary"
              onClick={handleSend}
            >
              <Send size={20} />
            </button>
            <button 
              className="btn btn-light"
              onClick={() => setShowVoiceModal(true)}
            >
              <Mic size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Worker Modal */}
      {showWorkerModal && (
        <WorkerModal onClose={() => setShowWorkerModal(false)} />
      )}

      {/* Media Modal */}
      {activeMedia && (
        <MediaModal 
          media={activeMedia} 
          onClose={handleCloseMedia}
        />
      )}

      {/* Send Message Modal */}
      <SendMessageModal
        show={showSendModal}
        onClose={() => setShowSendModal(false)}
        message={newMessage}
        selectedOrder={selectedOrder}
        onMessageSent={() => {
          setNewMessage('');
          fetchMessages(selectedOrder.order_id);
        }}
      />

      {/* Voice Message Modal */}
      <VoiceMessageDialog
        show={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        selectedOrder={selectedOrder}
      />
    </>
  );
};

export default ChatWindow;