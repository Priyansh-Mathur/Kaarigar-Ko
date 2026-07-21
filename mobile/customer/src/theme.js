export const colors = {
  brand: '#4f46e5',
  brandDark: '#4338ca',
  brandLight: '#eef2ff',
  accent: '#f59e0b',
  bg: '#f1f5f9',
  card: '#ffffff',
  ink: '#0f172a',
  text: '#334155',
  muted: '#94a3b8',
  border: '#e2e8f0',
  green: '#059669',
  greenBg: '#ecfdf5',
  amber: '#b45309',
  amberBg: '#fffbeb',
  rose: '#e11d48',
  roseBg: '#fff1f2',
  blue: '#0284c7',
  blueBg: '#eff6ff',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export function space(n) {
  return n * 4;
}

const TONES = {
  REQUESTED: { bg: colors.amberBg, fg: colors.amber },
  ACCEPTED: { bg: colors.blueBg, fg: colors.blue },
  EN_ROUTE: { bg: colors.blueBg, fg: colors.blue },
  IN_PROGRESS: { bg: colors.brandLight, fg: colors.brand },
  COMPLETED: { bg: colors.greenBg, fg: colors.green },
  SETTLED: { bg: colors.greenBg, fg: colors.green },
  REJECTED: { bg: colors.roseBg, fg: colors.rose },
  CANCELLED_BY_CUSTOMER: { bg: colors.roseBg, fg: colors.rose },
  CANCELLED_BY_WORKER: { bg: colors.roseBg, fg: colors.rose },
  DISPUTED: { bg: colors.roseBg, fg: colors.rose },
  PENDING: { bg: colors.amberBg, fg: colors.amber },
  APPROVED: { bg: colors.greenBg, fg: colors.green },
  ONLINE: { bg: colors.greenBg, fg: colors.green },
  OFFLINE: { bg: '#f1f5f9', fg: colors.muted },
};

export function statusTone(status) {
  return TONES[status] ?? { bg: '#f1f5f9', fg: colors.muted };
}
