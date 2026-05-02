// JS getDay(): 0=Sun,1=Mon,...,6=Sat  →  app dayIndex: Mon=0,...,Sat=5,Sun=6
export function getTodayDayIndex() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

// YYYY-MM-DD in local time (not UTC)
export function todayLocalISO() {
  return new Date().toLocaleDateString('en-CA');
}
