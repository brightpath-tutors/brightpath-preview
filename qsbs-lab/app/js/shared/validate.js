// js/shared/validate.js

export const validate = {
  required(val, fieldName, errors) {
    errors = errors || [];
    if (val == null || val === '') { errors.push(fieldName + ' is required'); return false; }
    return true;
  },
  positiveNumber(val, fieldName, errors) {
    errors = errors || [];
    const n = Number(val);
    if (isNaN(n) || n < 0) { errors.push(fieldName + ' must be a non-negative number'); return false; }
    return true;
  },
  isoDate(val, fieldName, errors) {
    errors = errors || [];
    if (!val) return true;
    if (isNaN(new Date(val).getTime())) { errors.push(fieldName + ' must be a valid date'); return false; }
    return true;
  },
  uuid() { return crypto.randomUUID(); }
};

export default validate;
