(async () => {
  const login = await fetch("http://localhost:8080/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "GV001", password: "giangvienfpt" }),
    redirect: "manual",
  });
  const cookie = login.headers.get("set-cookie");
  if (!cookie) {
    console.error("missing cookie");
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  console.log("query date", today);
  const resp = await fetch(`http://localhost:8080/api/attendances/classes/SE19B3/slots?date=${today}`, {
    headers: { Cookie: cookie },
  });
  console.log("status", resp.status);
  const text = await resp.text();
  console.log(text);
})();
