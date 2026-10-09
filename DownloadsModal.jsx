import { useEffect, useState } from "react";
import { ArrowLeft, Download, Play, Trash2, X, HardDrive } from "lucide-react";
import { formatSize, listDownloads, removeDownload } from "../downloadStore.js";
export default function DownloadsModal({ onClose, onPlay, onNotice, onChanged, refreshKey=0 }) {
  const [items,setItems]=useState([]); const [busy,setBusy]=useState("");
  async function refresh(){try{setItems(await listDownloads());}catch(e){onNotice?.(e.message);}}
  useEffect(()=>{refresh();},[refreshKey]);
  async function erase(item){if(!window.confirm(`Supprimer « ${item.title} » des téléchargements ?`))return;setBusy(item.id);try{await removeDownload(item.id);await refresh();onChanged?.();onNotice?.("Vidéo supprimée des téléchargements.");}catch(e){onNotice?.(e.message);}finally{setBusy("");}}
  return <div className="downloads-backdrop"><section className="downloads-panel" role="dialog" aria-modal="true" aria-label="Mes téléchargements"><header className="downloads-header"><button className="player-back" onClick={onClose}><ArrowLeft size={18}/> Retour</button><div><span className="eyebrow">BIBLIOTHÈQUE HORS LIGNE</span><h2>Mes téléchargements</h2></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20}/></button></header>
    {!items.length?<div className="downloads-empty"><HardDrive size={42}/><h3>Aucune vidéo téléchargée</h3><p>Ouvre une fiche avec une vidéo disponible puis appuie sur « Télécharger ».</p></div>:<div className="downloads-list">{items.map(item=><article className="download-item" key={item.id}><img src={item.poster||"https://placehold.co/100x140/151a25/ffffff?text=CineBox"} alt=""/><div className="download-copy"><strong>{item.title}</strong><span>{item.type} · {item.year||""}</span><small>{formatSize(item.size)} · Enregistré sur cet appareil</small><div className="download-actions"><button className="primary-button" onClick={()=>onPlay({...item,videoUrl:`offline:${item.id}`})}><Play size={15} fill="currentColor"/> Regarder</button><button className="secondary-button danger" disabled={busy===item.id} onClick={()=>erase(item)}><Trash2 size={15}/> Supprimer</button></div></div></article>)}</div>}
    <p className="downloads-footnote">Les vidéos sont conservées dans le stockage du navigateur sur cet appareil. L’espace disponible dépend du téléphone.</p>
  </section></div>;
}
