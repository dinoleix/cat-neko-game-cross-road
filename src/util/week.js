// ISO-8601 week keys: weeks run Monday 00:00 through Sunday 23:59, and week 1
// is the week containing Jan 4. Keys sort and compare as plain strings
// ("2026-W33"), which is what lets a week's scores live under their own
// document path and roll over on their own - nothing has to run at midnight
// on Sunday to "close" a week, the key simply stops matching.
//
// Computed from the device's local clock, so the boundary lands on Monday
// morning wherever the café is. Players in a different timezone can therefore
// bucket into a neighbouring week within a few hours of the boundary; for a
// single-location café that is not worth the complexity of pinning an offset.

const DAY_MS = 86400000;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Monday of the week containing `date`.
export function mondayOf(date) {
  const d = startOfDay(date);
  const dayFromMonday = (d.getDay() + 6) % 7; // Sunday is 0 in JS, we want it last
  d.setDate(d.getDate() - dayFromMonday);
  return d;
}

export function weekKeyFor(date = new Date()) {
  const monday = mondayOf(date);

  // The ISO year is whichever year the Thursday of this week falls in - that
  // is what makes the turn of the year come out right, when a single week can
  // have days in two different years.
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const week1Monday = mondayOf(new Date(isoYear, 0, 4));
  // Rounded because DST changes make some weeks 23 or 25 hours short/long.
  const weekNumber = Math.round((monday - week1Monday) / (7 * DAY_MS)) + 1;

  return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
}

export function currentWeekKey() {
  return weekKeyFor(new Date());
}

export function lastWeekKey() {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() - 7);
  return weekKeyFor(monday);
}
