/**
 * Shared Thai date display helpers.
 *
 * Every admin list page had its own inline `formatDate()`, and they'd drifted
 * inconsistent - some spelled out the month name ("16 สิงหาคม 2569"), others
 * just showed digits ("16/8/2569"). Both already correctly use the Buddhist
 * year (`toLocaleDateString('th-TH')` defaults to it), but only the
 * month-name style actually reads as "เดือน ปีไทย/พ.ศ." Centralizing here so
 * every page shows the same format, and so this only needs to change in one
 * place if the display format ever needs to change again.
 *
 * IMPORTANT: this is a DISPLAY-ONLY concern. Every date value sent back to
 * the API (via <input type="date">, request payloads, etc.) must stay the
 * plain Gregorian ISO string ("YYYY-MM-DD") the backend expects - never feed
 * a formatThaiDate() result back into a form field or API call.
 */

/** "16 สิงหาคม 2569" - day, full Thai month name, Buddhist year. */
export function formatThaiDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "16 ส.ค. 2569" - abbreviated month, for tight table columns. */
export function formatThaiDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "16 สิงหาคม 2569 14:30" - full date plus time, for timestamps. */
export function formatThaiDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
