import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import config from '../modules/config';
import { getPrimaryPhone, getWorkerDisplayName, getWorkerByPhone } from '../utils/workerUtils';

const OrderDetails = ({ order, onClose, onOrderUpdate }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [isCompleted, setIsCompleted] = useState(order?.jewellery_details?.status === 'completed');
  const [isLoading, setIsLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order); // Local state to track order updates

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Update local order state when prop changes
  useEffect(() => {
    setCurrentOrder(order);
    setIsCompleted(order?.jewellery_details?.status === 'completed');
  }, [order]);

  // Helper function to get worker phone from order (handles different field locations)
  const getWorkerPhoneFromOrder = (order) => {
    return order?.worker_phone || order?.jewellery_details?.['worker-phone'] || null;
  };

  // Update selectedWorker when workers are loaded and order changes
  useEffect(() => {
    const workerPhone = getWorkerPhoneFromOrder(currentOrder);
    if (workers.length > 0 && workerPhone) {
      const assignedWorker = getWorkerByPhone(workers, workerPhone);
      if (assignedWorker) {
        // Set the primary phone of the assigned worker as selected
        setSelectedWorker(getPrimaryPhone(assignedWorker.phones));
      } else {
        // If worker not found, keep the stored phone (might be legacy data)
        setSelectedWorker(workerPhone);
      }
    } else if (!workerPhone) {
      setSelectedWorker('');
    }
  }, [workers, currentOrder]);

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

  const fetchWorkerDetails = async (phoneNumber) => {
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers/${phoneNumber}`);
      if (!response.ok) {
        throw new Error('Failed to fetch worker details');
      }
      const data = await response.json();
      return data.worker;
    } catch (error) {
      console.error('Error fetching worker details:', error);
      throw error;
    }
  };

  const updateOrder = async (workerPhone, status) => {
    setIsLoading(true);
    try {
      console.log('Updating order with worker:', workerPhone);
      console.log('Current worker:', currentOrder.worker_phone);
      
      // Fetch worker details to get all associated phone numbers
      const workerDetails = await fetchWorkerDetails(workerPhone);
      
      const updatedOrder = {
        client_details: {
          phone: currentOrder.client_details.phone
        },
        worker_phone: workerPhone,
        jewellery_details: {
          ...currentOrder.jewellery_details,
          status: status
        }
      };

      // Use the reassignment API
      await fetch(`${config.API_ROOT}/api/orders/${currentOrder.order_id}/reassign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedOrder)
      });

      // Note: The /reassign API endpoint handles ALL notifications automatically:
      // - Termination notifications to the previous worker (if any)
      // - Assignment notifications to the new worker
      // No manual notifications needed to avoid duplicates
      console.log('Order reassigned successfully via API. All notifications handled by backend.');

      // Update local state with the complete order structure
      const updatedCurrentOrder = {
        ...currentOrder,
        worker_phone: workerPhone,
        jewellery_details: {
          ...currentOrder.jewellery_details,
          status: status,
          'worker-phone': workerPhone // Also update the jewellery_details field for compatibility
        }
      };
      
      setCurrentOrder(updatedCurrentOrder);
      setIsCompleted(status === 'completed');

      // Notify parent component
      onOrderUpdate && onOrderUpdate(updatedCurrentOrder);

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
      if (checked) {
        // When marking as completed, use a different approach
        // Update order status without using reassignment API
        const updatedOrder = {
          client_details: {
            phone: currentOrder.client_details.phone
          },
          worker_phone: getWorkerPhoneFromOrder(currentOrder),
          jewellery_details: {
            ...currentOrder.jewellery_details,
            status: 'completed'
          }
        };

        // Use regular order update API instead of reassignment
        const response = await fetch(`${config.API_ROOT}/api/orders/${currentOrder.order_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedOrder)
        });

        if (!response.ok) {
          throw new Error('Failed to update order status');
        }

        // Send completion notifications to both client and worker
        console.log('Order marked as completed, sending completion notifications');
        
        // Send notification to customer
        await sendCompletionNotification(currentOrder.client_details.phone, currentOrder);
        
        // Send notification to assigned worker (all phone numbers)
        const workerPhone = getWorkerPhoneFromOrder(currentOrder);
        if (workerPhone) {
          try {
            const workerDetails = await fetchWorkerDetails(workerPhone);
            console.log('Sending completion notifications to all worker phones');
            for (const phone of workerDetails.phones) {
              console.log('Sending completion notification to:', phone.phone_number);
              await sendCompletionNotification(phone.phone_number, currentOrder);
            }
          } catch (error) {
            console.error('Error fetching worker details for completion notification:', error);
            // Fallback to sending to the stored phone number
            await sendCompletionNotification(workerPhone, currentOrder);
          }
        }

        // Update local state
        const updatedCurrentOrder = {
          ...currentOrder,
          jewellery_details: {
            ...currentOrder.jewellery_details,
            status: 'completed'
          }
        };
        
        setCurrentOrder(updatedCurrentOrder);
        onOrderUpdate && onOrderUpdate(updatedCurrentOrder);

      } else {
        // When unchecking completed status, use the regular updateOrder function
        await updateOrder(getWorkerPhoneFromOrder(currentOrder), 'accepted');
      }
    } catch (error) {
      console.error('Error in status update process:', error);
      // Revert the checkbox state if there was an error
      setIsCompleted(!checked);
    }
  };

  if (!currentOrder) return null;

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
            <small className="text-muted">Order ID: {currentOrder.order_id}</small>
          </div>
          <button className="btn btn-light rounded-circle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body p-4">
          <div className="mb-4">
            <h6 className="text-muted mb-2">Order Information</h6>
            <p className="mb-1"><strong>Created:</strong> {new Date(currentOrder.created_at).toLocaleString()}</p>
            <p className="mb-1"><strong>Updated:</strong> {new Date(currentOrder.updated_at).toLocaleString()}</p>
          </div>

          <div className="mb-4">
            <h6 className="text-muted mb-2">Worker Assignment</h6>
            <div className="mb-3 p-3 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center">
                <span><strong>Currently Assigned:</strong></span>
                <span className={`badge ${getWorkerPhoneFromOrder(currentOrder) ? 'bg-success' : 'bg-secondary'}`}>
                  {getWorkerPhoneFromOrder(currentOrder) ? (
                    (() => {
                      const assignedWorker = getWorkerByPhone(workers, getWorkerPhoneFromOrder(currentOrder));
                      return assignedWorker ? getWorkerDisplayName(assignedWorker) : getWorkerPhoneFromOrder(currentOrder);
                    })()
                  ) : (
                    'Not Assigned'
                  )}
                </span>
              </div>
            </div>
            <select 
              className="form-select"
              value={selectedWorker}
              onChange={handleWorkerChange}
              disabled={isLoading}
            >
              <option value="">Select a worker</option>
              {workers.map((worker) => {
                const isCurrentlyAssigned = getWorkerByPhone([worker], getWorkerPhoneFromOrder(currentOrder));
                return (
                  <option key={worker.id} value={getPrimaryPhone(worker.phones)}>
                    {getWorkerDisplayName(worker)}{isCurrentlyAssigned ? ' (Currently Assigned)' : ''}
                  </option>
                );
              })}
            </select>
            {selectedWorker && (
              <div className="mt-2">
                <small className="text-muted">
                  Worker will be notified on all their registered phone numbers
                </small>
              </div>
            )}
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
            <p className="mb-1"><strong>Name:</strong> {currentOrder.jewellery_details.name}</p>
            <p className="mb-1"><strong>Melting:</strong> {currentOrder.jewellery_details.melting}</p>
            <p className="mb-1"><strong>Weight:</strong> {currentOrder.jewellery_details.weight}</p>
            <p className="mb-1"><strong>Special Instructions:</strong> {currentOrder.jewellery_details.special}</p>
          </div>

          <div>
            <h6 className="text-muted mb-2">Client Details</h6>
            <p className="mb-1"><strong>Phone:</strong> {currentOrder.client_details.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;