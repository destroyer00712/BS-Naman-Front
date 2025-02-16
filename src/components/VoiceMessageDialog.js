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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check for MP3/MP4 support
      let options;
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        options = { mimeType: 'audio/mpeg' };
      } else {
        throw new Error('MP3/MP4 recording is not supported in this browser');
      }

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
      alert('Error: MP3/MP4 recording is not supported in this browser or microphone access was denied.');
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
      
      // Ensure correct file extension and type based on recorded format
      const fileExtension = mediaRecorderRef.current.mimeType.includes('mp4') ? 'mp4' : 'mp3';
      formData.append('file', audioBlob, `audio.${fileExtension}`);
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mediaRecorderRef.current.mimeType);

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
      
      const { id: mediaId } = await uploadResponse.json();
      return mediaId;
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  };

  const sendWhatsAppMessage = async (phoneNumber, mediaId) => {
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
          type: "audio",
          audio: { id: mediaId }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'WhatsApp API request failed');
      }
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  };

  const handleSend = async () => {
    if (!audioBlob || !recipientType) return;
    setIsSending(true);

    try {
      const mediaId = await uploadAudioToWhatsApp();
      let success = true;

      if (recipientType === 'client' || recipientType === 'both') {
        const clientSuccess = await sendWhatsAppMessage(selectedOrder.client_details.phone, mediaId);
        success = success && clientSuccess;
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        const workerSuccess = await sendWhatsAppMessage(selectedOrder.jewellery_details['worker-phone'], mediaId);
        success = success && workerSuccess;
      }

      if (success) {
        onClose();
      } else {
        alert('Failed to send message to one or more recipients');
      }
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
              onClick={onClose}
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
              onClick={onClose}
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