import { useState } from 'react';
import { downloadBulkUploadTemplate, uploadBulkFile, type BulkUploadReport } from '../api/individual';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export default function BulkUploadDialog({ open, onClose, onUploaded }: BulkUploadDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<BulkUploadReport | null>(null);

  function reset() {
    setBusy(false);
    setError('');
    setReport(null);
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function handleFileChosen(file: File) {
    setBusy(true);
    setError('');
    try {
      const result = await uploadBulkFile(file);
      setReport(result);
      if (result.created_count > 0) onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <h2>Bulk upload registrations</h2>

        {!report && (
          <>
            <p className="bulk-intro">
              Download the template, fill it in (one row per person — <code>full_name</code> and{' '}
              <code>category_code</code> are required, the rest is optional), then upload it here.
              Rows default to CONFIRMED; set a <code>status</code> column to override.
            </p>
            <div className="bulk-start-actions">
              <button
                className="btn"
                onClick={async () => {
                  const blob = await downloadBulkUploadTemplate();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'individual-bulk-upload-template.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
              >
                ↓ Download Excel template
              </button>
            </div>

            <label className="bulk-dropzone" style={{ display: 'block', cursor: 'pointer' }}>
              {busy ? (
                'Uploading…'
              ) : (
                <>
                  <strong style={{ color: 'var(--text)' }}>Click to choose a file</strong>
                  <div>CSV or XLSX, using the template's columns</div>
                </>
              )}
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChosen(file);
                  e.target.value = '';
                }}
              />
            </label>
            {error && <div className="banner banner-error" style={{ marginTop: 14 }}>{error}</div>}

            <div className="modal-actions">
              <button className="btn" onClick={handleClose}>
                Close
              </button>
            </div>
          </>
        )}

        {report && (
          <>
            <div className="banner banner-success">
              Created {report.created_count} registration{report.created_count === 1 ? '' : 's'}.
            </div>
            {report.error_count > 0 && (
              <>
                <p className="bulk-intro">{report.error_count} row(s) failed:</p>
                <div className="bulk-report-list">
                  {report.errors.map((e, i) => (
                    <div className="bulk-report-row error" key={i}>
                      Row {e.row}: {e.error}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="modal-actions">
              <button className="btn btn-success" onClick={handleClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
