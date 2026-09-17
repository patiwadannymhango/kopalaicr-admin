import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from '../components/HeaderNav';
import WithdrawalDialog from '../components/WithdrawalDialog';
import { titleCase, formatTime, formatMoney, registrationStatusLabel } from '../utils/format';
import { STATUS_OPTIONS, type DashboardStats } from '../api/individual';
import {
  createTeamManually,
  deleteTeamRegistration,
  downloadTeamExport,
  getTeamDashboard,
  getTeamFilterOptions,
  listTeamRegistrations,
  updateTeamDetails,
  RELAY_CATEGORY_OPTIONS,
  type AdminTeamRegistration,
  type TeamFilterOptions,
} from '../api/team';
import { GENDER_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../utils/formOptions';

const PAGE_SIZE = 25;
const REFRESH_INTERVAL_MS = 30000;
const MAX_ROSTER = 8; // matches TEAM_FREE_RUNNER_LIMIT in kopalaicr-api

type RosterDraftEntry = { fullName: string; gender: string };

export default function Teams() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<TeamFilterOptions | null>(null);

  const [rows, setRows] = useState<AdminTeamRegistration[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [relayFilter, setRelayFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    team_name: '',
    company_or_institution: '',
    relay_category: '',
    captain_first_name: '',
    captain_last_name: '',
    captain_email: '',
    captain_phone: '',
    status: 'CONFIRMED',
    payment_method: 'CASH',
  });
  const [roster, setRoster] = useState<RosterDraftEntry[]>([]);

  const [editTarget, setEditTarget] = useState<AdminTeamRegistration | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    team_name: '',
    company_or_institution: '',
    relay_category: '',
    captain_first_name: '',
    captain_last_name: '',
    captain_phone: '',
    status: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminTeamRegistration | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      listTeamRegistrations({
        search,
        status: statusFilter,
        relay_category: relayFilter,
        ordering: '-registered_at',
        page,
      })
        .then((data) => {
          setRows(data.results);
          setCount(data.count);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load team registrations.'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter, relayFilter, page]
  );

  function loadStats() {
    getTeamDashboard()
      .then(setStats)
      .catch(() => {});
  }

  useEffect(load, [load]);
  useEffect(loadStats, []);

  useEffect(() => {
    getTeamFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const poll = setInterval(() => {
      load(true);
      loadStats();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [load]);

  function handleRefresh() {
    load();
    loadStats();
  }

  function statusCount(status: string) {
    return stats?.by_status.find((s) => s.status === status)?.count ?? 0;
  }

  const pendingCount = statusCount('PENDING_PAYMENT') + statusCount('PAYMENT_PROCESSING');

  function resetAddForm() {
    setAddForm({
      team_name: '',
      company_or_institution: '',
      relay_category: '',
      captain_first_name: '',
      captain_last_name: '',
      captain_email: '',
      captain_phone: '',
      status: 'CONFIRMED',
      payment_method: 'CASH',
    });
    setRoster([]);
  }

  function addRosterRow() {
    if (roster.length >= MAX_ROSTER) return;
    setRoster([...roster, { fullName: '', gender: '' }]);
  }

  function updateRosterRow(index: number, patch: Partial<RosterDraftEntry>) {
    setRoster(roster.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRosterRow(index: number) {
    setRoster(roster.filter((_, i) => i !== index));
  }

  async function handleAddTeam() {
    setAddBusy(true);
    setError('');
    try {
      await createTeamManually({
        team_name: addForm.team_name,
        company_or_institution: addForm.company_or_institution,
        relay_category: addForm.relay_category,
        captain_first_name: addForm.captain_first_name,
        captain_last_name: addForm.captain_last_name,
        captain_email: addForm.captain_email,
        captain_phone: addForm.captain_phone,
        roster: roster
          .filter((r) => r.fullName.trim())
          .map((r) => ({ fullName: r.fullName, gender: r.gender || undefined })),
        status: addForm.status,
        payment_method: addForm.payment_method,
      });
      setNotice('Team registered.');
      setAddOpen(false);
      resetAddForm();
      load();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register team.');
    } finally {
      setAddBusy(false);
    }
  }

  function openEditDialog(row: AdminTeamRegistration) {
    setEditTarget(row);
    setEditError('');
    setEditForm({
      team_name: row.team_name,
      company_or_institution: row.company_or_institution,
      relay_category: row.relay_category,
      captain_first_name: row.captain_first_name,
      captain_last_name: row.captain_last_name,
      captain_phone: row.captain_phone,
      status: row.status,
    });
  }

  function closeEditDialog() {
    if (editBusy) return;
    setEditTarget(null);
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setEditBusy(true);
    setEditError('');
    try {
      await updateTeamDetails(editTarget.id, editForm);
      setEditTarget(null);
      setNotice('Team updated.');
      load();
      loadStats();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update team.');
    } finally {
      setEditBusy(false);
    }
  }

  function openDeleteDialog(row: AdminTeamRegistration) {
    setDeleteTarget(row);
    setDeleteError('');
  }

  function closeDeleteDialog() {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteError('');
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteTeamRegistration(deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Team registration deleted.');
      load();
      loadStats();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleExport() {
    setExportBusy(true);
    setError('');
    try {
      const blob = await downloadTeamExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kopala-icr-team-registrations.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="page">
      <div className="header">
        <div className="header-left">
          <div className="header-title">
            <p className="eyebrow">KOPALA ICR 2026</p>
            <h1>Teams</h1>
          </div>
          <HeaderNav />
        </div>
        <div className="header-right">
          <span className="live-indicator">
            <span className="live-dot" />
            Live · {formatTime(now)}
          </span>
          <button className="btn" onClick={handleRefresh}>
            ↻ Refresh
          </button>
          <button className="btn btn-success" onClick={() => setAddOpen(true)}>
            + Add Team
          </button>
          <button className="btn btn-amber" onClick={handleExport} disabled={exportBusy}>
            {exportBusy ? 'Exporting…' : '↓ Export Excel'}
          </button>
          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      {stats && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <p className="stat-label">TOTAL</p>
              <p className="stat-value">{stats.total_registrations}</p>
              <p className="stat-sub">teams</p>
            </div>
            <div className="stat-card paid">
              <p className="stat-label">PAID</p>
              <p className="stat-value">{statusCount('CONFIRMED')}</p>
              <p className="stat-sub">confirmed</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">AWAITING PAYMENT</p>
              <p className="stat-value">{pendingCount}</p>
              <p className="stat-sub">pending / processing</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">TODAY</p>
              <p className="stat-value">{stats.today_count}</p>
              <p className="stat-sub">new today</p>
            </div>
          </div>

          <div className="stats-row stats-row-secondary">
            <div className="stat-card collected">
              <p className="stat-label">REVENUE COLLECTED</p>
              <p className="stat-value">{formatMoney(stats.revenue_confirmed)}</p>
              <p className="stat-sub">actually paid</p>
            </div>
            <div className="stat-card income">
              <p className="stat-label">AMOUNT INCOME</p>
              <p className="stat-value">{formatMoney(stats.total_income)}</p>
              <p className="stat-sub">total potential</p>
            </div>
            <div className="stat-card pending">
              <p className="stat-label">AMOUNT PENDING</p>
              <p className="stat-value">{formatMoney(stats.revenue_pending)}</p>
              <p className="stat-sub">still owed</p>
            </div>
            <div className="stat-card today">
              <p className="stat-label">AMOUNT TODAY</p>
              <p className="stat-value">{formatMoney(stats.revenue_today)}</p>
              <p className="stat-sub">collected today</p>
            </div>
            <div className="stat-card withdrawn">
              <p className="stat-label">CASH WITHDRAWN</p>
              <p className="stat-value">{formatMoney(stats.cash_withdrawn)}</p>
              <p className="stat-sub">taken out</p>
            </div>
            <div className="stat-card available">
              <p className="stat-label">CASH AVAILABLE</p>
              <p className="stat-value">{formatMoney(stats.cash_available)}</p>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => setWithdrawOpen(true)}>
                ↓ Withdraw
              </button>
            </div>
          </div>
        </>
      )}

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search team, company, captain, reference…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={relayFilter}
          onChange={(e) => {
            setRelayFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All relay categories</option>
          {filterOptions?.relay_categories.map((r) => (
            <option key={r} value={r}>
              {titleCase(r)}
            </option>
          ))}
        </select>
        <span className="filters-count">
          {count} of {stats?.total_registrations ?? count}
        </span>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="reg-table">
            <thead>
              <tr>
                <th>•</th>
                <th>Reference</th>
                <th>Team</th>
                <th>Company / Institution</th>
                <th>Category</th>
                <th>Captain</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Roster</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="dim">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{r.registration_number || '—'}</td>
                  <td className="name">{r.team_name}</td>
                  <td>{r.company_or_institution}</td>
                  <td>{titleCase(r.relay_category)}</td>
                  <td>
                    {r.captain_first_name} {r.captain_last_name}
                  </td>
                  <td className={r.captain_phone ? '' : 'dim'}>{r.captain_phone || '—'}</td>
                  <td className={r.captain_email ? '' : 'dim'}>{r.captain_email || '—'}</td>
                  <td>
                    {r.roster.length} / {r.free_runner_limit}
                  </td>
                  <td>{formatMoney(r.amount)}</td>
                  <td>
                    <span className={`status-badge status-${r.status}`}>{registrationStatusLabel(r.status)}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="row-action-btn" title="Edit" onClick={() => openEditDialog(r)}>
                        ✎
                      </button>
                      {registrationStatusLabel(r.status) === 'Unconfirmed' && (
                        <button
                          className="row-action-btn row-action-danger"
                          title="Delete (only available for unconfirmed registrations)"
                          onClick={() => openDeleteDialog(r)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="loading-state">Loading…</div>}
          {!loading && rows.length === 0 && <div className="empty-state">No team registrations match these filters.</div>}
        </div>

        <div className="table-footer">
          <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ‹
          </button>
          <span className="filters-count">
            Page {page} of {totalPages}
          </span>
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            ›
          </button>
        </div>
      </div>

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add team</h2>
            <div className="field">
              <label>Team name</label>
              <input value={addForm.team_name} onChange={(e) => setAddForm({ ...addForm, team_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Company / institution</label>
              <input
                value={addForm.company_or_institution}
                onChange={(e) => setAddForm({ ...addForm, company_or_institution: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Relay category</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.relay_category}
                onChange={(e) => setAddForm({ ...addForm, relay_category: e.target.value })}
              >
                <option value="">Select…</option>
                {RELAY_CATEGORY_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Captain first name</label>
              <input
                value={addForm.captain_first_name}
                onChange={(e) => setAddForm({ ...addForm, captain_first_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Captain last name</label>
              <input
                value={addForm.captain_last_name}
                onChange={(e) => setAddForm({ ...addForm, captain_last_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Captain email</label>
              <input
                value={addForm.captain_email}
                onChange={(e) => setAddForm({ ...addForm, captain_email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Captain phone</label>
              <input
                value={addForm.captain_phone}
                onChange={(e) => setAddForm({ ...addForm, captain_phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
            </div>
            {addForm.status === 'CONFIRMED' && (
              <div className="field">
                <label>Paid via</label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={addForm.payment_method}
                  onChange={(e) => setAddForm({ ...addForm, payment_method: e.target.value })}
                >
                  {PAYMENT_METHOD_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>
                Roster ({roster.length}/{MAX_ROSTER})
              </label>
              {roster.map((r, index) => (
                <div key={index} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    placeholder="Runner full name"
                    value={r.fullName}
                    onChange={(e) => updateRosterRow(index, { fullName: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="filter-select"
                    value={r.gender}
                    onChange={(e) => updateRosterRow(index, { gender: e.target.value })}
                  >
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {titleCase(g)}
                      </option>
                    ))}
                  </select>
                  <button className="row-action-btn row-action-danger" onClick={() => removeRosterRow(index)}>
                    ✕
                  </button>
                </div>
              ))}
              {roster.length < MAX_ROSTER && (
                <button className="btn" type="button" onClick={addRosterRow}>
                  + Add runner
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleAddTeam}
                disabled={
                  addBusy ||
                  !addForm.team_name ||
                  !addForm.company_or_institution ||
                  !addForm.relay_category ||
                  !addForm.captain_first_name ||
                  !addForm.captain_last_name ||
                  !addForm.captain_email
                }
              >
                {addBusy ? 'Saving…' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-backdrop" onClick={closeEditDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit team — {editTarget.registration_number || 'unconfirmed'}</h2>
            <div className="field">
              <label>Captain email</label>
              <input value={editTarget.captain_email || '—'} disabled />
              <p className="field-note">Email can't be changed after registration.</p>
            </div>
            <div className="field">
              <label>Team name</label>
              <input
                value={editForm.team_name}
                onChange={(e) => setEditForm({ ...editForm, team_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Company / institution</label>
              <input
                value={editForm.company_or_institution}
                onChange={(e) => setEditForm({ ...editForm, company_or_institution: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Relay category</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.relay_category}
                onChange={(e) => setEditForm({ ...editForm, relay_category: e.target.value })}
              >
                {RELAY_CATEGORY_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Captain first name</label>
              <input
                value={editForm.captain_first_name}
                onChange={(e) => setEditForm({ ...editForm, captain_first_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Captain last name</label>
              <input
                value={editForm.captain_last_name}
                onChange={(e) => setEditForm({ ...editForm, captain_last_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Captain phone</label>
              <input
                value={editForm.captain_phone}
                onChange={(e) => setEditForm({ ...editForm, captain_phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
              {editForm.status === 'CONFIRMED' && editTarget.status !== 'CONFIRMED' && (
                <p className="field-note">Records a CASH payment for the full amount unless one already exists.</p>
              )}
            </div>
            <div className="field">
              <label>Roster ({editTarget.roster.length})</label>
              <div className="roster-list">
                {editTarget.roster.length === 0 && <span>No runners on this roster.</span>}
                {editTarget.roster.map((runner) => (
                  <span className="roster-chip" key={runner.id}>
                    • {runner.full_name} {runner.gender ? `(${titleCase(runner.gender)})` : ''}
                  </span>
                ))}
              </div>
              <p className="field-note">Roster changes are made in Django admin, not here.</p>
            </div>
            {editError && <div className="banner banner-error">{editError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeEditDialog} disabled={editBusy}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleSaveEdit}
                disabled={editBusy || !editForm.team_name.trim()}
              >
                {editBusy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={closeDeleteDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-danger">⚠ Delete team registration?</h2>
            <p className="bulk-intro">
              Are you sure you want to delete{' '}
              <strong style={{ color: 'var(--text)' }}>
                {deleteTarget.registration_number || deleteTarget.team_name}
              </strong>
              ? This cannot be undone.
            </p>
            {deleteError && <div className="banner banner-error">{deleteError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeDeleteDialog} disabled={deleteBusy}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <WithdrawalDialog
          open={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          entryType="TEAM"
          cashAvailable={stats.cash_available}
          onWithdrawn={() => {
            setNotice('Withdrawal recorded.');
            loadStats();
          }}
        />
      )}
    </div>
  );
}
