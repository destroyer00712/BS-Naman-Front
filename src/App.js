import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import OrdersSidebar from './components/OrdersSidebar';
import ChatWindow from './components/ChatWindow';
import OrderDetails from './components/OrderDetails';

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

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    if (order.jewellery_details.status === 'declined') {
      // If order is declined, we'll show the declined view instead of chat
      setShowOrderDetails(false);
    }
  };

  const handleAcceptDeclinedOrder = (order) => {
    // Show worker selection modal when accepting a declined order
    setShowWorkerModal(true);
  };

  const handleWorkerSelect = async (workerPhone) => {
    setShowWorkerModal(false);
    // Update the order status here (you'll need to implement this)
    // After successful update:
    setSelectedOrder({
      ...selectedOrder,
      jewellery_details: {
        ...selectedOrder.jewellery_details,
        status: 'accepted',
        'worker-phone': workerPhone
      }
    });
  };

  return (
    <div className="d-flex vh-100">
      {/* Sidebar */}
      <div className="h-100" style={{ flex: '0 0 340px' }}>
        <OrdersSidebar onOrderSelect={handleOrderSelect} />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 h-100 p-4">
        {selectedOrder ? (
          selectedOrder.jewellery_details.status === 'declined' ? (
            // Show declined view if order is declined
            <DeclinedOrderView 
              order={selectedOrder}
              onAcceptClick={handleAcceptDeclinedOrder}
            />
          ) : (
            // Show chat window for non-declined orders
            <ChatWindow 
              selectedOrder={selectedOrder}
              onInfoClick={() => setShowOrderDetails(true)}
            />
          )
        ) : (
          // Show empty state when no order is selected
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="text-center text-muted">
              <h3>Select an order to view chat</h3>
              <p>Choose an order from the sidebar to start chatting</p>
            </div>
          </div>
        )}
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
          workers={[]} // You'll need to fetch and pass workers data here
        />
      )}
    </div>
  );
};

export default App;