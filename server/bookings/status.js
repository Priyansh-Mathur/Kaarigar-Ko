// Booking state machine (mirrors src/bookings/booking-status.ts).
const WORKER_TRANSITIONS = {
  ACCEPTED: ['EN_ROUTE'],
  EN_ROUTE: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
};

const TERMINAL_STATUSES = [
  'COMPLETED',
  'SETTLED',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_WORKER',
  'EXPIRED',
];

function canWorkerTransition(from, to) {
  return (WORKER_TRANSITIONS[from] ?? []).includes(to);
}

module.exports = { canWorkerTransition, TERMINAL_STATUSES };
