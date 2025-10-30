const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  try {
    const loginRes = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'GV001', password: 'giangvienfpt' }),
      redirect: 'manual',
    });

    const cookie = loginRes.headers.get('set-cookie');
    console.log('login status', loginRes.status);

    const attendRes = await fetch('http://localhost:8080/api/attendances/classes', {
      headers: { Cookie: cookie },
    });

    console.log('attendance status', attendRes.status);
    const text = await attendRes.text();
    console.log('body', text);
  } catch (error) {
    console.error('error', error);
  }
})();
