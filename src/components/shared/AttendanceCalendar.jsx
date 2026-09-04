function parseVouchDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split(' ');
  if (parts.length !== 3) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months.indexOf(parts[1]);
  if (m < 0) return null;
  return new Date(parseInt(parts[2], 10), m, parseInt(parts[0], 10));
}

export default function AttendanceCalendar({ assignments, attendance }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = now.getDate();

  const attendanceByDay = {};
  attendance.forEach((a) => {
    const d = parseVouchDate(a.date);
    if (d && d.getMonth() === month && d.getFullYear() === year) attendanceByDay[d.getDate()] = a.status;
  });

  const scheduledDays = new Set();
  assignments.forEach((l) => {
    if (!['monitoring', 'fulfillment_completed'].includes(l.status)) return;
    const s = new Date(l.startDate);
    const e = new Date(l.expectedEnd || l.endDate);
    let d = new Date(Math.max(s, new Date(year, month, 1)));
    const end = new Date(Math.min(e, new Date(year, month, daysInMonth)));
    while (d <= end) {
      if (d.getMonth() === month) scheduledDays.add(d.getDate());
      d.setDate(d.getDate() + 1);
    }
  });

  const dowLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const cells = [];
  dowLabels.forEach((l, i) => cells.push({ key: `dow${i}`, label: l, dow: true }));
  for (let i = 0; i < firstDay; i++) cells.push({ key: `blank${i}`, empty: true });
  for (let day = 1; day <= daysInMonth; day++) {
    const status = attendanceByDay[day];
    let cls = 'bg-slate-50 text-slate-400 border border-transparent';
    if (status === 'Verified') cls = 'bg-emerald-500 text-white';
    else if (status === 'Late') cls = 'bg-amber-400 text-white';
    else if (status && status.startsWith('Flagged')) cls = 'bg-red-500 text-white';
    else if (scheduledDays.has(day)) cls = 'bg-white text-brand-700 border-2 border-brand-400';
    cells.push({ key: `d${day}`, day, cls, isToday: day === todayDate });
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((c) => {
        if (c.dow) return <div key={c.key} className="text-center text-[10px] font-medium text-slate-400 py-1">{c.label}</div>;
        if (c.empty) return <div key={c.key} />;
        return (
          <div
            key={c.key}
            className={`aspect-square flex items-center justify-center text-[11px] font-medium rounded-lg ${c.cls} ${
              c.isToday ? 'ring-2 ring-ink-950 ring-offset-1' : ''
            }`}
          >
            {c.day}
          </div>
        );
      })}
    </div>
  );
}
