function decodeBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    return {
      user: decoded.slice(0, idx),
      pass: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

export function isAuthorized(request, env) {
  const creds = decodeBasicAuth(request.headers.get("Authorization"));
  if (!creds) return false;
  return creds.user === env.ADMIN_USER && creds.pass === env.ADMIN_PASS;
}

export function unauthorized() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SBTI Admin"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
