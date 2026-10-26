import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export interface JWTPayload {
  lawyerId: string;
  email: string;
  fullName: string;
}

// Read lazily so `next build` does not need the secret, but any real use fails loudly without it.
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "NEXTAUTH_SECRET is missing or too short. Set it in frontend/.env (and the same value as JWT_SECRET in backend/.env)."
    );
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), { algorithm: "HS256", expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as JWTPayload;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXTAUTH_SECRET")) throw error;
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
}

/** Returns the authenticated lawyer's id, or null when the Bearer token is missing/invalid. */
export function getLawyerId(request: Request): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.lawyerId || null;
}
