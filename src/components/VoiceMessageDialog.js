import React, { useState, useRef } from 'react';
import config from './config';
import { Mic, Square, Send } from 'lucide-react';

const VoiceMessageDialog = ({ show, onClose, selectedOrder }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recipientType, setRecipientType] = useState('');
  const [isSending, setIsSending] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const resetRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      const tracks = mediaRecorderRef.current.stream?.getTracks();
      tracks?.forEach(track => track.stop());
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecipientType('');
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  const handleClose = () => {
    resetRecording();
    onClose();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Update MIME type options to match WhatsApp's accepted formats
      let options;
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };  // Clean MIME type without codecs
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        options = { mimeType: 'audio/mpeg' };
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        options = { mimeType: 'audio/aac' };
      } else {
        throw new Error('No supported audio format available');
      }

      console.log('Selected recording format:', options.mimeType);
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current.mimeType 
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error: Recording is not supported in this browser or microphone access was denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudioToWhatsApp = async () => {
    try {
      const formData = new FormData();
      
      // Map the MIME type to appropriate extension and WhatsApp format
      const mimeType = mediaRecorderRef.current.mimeType;
      let fileExtension;
      let whatsappMimeType;
      
      switch (mimeType.split(';')[0]) { // Remove any codec information
        case 'audio/mp4':
          fileExtension = 'm4a';
          whatsappMimeType = 'audio/mp4';
          break;
        case 'audio/mpeg':
          fileExtension = 'mp3';
          whatsappMimeType = 'audio/mpeg';
          break;
        case 'audio/aac':
          fileExtension = 'aac';
          whatsappMimeType = 'audio/aac';
          break;
        default:
          throw new Error('Unsupported audio format');
      }

      console.log('Uploading with WhatsApp MIME type:', whatsappMimeType);
      
      formData.append('file', audioBlob, `audio.${fileExtension}`);
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', whatsappMimeType);

      const uploadResponse = await fetch(`${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MEDIA}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error?.message || 'Failed to upload audio');
      }
      
      const responseData = await uploadResponse.json();
      console.log('Upload response:', responseData);
      return responseData.id;
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  };

  const sendWhatsAppMessage = async (phoneNumber, mediaId) => {
    try {
      // Add logging to debug the send process
      console.log('Sending message to:', phoneNumber, 'with mediaId:', mediaId);
      
      const messageData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber.replace(/\D/g, ''),
        type: "audio",
        audio: { id: mediaId }
      };

      console.log('Message payload:', messageData);

      const url = `${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}${config.WHATSAPP_ENDPOINTS.MESSAGES}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      const responseData = await response.json();
      console.log('WhatsApp API response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error?.message || 'WhatsApp API request failed');
      }

      return responseData.messages?.[0]?.id ? true : false;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error; // Propagate the error instead of returning false
    }
  };

  const handleSend = async () => {
    if (!audioBlob || !recipientType) return;
    setIsSending(true);

    try {
      const mediaId = await uploadAudioToWhatsApp();
      console.log('Obtained mediaId:', mediaId);

      if (recipientType === 'client' || recipientType === 'both') {
        const clientPhone = selectedOrder.client_details.phone;
        console.log('Sending to client:', clientPhone);
        await sendWhatsAppMessage(clientPhone, mediaId);
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        const workerPhone = selectedOrder.jewellery_details['worker-phone'];
        console.log('Sending to worker:', workerPhone);
        await sendWhatsAppMessage(workerPhone, mediaId);
      }

      onClose();
    } catch (error) {
      console.error('Error in send process:', error);
      alert('Error: ' + (error.message || 'An error occurred while sending the message'));
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
            <h5 className="modal-title">Record Voice Message</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body">
            <div className="text-center mb-4">
              {!audioBlob ? (
                <button 
                  className={`btn btn-lg ${isRecording ? 'btn-danger' : 'btn-primary'} rounded-circle p-4`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square size={24} /> : <Mic size={24} />}
                </button>
              ) : (
                <audio controls className="w-100">
                  <source src={URL.createObjectURL(audioBlob)} type={mediaRecorderRef.current.mimeType} />
                  Your browser does not support the audio element.
                </audio>
              )}
              {isRecording && <p className="mt-2 text-danger">Recording...</p>}
            </div>

            {audioBlob && (
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
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleClose}
            >
              Cancel
            </button>
            {audioBlob && (
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

export default VoiceMessageDialog;