/* ============================================================
   VOUCH — pure formatting helpers (ported from assets/js/utils.js)
   ------------------------------------------------------------
   The DOM-manipulating helpers from the original utils.js
   (vouchToast, vouchOpenModal/vouchCloseModal, vouchBindModalClosers)
   are NOT ported here — in React those become <Toast/>/useToast()
   and controlled modal components instead. This file keeps only
   the pure, framework-agnostic bits.
============================================================ */

export function formatMoney(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export const STATUS_BADGE_MAP = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Suspended: 'bg-red-50 text-red-600 border-red-200',
  'Pending Verification': 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  flagged: 'bg-red-50 text-red-600 border-red-200',
};

export const STATUS_LABEL_MAP = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  flagged: 'Flagged',
};
