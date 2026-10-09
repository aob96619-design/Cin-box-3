import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ensureStore, readDb, writeDb, makeId, uploadDir } from "./store.js";
import { requireAuth, requireAdmin, signToken } from "./auth.js";

ensureStore();
const app = express();
const PORT = Number(process.env.PORT || 3001);
const here = path.dirname(fileURLToPath(import.meta.url));
const maxUpload = Number(process.env.MAX_UPLOAD_MB || 2048) * 1024 * 1024;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use("/media", express.static(uploadDir, { fallthrough: false, setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); } }));

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(100)
});
const titleSchema = z.object({
  title: z.string().trim().min(1).max(140),
  type: z.enum(["Film", "Série"]),
  year: z.coerce.number().int().min(1888).max(2100),
  genre: z.string().trim().min(1).max(80),
  rating: z.string().trim().max(12).default("—"),
  duration: z.string().trim().max(50).default(""),
  poster: z.string().trim().max(1000).default(""),
  backdrop: z.string().trim().max(1000).default(""),
  description: z.string().trim().max(5000).default(""),
  videoUrl: z.string().trim().max(1500).default(""),
  featured: z.boolean().default(false)
});

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}
function cleanTitle(title) {
  return { ...title };
}
function validateTitle(req, res, next) {
  const parsed = titleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
  req.titleInput = parsed.data;
  next();
}

async function seedAdmin() {
  const db = readDb();
  if (db.users.some(u => u.role === "admin")) return;
  const email = (process.env.ADMIN_EMAIL || "admin@cinebox.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe-123!";
  db.users.push({
    id: makeId("user"), name: "Administrateur", email,
    passwordHash: await bcrypt.hash(password, 12), role: "admin", createdAt: new Date().toISOString()
  });
  writeDb(db);
  console.log(`Compte admin de développement initialisé : ${email}`);
}
await seedAdmin();

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "cinebox-api", now: new Date().toISOString() }));

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Informations invalides." });
  const input = parsed.data;
  const db = readDb();
  const email = input.email.toLowerCase();
  if (db.users.some(u => u.email === email)) return res.status(409).json({ error: "Cette adresse e-mail est déjà utilisée." });
  const user = {
    id: makeId("user"), name: input.name, email,
    passwordHash: await bcrypt.hash(input.password, 12), role: "user", createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "E-mail ou mot de passe invalide." });
  const db = readDb();
  const user = db.users.find(u => u.email === parsed.data.email.toLowerCase());
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "E-mail ou mot de passe incorrect." });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.auth.sub);
  if (!user) return res.status(401).json({ error: "Compte introuvable." });
  res.json({ user: publicUser(user) });
});

app.get("/api/titles", (req, res) => {
  const db = readDb();
  const q = String(req.query.q || "").trim().toLowerCase();
  const type = String(req.query.type || "Tout");
  const genre = String(req.query.genre || "").trim().toLowerCase();
  const results = db.titles.filter(item => {
    const text = `${item.title} ${item.genre} ${item.year} ${item.description}`.toLowerCase();
    return (!q || text.includes(q)) &&
      (type === "Tout" || item.type.toLowerCase() === type.toLowerCase()) &&
      (!genre || item.genre.toLowerCase() === genre);
  }).map(cleanTitle);
  res.json({ count: results.length, results, genres: [...new Set(db.titles.map(t => t.genre))].sort() });
});

app.get("/api/titles/:id", (req, res) => {
  const item = readDb().titles.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Titre introuvable." });
  res.json(cleanTitle(item));
});

app.get("/api/favorites", requireAuth, (req, res) => {
  const db = readDb();
  const ids = db.favorites.filter(f => f.userId === req.auth.sub).map(f => f.titleId);
  res.json({ ids });
});

app.post("/api/favorites/:titleId", requireAuth, (req, res) => {
  const db = readDb();
  const title = db.titles.find(t => t.id === req.params.titleId);
  if (!title) return res.status(404).json({ error: "Titre introuvable." });
  const index = db.favorites.findIndex(f => f.userId === req.auth.sub && f.titleId === title.id);
  let active;
  if (index >= 0) { db.favorites.splice(index, 1); active = false; }
  else { db.favorites.push({ userId: req.auth.sub, titleId: title.id, createdAt: new Date().toISOString() }); active = true; }
  writeDb(db);
  res.json({ active });
});

app.get("/api/progress", requireAuth, (req, res) => {
  const db = readDb();
  res.json({ items: db.progress.filter(p => p.userId === req.auth.sub) });
});

