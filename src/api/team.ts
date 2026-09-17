import { apiFetch, apiFetchBlob } from './client';
import type { CategoryOption, DashboardStats, Paginated } from './individual';

export interface RosterRunner {
  id: string;
  full_name: string;
  gender: string;
}

export interface AdminTeamRegistration {
  id: string;
  registration_number: string | null;
  status: string;
  amount: string;
  currency: string;
  team_name: string;
  company_or_institution: string;
  relay_category: string;
  captain_first_name: string;
  captain_last_name: string;
  captain_email: string;
  captain_phone: string;
  free_runner_limit: number;
  roster: RosterRunner[];
  category: string;
  category_name: string;
  registered_at: string;
  updated_at: string;
}

export interface TeamFilterOptions {
  categories: CategoryOption[];
  relay_categories: string[];
}

export const RELAY_CATEGORY_OPTIONS = [
  { value: 'mens-team', label: "Men's Team" },
  { value: 'womens-team', label: "Women's Team" },
  { value: 'mixed-team', label: 'Mixed Team' },
];

export async function getTeamDashboard(): Promise<DashboardStats> {
  return apiFetch(`/api/v1/registrations/admin/team/dashboard/`);
}

export async function listTeamRegistrations(params: {
  search?: string;
  status?: string;
  category?: string;
  relay_category?: string;
  ordering?: string;
  page?: number;
}): Promise<Paginated<AdminTeamRegistration>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.relay_category) qs.set('relay_category', params.relay_category);
  if (params.ordering) qs.set('ordering', params.ordering);
  if (params.page) qs.set('page', String(params.page));

  return apiFetch(`/api/v1/registrations/admin/team/registrations/?${qs.toString()}`);
}

export async function getTeamFilterOptions(): Promise<TeamFilterOptions> {
  return apiFetch(`/api/v1/registrations/admin/team/filters/`);
}

export async function createTeamManually(payload: {
  team_name: string;
  company_or_institution: string;
  relay_category: string;
  captain_first_name: string;
  captain_last_name: string;
  captain_email: string;
  captain_phone: string;
  roster?: { fullName: string; gender?: string }[];
  status?: string;
  payment_method?: string;
}) {
  return apiFetch<AdminTeamRegistration>(`/api/v1/registrations/admin/team/registrations/create/`, {
    method: 'POST',
    body: payload,
  });
}

export async function updateTeamDetails(
  id: string,
  payload: {
    team_name?: string;
    company_or_institution?: string;
    relay_category?: string;
    captain_first_name?: string;
    captain_last_name?: string;
    captain_phone?: string;
    status?: string;
  }
): Promise<AdminTeamRegistration> {
  return apiFetch<AdminTeamRegistration>(`/api/v1/registrations/admin/team/registrations/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteTeamRegistration(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/registrations/admin/team/registrations/${id}/`, { method: 'DELETE' });
}

export async function downloadTeamExport(): Promise<Blob> {
  return apiFetchBlob(`/api/v1/registrations/admin/team/registrations/export/`);
}
