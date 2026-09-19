import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from '../components/HeaderNav';
import BulkUploadDialog from '../components/BulkUploadDialog';
import WithdrawalDialog from '../components/WithdrawalDialog';
import { titleCase, formatTime, formatMoney, registrationStatusLabel } from '../utils/format';
import {
  createRegistrationManually,
  deleteRegistration,
  downloadExport,
  getDashboard,
  getFilterOptions,
  listRegistrations,
  updateRegistrationDetails,
  STATUS_OPTIONS,
  type AdminIndividualRegistration,
  type DashboardStats,
  type FilterOptions,
} from '../api/individual';
import {
  GENDER_OPTIONS,
  AGE_RANGE_OPTIONS,
  TSHIRT_SIZE_OPTIONS,
  DIVISION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '../utils/formOptions';

const PAGE_SIZE = 25;
const REFRESH_INTERVAL_MS = 30000;

export default function Registrations() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [rows, setRows] = useState<AdminIndividualRegistration[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    category_id: '',
    gender: '',
    age_range: '',
    country: '',
    t_shirt_size: '',
    division: '',
    town_or_city: '',
    club_or_institution: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    status: 'CONFIRMED',
    payment_method: 'CASH',
  });
  const [exportBusy, setExportBusy] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminIndividualRegistration | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    gender: '',
    age_range: '',
    country: '',
    t_shirt_size: '',
    division: '',
    town_or_city: '',
    club_or_institution: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    status: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminIndividualRegistration | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      listRegistrations({
        search,
        status: statusFilter,
        category: categoryFilter,
        gender: genderFilter,
        organisation: orgFilter,
        ordering: '-registered_at',
        page,
      })
        .then((data) => {
          setRows(data.results);
          setCount(data.count);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load registrations.'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter, categoryFilter, genderFilter, orgFilter, page]
  );

  function loadStats() {
    getDashboard()
      .then(setStats)
      .catch(() => {});
  }

  useEffect(load, [load]);
  useEffect(loadStats, []);

  useEffect(() => {
    getFilterOptions()
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

  const selectedAddCategory = filterOptions?.categories.find((c) => c.id === addForm.category_id);
  const showDivision = selectedAddCategory?.code === '10km-individual';

  function resetAddForm() {
    setAddForm({
      full_name: '',
      email: '',
      phone: '',
      category_id: '',
      gender: '',
      age_range: '',
      country: '',
      t_shirt_size: '',
      division: '',
      town_or_city: '',
      club_or_institution: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_notes: '',
      status: 'CONFIRMED',
      payment_method: 'CASH',
    });
  }

  async function handleAddPerson() {
    setAddBusy(true);
    setError('');
    try {
      await createRegistrationManually({
        category_id: addForm.category_id,
        full_name: addForm.full_name,
        email: addForm.email,
        phone: addForm.phone,
        gender: addForm.gender,
        age_range: addForm.age_range,
        country: addForm.country,
        t_shirt_size: addForm.t_shirt_size,
        division: addForm.division,
        town_or_city: addForm.town_or_city,
        club_or_institution: addForm.club_or_institution,
        emergency_contact_name: addForm.emergency_contact_name,
        emergency_contact_phone: addForm.emergency_contact_phone,
        medical_notes: addForm.medical_notes,
        status: addForm.status,
        payment_method: addForm.payment_method,
      });
      setNotice('Person registered.');
      setAddOpen(false);
      resetAddForm();
      load();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register person.');
    } finally {
      setAddBusy(false);
    }
  }

  function openEditDialog(row: AdminIndividualRegistration) {
    setEditTarget(row);
    setEditError('');
    setEditForm({
      full_name: row.participant.full_name,
      phone: row.participant.phone,
      gender: row.participant.gender || '',
      age_range: row.participant.age_range || '',
      country: row.participant.country || '',
      t_shirt_size: row.t_shirt_size || '',
      division: row.division || '',
      town_or_city: row.town_or_city || '',
      club_or_institution: row.club_or_institution || '',
      emergency_contact_name: row.emergency_contact_name || '',
      emergency_contact_phone: row.emergency_contact_phone || '',
      medical_notes: row.medical_notes || '',
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
      await updateRegistrationDetails(editTarget.id, editForm);
      setEditTarget(null);
      setNotice('Registration updated.');
      load();
      loadStats();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update registration.');
    } finally {
      setEditBusy(false);
    }
  }

  function openDeleteDialog(row: AdminIndividualRegistration) {
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
      await deleteRegistration(deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Registration deleted.');
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
      const blob = await downloadExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kopala-icr-individual-registrations.xlsx';
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
            <h1>Registrations</h1>
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
            + Add Person
          </button>
          <button className="btn" onClick={() => setBulkUploadOpen(true)}>
            ⇧ Bulk upload
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
              <p className="stat-sub">registrations</p>
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
              {/* <button className="btn" style={{ marginTop: 8 }} onClick={() => setWithdrawOpen(true)}>
                ↓ Withdraw
              </button> */}
            </div>
          </div>
        </>
      )}

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search name, email, phone, reference…"
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
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All races</option>
          {filterOptions?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All genders</option>
          {filterOptions?.genders.map((g) => (
            <option key={g} value={g}>
              {titleCase(g)}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={orgFilter}
          onChange={(e) => {
            setOrgFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All clubs / institutions</option>
          {filterOptions?.organisations.map((o) => (
            <option key={o} value={o}>
              {o}
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
                <th>Name</th>
                <th>Race</th>
                <th>Division</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Club / Institution</th>
                <th>Shirt</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="dim">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{r.registration_number || '—'}</td>
                  <td className="name">{r.participant.full_name}</td>
                  <td>{r.category_name}</td>
                  <td className={r.division ? '' : 'dim'}>{titleCase(r.division) || '—'}</td>
                  <td className={r.participant.gender ? '' : 'dim'}>{titleCase(r.participant.gender) || '—'}</td>
                  <td className={r.participant.age_range ? '' : 'dim'}>{r.participant.age_range || '—'}</td>
                  <td className={r.participant.phone ? '' : 'dim'}>{r.participant.phone || '—'}</td>
                  <td className={r.participant.email ? '' : 'dim'}>{r.participant.email || '—'}</td>
                  <td className={r.club_or_institution ? '' : 'dim'}>{r.club_or_institution || '—'}</td>
                  <td className={r.t_shirt_size ? '' : 'dim'}>{r.t_shirt_size || '—'}</td>
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
          {!loading && rows.length === 0 && <div className="empty-state">No registrations match these filters.</div>}
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
            <h2>Add person</h2>
            <div className="field">
              <label>Full name</label>
              <input value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Race</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.category_id}
                onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value, division: '' })}
              >
                <option value="">Select a race…</option>
                {filterOptions?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {showDivision && (
              <div className="field">
                <label>Division</label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={addForm.division}
                  onChange={(e) => setAddForm({ ...addForm, division: e.target.value })}
                >
                  <option value="">Select…</option>
                  {DIVISION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              <label>Gender</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.gender}
                onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {titleCase(g)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Age range</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.age_range}
                onChange={(e) => setAddForm({ ...addForm, age_range: e.target.value })}
              >
                <option value="">Select…</option>
                {AGE_RANGE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Country</label>
              <input
                value={addForm.country}
                placeholder="Zambia"
                onChange={(e) => setAddForm({ ...addForm, country: e.target.value })}
              />
            </div>
            <div className="field">
              <label>T-shirt size</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.t_shirt_size}
                onChange={(e) => setAddForm({ ...addForm, t_shirt_size: e.target.value })}
              >
                <option value="">Select…</option>
                {TSHIRT_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Town / City</label>
              <input
                value={addForm.town_or_city}
                onChange={(e) => setAddForm({ ...addForm, town_or_city: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Club / institution</label>
              <input
                value={addForm.club_or_institution}
                onChange={(e) => setAddForm({ ...addForm, club_or_institution: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact name</label>
              <input
                value={addForm.emergency_contact_name}
                onChange={(e) => setAddForm({ ...addForm, emergency_contact_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact phone</label>
              <input
                value={addForm.emergency_contact_phone}
                onChange={(e) => setAddForm({ ...addForm, emergency_contact_phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Medical notes</label>
              <textarea
                rows={3}
                value={addForm.medical_notes}
                onChange={(e) => setAddForm({ ...addForm, medical_notes: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleAddPerson}
                disabled={addBusy || !addForm.full_name || !addForm.category_id}
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
            <h2>Edit registration — {editTarget.registration_number || 'unconfirmed'}</h2>
            <div className="field">
              <label>Email</label>
              <input value={editTarget.participant.email || '—'} disabled />
              <p className="field-note">Email can't be changed after registration.</p>
            </div>
            <div className="field">
              <label>Full name</label>
              <input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
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
              <label>Gender</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {titleCase(g)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Age range</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.age_range}
                onChange={(e) => setEditForm({ ...editForm, age_range: e.target.value })}
              >
                <option value="">Select…</option>
                {AGE_RANGE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Country</label>
              <input
                value={editForm.country}
                placeholder="Zambia"
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
              />
            </div>
            <div className="field">
              <label>T-shirt size</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.t_shirt_size}
                onChange={(e) => setEditForm({ ...editForm, t_shirt_size: e.target.value })}
              >
                <option value="">Select…</option>
                {TSHIRT_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Division</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.division}
                onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
              >
                <option value="">—</option>
                {DIVISION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Town / City</label>
              <input
                value={editForm.town_or_city}
                onChange={(e) => setEditForm({ ...editForm, town_or_city: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Club / institution</label>
              <input
                value={editForm.club_or_institution}
                onChange={(e) => setEditForm({ ...editForm, club_or_institution: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact name</label>
              <input
                value={editForm.emergency_contact_name}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact phone</label>
              <input
                value={editForm.emergency_contact_phone}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Medical notes</label>
              <textarea
                rows={3}
                value={editForm.medical_notes}
                onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
              />
            </div>
            {editError && <div className="banner banner-error">{editError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeEditDialog} disabled={editBusy}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleSaveEdit}
                disabled={editBusy || !editForm.full_name.trim()}
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
            <h2 className="modal-title-danger">⚠ Delete registration?</h2>
            <p className="bulk-intro">
              Are you sure you want to delete{' '}
              <strong style={{ color: 'var(--text)' }}>
                {deleteTarget.registration_number || deleteTarget.participant.full_name}
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

      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={() => {
          load();
          loadStats();
        }}
      />

      {stats && (
        <WithdrawalDialog
          open={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          entryType="INDIVIDUAL"
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
