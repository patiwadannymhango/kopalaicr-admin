// Mirrors apps.registrations.models choices on the backend exactly (see
// kopalaicr-api) — shared between the manual "Add person"/"Add team" forms
// and the bulk-upload feature so every entry path offers/expects the same
// values as the public registration form.
export const GENDER_OPTIONS = ['male', 'female'];
export const AGE_RANGE_OPTIONS = ['Under 18', '18-29', '30-39', '40-49', '50-59', '60+'];
export const TSHIRT_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

// Only meaningful for the 10KM Individual Race category (code
// "10km-individual") — the 5KM Fun Race & Walk has no divisions.
export const DIVISION_OPTIONS: { value: string; label: string }[] = [
  { value: 'mens-open', label: "Men's Open" },
  { value: 'womens-open', label: "Women's Open" },
  { value: 'corporate', label: 'Corporate' },
  { value: 'masters', label: 'Masters' },
];

// Shown on the "Add person"/"Add team" forms only when Status is set to
// CONFIRMED — what the cash/EFT was actually received as, recorded on a
// matching Payment row (see kopalaicr-api's create_admin_cash_payment).
export const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MTN_MONEY', label: 'MTN Money' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'ZAMTEL_KWACHA', label: 'Zamtel Kwacha' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
];
