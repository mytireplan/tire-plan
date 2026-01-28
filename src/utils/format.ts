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
  // ISO 전체 문자열(시간 포함)을 로컬 Date로 변환 후 안전하게 YYYY-MM-DD 반환
  const d = new Date(isoString);
  return dateToLocalDateString(d);
};

// Date 객체를 로컬 기준 YYYY-MM-DD 문자열로 변환
export const dateToLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 로컬 날짜 문자열 비교 (YYYY-MM-DD 형식)
export const isDateInRange = (
  isoDateString: string,
  startDate: Date,
  endDate: Date
): boolean => {
  const dateStr = isoToLocalDate(isoDateString);
  // toISOString()은 UTC 기준이어서 한국시간(UTC+9)에서 하루가 밀릴 수 있음
  // 로컬 기준으로 안전하게 비교하기 위해 직접 YYYY-MM-DD 문자열을 구성
  const startStr = dateToLocalDateString(startDate);
  const endStr = dateToLocalDateString(endDate);
  return dateStr >= startStr && dateStr <= endStr;
};

export default formatCurrency;
