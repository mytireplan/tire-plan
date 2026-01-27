export const formatNumber = (value: number | string | undefined | null) => {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString();
};

export const formatCurrency = (value: number | string | undefined | null, withSymbol = true) => {
  if (value === undefined || value === null || value === '') return withSymbol ? '₩0' : '0';
  const n = Number(value);
  if (Number.isNaN(n)) return withSymbol ? '₩0' : '0';
  return withSymbol ? `₩${n.toLocaleString()}` : n.toLocaleString();
};

// ISO 문자열을 로컬 날짜 부분만 추출 (timezone 문제 회피)
export const isoToLocalDate = (isoString: string) => {
  return isoString.split('T')[0]; // "2026-01-03"
};

// 로컬 날짜 문자열 비교 (YYYY-MM-DD 형식)
export const isDateInRange = (
  isoDateString: string,
  startDate: Date,
  endDate: Date
): boolean => {
  const dateStr = isoToLocalDate(isoDateString);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  return dateStr >= startStr && dateStr <= endStr;
};

export default formatCurrency;
