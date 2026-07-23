// js/core/router.js — hash-based router
import state from './state.js';

const routes = {};
let _current = null;

export const router = {
  on(path, handler) {
    routes[path] = handler;
  },
  navigate(hash) {
    window.location.hash = hash;
  },
  current() { return _current; },
  start() {
    function handle() {
      const raw = window.location.hash.replace('#', '') || '/';
      const parts = raw.split('/').filter(Boolean);
      const route = '/' + (parts[0] || '');
      _current = { path: route, params: parts.slice(1), hash: raw, full: raw };
      if (routes[route]) {
        routes[route](_current);
      } else if (routes['*']) {
        routes['*'](_current);
      }
      state.emit('route:changed', _current);
    }
    window.addEventListener('hashchange', handle);
    handle();
  }
};

export default router;
