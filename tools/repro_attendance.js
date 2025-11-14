const fetch = global.fetch;
(async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJUMDAxIiwicm9sZSI6InRlYWNoZXIiLCJ1c2VyX2NvZGUiOiJUMDAxIiwiaWF0IjoxNzYyOTQ2MjM0fQ.q5VaV1KkVu9MxNXHmRmM9r4cLOy9Grzsge6qluagorY';
    const base = 'http://localhost:8080';
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

    console.log('\n== GET classes ==');
    let res = await fetch(base + '/api/attendances/classes', { headers });
    let body = await res.json();
    console.log(JSON.stringify(body, null, 2));
    if (!body.success || !body.data || !body.data.length) return;
    const classId = body.data[0].id;
    const date = new Date().toISOString().slice(0, 10);

    console.log('\n== GET slots for class', classId, 'date', date, '==');
    res = await fetch(base + `/api/attendances/classes/${encodeURIComponent(classId)}/slots?date=${date}`, { headers });
    body = await res.json();
    console.log(JSON.stringify(body, null, 2));
    if (!body.success || !body.data || !body.data.length) return;
    const slotId = body.data[0].slotId;

    console.log('\n== CREATE session (qr) ==');
    res = await fetch(base + '/api/attendances/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ classId, slotId, type: 'qr', date }),
    });
    body = await res.json();
    console.log(JSON.stringify(body, null, 2));
    if (!body.success) return;
    const session = body.data;
    const sessionId = session.id;

    console.log('\n== CLOSE session ==');
    res = await fetch(base + `/api/attendances/sessions/${sessionId}/close`, { method: 'POST', headers });
    body = await res.json();
    console.log(JSON.stringify(body, null, 2));

    console.log('\n== TRY reopen as manual (POST sessions with type manual) ==');
    res = await fetch(base + '/api/attendances/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ classId, slotId, type: 'manual', date }),
    });
    body = await res.json();
    console.log(JSON.stringify(body, null, 2));
    if (!body.success) return;
    const reopenedId = body.data?.id || sessionId;

    console.log('\n== GET students for session', reopenedId, '==');
    res = await fetch(base + `/api/attendances/sessions/${reopenedId}/students`, { headers });
    body = await res.json();
    console.log(JSON.stringify(body, null, 2));

    console.log('\n== DONE ==');
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 1;
  }
})();
