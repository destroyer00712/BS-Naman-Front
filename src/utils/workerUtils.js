/**
 * Utility functions for handling worker data with the new API structure
 */

/**
 * Get the primary phone number from a worker's phones array
 * @param {Array} phones - Array of phone objects with phone_number and is_primary fields
 * @returns {string} Primary phone number or first phone number if no primary is set
 */
export const getPrimaryPhone = (phones) => {
  if (!phones || phones.length === 0) return '';
  
  const primaryPhone = phones.find(phone => phone.is_primary);
  return primaryPhone ? primaryPhone.phone_number : phones[0].phone_number;
};

/**
 * Get all phone numbers from a worker's phones array
 * @param {Array} phones - Array of phone objects
 * @returns {Array} Array of phone number strings
 */
export const getAllPhoneNumbers = (phones) => {
  if (!phones || phones.length === 0) return [];
  return phones.map(phone => phone.phone_number);
};

/**
 * Format worker display name with primary phone and count of additional phones
 * @param {Object} worker - Worker object with name and phones array
 * @returns {string} Formatted display name
 */
export const getWorkerDisplayName = (worker) => {
  if (!worker || !worker.phones || worker.phones.length === 0) {
    return worker?.name || 'Unknown Worker';
  }
  
  const primaryPhone = getPrimaryPhone(worker.phones);
  const phoneCount = worker.phones.length;
  const additionalCount = phoneCount - 1;
  
  return `${worker.name} (${primaryPhone}${additionalCount > 0 ? ` +${additionalCount} more` : ''})`;
};

/**
 * Format phone display string showing primary phone and other phones
 * @param {Array} phones - Array of phone objects
 * @returns {string} Formatted phone display string
 */
export const formatPhoneDisplay = (phones) => {
  if (!phones || phones.length === 0) return 'No phones';
  
  const primaryPhone = phones.find(phone => phone.is_primary);
  const otherPhones = phones.filter(phone => !phone.is_primary);
  
  let display = primaryPhone ? `${primaryPhone.phone_number} (Primary)` : '';
  if (otherPhones.length > 0) {
    const otherPhonesList = otherPhones.map(p => p.phone_number).join(', ');
    display += primaryPhone ? `, ${otherPhonesList}` : otherPhonesList;
  }
  
  return display;
};

/**
 * Check if a worker has a specific phone number
 * @param {Object} worker - Worker object with phones array
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} True if worker has the phone number
 */
export const workerHasPhone = (worker, phoneNumber) => {
  if (!worker || !worker.phones || !phoneNumber) return false;
  return worker.phones.some(phone => phone.phone_number === phoneNumber);
};

/**
 * Get worker by phone number from workers array
 * @param {Array} workers - Array of worker objects
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Object|null} Worker object if found, null otherwise
 */
export const getWorkerByPhone = (workers, phoneNumber) => {
  if (!workers || !phoneNumber) return null;
  return workers.find(worker => workerHasPhone(worker, phoneNumber)) || null;
};

/**
 * Validate phone structure for API requests
 * @param {Array} phones - Array of phone objects to validate
 * @returns {Object} { isValid: boolean, errors: Array, validPhones: Array }
 */
export const validatePhones = (phones) => {
  const errors = [];
  const validPhones = [];
  
  if (!phones || phones.length === 0) {
    errors.push('At least one phone number is required');
    return { isValid: false, errors, validPhones };
  }
  
  let hasPrimary = false;
  let validCount = 0;
  
  phones.forEach((phone, index) => {
    if (!phone.phone_number || phone.phone_number.trim() === '') {
      errors.push(`Phone number at position ${index + 1} is empty`);
      return;
    }
    
    // Basic phone number validation (adjust regex as needed)
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone.phone_number.trim())) {
      errors.push(`Invalid phone number format: ${phone.phone_number}`);
      return;
    }
    
    if (phone.is_primary) {
      if (hasPrimary) {
        errors.push('Only one phone number can be marked as primary');
        return;
      }
      hasPrimary = true;
    }
    
    validPhones.push({
      phone_number: phone.phone_number.trim(),
      is_primary: Boolean(phone.is_primary)
    });
    validCount++;
  });
  
  // If no primary is set, make the first valid phone primary
  if (validPhones.length > 0 && !hasPrimary) {
    validPhones[0].is_primary = true;
  }
  
  return {
    isValid: errors.length === 0 && validCount > 0,
    errors,
    validPhones
  };
}; 