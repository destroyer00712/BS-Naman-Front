import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import config from '../modules/config';

const OrderDetails = ({ order, onClose }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(order?.jewellery_details?.['worker-phone'] || '');
  const [isCompleted, setIsCompleted] = useState(order?.jewellery_details?.status === 'completed');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKERS}`);
      const data = await response.json();
      setWorkers(data.workers);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const sendWorkerNotification = async (workerPhone, order) => {
    try {
      const response = await fetch(`${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: workerPhone,
          type: "template",
          template: {
            name: "worker_assignment",
            language: {
              code: "en"
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: order.order_id
                  },
                  {
                    type: "text",
                    text: order.jewellery_details.name || "Not specified"
                  },
                  {
                    type: "text",
                    text: order.jewellery_details.weight || "Not specified"
                  },
                  {
                    type: "text",
                    text: order.jewellery_details.melting || "Not specified"
                  },
                  {
                    type: "text",
                    text: order.jewellery_details.special || "No special instructions"
                  }
                ]
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp notification');
      }

      console.log('Worker notification sent successfully');
    } catch (error) {
      console.error('Error sending worker notification:', error);
    }
  };

  const sendWorkerRemovedNotification = async (workerPhone, order) => {
    try {
      const response = await fetch(`${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: workerPhone,
          type: "template",
          template: {
            name: "worker_changed",
            language: {
              code: "en"
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: order.order_id
                  }
                ]
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp notification');
      }

      console.log('Worker notification sent successfully');
    } catch (error) {
      console.error('Error sending worker notification:', error);
    }
  };

  const sendCompletionNotification = async (phone, order) => {
    try {
      const response = await fetch(`${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "template",
          template: {
            name: "order_completed",
            language: {
              code: "en"
            },
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: order.order_id
                  },
                  {
                    type: "text",
                    text: order.jewellery_details.name || "Not specified"
                  }
                ]
              }
            ]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp notification');
      }

      console.log('Completion notification sent successfully');
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  };

  const updateOrder = async (workerPhone, status) => {
    setIsLoading(true);
    try {
      console.log('Updating order with worker:', workerPhone);
      console.log('Current worker:', order.jewellery_details['worker-phone']);
      
      const updatedOrder = {
        client_details: {
          phone: order.client_details.phone
        },
        jewellery_details: {
          ...order.jewellery_details,
          'worker-phone': workerPhone,
          status: status
        }
      };

      await fetch(`${config.API_ROOT}/api/orders/${order.order_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedOrder)
      });

      // Only send worker notifications if the worker is actually changing
      const isWorkerChange = workerPhone !== order.jewellery_details['worker-phone'];
      if (isWorkerChange) {
        console.log('Worker changed, sending notifications');
        if (order.jewellery_details['worker-phone']) {
          console.log('Sending removal notification to:', order.jewellery_details['worker-phone']);
          await sendWorkerRemovedNotification(order.jewellery_details['worker-phone'], order);
        }
        if (workerPhone) {
          console.log('Sending assignment notification to:', workerPhone);
          await sendWorkerNotification(workerPhone, order);
        }
      } else {
        console.log('No worker change detected, skipping notifications');
      }
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerChange = (e) => {
    const value = e.target.value;
    setSelectedWorker(value);
    updateOrder(value, isCompleted ? 'completed' : 'accepted');
  };

  const handleStatusToggle = async (e) => {
    const checked = e.target.checked;
    setIsCompleted(checked);
    
    try {
      // Update the order status
      await updateOrder(order.jewellery_details['worker-phone'], checked ? 'completed' : 'accepted');
      
      // If order is being marked as completed, send notifications
      if (checked) {
        // Send notification to customer
        await sendCompletionNotification(order.client_details.phone, order);
        
        // Send notification to worker if there is one assigned
        if (order.jewellery_details['worker-phone']) {
          await sendCompletionNotification(order.jewellery_details['worker-phone'], order);
        }
      }
    } catch (error) {
      console.error('Error in status update process:', error);
      // Revert the checkbox state if there was an error
      setIsCompleted(!checked);
    }
  };

  if (!order) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="modal-content bg-white rounded-3 shadow" style={{ width: '90%', maxWidth: '500px' }}>
        <div className="modal-header border-bottom p-3 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Order Details</h5>
            <small className="text-muted">Order ID: {order.order_id}</small>
          </div>
          <button className="btn btn-light rounded-circle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body p-4">
          <div className="mb-4">
            <h6 className="text-muted mb-2">Order Information</h6>
            <p className="mb-1"><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
            <p className="mb-1"><strong>Updated:</strong> {new Date(order.updated_at).toLocaleString()}</p>
          </div>

          <div className="mb-4">
            <h6 className="text-muted mb-2">Worker Assignment</h6>
            <select 
              className="form-select"
              value={selectedWorker}
              onChange={handleWorkerChange}
              disabled={isLoading}
            >
              <option value="">Select a worker</option>
              {workers.map((worker) => (
                <option key={worker.phone_number} value={worker.phone_number}>
                  {worker.name} ({worker.phone_number})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <h6 className="text-muted mb-2">Order Status</h6>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="statusToggle"
                checked={isCompleted}
                onChange={handleStatusToggle}
                disabled={isLoading}
              />
              <label className="form-check-label" htmlFor="statusToggle">
                {isCompleted ? 'Completed' : 'In Progress'}
              </label>
            </div>
          </div>

          <div className="mb-4">
            <h6 className="text-muted mb-2">Jewellery Details</h6>
            <p className="mb-1"><strong>Name:</strong> {order.jewellery_details.name}</p>
            <p className="mb-1"><strong>Melting:</strong> {order.jewellery_details.melting}</p>
            <p className="mb-1"><strong>Weight:</strong> {order.jewellery_details.weight}</p>
            <p className="mb-1"><strong>Special Instructions:</strong> {order.jewellery_details.special}</p>
          </div>

          <div>
            <h6 className="text-muted mb-2">Client Details</h6>
            <p className="mb-1"><strong>Phone:</strong> {order.client_details.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;