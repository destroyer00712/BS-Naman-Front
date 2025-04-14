import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import config from '../modules/config';

const WorkerModal = ({ onClose }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone_numbers: [''] });
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
        await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKER_DETAILS(formData.phone_numbers[0])}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.name,
            phone_numbers: formData.phone_numbers.filter(num => num.trim() !== '')
          })
        });
      } else {
        await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKERS}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            phone_numbers: formData.phone_numbers.filter(num => num.trim() !== '')
          })
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
        await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKER_DETAILS(phoneNumber)}`, {
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
      phone_numbers: worker.phone_numbers || [worker.phone_number]
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setFormData({ name: '', phone_numbers: [''] });
    setIsEditing(false);
  };

  const addPhoneNumber = () => {
    setFormData({
      ...formData,
      phone_numbers: [...formData.phone_numbers, '']
    });
  };

  const removePhoneNumber = (index) => {
    const newPhoneNumbers = formData.phone_numbers.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      phone_numbers: newPhoneNumbers
    });
  };

  const updatePhoneNumber = (index, value) => {
    const newPhoneNumbers = [...formData.phone_numbers];
    newPhoneNumbers[index] = value;
    setFormData({
      ...formData,
      phone_numbers: newPhoneNumbers
    });
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex flex-column w-100">
              <div className="d-flex align-items-center justify-content-between">
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
                <button type="button" className="btn-close" onClick={onClose}></button>
              </div>
              {!showForm && (
                <div className="mt-4">
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={20} className="me-1" />
                    Create
                  </button>
                </div>
              )}
            </div>
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
                  <label className="form-label">Phone Numbers</label>
                  {formData.phone_numbers.map((phoneNumber, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="tel"
                        className="form-control"
                        value={phoneNumber}
                        onChange={(e) => updatePhoneNumber(index, e.target.value)}
                        required={index === 0}
                        disabled={isEditing && index === 0}
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removePhoneNumber(index)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline-primary mt-2"
                    onClick={addPhoneNumber}
                  >
                    <Plus size={16} className="me-1" />
                    Add Phone Number
                  </button>
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
                      key={worker.phone_numbers?.[0] || worker.phone_number} 
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div>{worker.name}</div>
                        <small className="text-muted">
                          {worker.phone_numbers?.join(', ') || worker.phone_number}
                        </small>
                      </div>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(worker)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(worker.phone_numbers?.[0] || worker.phone_number)}
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