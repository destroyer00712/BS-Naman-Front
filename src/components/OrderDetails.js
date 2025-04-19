import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import config from '../modules/config';

const OrderDetails = ({ order, onClose }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(order?.jewellery_details?.['worker-id'] || '');
  const [isCompleted, setIsCompleted] = useState(order?.jewellery_details?.status === 'completed');
  const [isLoading, setIsLoading] = useState(false);
  const [workerName, setWorkerName] = useState('');

  useEffect(() => {
    fetchWorkers();
    if (selectedWorker) {
      fetchWorkerName(selectedWorker);
    }
  }, [selectedWorker]);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers`);
      const data = await response.json();
      setWorkers(data.workers);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchWorkerName = async (workerId) => {
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers/${workerId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkerName(data.worker.name);
      }
    } catch (error) {
      console.error('Error fetching worker name:', error);
    }
  };

  const getWorkerPhoneNumbersByName = async (name) => {
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers`);
      if (!response.ok) {
        throw new Error('Failed to fetch workers');
      }
      const data = await response.json();
      
      const matchedWorkers = data.workers.filter(worker => worker.name.toLowerCase() === name.toLowerCase());
      const phoneNumbers = matchedWorkers.flatMap(worker => 
        worker.phone_numbers.map(phone => phone.number)
      );

      return phoneNumbers;
    } catch (error) {
      console.error('Error fetching worker phone numbers:', error);
      return [];
    }
  };

  const sendWorkerNotification = async (workerName, order, isTermination = false) => {
    try {
      const phoneNumbers = await getWorkerPhoneNumbersByName(workerName);
      
      if (phoneNumbers.length === 0) {
        throw new Error('No phone numbers found for the worker');
      }

      const templateName = isTermination ? 'worker_termination' : 'worker_assignment';
      const notificationPromises = phoneNumbers.map(phoneNumber => 
        fetch(`${config.WHATSAPP_API_ROOT}${config.WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "template",
            template: {
              name: templateName,
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
        })
      );

      await Promise.all(notificationPromises);
      console.log(`Worker ${isTermination ? 'termination' : 'assignment'} notifications sent successfully to all numbers`);
    } catch (error) {
      console.error(`Error sending worker ${isTermination ? 'termination' : 'assignment'} notifications:`, error);
    }
  };

  const getWorkerPrimaryPhoneNumber = async (workerId) => {
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers`);
      if (!response.ok) {
        throw new Error('Failed to fetch workers');
      }
      const data = await response.json();
      
      // Find worker by ID
      const worker = data.workers.find(w => w.id === workerId);
      if (!worker) {
        return null;
      }
      
      // Get primary phone number
      const primaryPhone = worker.phone_numbers.find(phone => phone.is_primary);
      return primaryPhone ? primaryPhone.number : null;
    } catch (error) {
      console.error('Error fetching worker primary phone number:', error);
      return null;
    }
  };

  const updateOrder = async (workerId, status) => {
    setIsLoading(true);
    try {
      const updatedOrder = {
        client_details: {
          phone: order.client_details.phone
        },
        jewellery_details: {
          ...order.jewellery_details,
          'worker-id': workerId,
          status: status
        }
      };

      // If there was a previous worker and we're changing workers, send termination notification
      if (order.jewellery_details['worker-id'] && order.jewellery_details['worker-id'] !== workerId) {
        try {
          // First try to get the worker from the local workers list
          const previousWorker = workers.find(w => w.id === order.jewellery_details['worker-id']);
          if (previousWorker) {
            const primaryPhone = previousWorker.phone_numbers.find(phone => phone.is_primary);
            if (primaryPhone) {
              await sendWorkerNotification(previousWorker.name, order, true);
            }
          } else {
            // Fallback to API if not found locally
            const primaryPhone = await getWorkerPrimaryPhoneNumber(order.jewellery_details['worker-id']);
            if (primaryPhone) {
              const previousWorkerResponse = await fetch(`${config.API_ROOT}/api/workers/${primaryPhone}`);
              if (previousWorkerResponse.ok) {
                const previousWorkerData = await previousWorkerResponse.json();
                await sendWorkerNotification(previousWorkerData.worker.name, order, true);
              }
            }
          }
        } catch (error) {
          console.error('Error sending termination notification:', error);
          // Continue with the order update even if notification fails
        }
      }

      await fetch(`${config.API_ROOT}/api/orders/${order.order_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedOrder)
      });

      // If a new worker is assigned, send assignment notification
      if (workerId) {
        try {
          // First try to get the worker from the local workers list
          const newWorker = workers.find(w => w.id === workerId);
          if (newWorker) {
            const primaryPhone = newWorker.phone_numbers.find(phone => phone.is_primary);
            if (primaryPhone) {
              await sendWorkerNotification(newWorker.name, order);
            }
          } else {
            // Fallback to API if not found locally
            const primaryPhone = await getWorkerPrimaryPhoneNumber(workerId);
            if (primaryPhone) {
              const workerResponse = await fetch(`${config.API_ROOT}/api/workers/${primaryPhone}`);
              if (workerResponse.ok) {
                const workerData = await workerResponse.json();
                await sendWorkerNotification(workerData.worker.name, order);
              }
            }
          }
        } catch (error) {
          console.error('Error sending assignment notification:', error);
          // Continue with the order update even if notification fails
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerChange = async (e) => {
    const value = e.target.value;
    setSelectedWorker(value);
    await updateOrder(value, isCompleted ? 'completed' : 'accepted');
  };

  const handleStatusToggle = async (e) => {
    const checked = e.target.checked;
    setIsCompleted(checked);
    
    try {
      await updateOrder(order.jewellery_details['worker-id'], checked ? 'completed' : 'accepted');
    } catch (error) {
      console.error('Error in status update process:', error);
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
            <div className="d-flex align-items-center gap-2">
              <select 
                className="form-select"
                value={selectedWorker}
                onChange={handleWorkerChange}
                disabled={isLoading}
              >
                <option value="">Select a worker</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              {workerName && (
                <span className="badge bg-primary">
                  {workerName}
                </span>
              )}
            </div>
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