import { apiFetch, apiFetchBlob } from './client';

export interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age_range: string;
  country: string;
}

export interface AdminIndividualRegistration {
  id: string;
  registration_number: string | null;
  status: string;
  amount: string;
  currency: string;
  participant: Participant;
  category: string;
  category_name: string;
  category_code: string;
  t_shirt_size: string;
  division: string;
  town_or_city: string;
  club_or_institution: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_notes: string;
  registered_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CategoryOption {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
}

export interface FilterOptions {
  categories: CategoryOption[];
  genders: string[];
  organisations: string[];
}

// Matches apps.common.models.BaseRegistration.Status — no DRAFT/RESERVED
// here, unlike the Copperbelt/Kabwe reference apps this one was modelled
// after (see kopalaicr-api's README).
export const STATUS_OPTIONS = [
  'PENDING_PAYMENT',
  'PAYMENT_PROCESSING',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
];

export interface DashboardStats {
  total_registrations: number;
  today_count: number;
  by_status: { status: string; count: number }[];
  revenue_confirmed: string;
  revenue_pending: string;
  revenue_today: string;
  total_income: string;
  cash_withdrawn: string;
  cash_available: string;
}

export async function getDashboard(): Promise<DashboardStats> {
  return apiFetch(`/api/v1/registrations/admin/individual/dashboard/`);
}

export async function listRegistrations(params: {
  search?: string;
  status?: string;
  category?: string;
  gender?: string;
  organisation?: string;
  ordering?: string;
  page?: number;
}): Promise<Paginated<AdminIndividualRegistration>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.gender) qs.set('gender', params.gender);
  if (params.organisation) qs.set('organisation', params.organisation);
  if (params.ordering) qs.set('ordering', params.ordering);
  if (params.page) qs.set('page', String(params.page));

  return apiFetch(`/api/v1/registrations/admin/individual/registrations/?${qs.toString()}`);
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiFetch(`/api/v1/registrations/admin/individual/filters/`);
}

export async function createRegistrationManually(payload: {
  category_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  age_range?: string;
  country?: string;
  t_shirt_size?: string;
  division?: string;
  town_or_city?: string;
  club_or_institution?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  status?: string;
  payment_method?: string;
}) {
  return apiFetch<AdminIndividualRegistration>(`/api/v1/registrations/admin/individual/registrations/create/`, {
    method: 'POST',
    body: payload,
  });
}

export async function updateRegistrationDetails(
  id: string,
  payload: {
    full_name?: string;
    phone?: string;
    gender?: string;
    age_range?: string;
    country?: string;
    t_shirt_size?: string;
    division?: string;
    town_or_city?: string;
    club_or_institution?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    medical_notes?: string;
    status?: string;
  }
): Promise<AdminIndividualRegistration> {
  return apiFetch<AdminIndividualRegistration>(`/api/v1/registrations/admin/individual/registrations/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteRegistration(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/registrations/admin/individual/registrations/${id}/`, { method: 'DELETE' });
}

// The export endpoint requires the same Bearer auth as everything else, so
// it can't just be an <a href> like a public download link.
export async function downloadExport(): Promise<Blob> {
  return apiFetchBlob(`/api/v1/registrations/admin/individual/registrations/export/`);
}

// --- Bulk upload -----------------------------------------------------

export interface BulkUploadReport {
  created_count: number;
  created_references: string[];
  error_count: number;
  errors: { row: number; error: string }[];
}

export async function downloadBulkUploadTemplate(): Promise<Blob> {
  return apiFetchBlob(`/api/v1/registrations/admin/individual/registrations/bulk-upload/template/`);
}

export async function uploadBulkFile(file: File): Promise<BulkUploadReport> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<BulkUploadReport>(`/api/v1/registrations/admin/individual/registrations/bulk-upload/`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}
