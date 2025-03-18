import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import config from './config';

const WorkerModal = ({ onClose }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone_number: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKERS}`);
      const data = await response.json();
      setWorkers(data.workers);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await fetch(config.ENDPOINTS.WORKER_DETAILS(formData.phone_number), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name })
        });
      } else {
        await fetch(config.ENDPOINTS.WORKERS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      await fetchWorkers();
      handleBackToList();
    } catch (error) {
      console.error('Error saving worker:', error);
    }
  };

  const handleDelete = async (phoneNumber) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        await fetch(config.ENDPOINTS.WORKER_DETAILS(phoneNumber), {
          method: 'DELETE'
        });
        await fetchWorkers();
      } catch (error) {
        console.error('Error deleting worker:', error);
      }
    }
  };

  const handleEdit = (worker) => {
    setFormData({
      name: worker.name,
      phone_number: worker.phone_number
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setFormData({ name: '', phone_number: '' });
    setIsEditing(false);
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center">
              {showForm && (
                <button 
                  className="btn btn-link text-decoration-none me-2"
                  onClick={handleBackToList}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h5 className="modal-title mb-0">
                {showForm ? (isEditing ? 'Edit Worker' : 'Create Worker') : 'Workers'}
              </h5>
            </div>
            {!showForm && (
              <button 
                className="btn btn-primary me-2"
                onClick={() => setShowForm(true)}
              >
                <Plus size={20} className="me-1" />
                Create
              </button>
            )}
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {showForm ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                    disabled={isEditing}
                  />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={handleBackToList}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {isEditing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="list-group">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  workers.map((worker) => (
                    <div 
                      key={worker.phone_number} 
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <span>{worker.name}</span>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(worker)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(worker.phone_number)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerModal;