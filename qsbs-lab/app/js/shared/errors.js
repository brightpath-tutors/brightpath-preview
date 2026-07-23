// js/shared/errors.js — P2: Error handling policy
// Rules: never throw from engines. Catch all exceptions and return them.

export function safeNumber(val, fallback, warnings) {
  if (fallback === undefined) fallback = 0;
  if (warnings === undefined) warnings = [];
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) {
    warnings.push('Non-finite value ' + val + ' replaced with ' + fallback);
    return fallback;
  }
  return n;
}

export function requireField(obj, field, missing) {
  if (missing === undefined) missing = [];
  if (obj == null || obj[field] == null || obj[field] === '') {
    missing.push(field);
    return false;
  }
  return true;
}

export function safeRun(fn, errorList) {
  if (errorList === undefined) errorList = [];
  try {
    return fn();
  } catch (e) {
    errorList.push(e.message || String(e));
    return null;
  }
}
