// Client-side session helpers. Real authorization is enforced server-side by the API routes;
// these only drive UX (redirects, showing the signed-in user).

const TOKEN_KEY = "token";
const USER_KEY = "user";

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Returns the stored token if present and not expired; otherwise clears the session and returns null. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const exp = decodeExp(token);
  if (exp === null || exp * 1000 <= Date.now()) {
    clearSession();
    return null;
  }
  return token;
}

export function setSession(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
