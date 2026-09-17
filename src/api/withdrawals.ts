import { apiFetch } from './client';

export type EntryType = 'INDIVIDUAL' | 'TEAM';

export interface Withdrawal {
  id: string;
  entry_type: EntryType;
  amount: string;
  currency: string;
  narration: string;
  withdrawn_by_name: string;
  withdrawn_at: string;
}

export async function createWithdrawal(payload: {
  entry_type: EntryType;
  amount: string;
  narration?: string;
}): Promise<Withdrawal> {
  return apiFetch<Withdrawal>(`/api/v1/payments/admin/withdrawals/`, {
    method: 'POST',
    body: payload,
  });
}
