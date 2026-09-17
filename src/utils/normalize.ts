/**
 * Normalizes vehicle registration numbers to prevent duplicates caused by
 * spacing or hyphen differences.
 * e.g., 'DL 01 AB 1234', 'DL-01-AB-1234', and 'DL01AB1234' all resolve to 'DL01AB1234'
 */
export function normalizeRegNo(regNo: string): string {
  if (!regNo) return '';
  return regNo
    .toUpperCase()
    .replace(/[\s\-_.]+/g, '')
    .trim();
}

/**
 * Pretty-prints an Indian registration number if it matches standard patterns
 */
export function formatRegNoDisplay(regNo: string): string {
  const norm = normalizeRegNo(regNo);
  // Match standard 2 letter state + 2 digits + 1-3 letters + 1-4 digits
  const standardMatch = norm.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (standardMatch) {
    return `${standardMatch[1]} ${standardMatch[2]} ${standardMatch[3]} ${standardMatch[4]}`;
  }
  return norm;
}

export const formatRegNo = formatRegNoDisplay;

/**
 * Format currency in Indian numbering format (e.g. ₹15,41,817)
 */
export function formatINR(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '₹0';
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
  return formatter.format(value);
}

/**
 * Format kilometers with commas in Indian format
 */
export function formatKM(value: number, decimals: number = 1): string {
  if (isNaN(value) || value === null || value === undefined) return '0.0';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
