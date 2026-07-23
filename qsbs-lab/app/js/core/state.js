// js/core/state.js — pub/sub event bus

const handlers = {};

export const state = {
  on(event, handler) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(handler);
    return function off() { state.off(event, handler); };
  },
  off(event, handler) {
    if (handlers[event]) {
      handlers[event] = handlers[event].filter(function(h) { return h !== handler; });
    }
  },
  emit(event, data) {
    (handlers[event] || []).forEach(function(h) {
      try { h(data); } catch (e) { console.error('State handler error', event, e); }
    });
  },
  clear(event) {
    if (event) delete handlers[event];
    else Object.keys(handlers).forEach(function(k) { delete handlers[k]; });
  }
};

export default state;
