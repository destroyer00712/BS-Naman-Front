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
    console.log(`[Workers] Function parameters:`, {
      selectedOrderId: selectedOrder?.order_id,
      message: message,
      messageLength: message?.length,
      recipientType: recipientType
    });
    
    try {
      // Fetch all workers from the general API endpoint
      console.log(`[Workers] Fetching all workers from API...`);
      console.log(`[Workers] API URL: ${config.API_ROOT}/api/workers`);
      
      const workerResponse = await fetch(`${config.API_ROOT}/api/workers`);
      console.log(`[Workers] API Response status: ${workerResponse.status} ${workerResponse.statusText}`);
      
      if (!workerResponse.ok) {
        console.error(`[Workers] ❌ Failed to fetch workers: ${workerResponse.status} ${workerResponse.statusText}`);
        throw new Error(`Failed to fetch workers: ${workerResponse.status}`);
      }
      
      const workerData = await workerResponse.json();
      console.log(`[Workers] Raw worker data received:`, workerData);
      console.log(`[Workers] Worker data type:`, typeof workerData);
      console.log(`[Workers] Worker data keys:`, Object.keys(workerData || {}));
      
      // Handle the workers response format
      const workers = workerData.workers || [];
      console.log(`[Workers] Processed workers array:`, workers);
      console.log(`[Workers] Workers array type:`, typeof workers);
      console.log(`[Workers] Is workers an array:`, Array.isArray(workers));
      console.log(`[Workers] Total workers found: ${workers.length}`);
      
      if (workers.length === 0) {
        console.warn(`[Workers] ⚠️ No workers found to send messages to`);
        console.log(`[Workers] Worker data was:`, workerData);
        return false;
      }

      const allSendPromises = [];
      let totalPhoneNumbers = 0;
      let validPhoneNumbers = 0;
      let processedWorkers = 0;
      let skippedWorkers = 0;
      
      console.log(`[Workers] Starting worker processing loop...`);
      
      for (const [index, worker] of workers.entries()) {
        console.log(`[Workers] =====================================`);
        console.log(`[Workers] Processing worker ${index + 1}/${workers.length}:`);
        console.log(`[Workers] Worker object:`, worker);
        console.log(`[Workers] Worker ID: ${worker.id}`);
        console.log(`[Workers] Worker name: ${worker.name}`);
        console.log(`[Workers] Worker phones:`, worker.phones);
        
        if (!worker.phones || !Array.isArray(worker.phones)) {
          console.warn(`[Workers] ⚠️ Worker ${worker.name} has no phones array or phones is not an array`);
          console.log(`[Workers] Worker phones data:`, worker.phones);
          console.log(`[Workers] Worker phones type:`, typeof worker.phones);
          skippedWorkers++;
          continue;
        }
        
        console.log(`[Workers] Worker ${worker.name} has ${worker.phones.length} phone number(s)`);
        totalPhoneNumbers += worker.phones.length;
        
        // Log all phone numbers for this worker
        worker.phones.forEach((phone, phoneIndex) => {
          console.log(`[Workers] Phone ${phoneIndex + 1}:`, phone);
          console.log(`[Workers]   - Number: ${phone.phone_number}`);
          console.log(`[Workers]   - Primary: ${phone.is_primary}`);
          console.log(`[Workers]   - Phone object keys:`, Object.keys(phone || {}));
        });
        
        // Filter valid phone numbers
        console.log(`[Workers] Starting phone validation for ${worker.name}...`);
        const validPhones = worker.phones.filter(phone => {
          console.log(`[Workers] Validating phone:`, phone);
          const isValid = isValidPhoneNumber(phone.phone_number);
          console.log(`[Workers] Phone ${phone.phone_number} validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
          if (!isValid) {
            console.log(`[Workers] Invalid phone details:`, {
              phoneNumber: phone.phone_number,
              phoneType: typeof phone.phone_number,
              phoneLength: phone.phone_number?.length,
              containsDefault: phone.phone_number?.includes('DEFAULT_')
            });
          }
          return isValid;
        });

        validPhoneNumbers += validPhones.length;
        console.log(`[Workers] Worker ${worker.name}: ${validPhones.length}/${worker.phones.length} phone numbers are valid`);
        console.log(`[Workers] Valid phones for ${worker.name}:`, validPhones);

        if (validPhones.length === 0) {
          console.warn(`[Workers] ⚠️ No valid phone numbers found for worker: ${worker.name}`);
          skippedWorkers++;
          continue;
        }

        processedWorkers++;
        console.log(`[Workers] 📱 Preparing to send messages to worker: ${worker.name} with ${validPhones.length} valid phone numbers`);

        // Send to ALL valid phone numbers for this worker
        const workerSendPromises = validPhones.map(async (phone, phoneIndex) => {
          console.log(`[Workers] Creating promise ${phoneIndex + 1}/${validPhones.length} for ${worker.name} at ${phone.phone_number}`);
          
          try {
            console.log(`[Workers] About to call sendWhatsAppMessage for:`, {
              phoneNumber: phone.phone_number,
              orderId: selectedOrder.order_id,
              message: message,
              workerName: worker.name
            });
            
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
          } catch (error) {
            console.error(`[Workers] Error in promise for ${worker.name} (${phone.phone_number}):`, error);
            return {
              workerId: worker.id,
              workerName: worker.name,
              phoneNumber: phone.phone_number,
              isPrimary: phone.is_primary,
              success: false,
              error: error.message
            };
          }
        });

        console.log(`[Workers] Created ${workerSendPromises.length} promises for worker ${worker.name}`);
        allSendPromises.push(...workerSendPromises);
        console.log(`[Workers] Total promises so far: ${allSendPromises.length}`);
      }

      console.log(`[Workers] =====================================`);
      console.log(`[Workers] Worker processing complete. Summary:`);
      console.log(`[Workers]   - Total workers: ${workers.length}`);
      console.log(`[Workers]   - Processed workers: ${processedWorkers}`);
      console.log(`[Workers]   - Skipped workers: ${skippedWorkers}`);
      console.log(`[Workers]   - Total phone numbers: ${totalPhoneNumbers}`);
      console.log(`[Workers]   - Valid phone numbers: ${validPhoneNumbers}`);
      console.log(`[Workers]   - Total promises created: ${allSendPromises.length}`);

      if (allSendPromises.length === 0) {
        console.warn(`[Workers] ⚠️ No valid phone numbers found across all workers`);
        console.log(`[Workers] Summary: ${totalPhoneNumbers} total phones, ${validPhoneNumbers} valid phones, 0 messages to send`);
        return false;
      }

      console.log(`[Workers] 📤 Sending messages to ${allSendPromises.length} phone numbers across ${processedWorkers} workers`);
      console.log(`[Workers] Phone number summary: ${totalPhoneNumbers} total, ${validPhoneNumbers} valid, ${allSendPromises.length} messages to send`);

      // Execute all send operations in parallel
      console.log(`[Workers] Executing all WhatsApp message sends in parallel...`);
      console.log(`[Workers] Promise array length before Promise.all: ${allSendPromises.length}`);
      
      const startTime = Date.now();
      const allResults = await Promise.all(allSendPromises);
      const endTime = Date.now();
      
      console.log(`[Workers] All message sends completed in ${endTime - startTime}ms`);
      console.log(`[Workers] Results array length: ${allResults.length}`);
      console.log(`[Workers] All results:`, allResults);
      
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
          success: result.success,
          error: result.error || null
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
          const errorText = phone.error ? ` - Error: ${phone.error}` : '';
          console.log(`[Workers]   ${status} ${phone.phoneNumber}${primaryText}${errorText}`);
        });
      });
      
      // Calculate overall success statistics
      const totalWorkers = Object.keys(workerResults).length;
      const workersWithSuccess = Object.values(workerResults).filter(worker => worker.successCount > 0).length;
      const totalMessages = allResults.length;
      const successfulMessages = allResults.filter(result => result.success).length;
      const failedMessages = allResults.filter(result => !result.success).length;
      
      console.log(`[Workers] 📈 Final Summary:`);
      console.log(`[Workers]   • Workers processed: ${totalWorkers}`);
      console.log(`[Workers]   • Workers with successful messages: ${workersWithSuccess}`);
      console.log(`[Workers]   • Total messages attempted: ${totalMessages}`);
      console.log(`[Workers]   • Successful messages: ${successfulMessages}`);
      console.log(`[Workers]   • Failed messages: ${failedMessages}`);
      console.log(`[Workers]   • Success rate: ${totalMessages > 0 ? ((successfulMessages/totalMessages) * 100).toFixed(1) : 0}%`);
      
      const overallSuccess = Object.values(workerResults).some(worker => worker.successCount > 0);
      console.log(`[Workers] ${overallSuccess ? '✅ Overall Success' : '❌ Overall Failure'}: At least one message was sent successfully: ${overallSuccess}`);
      
      // Return true if at least one phone number received the message successfully
      return overallSuccess;
      
    } catch (error) {
      console.error(`[Workers] ❌ Critical error in sendMessagesToWorkers:`, error);
      console.error(`[Workers] Error details:`, {
        message: error.message,
        stack: error.stack,
        selectedOrderId: selectedOrder?.order_id,
        configApiRoot: config.API_ROOT
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
    console.log(`[MAIN] 🚀 handleSend function called`);
    console.log(`[MAIN] Current state:`, {
      recipientType: recipientType,
      message: message,
      messageLength: message?.length,
      selectedOrder: selectedOrder?.order_id,
      isSending: isSending
    });

    if (!recipientType) {
      console.error(`[MAIN] ❌ No recipient type selected`);
      alert('Please select a recipient type');
      return;
    }

    if (!message || message.trim() === '') {
      console.error(`[MAIN] ❌ No message content provided`);
      alert('Please enter a message');
      return;
    }

    setIsSending(true);
    let success = true;
    console.log(`[MAIN] Starting message send process...`);

    try {
      // Client message sending
      if (recipientType === 'client' || recipientType === 'both') {
        console.log(`[MAIN] 📱 Sending message to client...`);
        console.log(`[MAIN] Client phone:`, selectedOrder.client_details?.phone);
        
        const clientSuccess = await sendWhatsAppMessage(selectedOrder.client_details.phone, selectedOrder.order_id, message);
        console.log(`[MAIN] Client message result:`, clientSuccess);
        success = success && clientSuccess;
        console.log(`[MAIN] Overall success after client: ${success}`);
      } else {
        console.log(`[MAIN] ⏭️ Skipping client message (recipient type: ${recipientType})`);
      }

      // Worker message sending
      if (recipientType === 'worker' || recipientType === 'both') {
        console.log(`[MAIN] 👷 About to send message to workers...`);
        console.log(`[MAIN] Calling sendMessagesToWorkers function...`);
        
        try {
          const workerSuccess = await sendMessagesToWorkers();
          console.log(`[MAIN] Worker message result:`, workerSuccess);
          success = success && workerSuccess;
          console.log(`[MAIN] Overall success after workers: ${success}`);
        } catch (workerError) {
          console.error(`[MAIN] ❌ Error in sendMessagesToWorkers:`, workerError);
          success = false;
        }
      } else {
        console.log(`[MAIN] ⏭️ Skipping worker message (recipient type: ${recipientType})`);
      }

      console.log(`[MAIN] All message sending complete. Final success status: ${success}`);

      if (success) {
        console.log(`[MAIN] ✅ All messages sent successfully, saving message to database...`);
        
        try {
          const saveSuccess = await saveMessage();
          console.log(`[MAIN] Save message result:`, saveSuccess);
          
          if (saveSuccess) {
            console.log(`[MAIN] 📡 Emitting socket event...`);
            socket.emit('newMessage', { orderId: selectedOrder.order_id, message });
            console.log(`[MAIN] 🎉 Process complete, calling callbacks...`);
            onMessageSent();
            onClose();
          } else {
            console.error(`[MAIN] ❌ Failed to save message to database`);
            alert('Messages sent but failed to save to database');
          }
        } catch (saveError) {
          console.error(`[MAIN] ❌ Error saving message:`, saveError);
          alert('Messages sent but failed to save to database');
        }
      } else {
        console.error(`[MAIN] ❌ Failed to send message to one or more recipients`);
        alert('Failed to send message to one or more recipients');
      }
    } catch (error) {
      console.error(`[MAIN] ❌ Critical error in send process:`, error);
      console.error(`[MAIN] Error details:`, {
        message: error.message,
        stack: error.stack,
        recipientType,
        selectedOrderId: selectedOrder?.order_id
      });
      alert('An error occurred while sending the message');
    } finally {
      console.log(`[MAIN] 🏁 Setting isSending to false`);
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