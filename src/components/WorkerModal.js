import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import config from '../modules/config';

const WorkerModal = ({ onClose }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    phone_numbers: [{ number: '', is_primary: true }] 
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers`);
      const data = await response.json();
      setWorkers(data.workers);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
    setIsLoading(false);
  };

  const getWorkerByPrimaryPhone = async (phoneNumber) => {
    try {
      const response = await fetch(`${config.API_ROOT}/api/workers/${phoneNumber}`);
      if (!response.ok) {
        throw new Error('Worker not found');
      }
      const data = await response.json();
      return data.worker;
    } catch (error) {
      console.error('Error fetching worker by phone:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const workerData = {
        name: formData.name,
        phone_numbers: formData.phone_numbers
      };

      if (isEditing) {
        const response = await fetch(`${config.API_ROOT}/api/workers/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workerData)
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to update worker');
        }
      } else {
        const response = await fetch(`${config.API_ROOT}/api/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workerData)
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create worker');
        }
      }
      await fetchWorkers();
      handleBackToList();
    } catch (error) {
      console.error('Error saving worker:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleDelete = async (workerId) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        const response = await fetch(`${config.API_ROOT}/api/workers/${workerId}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to delete worker');
        }
        await fetchWorkers();
      } catch (error) {
        console.error('Error deleting worker:', error);
        // You might want to show an error message to the user here
      }
    }
  };

  const handleEdit = (worker) => {
    setFormData({
      id: worker.id,
      name: worker.name,
      phone_numbers: worker.phone_numbers
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleBackToList = () => {
    setShowForm(false);
    setFormData({ name: '', phone_numbers: [{ number: '', is_primary: true }] });
    setIsEditing(false);
  };

  const addPhoneNumber = () => {
    setFormData({
      ...formData,
      phone_numbers: [...formData.phone_numbers, { number: '', is_primary: false }]
    });
  };

  const removePhoneNumber = (index) => {
    const newPhoneNumbers = formData.phone_numbers.filter((_, i) => i !== index);
    // If we're removing the primary number, make the first remaining number primary
    if (formData.phone_numbers[index].is_primary && newPhoneNumbers.length > 0) {
      newPhoneNumbers[0].is_primary = true;
    }
    setFormData({
      ...formData,
      phone_numbers: newPhoneNumbers
    });
  };

  const updatePhoneNumber = (index, value) => {
    const newPhoneNumbers = [...formData.phone_numbers];
    newPhoneNumbers[index].number = value;
    setFormData({
      ...formData,
      phone_numbers: newPhoneNumbers
    });
  };

  const setPrimaryNumber = (index) => {
    const newPhoneNumbers = formData.phone_numbers.map((phone, i) => ({
      ...phone,
      is_primary: i === index
    }));
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
                  {formData.phone_numbers.map((phone, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="tel"
                        className="form-control"
                        value={phone.number}
                        onChange={(e) => updatePhoneNumber(index, e.target.value)}
                        required={index === 0}
                        disabled={isEditing && index === 0}
                      />
                      <div className="input-group-text">
                        <input
                          type="radio"
                          name="primaryPhone"
                          checked={phone.is_primary}
                          onChange={() => setPrimaryNumber(index)}
                          className="form-check-input mt-0"
                        />
                        <small className="ms-1">Primary</small>
                      </div>
                      {formData.phone_numbers.length > 1 && (
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
                      key={worker.id} 
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <div>{worker.name}</div>
                        <small className="text-muted">
                          {worker.phone_numbers.map(phone => 
                            `${phone.number}${phone.is_primary ? ' (Primary)' : ''}`
                          ).join(', ')}
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
                          onClick={() => handleDelete(worker.id)}
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