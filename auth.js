import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET || "local-development-secret-change-me";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, secret(), { expiresIn: "7d" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Connecte-toi pour continuer." });
  try {
    req.auth = jwt.verify(token, secret());
    next();
  } catch {
    return res.status(401).json({ error: "Session expirée. Reconnecte-toi." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") return res.status(403).json({ error: "Accès réservé à l'administration." });
  next();
}
