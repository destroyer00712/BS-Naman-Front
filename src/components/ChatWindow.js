import React, { useState, useEffect, useRef } from 'react';
import config from '../modules/config';
import { Info, Plus, Send, Mic } from 'lucide-react';
import WorkerModal from './WorkerModal';
import VoiceMessageDialog from './VoiceMessageDialog';
import MediaViewer from './MediaViewer';

const SendMessageModal = ({ 
  show, 
  onClose, 
  message, 
  selectedOrder,
  onMessageSent 
}) => {
  const [recipientType, setRecipientType] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendWhatsAppMessage = async (phoneNumber, messageContent) => {
    try {
      const url = `${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MESSAGES}`;
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
            name: "update_sending",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [
                { 
                  type: "text", 
                  text: selectedOrder.order_id || ''
                },
                { 
                  type: "text", 
                  text: messageContent || ''
                }
              ]
            }]
          }
        })
      });

      if (!response.ok) throw new Error('WhatsApp API request failed');
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  };

  const saveMessage = async () => {
    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.MESSAGES}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: selectedOrder.order_id,
          content: message,
          sender_type: 'enterprise'
        })
      });

      if (!response.ok) throw new Error('Failed to save message');
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      return false;
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    let success = true;

    try {
      if (recipientType === 'client' || recipientType === 'both') {
        const clientSuccess = await sendWhatsAppMessage(selectedOrder.client_details.phone, message);
        success = success && clientSuccess;
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        const workerSuccess = await sendWhatsAppMessage(selectedOrder.jewellery_details['worker-phone'], message);
        success = success && workerSuccess;
      }

      if (success) {
        await saveMessage();
        onMessageSent();
        onClose();
      } else {
        alert('Failed to send message to one or more recipients');
      }
    } catch (error) {
      console.error('Error in send process:', error);
      alert('An error occurred while sending the message');
    } finally {
      setIsSending(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Send Message</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body">
            <div className="form-group mb-3">
              <label htmlFor="recipientSelect" className="form-label">
                Choose recipient(s) for your message
              </label>
              <select 
                id="recipientSelect"
                className="form-select" 
                value={recipientType} 
                onChange={(e) => setRecipientType(e.target.value)}
              >
                <option value="">Select recipient</option>
                <option value="client">Client</option>
                <option value="worker">Worker</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSend}
              disabled={!recipientType || isSending}
            >
              {isSending ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Sending...
                </>
              ) : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedOrder) {
      fetchMessages(selectedOrder.order_id);
      fetchClientName(selectedOrder.client_details.phone);
    }
  }, [selectedOrder]);

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
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.ORDER_MESSAGES(orderId)}`);
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
    setIsLoading(false);
  };

  const fetchMediaContent = async (mediaId) => {
    setIsLoadingMedia(true);
    try {
      const detailsResponse = await fetch(`${config.ENDPOINTS.WHATSAPP_MEDIA(mediaId)}`, {
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`
        }
      });
      const mediaDetails = await detailsResponse.json();
      
      if (mediaDetails.url) {
        const proxyUrl = `https://bsgold.chatloom.in/api/proxy-fb-media?url=${encodeURIComponent(mediaDetails.url)}`;
        const mediaResponse = await fetch(proxyUrl);
        
        if (!mediaResponse.ok) throw new Error('Failed to fetch media content');
        
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
          default:
            // For unknown types, try to extract extension from mime type
            const ext = mimeType.split('/')[1];
            if (ext) {
              fileExtension = `.${ext}`;
            }
        }
        
        // Create a FormData object to send the file with proper extension
        const formData = new FormData();
        formData.append('file', blob, `media_${Date.now()}${fileExtension}`);
        formData.append('type', mimeType);
        
        // Upload the file to our server
        const uploadResponse = await fetch(`${config.API_ROOT}/api/media/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to upload media');
        
        const { permanentUrl } = await uploadResponse.json();
        
        // Use the permanent URL in the message with the correct base URL
        return {
          url: permanentUrl,
          type: mimeType
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching media:', error);
      return null;
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleMediaClick = async (mediaId, mediaType) => {
    const mediaData = await fetchMediaContent(mediaId);
    if (mediaData) {
      setActiveMedia(mediaData);
    } else {
      alert('Failed to load media');
    }
  };

  const handleCloseMedia = () => {
    if (activeMedia?.url) {
      URL.revokeObjectURL(activeMedia.url);
    }
    setActiveMedia(null);
  };

  useEffect(() => {
    return () => {
      if (activeMedia?.url) {
        URL.revokeObjectURL(activeMedia.url);
      }
    };
  }, []);

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

  const MediaModal = ({ media, onClose }) => (
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
            {media.type === config.MEDIA_TYPES.AUDIO ? (
              <audio controls className="w-100 p-3">
                <source src={media.url} type={media.type} />
                Your browser does not support the audio element.
              </audio>
            ) : media.type?.startsWith('video/') ? (
              <video controls className="w-100">
                <source src={media.url} type={media.type} />
                Your browser does not support the video element.
              </video>
            ) : (
              <img 
                src={media.url} 
                alt="Media content" 
                className="img-fluid"
                style={{ maxHeight: '70vh' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const forwardMessage = async (message, targetType) => {
    setIsForwarding(true);
    try {
      const url = `${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MESSAGES}`;
      const phoneNumber = targetType === 'client' 
        ? selectedOrder.client_details.phone 
        : selectedOrder.jewellery_details['worker-phone'];

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
          // First get the media URL from WhatsApp API
          const mediaDetails = await fetch(`${config.ENDPOINTS.WHATSAPP_MEDIA(message.media_id)}`, {
            headers: {
              'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`
            }
          }).then(res => res.json());

          if (!mediaDetails.url) {
            throw new Error('No media URL found');
          }

          // Use the proxy endpoint with the correct URL parameter
          const proxyUrl = `https://bsgold.chatloom.in/api/proxy-fb-media?url=${encodeURIComponent(mediaDetails.url)}`;
          const mediaResponse = await fetch(proxyUrl);
          
          if (!mediaResponse.ok) throw new Error('Failed to fetch media content');
          
          const blob = await mediaResponse.blob();
          const mimeType = message.media_type || mediaDetails.mime_type || 'application/octet-stream';
          
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
            default:
              // For unknown types, try to extract extension from mime type
              const ext = mimeType.split('/')[1];
              if (ext) {
                fileExtension = `.${ext}`;
              }
          }
          
          // Create a FormData object to send the file with proper extension
          const formData = new FormData();
          formData.append('file', blob, `media_${Date.now()}${fileExtension}`);
          formData.append('type', mimeType);
          
          // Upload the file to our server
          const uploadResponse = await fetch(`${config.API_ROOT}/api/media/upload`, {
            method: 'POST',
            body: formData
          });
          
          if (!uploadResponse.ok) throw new Error('Failed to upload media');
          
          const { permanentUrl } = await uploadResponse.json();
          
          // Use the permanent URL in the message with the correct base URL
          templateComponents = [{
            type: "body",
            parameters: [
              { type: "text", text: selectedOrder.order_id },
              { type: "text", text: `https://bsgold-api.chatloom.in${permanentUrl}` }
            ]
          }];
        } catch (error) {
          console.error('Error handling media:', error);
          throw new Error('Failed to process media for forwarding');
        }
      }

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

      if (!response.ok) throw new Error('Failed to forward message');
      
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
    setExpandedForwardedMessage(expandedForwardedMessage === message.message_id ? null : message.message_id);
  };

  return (
    <>
      <div className="d-flex flex-column h-100 bg-white rounded-3 shadow-sm">
        {/* Chat Header */}
        <div className="p-2 p-md-3 border-bottom d-flex justify-content-between align-items-center">
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
        <div className="flex-grow-1 overflow-auto p-2 p-md-3" style={{ backgroundColor: '#f8f9fa' }}>
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
              const isForwarded = message.content.startsWith('Forwarded from');
              
              return (
                <div
                  key={message.message_id}
                  className="message-container mb-2"
                  style={{
                    display: 'flex',
                    justifyContent: message.sender_type === 'enterprise' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div 
                    style={{
                      ...getMessageStyle(message.sender_type),
                      backgroundColor: isForwarded ? config.SENDER_COLORS.forwarded : 
                        isClientMessage ? config.SENDER_COLORS.client :
                        isWorkerMessage ? config.SENDER_COLORS.worker :
                        config.SENDER_COLORS.enterprise
                    }} 
                    className="mw-75 position-relative"
                  >
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
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleMediaClick(message.media_id, message.media_type)}
                          disabled={isLoadingMedia}
                        >
                          {isLoadingMedia ? (
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          ) : 'View Media'}
                        </button>
                      ) : message.content && (message.content.startsWith('Voice message: ') || message.content.startsWith('Video message: ')) ? (
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleBlobUrlClick(message.content.substring(message.content.startsWith('Voice message: ') ? 'Voice message: '.length : 'Video message: '.length))}
                          disabled={isLoadingMedia}
                        >
                          {isLoadingMedia ? (
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          ) : `View ${message.content.startsWith('Voice message:') ? 'Voice' : 'Video'} Message`}
                        </button>
                      ) : (
                        message.content.replace(/^Forwarded from (Client|Worker): /, '')
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.5 15a.5.5 0 0 1-.5-.5v-3.509L8.605 11.11a.5.5 0 0 1-1.21 0l-3.395 3.39V14.5a.5.5 0 0 1-1 0v-3.509l3.395-3.39a.5.5 0 0 1 1.21 0L12 10.991V14.5a.5.5 0 0 1-.5.5z"/>
                            <path d="M12.5 1a.5.5 0 0 1 .5.5v3.509l3.395-3.39a.5.5 0 0 1 1.21 0l3.395 3.39V1.5a.5.5 0 0 1 1 0v3.509l-3.395 3.39a.5.5 0 0 1-1.21 0L12 5.009V1.5a.5.5 0 0 1 .5-.5z"/>
                          </svg>
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.5 15a.5.5 0 0 1-.5-.5v-3.509L8.605 11.11a.5.5 0 0 1-1.21 0l-3.395 3.39V14.5a.5.5 0 0 1-1 0v-3.509l3.395-3.39a.5.5 0 0 1 1.21 0L12 10.991V14.5a.5.5 0 0 1-.5.5z"/>
                            <path d="M12.5 1a.5.5 0 0 1 .5.5v3.509l3.395-3.39a.5.5 0 0 1 1.21 0l3.395 3.39V1.5a.5.5 0 0 1 1 0v3.509l-3.395 3.39a.5.5 0 0 1-1.21 0L12 5.009V1.5a.5.5 0 0 1 .5-.5z"/>
                          </svg>
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