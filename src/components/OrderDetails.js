import React from 'react';
import { X } from 'lucide-react';

const OrderDetails = ({ order, onClose }) => {
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
      zIndex: 1050
    }}>
      <div className="modal-content bg-white rounded-3 shadow" style={{ width: '90%', maxWidth: '500px' }}>
        <div className="modal-header border-bottom p-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Order Details</h5>
          <button className="btn btn-light rounded-circle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body p-4">
          <div className="mb-4">
            <h6 className="text-muted mb-2">Order Information</h6>
            <p className="mb-1"><strong>Order ID:</strong> {order.order_id}</p>
            <p className="mb-1"><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
            <p className="mb-1"><strong>Updated:</strong> {new Date(order.updated_at).toLocaleString()}</p>
          </div>

          <div className="mb-4">
            <h6 className="text-muted mb-2">Jewellery Details</h6>
            <p className="mb-1"><strong>Name:</strong> {order.jewellery_details.name}</p>
            <p className="mb-1"><strong>Melting:</strong> {order.jewellery_details.melting}</p>
            <p className="mb-1"><strong>Weight:</strong> {order.jewellery_details.weight}</p>
            <p className="mb-1"><strong>Timeline:</strong> {order.jewellery_details.timeline} days</p>
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