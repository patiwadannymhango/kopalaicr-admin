export function titleCase(value?: string) {
  if (!value) return '';
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(value.includes('-') ? '-' : ' ');
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatMoney(value: string | number) {
  return `K${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// Collapses the backend's 6 statuses down to the 3 buckets the admin cares
// about at a glance — no RESERVED here (kopalaicr-api has no such status,
// unlike the Copperbelt/Kabwe reference apps this one follows the pattern
// of).
export function registrationStatusLabel(status: string): 'Confirmed' | 'Unconfirmed' | 'Exempted' {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'REFUNDED') return 'Exempted';
  return 'Unconfirmed';
}