app.put("/api/progress/:titleId", requireAuth, (req, res) => {
  const schema = z.object({ seconds: z.coerce.number().min(0).max(60 * 60 * 24), duration: z.coerce.number().min(0).max(60 * 60 * 24) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Progression invalide." });
  const db = readDb();
  if (!db.titles.some(t => t.id === req.params.titleId)) return res.status(404).json({ error: "Titre introuvable." });
  const idx = db.progress.findIndex(p => p.userId === req.auth.sub && p.titleId === req.params.titleId);
  const entry = { userId: req.auth.sub, titleId: req.params.titleId, ...parsed.data, updatedAt: new Date().toISOString() };
  if (idx >= 0) db.progress[idx] = entry; else db.progress.push(entry);
  writeDb(db);
  res.json({ ok: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  }
});
const upload = multer({
  storage, limits: { fileSize: maxUpload, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = file.fieldname === "video"
      ? ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(file.mimetype)
      : ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype);
    cb(ok ? null : new Error("Format de fichier non autorisé."), ok);
  }
});

app.post("/api/submissions/upload/:kind", requireAuth, (req, res, next) => {
  const kind = req.params.kind;
  if (!["poster", "video"].includes(kind)) return res.status(400).json({ error: "Type de fichier inconnu." });
  // Les contributions communautaires sont limitées à 500 Mo par fichier vidéo.
  const communityUpload = multer({
    storage,
    limits: { fileSize: kind === "video" ? 500 * 1024 * 1024 : 8 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ok = file.fieldname === "video"
        ? ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(file.mimetype)
        : ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype);
      cb(ok ? null : new Error("Format de fichier non autorisé."), ok);
    }
  });
  communityUpload.single(kind)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || "Téléversement impossible." });
    if (!req.file) return res.status(400).json({ error: "Choisis un fichier." });
    res.json({ url: `/media/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
  });
});

app.post("/api/submissions", requireAuth, validateTitle, (req, res) => {
  if (req.titleInput.type !== "Série") return res.status(400).json({ error: "Cette fonction est réservée aux séries." });
  const db = readDb();
  if (!Array.isArray(db.submissions)) db.submissions = [];
  const submission = {
    id: makeId("submission"), ...req.titleInput, ownerId: req.auth.sub,
    status: "pending", createdAt: new Date().toISOString()
  };
  db.submissions.unshift(submission);
  writeDb(db);
  res.status(201).json({ id: submission.id, status: submission.status, message: "Ta série a été envoyée pour validation." });
});

app.get("/api/admin/submissions", requireAuth, requireAdmin, (_req, res) => {
  const db = readDb();
  res.json({ results: (db.submissions || []).filter(item => item.status === "pending") });
});

app.post("/api/admin/submissions/:id/approve", requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  if (!Array.isArray(db.submissions)) db.submissions = [];
  const index = db.submissions.findIndex(item => item.id === req.params.id && item.status === "pending");
  if (index < 0) return res.status(404).json({ error: "Proposition introuvable." });
  const submission = db.submissions[index];
  const { id, ownerId, status, ...titleData } = submission;
  const item = { id: makeId("title"), ...titleData, featured: false, createdAt: new Date().toISOString(), submittedBy: ownerId };
  db.titles.unshift(item);
  db.submissions[index] = { ...submission, status: "approved", reviewedAt: new Date().toISOString() };
  writeDb(db);
  res.json({ ok: true, title: item });
});

app.post("/api/admin/submissions/:id/reject", requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  if (!Array.isArray(db.submissions)) db.submissions = [];
  const index = db.submissions.findIndex(item => item.id === req.params.id && item.status === "pending");
  if (index < 0) return res.status(404).json({ error: "Proposition introuvable." });
  db.submissions[index] = { ...db.submissions[index], status: "rejected", reviewedAt: new Date().toISOString() };
  writeDb(db);
  res.json({ ok: true });
});

app.post("/api/admin/upload/:kind", requireAuth, requireAdmin, (req, res, next) => {
  const kind = req.params.kind;
  if (!["poster", "video"].includes(kind)) return res.status(400).json({ error: "Type de fichier inconnu." });
  upload.single(kind)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || "Téléversement impossible." });
    if (!req.file) return res.status(400).json({ error: "Choisis un fichier." });
    res.json({ url: `/media/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
  });
});

app.post("/api/admin/titles", requireAuth, requireAdmin, validateTitle, (req, res) => {
  const db = readDb();
  const item = { id: makeId("title"), ...req.titleInput, createdAt: new Date().toISOString() };
  db.titles.unshift(item);
  writeDb(db);
  res.status(201).json(item);
});

app.put("/api/admin/titles/:id", requireAuth, requireAdmin, validateTitle, (req, res) => {
  const db = readDb();
  const index = db.titles.findIndex(t => t.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Titre introuvable." });
  db.titles[index] = { ...db.titles[index], ...req.titleInput };
  writeDb(db);
  res.json(db.titles[index]);
});

app.delete("/api/admin/titles/:id", requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const index = db.titles.findIndex(t => t.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: "Titre introuvable." });
  const [removed] = db.titles.splice(index, 1);
  db.favorites = db.favorites.filter(f => f.titleId !== removed.id);
  db.progress = db.progress.filter(p => p.titleId !== removed.id);
  writeDb(db);
  res.json({ ok: true });
});

app.get("/api/admin/stats", requireAuth, requireAdmin, (_req, res) => {
  const db = readDb();
  res.json({
    titles: db.titles.length,
    movies: db.titles.filter(t => t.type === "Film").length,
    series: db.titles.filter(t => t.type === "Série").length,
    users: db.users.length,
    favorites: db.favorites.length
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erreur serveur. Vérifie la configuration et les journaux." });
});

app.listen(PORT, () => console.log(`CineBox API disponible sur http://localhost:${PORT}`));
