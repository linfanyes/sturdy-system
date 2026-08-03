const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api';
const saToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNGM4OTYyOC1lZWRkLTQ2MWItYjVjYi0xMjg1N2EwZDE1NmIiLCJyb2xlIjoic2Nob29sX2FkbWluIiwic2Nob29sSWQiOiI1OWRmMWIyNi04NTBkLTQzZjktOGI5Zi1iYWY3ZjkwNTI3MmYiLCJpYXQiOjE3ODU2NTU1MTYsImV4cCI6MTc4ODI0NzUxNn0.EwqpSXjixvcjzUqCGA5Xk4C9voQ4IdDR_utnvLaMXvM';
const teacherToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDU4MTE5OC1lNGU2LTQ2MDEtYWQ4ZC04YjUyMmYxYmNlNGYiLCJyb2xlIjoidGVhY2hlciIsInNjaG9vbElkIjoiNTlkZjFiMjYtODUwZC00M2Y5LThiOWYtYmFmN2Y5MDUyNzJmIiwiaWF0IjoxNzU2NTU1MTYsImV4cCI6MTc4ODI0NzUxNn0.VFL3c60raeKAZWK3FqUiFca0JyggN3qBSkVRluoEuck';

async function hit(method, path, token, body) {
  try {
    const r = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    return { status: r.status, body: t.slice(0, 160) };
  } catch (e) {
    return { status: 'ERR', body: String(e.message || e) };
  }
}

const out = {};
out.health = await hit('GET', '/health');
out.me_sa = await hit('GET', '/auth/me', saToken);
out.me_teacher = await hit('GET', '/auth/me', teacherToken);
out.root = await hit('GET', '/');
console.log(JSON.stringify(out, null, 2));
