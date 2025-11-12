const fetch = global.fetch || require('node-fetch');
const jwt = require('jsonwebtoken');

(async () => {
  const BASE = 'http://localhost:8080/api/attendances';
  const token = jwt.sign({ userId: 'T001', role: 'teacher', user_code: 'T001' }, process.env.JWT_SECRET || 'secret');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    console.log('\n1) GET classes');
    let r = await fetch(`${BASE}/classes`, { headers });
    console.log('status', r.status);
    let j = await r.json();
    console.log(JSON.stringify(j, null, 2));

    const classId = j?.data?.[0]?.id;
    if (!classId) return console.log('no classId found, stop');

    console.log('\n2) GET slots for class', classId);
    r = await fetch(`${BASE}/classes/${classId}/slots?date=${new Date().toISOString().slice(0,10)}`, { headers });
    console.log('status', r.status);
    j = await r.json();
    console.log(JSON.stringify(j, null, 2));

    const slotId = j?.data?.[0]?.slotId;
    if (!slotId) return console.log('no slotId found, stop');

    console.log('\n3) POST create session (manual)');
    r = await fetch(`${BASE}/sessions`, { method: 'POST', headers, body: JSON.stringify({ classId, slotId, type: 'manual', date: new Date().toISOString().slice(0,10) })});
    console.log('status', r.status);
    j = await r.json();
    console.log(JSON.stringify(j, null, 2));

    const sessionId = j?.data?.id;
    if (!sessionId) return console.log('no session id, stop');

    console.log('\n4) GET sessions/:id/students');
    r = await fetch(`${BASE}/sessions/${sessionId}/students`, { headers });
    console.log('status', r.status);
    j = await r.json();
    console.log(JSON.stringify(j, null, 2));

    console.log('\n5) GET session detail /session/:id');
    r = await fetch(`${BASE}/session/${sessionId}`, { headers });
    console.log('status', r.status);
    j = await r.json();
    console.log(JSON.stringify(j, null, 2));

  } catch (err) {
    console.error('error', err);
  }
})();
