import React, { useState, useRef, useEffect } from 'react';
import config from '../modules/config';
import { Image, Camera, Upload, Send, X } from 'lucide-react';

const ImageMessageDialog = ({ show, onClose, selectedOrder }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recipientType, setRecipientType] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);

  const resetImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setRecipientType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveMessage = async (shareableUrl) => {
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
          content: `Image: ${shareableUrl}`,
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

  const handleClose = () => {
    resetImage();
    onClose();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const sendWhatsAppMessage = async (phoneNumber, order_id, imageUrl) => {
    try {
      const url = `${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MESSAGES}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: 'update_sending',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: `${selectedOrder.jewellery_details.name || 'Not specified'}-${order_id}`,
                  },
                  {
                    type: 'text',
                    text: imageUrl,
                  },
                ],
              },
            ],
          },
        }),
      });

      if (!response.ok) throw new Error('WhatsApp API request failed');
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  };

  // Helper function to validate phone numbers
  const isValidPhoneNumber = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') return false;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15 && !phoneNumber.includes('DEFAULT_');
  };

  // Function to send messages to workers (similar to SendMessageModal)
  const sendMessagesToWorkers = async (imageUrl) => {
    console.log(`[Workers] Starting to send image messages to all workers for order: ${selectedOrder.order_id}`);
    
    try {
      // Fetch all workers from the general API endpoint
      const workerResponse = await fetch(`${config.API_ROOT}/api/workers`);
      
      if (!workerResponse.ok) {
        throw new Error(`Failed to fetch workers: ${workerResponse.status}`);
      }
      
      const workerData = await workerResponse.json();
      const workers = workerData.workers || [];
      
      if (workers.length === 0) {
        console.warn(`[Workers] No workers found to send messages to`);
        return false;
      }

      const allSendPromises = [];
      
      for (const worker of workers) {
        if (!worker.phones || !Array.isArray(worker.phones)) {
          continue;
        }
        
        // Filter valid phone numbers
        const validPhones = worker.phones.filter(phone => isValidPhoneNumber(phone.phone_number));

        if (validPhones.length === 0) {
          continue;
        }

        // Send to ALL valid phone numbers for this worker
        const workerSendPromises = validPhones.map(async (phone) => {
          try {
            const success = await sendWhatsAppMessage(phone.phone_number, selectedOrder.order_id, imageUrl);
            return {
              workerId: worker.id,
              workerName: worker.name,
              phoneNumber: phone.phone_number,
              isPrimary: phone.is_primary,
              success: success
            };
          } catch (error) {
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

        allSendPromises.push(...workerSendPromises);
      }

      if (allSendPromises.length === 0) {
        console.warn(`[Workers] No valid phone numbers found across all workers`);
        return false;
      }

      // Execute all send operations in parallel
      const allResults = await Promise.all(allSendPromises);
      
      // Return true if at least one phone number received the message successfully
      const overallSuccess = allResults.some(result => result.success);
      return overallSuccess;
      
    } catch (error) {
      console.error(`[Workers] Critical error in sendMessagesToWorkers:`, error);
      return false;
    }
  };

  const handleSend = async () => {
    if (!selectedImage || !recipientType) return;
    setIsSending(true);

    try {
      const orderId = selectedOrder.order_id;
      
      // Get the file extension based on file type
      const fileExtension = selectedImage.name.split('.').pop() || 'jpg';
      
      const formData = new FormData();
      formData.append('file', selectedImage, `image_${Date.now()}.${fileExtension}`);
      
      const uploadResponse = await fetch('https://bsgold-api.chatloom.in/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }
      
      const { permanentUrl, fileId, fileName, mimeType } = await uploadResponse.json();

      // Use the permanentUrl directly as it already includes the extension
      const fullImageUrl = `https://bsgold-api.chatloom.in${permanentUrl}`;

      await saveMessage(fullImageUrl);

      let success = true;

      if (recipientType === 'client' || recipientType === 'both') {
        const clientPhone = selectedOrder.client_details.phone;
        const clientSuccess = await sendWhatsAppMessage(clientPhone, orderId, fullImageUrl);
        success = success && clientSuccess;
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        const workerSuccess = await sendMessagesToWorkers(fullImageUrl);
        success = success && workerSuccess;
      }

      if (success) {
        onClose();
      } else {
        alert('Failed to send image to one or more recipients');
      }
    } catch (error) {
      console.error('Error in send process:', error);
      alert('Error: ' + (error.message || 'An error occurred while sending the image'));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    let intervalId;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.MESSAGES}?order_id=${selectedOrder.order_id}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const messages = await response.json();
        // Handle the messages update here (you'll need to add state management for messages)
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    if (show) {
      fetchMessages();
      intervalId = setInterval(fetchMessages, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      // Clean up preview URL when component unmounts or image changes
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [show, selectedOrder.order_id, imagePreview]);

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Send Image</h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
          </div>

          <div className="modal-body">
            <div className="text-center mb-4">
              {!selectedImage ? (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="btn btn-primary btn-lg rounded-circle p-4 mb-3"
                    onClick={triggerFileSelect}
                  >
                    <Image size={24} />
                  </button>
                  <p className="text-muted">Tap to select an image</p>
                  <small className="text-muted">Supported formats: JPG, PNG, GIF (Max 10MB)</small>
                </div>
              ) : (
                <>
                  <div className="position-relative mb-3">
                    <img 
                      src={imagePreview} 
                      alt="Selected" 
                      className="img-fluid rounded"
                      style={{ maxHeight: '300px', maxWidth: '100%' }}
                    />
                    <button 
                      className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2"
                      onClick={resetImage}
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-muted small">{selectedImage.name}</p>
                  <button 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={triggerFileSelect}
                  >
                    Change Image
                  </button>
                </>
              )}
            </div>

            {selectedImage && (
              <div className="form-group">
                <label htmlFor="recipientSelect" className="form-label">
                  Choose recipient(s)
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
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            {selectedImage && (
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
                ) : (
                  <>
                    <Send size={20} className="me-2" />
                    Send
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageMessageDialog;
