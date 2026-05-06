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

const toKoreaDateString = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) {
    return date.toISOString().split('T')[0];
  }

  return `${year}-${month}-${day}`;
};

// ISO 문자열을 로컬 날짜 부분만 추출 (timezone 문제 회피)
export const isoToLocalDate = (isoString: string) => {
  // ISO 전체 문자열(시간 포함)을 한국시간 기준 YYYY-MM-DD로 변환
  const d = new Date(isoString);
  return toKoreaDateString(d);
};

// Date 객체를 로컬 기준 YYYY-MM-DD 문자열로 변환
export const dateToLocalDateString = (date: Date) => {
  return toKoreaDateString(date);
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

// ISO 문자열을 한국 시간(Asia/Seoul)으로 포맷된 문자열로 변환
export const formatToKoreaTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    // Intl.DateTimeFormat을 사용하여 한국 시간으로 포맷
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch (e) {
    return isoString;
  }
};

// Browser local timezone의 "보이는 날짜"를 Asia/Seoul 기준 YYYY-MM-DD로 변환
// 예: browser가 UTC timezone이어도, 사용자가 "2026-05-18"이라고 선택하면 "2026-05-18"로 반환
export const getKoreaDateString = (localDate: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(localDate);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  
  if (!year || !month || !day) {
    return toKoreaDateString(localDate);
  }
  
  return `${year}-${month}-${day}`;
};

// Asia/Seoul 자정(00:00:00)에 해당하는 UTC Date 객체 반환
// 사용자가 선택한 "local date"를 Asia/Seoul 자정으로 해석해서 UTC로 변환
export const getKoreaMidnightUTC = (localDate: Date): Date => {
  const koreaDateStr = getKoreaDateString(localDate);
  const [year, month, day] = koreaDateStr.split('-').map(Number);
  
  // Asia/Seoul 자정 = UTC 15:00 (UTC+9이므로 00:00 - 09:00)
  // 정확한 계산: UTC 자정 + 9시간 = Asia/Seoul 09:00
  // 따라서 Asia/Seoul 자정 = UTC 자정 - 9시간
  const koreaDate = new Date(Date.UTC(year, month - 1, day));
  // Asia/Seoul 00:00:00을 UTC로 변환하면 전 날짜 15:00:00
  const offset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  return new Date(koreaDate.getTime() - offset);
};

// Asia/Seoul 기준 마지막 시간(23:59:59)에 해당하는 UTC Date 객체 반환
export const getKoreaEndOfDayUTC = (localDate: Date): Date => {
  const koreaDateStr = getKoreaDateString(localDate);
  const [year, month, day] = koreaDateStr.split('-').map(Number);
  
  const koreaDate = new Date(Date.UTC(year, month - 1, day + 1)); // 다음 날 자정
  const offset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const endOfDay = new Date(koreaDate.getTime() - offset - 1); // -1ms로 23:59:59.999
  return endOfDay;
};

// Asia/Seoul 기준 날짜/시간을 UTC ISO string으로 변환
// koreaDateStr: "2026-05-18" (Asia/Seoul 기준)
// timeStr: "22:00" (Asia/Seoul 기준 시간)
// return: "2026-05-18T13:00:00Z" (UTC, 22:00 - 9시간)
export const koreaDateTimeToISO = (koreaDateStr: string, timeStr: string): string => {
  const [year, month, day] = koreaDateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  // Date.UTC는 UTC 기준으로 생성됨
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  
  // Asia/Seoul (UTC+9) 기준 시간을 UTC로 변환하려면 9시간을 뺌
  // Asia/Seoul 22:00 = UTC 13:00
  const offset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  return new Date(utcDate.getTime() - offset).toISOString();
};
