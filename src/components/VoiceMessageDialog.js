import React, { useState, useRef } from 'react';
import config from '../modules/config';
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

  const saveMessage = async (shareableUrl) => {
    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.MESSAGES}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: selectedOrder.order_id,
          content: `Voice message: ${shareableUrl}`,
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

  const handleClose = () => {
    resetRecording();
    onClose();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let options;
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        options = { mimeType: 'audio/mpeg' };
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        options = { mimeType: 'audio/aac' };
      } else {
        throw new Error('No supported audio format available');
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
          type: mediaRecorderRef.current.mimeType,
        });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
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

  const sendWhatsAppMessage = async (phoneNumber, order_id, audioUrl) => {
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
                    text: order_id,
                  },
                  {
                    type: 'text',
                    text: audioUrl,
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

  const handleSend = async () => {
    if (!audioBlob || !recipientType) return;
    setIsSending(true);

    try {
      const orderId = selectedOrder.order_id;
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', audioBlob, `voice_${Date.now()}.mp3`);
      
      // Upload the file to the server
      const uploadResponse = await fetch('http://bsgold.in/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) throw new Error('Failed to upload voice message');
      
      const { permanentUrl, fileId, fileName, mimeType } = await uploadResponse.json();

      // Save the message with the permanent URL to the database
      await saveMessage(permanentUrl);

      if (recipientType === 'client' || recipientType === 'both') {
        const clientPhone = selectedOrder.client_details.phone;
        await sendWhatsAppMessage(clientPhone, orderId, permanentUrl);
      }

      if (recipientType === 'worker' || recipientType === 'both') {
        const workerPhone = selectedOrder.jewellery_details['worker-phone'];
        await sendWhatsAppMessage(workerPhone, orderId, permanentUrl);
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
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
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
                <>
                  <audio controls className="w-100">
                    <source src={URL.createObjectURL(audioBlob)} type={mediaRecorderRef.current.mimeType} />
                    Your browser does not support the audio element.
                  </audio>
                  <button 
                    className="btn btn-warning mt-2" 
                    onClick={resetRecording}
                  >
                    Reset Recording
                  </button>
                </>
              )}
              {isRecording && <p className="mt-2 text-danger">Recording...</p>}
            </div>

            {audioBlob && (
              <div className="form-group">
                <label htmlFor="recipientSelect" className="form-label">
                  Choose recipient(s)</label>
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