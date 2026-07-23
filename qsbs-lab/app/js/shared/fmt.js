// js/shared/fmt.js — formatting utilities

export const fmt = {
  currency(n, decimals) {
    if (decimals === undefined) decimals = 0;
    if (n == null || isNaN(n)) return '$—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(n);
  },
  pct(n, decimals) {
    if (decimals === undefined) decimals = 1;
    if (n == null || isNaN(n)) return '—%';
    return (n * 100).toFixed(decimals) + '%';
  },
  number(n, decimals) {
    if (decimals === undefined) decimals = 0;
    if (n == null || isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(n);
  },
  date(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return iso; }
  },
  years(n) {
    if (n == null || isNaN(n)) return '—';
    return n === 1 ? '1 year' : n.toFixed(1) + ' years';
  },
  millions(n) {
    if (n == null || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    return fmt.currency(n);
  },
  shortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch (e) { return iso; }
  }
};

export default fmt;
