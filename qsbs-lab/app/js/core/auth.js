// js/core/auth.js — Supabase auth wrapper (optional cloud sync)
import state from './state.js';

let _supabase = null;
let _user = null;

export const auth = {
  init(supabaseClient) {
    _supabase = supabaseClient;
    if (_supabase) {
      _supabase.auth.onAuthStateChange(function(event, session) {
        _user = session ? session.user : null;
        state.emit('auth:changed', { user: _user, event: event });
      });
    }
  },
  user() { return _user; },
  isLoggedIn() { return !!_user; },
  login(email) {
    if (!_supabase) return Promise.resolve({ error: 'Supabase not configured' });
    return _supabase.auth.signInWithOtp({ email: email });
  },
  logout() {
    if (!_supabase) return Promise.resolve();
    return _supabase.auth.signOut();
  }
};

export default auth;
