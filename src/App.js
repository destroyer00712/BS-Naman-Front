import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import config from './modules/config';
import OrdersSidebar from './components/OrdersSidebar';
import ChatWindow from './components/ChatWindow';
import OrderDetails from './components/OrderDetails';
import AudioViewer from './components/AudioViewer';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BlobRedirectPage from './components/BlobRedirectPage';

// Declined Order View Component
const DeclinedOrderView = ({ order, onAcceptClick }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center h-100">
      <div className="text-center mb-4">
        <i className="bi bi-x-circle text-danger" style={{ fontSize: '3rem' }}></i>
        <h4 className="mt-3">Order Declined</h4>
        <p className="text-muted">This order was previously declined</p>
      </div>
      <button 
        className="btn btn-primary"
        onClick={() => onAcceptClick(order)}
      >
        Accept Order
      </button>
    </div>
  );
};

const WorkerSelectionModal = ({ show, onClose, onConfirm, workers }) => {
  const [selectedWorker, setSelectedWorker] = useState('');

  return (
    <>
      <div className={`modal fade ${show ? 'show' : ''}`} 
           style={{ 
             display: show ? 'block' : 'none',
             zIndex: 1055
           }}
           tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Assign Worker</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <select 
                  className="form-select"
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                >
                  <option value="">Select a worker...</option>
                  {workers.map(worker => (
                    <option key={worker.phone_number} value={worker.phone_number}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => onConfirm(selectedWorker)}
                disabled={!selectedWorker}
              >
                Assign Worker
              </button>
            </div>
          </div>
        </div>
      </div>
      {show && <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1054 }}
      ></div>}
    </>
  );
};

const App = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);

  // Fetch workers when component mounts
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKERS}`);
        const data = await response.json();
        setWorkers(data.workers);
      } catch (error) {
        console.error('Error fetching workers:', error);
      }
    };
    fetchWorkers();
  }, []);

  const updateOrderStatus = async (orderId, status, workerPhone = null) => {
    const updatedJewelleryDetails = {
      ...selectedOrder.jewellery_details,
      status: status
    };

    if (workerPhone) {
      updatedJewelleryDetails['worker-phone'] = workerPhone;
    }

    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.ORDERS}/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_details: selectedOrder.client_details,
          jewellery_details: updatedJewelleryDetails
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
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
                    text: order.jewellery_details.timeline || "Not specified"
                  },
                  {
                    type: "text",
                    text: order.jewellery_details.special_instructions || "No special instructions"
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
    } catch (error) {
      console.error('Error sending worker notification:', error);
      throw error;
    }
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    if (order.jewellery_details.status === 'declined') {
      setShowOrderDetails(false);
    }
  };

  const handleAcceptDeclinedOrder = (order) => {
    setShowWorkerModal(true);
  };

  const handleWorkerSelect = async (workerPhone) => {
    setShowWorkerModal(false);
    
    try {
      // First update the order status
      const updateSuccess = await updateOrderStatus(selectedOrder.order_id, 'accepted', workerPhone);
      
      if (!updateSuccess) {
        throw new Error('Failed to update order status');
      }

      // Then send the WhatsApp notification
      await sendWorkerNotification(workerPhone, selectedOrder);
      
      // Update the local state
      setSelectedOrder({
        ...selectedOrder,
        jewellery_details: {
          ...selectedOrder.jewellery_details,
          status: 'accepted',
          'worker-phone': workerPhone
        }
      });
    } catch (error) {
      console.error('Error in worker assignment process:', error);
      // You might want to add error handling UI here
      alert('Failed to assign worker. Please try again.');
    }
  };

  // Example function to set the audio URL
  const handleAudioUpload = (blob) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setBlobUrl(url);
  };

  return (
    <Router>
      <Routes>
        <Route path="/redirect" element={<BlobRedirectPage blobUrl={blobUrl} />} />
        <Route path="/" element={
          <div className="d-flex flex-column flex-md-row vh-100">
            {/* Sidebar - Now full width on mobile */}
            <div className="h-100 order-2 order-md-1" style={{ flex: '0 0 340px' }}>
              <OrdersSidebar onOrderSelect={handleOrderSelect} />
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 h-100 p-2 p-md-4 order-1 order-md-2">
              {selectedOrder ? (
                selectedOrder.jewellery_details.status === 'declined' ? (
                  <DeclinedOrderView 
                    order={selectedOrder}
                    onAcceptClick={handleAcceptDeclinedOrder}
                  />
                ) : (
                  <ChatWindow 
                    selectedOrder={selectedOrder}
                    onInfoClick={() => setShowOrderDetails(true)}
                  />
                )
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="text-center text-muted">
                    <h3>Select an order to view chat</h3>
                    <p>Choose an order from the sidebar to start chatting</p>
                  </div>
                </div>
              )}
              {/* Audio Viewer */}
              <AudioViewer audioUrl={audioUrl} />
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
              <OrderDetails
                order={selectedOrder}
                onClose={() => setShowOrderDetails(false)}
              />
            )}

            {/* Worker Selection Modal */}
            {showWorkerModal && selectedOrder && (
              <WorkerSelectionModal
                show={showWorkerModal}
                onClose={() => setShowWorkerModal(false)}
                onConfirm={handleWorkerSelect}
                workers={workers}
              />
            )}

            {/* Blob Redirect Page */}
            {blobUrl && <BlobRedirectPage blobUrl={blobUrl} />}
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default App;