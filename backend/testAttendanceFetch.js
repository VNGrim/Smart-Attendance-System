(async () => {
  try {
    const loginRes = await fetch("http://localhost:8080/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "GV001", password: "giangvienfpt" }),
      redirect: "manual",
    });

    console.log("login status", loginRes.status);
    const cookie = loginRes.headers.get("set-cookie");
    if (!cookie) {
      console.error("Missing cookie", await loginRes.text());
      process.exit(1);
    }

    const attendRes = await fetch("http://localhost:8080/api/attendances/classes", {
      headers: { Cookie: cookie },
    });

    console.log("classes status", attendRes.status);
    const text = await attendRes.text();
    console.log(text);
  } catch (err) {
    console.error("error", err);
  }
})();
