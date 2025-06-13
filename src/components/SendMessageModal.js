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
    console.log(`[WhatsApp] Starting message send to: ${phoneNumber}`);
    console.log(`[WhatsApp] Order ID: ${order_id}`);
    console.log(`[WhatsApp] Message content: ${messageContent}`);
    
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      console.log(`[WhatsApp] Cleaned phone number: ${cleanPhone}`);
      
      const url = `${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MESSAGES}`;
      console.log(`[WhatsApp] API URL: ${url}`);
      
      const requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
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
      };
      
      console.log(`[WhatsApp] Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[WhatsApp] Response status: ${response.status} ${response.statusText}`);
      
      const responseData = await response.json();
      console.log(`[WhatsApp] Response data:`, responseData);

      if (!response.ok) {
        console.error(`[WhatsApp] API request failed for ${phoneNumber}:`, responseData);
        throw new Error(`WhatsApp API request failed: ${response.status} - ${JSON.stringify(responseData)}`);
      }
      
      console.log(`[WhatsApp] ✅ Message sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error(`[WhatsApp] ❌ Error sending message to ${phoneNumber}:`, error);
      console.error(`[WhatsApp] Error details:`, {
        message: error.message,
        stack: error.stack,
        phoneNumber,
        order_id,
        messageContent
      });
      return false;
    }
  };

  // Helper function to validate phone numbers
  const isValidPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') return false;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15 && !phoneNumber.includes('DEFAULT_');
  };

  // Optimized function to send messages to workers
  const sendMessagesToWorkers = async () => {
    console.log(`[Workers] 🚀 Starting to send messages to all workers for order: ${selectedOrder.order_id}`);
    
    try {
      // Fetch all workers from the general API endpoint
      console.log(`[Workers] Fetching all workers from API...`);
      const workerResponse = await fetch(`${config.API_ROOT}/api/workers`);
      
      if (!workerResponse.ok) {
        console.error(`[Workers] ❌ Failed to fetch workers: ${workerResponse.status} ${workerResponse.statusText}`);
        throw new Error(`Failed to fetch workers: ${workerResponse.status}`);
      }
      
      const workerData = await workerResponse.json();
      console.log(`[Workers] Raw worker data received:`, workerData);
      
      // Handle the workers response format
      const workers = workerData.workers || [];
      console.log(`[Workers] Processed workers array:`, workers);
      console.log(`[Workers] Total workers found: ${workers.length}`);
      
      if (workers.length === 0) {
        console.warn(`[Workers] ⚠️ No workers found to send messages to`);
        return false;
      }

      const allSendPromises = [];
      let totalPhoneNumbers = 0;
      let validPhoneNumbers = 0;
      
      for (const [index, worker] of workers.entries()) {
        console.log(`[Workers] Processing worker ${index + 1}/${workers.length}: ${worker.name} (ID: ${worker.id})`);
        
        if (!worker.phones || !Array.isArray(worker.phones)) {
          console.warn(`[Workers] ⚠️ Worker ${worker.name} has no phones array or phones is not an array`);
          console.log(`[Workers] Worker phones data:`, worker.phones);
          continue;
        }
        
        console.log(`[Workers] Worker ${worker.name} has ${worker.phones.length} phone number(s)`);
        totalPhoneNumbers += worker.phones.length;
        
        // Log all phone numbers for this worker
        worker.phones.forEach((phone, phoneIndex) => {
          console.log(`[Workers] Phone ${phoneIndex + 1}: ${phone.phone_number} (Primary: ${phone.is_primary})`);
        });
        
        // Filter valid phone numbers
        const validPhones = worker.phones.filter(phone => {
          const isValid = isValidPhoneNumber(phone.phone_number);
          console.log(`[Workers] Phone ${phone.phone_number} validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
          return isValid;
        });

        validPhoneNumbers += validPhones.length;
        console.log(`[Workers] Worker ${worker.name}: ${validPhones.length}/${worker.phones.length} phone numbers are valid`);

        if (validPhones.length === 0) {
          console.warn(`[Workers] ⚠️ No valid phone numbers found for worker: ${worker.name}`);
          continue;
        }

        console.log(`[Workers] 📱 Preparing to send messages to worker: ${worker.name} with ${validPhones.length} valid phone numbers`);

        // Send to ALL valid phone numbers for this worker
        const workerSendPromises = validPhones.map(async (phone, phoneIndex) => {
          console.log(`[Workers] Sending message ${phoneIndex + 1}/${validPhones.length} to ${worker.name} at ${phone.phone_number}`);
          
          const success = await sendWhatsAppMessage(phone.phone_number, selectedOrder.order_id, message);
          
          const result = {
            workerId: worker.id,
            workerName: worker.name,
            phoneNumber: phone.phone_number,
            isPrimary: phone.is_primary,
            success: success
          };
          
          console.log(`[Workers] Message result for ${worker.name} (${phone.phone_number}):`, result);
          return result;
        });

        allSendPromises.push(...workerSendPromises);
      }

      if (allSendPromises.length === 0) {
        console.warn(`[Workers] ⚠️ No valid phone numbers found across all workers`);
        console.log(`[Workers] Summary: ${totalPhoneNumbers} total phones, ${validPhoneNumbers} valid phones, 0 messages to send`);
        return false;
      }

      console.log(`[Workers] 📤 Sending messages to ${allSendPromises.length} phone numbers across ${workers.length} workers`);
      console.log(`[Workers] Phone number summary: ${totalPhoneNumbers} total, ${validPhoneNumbers} valid, ${allSendPromises.length} messages to send`);

      // Execute all send operations in parallel
      console.log(`[Workers] Executing all WhatsApp message sends in parallel...`);
      const startTime = Date.now();
      const allResults = await Promise.all(allSendPromises);
      const endTime = Date.now();
      console.log(`[Workers] All message sends completed in ${endTime - startTime}ms`);
      
      // Group results by worker
      const workerResults = {};
      allResults.forEach((result, index) => {
        console.log(`[Workers] Processing result ${index + 1}/${allResults.length}:`, result);
        
        if (!workerResults[result.workerId]) {
          workerResults[result.workerId] = {
            workerId: result.workerId,
            workerName: result.workerName,
            phoneResults: [],
            successCount: 0,
            totalPhones: 0
          };
        }
        workerResults[result.workerId].phoneResults.push({
          phoneNumber: result.phoneNumber,
          isPrimary: result.isPrimary,
          success: result.success
        });
        workerResults[result.workerId].totalPhones++;
        if (result.success) {
          workerResults[result.workerId].successCount++;
        }
      });

      // Log detailed results for debugging
      console.log(`[Workers] 📊 Detailed worker message sending results:`, workerResults);
      
      // Log results for each worker
      Object.values(workerResults).forEach(worker => {
        console.log(`[Workers] Worker: ${worker.workerName} - ${worker.successCount}/${worker.totalPhones} messages sent successfully`);
        worker.phoneResults.forEach(phone => {
          const status = phone.success ? '✅' : '❌';
          const primaryText = phone.isPrimary ? ' (Primary)' : '';
          console.log(`[Workers]   ${status} ${phone.phoneNumber}${primaryText}`);
        });
      });
      
      // Calculate overall success statistics
      const totalWorkers = Object.keys(workerResults).length;
      const workersWithSuccess = Object.values(workerResults).filter(worker => worker.successCount > 0).length;
      const totalMessages = allResults.length;
      const successfulMessages = allResults.filter(result => result.success).length;
      
      console.log(`[Workers] 📈 Final Summary:`);
      console.log(`[Workers]   • Workers processed: ${totalWorkers}`);
      console.log(`[Workers]   • Workers with successful messages: ${workersWithSuccess}`);
      console.log(`[Workers]   • Total messages attempted: ${totalMessages}`);
      console.log(`[Workers]   • Successful messages: ${successfulMessages}`);
      console.log(`[Workers]   • Success rate: ${((successfulMessages/totalMessages) * 100).toFixed(1)}%`);
      
      const overallSuccess = Object.values(workerResults).some(worker => worker.successCount > 0);
      console.log(`[Workers] ${overallSuccess ? '✅ Overall Success' : '❌ Overall Failure'}: At least one message was sent successfully: ${overallSuccess}`);
      
      // Return true if at least one phone number received the message successfully
      return overallSuccess;
      
    } catch (error) {
      console.error(`[Workers] ❌ Critical error in sendMessagesToWorkers:`, error);
      console.error(`[Workers] Error details:`, {
        message: error.message,
        stack: error.stack,
        selectedOrderId: selectedOrder?.order_id
      });
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
        const workerSuccess = await sendMessagesToWorkers();
        success = success && workerSuccess;
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