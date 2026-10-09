import { useState } from "react";
import { X, Upload, Clapperboard, Send } from "lucide-react";
import { api, json } from "../api.js";

const initial = { title: "", type: "Série", year: new Date().getFullYear(), genre: "Drame", rating: "—", duration: "1 saison", poster: "", backdrop: "", description: "", videoUrl: "", featured: false };

export default function SeriesSubmissionModal({ onClose, onSubmitted }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  async function upload(kind, file) {
    if (!file) return;
    setError(""); setNotice(""); setUploading(kind);
    try {
      const data = new FormData(); data.append(kind, file);
      const result = await api(`/submissions/upload/${kind}`, { method: "POST", body: data });
      change(kind === "poster" ? "poster" : "videoUrl", result.url);
      setNotice(kind === "video" ? "Vidéo envoyée." : "Affiche envoyée.");
    } catch (e) { setError(e.message); }
    finally { setUploading(""); }
  }

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, type: "Série", year: Number(form.year), featured: false };
      await api("/submissions", json("POST", payload));
      setNotice("Ta série a été envoyée à l’équipe CineBox pour validation.");
      onSubmitted(); onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="auth-modal series-submit-modal" role="dialog" aria-modal="true" aria-label="Proposer une série">
      <button className="modal-close icon-button" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
      <div className="auth-logo"><span className="brand-mark"><Clapperboard size={22}/></span></div>
      <h2>Ajoute ta série</h2>
      <p className="muted">Partage ta création avec la communauté CineBox. Elle sera publiée après validation.</p>
      <form onSubmit={submit} className="auth-form series-submit-form">
        <label>Nom de la série<input required maxLength="140" value={form.title} onChange={e => change("title", e.target.value)} placeholder="Le titre de ta série"/></label>
        <div className="form-row"><label>Année<input required type="number" min="1888" max="2100" value={form.year} onChange={e => change("year", e.target.value)}/></label><label>Genre<input required maxLength="80" value={form.genre} onChange={e => change("genre", e.target.value)} placeholder="Drame, comédie…"/></label></div>
        <label>Nombre de saisons<input maxLength="50" value={form.duration} onChange={e => change("duration", e.target.value)} placeholder="Ex. 1 saison"/></label>
        <label>Description<textarea rows="3" maxLength="5000" value={form.description} onChange={e => change("description", e.target.value)} placeholder="Présente ta série…"/></label>
        <label>Affiche (URL, facultatif)<input type="url" value={form.poster} onChange={e => change("poster", e.target.value)} placeholder="https://…"/></label>
        <label className="upload-label"><Upload size={15}/> {uploading === "poster" ? "Envoi de l’affiche…" : "Ou choisir une affiche"}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={Boolean(uploading)} onChange={e => upload("poster", e.target.files?.[0])}/></label>
        <label>Adresse de la vidéo ou du premier épisode (facultatif)<input type="url" value={form.videoUrl} onChange={e => change("videoUrl", e.target.value)} placeholder="https://…"/></label>
        <label className="upload-label"><Upload size={15}/> {uploading === "video" ? "Envoi de la vidéo…" : "Ou téléverser une vidéo (500 Mo max.)"}<input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" disabled={Boolean(uploading)} onChange={e => upload("video", e.target.files?.[0])}/></label>
        <p className="share-note">Publie uniquement des vidéos et images que tu as créées ou que tu as le droit de partager. Les séries proposées restent privées jusqu’à leur validation.</p>
        {error && <p className="form-error">{error}</p>}{notice && <p className="form-notice">{notice}</p>}
        <button className="primary-button wide" disabled={busy || Boolean(uploading)}><Send size={15}/>{busy ? "Envoi…" : "Envoyer ma série"}</button>
      </form>
    </section>
  </div>;
}
