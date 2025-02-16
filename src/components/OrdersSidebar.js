import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import config from './config';
import '../css/OrdersSidebar.css';


const socket = io(config.SOCKET_IO_SERVER_URL); // Replace 3001 with your backend port

console.log('Socket:', socket); // Check if the socket object is created
socket.on('connect', () => console.log('Connected to Socket.IO'));
socket.on('connect_error', (err) => console.error('Socket.IO connection error:', err));
// Status Modal Component
const StatusModal = ({ show, onClose, onResponse }) => (
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
            <h5 className="modal-title">Order Confirmation</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Would you like to accept or decline this order?</p>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-outline-danger"
              onClick={() => onResponse(false)}
            >
              Decline
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={() => onResponse(true)}
            >
              Accept
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

// Worker Selection Modal Component
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

const OrdersSidebar = ({ onOrderSelect }) => {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientNames, setClientNames] = useState({});
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.ORDERS}`);
        const data = await response.json();
        setOrders(data.orders);
        fetchClientNames(data.orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchOrders();

        // Listen for real-time order updates
        socket.on('newOrder', (newOrder) => {
          setOrders(prevOrders => [newOrder, ...prevOrders]); // Correct way to update state
        });
    
        return () => {
          socket.off('newOrder');
        };
    
  }, []);

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

  const fetchClientNames = async (orders) => {
    const names = {};
    for (const order of orders) {
      try {
        const response = await fetch(
          `${config.API_ROOT}${config.ENDPOINTS.CLIENT_DETAILS(order.client_details.phone)}`
        );
        const data = await response.json();
        names[order.order_id] = data.client.name;
      } catch (error) {
        console.error('Error fetching client name:', error);
        names[order.order_id] = 'Unknown Client';
      }
    }
    setClientNames(names);
  };

  const updateOrderStatus = async (orderId, status, workerPhone = null) => {
    const order = orders.find(o => o.order_id === orderId);
    if (!order) return;

    const updatedJewelleryDetails = {
      ...order.jewellery_details,
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
          client_details: order.client_details,
          jewellery_details: updatedJewelleryDetails
        })
      });

      if (response.ok) {
        const updatedOrders = orders.map(o => 
          o.order_id === orderId 
            ? { ...o, jewellery_details: updatedJewelleryDetails }
            : o
        );
        setOrders(updatedOrders);
        setFilteredOrders(updatedOrders.filter(order => 
          clientNames[order.order_id]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.order_id.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  useEffect(() => {
    const filtered = orders.filter(order => 
      clientNames[order.order_id]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [searchQuery, orders, clientNames]);

  const handleOrderClick = (order) => {
    setCurrentOrder(order);
    setSelectedOrderId(order.order_id);
    
    if (order.jewellery_details.status === 'pending') {
      setShowStatusModal(true);
    } else if (order.jewellery_details.status === 'declined') {
      onOrderSelect({
        ...order,
        isDeclined: true
      });
    } else {
      onOrderSelect(order);
    }

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleStatusResponse = async (accepted) => {
    setShowStatusModal(false);
    
    if (accepted) {
      setShowWorkerModal(true);
    } else {
      await updateOrderStatus(currentOrder.order_id, 'declined');
      onOrderSelect({ 
        ...currentOrder, 
        jewellery_details: { 
          ...currentOrder.jewellery_details, 
          status: 'declined' 
        },
        isDeclined: true
      });
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

      console.log('Worker notification sent successfully');
    } catch (error) {
      console.error('Error sending worker notification:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleWorkerSelect = async (workerPhone) => {
    setShowWorkerModal(false);
    
    try {
      // First update the order status
      await updateOrderStatus(currentOrder.order_id, 'accepted', workerPhone);
      
      // Then send the WhatsApp notification
      await sendWorkerNotification(workerPhone, currentOrder);
      
      // Finally update the UI
      onOrderSelect({ 
        ...currentOrder, 
        jewellery_details: { 
          ...currentOrder.jewellery_details, 
          status: 'accepted',
          'worker-phone': workerPhone 
        }
      });
    } catch (error) {
      console.error('Error in worker assignment process:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <>
      <button
        className="d-md-none btn btn-primary position-fixed sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{ left: '10px', top: '10px', zIndex: 1053 }}
      >
        <i className={`bi bi-${isSidebarOpen ? 'x-lg' : 'list'}`}></i>
      </button>

      <div 
        className={`sidebar-container ${isSidebarOpen ? 'sidebar-open' : ''}`}
        style={{ zIndex: 1052 }}
      >
        <div className="d-flex flex-column h-100 bg-white shadow-sm sidebar-content">
          <div className="p-4 border-bottom bg-light">
            <h5 className="mb-3 fw-bold text-primary d-flex align-items-center">
              <i className="bi bi-kanban me-2"></i>
              Orders Dashboard
            </h5>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="search"
                className="form-control border-start-0 ps-0"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-4 py-3 border-bottom">
            <small className="text-muted">
              Showing {filteredOrders.length} of {orders.length} orders
            </small>
          </div>

          <div className="orders-scroll-container">
            <div className="px-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.order_id}
                  data-order-id={order.order_id}
                  className={`card border-0 rounded-3 mb-3 mt-3 shadow-sm cursor-pointer transition-all hover-lift ${
                    selectedOrderId === order.order_id ? 'border-primary border-2' : ''
                  }`}
                  onClick={() => handleOrderClick(order)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="card-title mb-0 fw-bold text-primary">
                        {order.order_id}
                      </h6>
                      <span className={`badge ${
                        order.jewellery_details.status === 'pending' ? 'bg-warning text-dark' : 
                        order.jewellery_details.status === 'accepted' ? 'bg-success' : 
                        order.jewellery_details.status === 'declined' ? 'bg-danger' : 
                        'bg-primary'} rounded-pill`}>
                        {order.jewellery_details.status || order.jewellery_details.melting}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="fw-medium">
                        {clientNames[order.order_id] || 'Loading...'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </small>
                      <small className="text-primary">
                        {order.jewellery_details.weight}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-top bg-light mt-auto">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString()}
            </small>
          </div>
        </div>
      </div>

      <StatusModal 
        show={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onResponse={handleStatusResponse}
      />

      <WorkerSelectionModal
        show={showWorkerModal}
        onClose={() => setShowWorkerModal(false)}
        onConfirm={handleWorkerSelect}
        workers={workers}
      />
    </>
  );
};

export default OrdersSidebar;