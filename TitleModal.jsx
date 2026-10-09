import { useEffect, useState } from "react";
import { X, Play, Heart, Star, Clock, Download, Share2, Link as LinkIcon } from "lucide-react";
export default function TitleModal({ item, onClose, isFavorite, onToggleFavorite, onPlay, progress, onNotice, onDownload, downloaded=false, downloading=false }) {
  const [brokenImage,setBrokenImage]=useState(false);
  async function shareTitle() {
    const url = new URL(window.location.href);
    url.searchParams.set("title", item.id);
    const shareData = { title: `${item.title} — CineBox`, text: `Découvre ${item.title} sur CineBox.`, url: url.toString() };
    try {
      // On Android, try to share the actual uploaded file when the browser supports it.
      // Keep a size limit so a very large movie is not loaded into memory all at once.
      if (item.videoUrl && navigator.share && navigator.canShare && typeof File !== "undefined") {
        const videoUrl = new URL(item.videoUrl, window.location.origin);
        if (videoUrl.origin === window.location.origin) {
          const response = await fetch(videoUrl);
          if (response.ok) {
            const length = Number(response.headers.get("content-length") || 0);
            if (!length || length <= 100 * 1024 * 1024) {
              const blob = await response.blob();
              if (blob.size <= 100 * 1024 * 1024) {
                const extension = (videoUrl.pathname.split(".").pop() || "mp4").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";
                const file = new File([blob], `${String(item.title || "cinebox-video").replace(/[^a-z0-9_-]/gi, "-")}.${extension}`, { type: blob.type || "video/mp4" });
                if (navigator.canShare({ files: [file] })) {
                  await navigator.share({ title: shareData.title, text: shareData.text, files: [file] });
                  onNotice?.("Vidéo envoyée au menu de partage de ton téléphone.");
                  return;
                }
              }
            }
          }
        }
      }
      if (navigator.share) {
        await navigator.share(shareData);
        onNotice?.("Lien CineBox partagé. Le destinataire doit avoir accès à la vidéo.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        onNotice?.("Lien CineBox copié. Tu peux l’envoyer à tes contacts.");
      } else {
        window.prompt("Copie ce lien pour le partager :", shareData.url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") onNotice?.("Le partage du fichier n’est pas disponible pour cette vidéo. Réessaie avec le lien CineBox.");
    }
  }
  async function downloadVideo() {
    if (!item.videoUrl) { onNotice?.("Aucune vidéo n’est associée à ce titre."); return; }
    await onDownload?.(item);
  }
  useEffect(()=>{setBrokenImage(false);},[item?.id]);
  if(!item)return null;
  const resume = progress?.[item.id]?.seconds || 0;
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="title-modal" role="dialog" aria-modal="true" aria-label={`Détails de ${item.title}`}>
    <div className="modal-hero" style={{backgroundImage:`linear-gradient(90deg,#0a0d14 0%,rgba(10,13,20,.82) 50%,rgba(10,13,20,.2) 100%),linear-gradient(0deg,#0a0d14 0%,transparent 65%),url("${item.backdrop||item.poster}")`}}>
      <button className="modal-close icon-button" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
      <div className="modal-copy"><span className="eyebrow">{item.type} · {item.year}</span><h2>{item.title}</h2>
        <div className="modal-meta"><span className="rating"><Star size={15} fill="currentColor"/> {item.rating||"—"}</span><span><Clock size={13}/> {item.duration||"Durée non indiquée"}</span><span>{item.genre}</span></div>
        <p>{item.description}</p>
        <div className="modal-actions"><button className="primary-button" onClick={()=>onPlay(item)}><Play size={17} fill="currentColor"/> {resume>5?"Reprendre la lecture":"Regarder"}</button><button className="secondary-button" onClick={()=>onToggleFavorite(item.id)}><Heart size={17} fill={isFavorite?"currentColor":"none"}/>{isFavorite?"Dans mes favoris":"Ajouter aux favoris"}</button><button className="secondary-button" onClick={downloadVideo} disabled={!item.videoUrl||downloading}><Download size={17}/> {downloading?"Téléchargement…":downloaded?"Téléchargé ✓":"Télécharger"}</button><button className="secondary-button" onClick={shareTitle}><Share2 size={17}/> Partager / envoyer</button></div>
        {!item.videoUrl&&<p className="no-video-note">Aucune vidéo n'est encore associée à ce titre. Ajoute une source autorisée dans l'administration pour activer la lecture et le téléchargement.</p>}
        <p className="share-note"><LinkIcon size={13}/> Le partage envoie un lien CineBox. La personne doit pouvoir accéder au site pour regarder la vidéo.</p>
      </div>
    </div>
  </section></div>;
}
