import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { io } from 'socket.io-client';
import config from '../modules/config';

const socket = io(config.API_ROOT);

const SendMessageModal = ({ 
  show, 
  onClose, 
  message, 
  selectedOrder,
  onMessageSent 
}) => {
  const [recipientType, setRecipientType] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (show) {
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, [show]);

  const sendWhatsAppMessage = async (phoneNumber, order_id, messageContent) => {
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
                  text: `${selectedOrder.jewellery_details.name || 'Not specified'}-${order_id || ''}`
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
      const recipients = [];
      if (recipientType === 'client' || recipientType === 'both') {
        recipients.push('Client');
      }
      if (recipientType === 'worker' || recipientType === 'both') {
        recipients.push('Worker');
      }

      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.MESSAGES}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: selectedOrder.order_id,
          content: message,
          sender_type: 'enterprise',
          recipients: recipients
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
        const clientSuccess = await sendWhatsAppMessage(selectedOrder.client_details.phone, selectedOrder.order_id, message);
        success = success && clientSuccess;
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        try {
          // Fetch all worker phone numbers
          const workerResponse = await fetch(`${config.API_ROOT}/api/workers/${selectedOrder.worker_phone}`);
          const workerData = await workerResponse.json();
          const workerPhones = workerData.worker.phones.map(phone => phone.phone_number);

          // Send message to all worker phones
          const workerSendPromises = workerPhones.map(async (phoneNumber) => {
            const workerSuccess = await sendWhatsAppMessage(phoneNumber, selectedOrder.order_id, message);
            return workerSuccess;
          });

          const workerResults = await Promise.all(workerSendPromises);
          const workerSuccess = workerResults.every(result => result === true);
          success = success && workerSuccess;
        } catch (error) {
          console.error('Error sending to worker phones:', error);
          success = false;
        }
      }

      if (success) {
        await saveMessage();
        socket.emit('newMessage', { orderId: selectedOrder.order_id, message });
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

export default SendMessageModal;