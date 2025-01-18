import React, { useState, useEffect, useRef } from 'react';
import config from '../modules/config';
import { Info, Plus, Send, Mic } from 'lucide-react';
import WorkerModal from './WorkerModal';
import VoiceMessageDialog from './VoiceMessageDialog';

const SendMessageModal = ({ 
  show, 
  onClose, 
  message, 
  selectedOrder,
  onMessageSent 
}) => {
  const [recipientType, setRecipientType] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendWhatsAppMessage = async (phoneNumber) => {
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
            name: "update_template",
            language: { code: "en" },
            components: [{
              type: "body",
              parameters: [{ type: "text", text: message }]
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
        const clientSuccess = await sendWhatsAppMessage(selectedOrder.client_details.phone);
        success = success && clientSuccess;
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        const workerSuccess = await sendWhatsAppMessage(selectedOrder.jewellery_details['worker-phone']);
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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedOrder) {
      fetchMessages(selectedOrder.order_id);
    }
  }, [selectedOrder]);

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
        const mediaResponse = await fetch(mediaDetails.url, {
          headers: {
            'User-Agent': 'PostmanRuntime/7.43.0'
          }
        });
        
        if (!mediaResponse.ok) throw new Error('Failed to fetch media content');
        
        const blob = await mediaResponse.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        return {
          url: objectUrl,
          type: mediaDetails.mime_type
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

  return (
    <>
      <div className="d-flex flex-column h-100 bg-white rounded-3 shadow-sm">
        {/* Chat Header */}
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <button 
            className="btn btn-light rounded-circle"
            onClick={() => setShowWorkerModal(true)}
          >
            <Plus size={20} />
          </button>
          <h6 className="mb-0 fw-bold">Order Chat</h6>
          <button className="btn btn-light rounded-circle" onClick={onInfoClick}>
            <Info size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: '#f8f9fa' }}>
          {isLoading ? (
            <div className="text-center p-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.message_id}
                className="message-container"
                style={{
                  display: 'flex',
                  justifyContent: message.sender_type === 'enterprise' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={getMessageStyle(message.sender_type)}>
                  <div className="message-content">
                    {message.content}
                  </div>
                  {message.media_id && (
                    <div className="mt-2">
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
                  )}
                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </small>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-top p-3">
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