import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import config from '../modules/config';
import { getPrimaryPhone, formatPhoneDisplay, validatePhones } from '../utils/workerUtils';

const WorkerModal = ({ onClose }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phones: [{ phone_number: '', is_primary: true }] });
  const [isEditing, setIsEditing] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);

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

  const getPrimaryPhone = (phones) => {
    const primaryPhone = phones.find(phone => phone.is_primary);
    return primaryPhone ? primaryPhone.phone_number : phones[0]?.phone_number || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Use utility function for validation
    const validation = validatePhones(formData.phones);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    // Transform phones array to match API format
    const primaryPhone = validation.validPhones.find(phone => phone.is_primary);
    const secondaryPhones = validation.validPhones.filter(phone => !phone.is_primary);
    
    const workerData = {
      name: formData.name,
      primary_phone: primaryPhone ? primaryPhone.phone_number : validation.validPhones[0]?.phone_number || '',
      secondary_phones: secondaryPhones.map(phone => phone.phone_number)
    };

    try {
      if (isEditing) {
        await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKER_DETAILS(editingWorkerId)}`, {
          method: 'PUT',  
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workerData)
        });
      } else {
        await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKERS}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workerData)
        });
      }
      await fetchWorkers();
      handleBackToList();
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Failed to save worker. Please try again.');
    }
  };

  const handleDelete = async (workerId) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        await fetch(`${config.API_ROOT}${config.ENDPOINTS.WORKER_DETAILS(workerId)}`, {
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
      phones: worker.phones.length > 0 ? worker.phones : [{ phone_number: '', is_primary: true }]
    });
    setIsEditing(true);
    setEditingWorkerId(worker.id);
    setShowForm(true);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setFormData({ name: '', phones: [{ phone_number: '', is_primary: true }] });
    setIsEditing(false);
    setEditingWorkerId(null);
  };

  const addPhoneNumber = () => {
    setFormData({
      ...formData,
      phones: [...formData.phones, { phone_number: '', is_primary: false }]
    });
  };

  const removePhoneNumber = (index) => {
    const newPhones = formData.phones.filter((_, i) => i !== index);
    // If we removed the primary phone, make the first one primary
    if (formData.phones[index].is_primary && newPhones.length > 0) {
      newPhones[0].is_primary = true;
    }
    setFormData({
      ...formData,
      phones: newPhones
    });
  };

  const updatePhoneNumber = (index, field, value) => {
    const newPhones = [...formData.phones];
    
    if (field === 'is_primary' && value) {
      // If setting this as primary, unset all others
      newPhones.forEach((phone, i) => {
        phone.is_primary = i === index;
      });
    } else {
      newPhones[index][field] = value;
    }
    
    setFormData({
      ...formData,
      phones: newPhones
    });
  };

  const formatPhoneDisplay = (phones) => {
    const primaryPhone = phones.find(phone => phone.is_primary);
    const otherPhones = phones.filter(phone => !phone.is_primary);
    
    let display = primaryPhone ? `${primaryPhone.phone_number} (Primary)` : '';
    if (otherPhones.length > 0) {
      display += primaryPhone ? `, ${otherPhones.map(p => p.phone_number).join(', ')}` : otherPhones.map(p => p.phone_number).join(', ');
    }
    
    return display;
  };

  const formatPhoneDisplayForList = (phones) => {
    return formatPhoneDisplay(phones);
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
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
                    Create Worker
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="modal-body">
            {showForm ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Worker Name</label>
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
                  {formData.phones.map((phone, index) => (
                    <div key={index} className="card mb-2">
                      <div className="card-body">
                        <div className="row align-items-end">
                          <div className="col-md-7">
                            <label className="form-label">Phone Number</label>
                            <input
                              type="tel"
                              className="form-control"
                              value={phone.phone_number}
                              onChange={(e) => updatePhoneNumber(index, 'phone_number', e.target.value)}
                              required={index === 0}
                              placeholder="Enter phone number"
                            />
                          </div>
                          <div className="col-md-3">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="primaryPhone"
                                checked={phone.is_primary}
                                onChange={(e) => updatePhoneNumber(index, 'is_primary', e.target.checked)}
                              />
                              <label className="form-check-label">
                                Primary
                              </label>
                            </div>
                          </div>
                          <div className="col-md-2">
                            {formData.phones.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => removePhoneNumber(index)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline-primary"
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
                    {isEditing ? 'Update Worker' : 'Create Worker'}
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
                ) : workers.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No workers found. Create your first worker to get started.
                  </div>
                ) : (
                  workers.map((worker) => (
                    <div 
                      key={worker.id} 
                      className="list-group-item"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <h6 className="mb-0">{worker.name}</h6>
                            <small className="text-muted">
                              Created: {new Date(worker.created_at).toLocaleDateString()}
                            </small>
                          </div>
                          <div className="text-muted small">
                            <strong>Phones:</strong> {formatPhoneDisplayForList(worker.phones)}
                          </div>
                          {worker.updated_at !== worker.created_at && (
                            <div className="text-muted small">
                              <strong>Last Updated:</strong> {new Date(worker.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="btn-group ms-3">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(worker)}
                            title="Edit Worker"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(worker.id)}
                            title="Delete Worker"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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