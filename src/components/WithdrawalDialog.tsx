import { useState } from 'react';
import { createWithdrawal, type EntryType } from '../api/withdrawals';

interface WithdrawalDialogProps {
  open: boolean;
  onClose: () => void;
  entryType: EntryType;
  cashAvailable: string;
  onWithdrawn: () => void;
}

export default function WithdrawalDialog({ open, onClose, entryType, cashAvailable, onWithdrawn }: WithdrawalDialogProps) {
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setAmount('');
    setNarration('');
    setError('');
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    setBusy(true);
    setError('');
    try {
      await createWithdrawal({ entry_type: entryType, amount, narration });
      reset();
      onClose();
      onWithdrawn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record withdrawal.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Record cash withdrawal</h2>
        <p className="bulk-intro">
          Cash available right now: <strong style={{ color: 'var(--text)' }}>K{Number(cashAvailable).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
        </p>
        <div className="field">
          <label>Amount (ZMW)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label>Reason / note (optional)</label>
          <textarea rows={3} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </div>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-amber" onClick={handleSubmit} disabled={busy || !amount || Number(amount) <= 0}>
            {busy ? 'Recording…' : 'Record withdrawal'}
          </button>
        </div>
      </div>
    </div>
  );
}
