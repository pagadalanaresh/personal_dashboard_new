export function isMarketOpen(date: Date) {
  // NSE trading hours are 9:15–15:30 IST (UTC+5:30, no DST), Mon–Fri.
  const istMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + (5 * 60 + 30);
  const istDaysOffset = Math.floor(istMinutes / (24 * 60));
  const istDay = (date.getUTCDay() + istDaysOffset) % 7;
  const istMinutesOfDay = istMinutes % (24 * 60);

  if (istDay === 0 || istDay === 6) return false;
  return istMinutesOfDay >= 9 * 60 + 15 && istMinutesOfDay <= 15 * 60 + 30;
}
