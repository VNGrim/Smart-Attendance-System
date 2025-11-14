async function run() {
  const base = 'http://localhost:8080/api/attendances';
  const dates = ['2025-11-13', '2025-11-14'];
  for (const date of dates) {
    try {
      const classesResp = await fetch(`${base}/classes?date=${date}`, { headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      const classes = await classesResp.json();
      console.log(`[Test] date=${date} classes_count=${Array.isArray(classes.data) ? classes.data.length : 0}`);
      if (Array.isArray(classes.data)) {
        console.log('[Test] classes sample', classes.data.slice(0, 3));
        const first = classes.data[0];
        if (first) {
          const slotsResp = await fetch(`${base}/classes/${first.id}/slots?date=${date}`, { headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
          const slots = await slotsResp.json();
          console.log(`[Test] date=${date} slots_count=${Array.isArray(slots.data) ? slots.data.length : 0}`);
          console.log('[Test] slots sample', Array.isArray(slots.data) ? slots.data.slice(0, 3) : []);
        }
      }
    } catch (e) {
      console.error('[Test] error', e.message);
    }
  }
}

run();
