import { useEffect, useRef, useState } from "react";
import { getDownload } from "../downloadStore.js";
import { X, ArrowLeft } from "lucide-react";
export default function PlayerModal({ item, initialSeconds=0, onClose, onProgress }) {
  const videoRef=useRef(null); const [error,setError]=useState(""); const [offlineSrc,setOfflineSrc]=useState("");
  useEffect(()=>{const v=videoRef.current;if(v&&initialSeconds>0){const set=()=>{try{v.currentTime=initialSeconds;}catch{}};v.addEventListener("loadedmetadata",set,{once:true});return()=>v.removeEventListener("loadedmetadata",set);}},[initialSeconds,item?.id]);
  useEffect(()=>{let objectUrl="";let cancelled=false;(async()=>{if(item?.videoUrl?.startsWith("offline:")){try{const saved=await getDownload(item.videoUrl.slice(8));if(!saved)throw new Error("Ce téléchargement n’existe plus.");objectUrl=URL.createObjectURL(saved.blob);if(!cancelled)setOfflineSrc(objectUrl);}catch(e){if(!cancelled)setError(e.message);}}else setOfflineSrc("");})();return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[item?.id,item?.videoUrl]);
  if(!item)return null;
  const src=item.videoUrl?.startsWith("offline:")?offlineSrc:item.videoUrl;
  return <div className="player-backdrop"><div className="player-top"><button className="player-back" onClick={onClose}><ArrowLeft size={18}/> Retour</button><span>{item.title}</span><button className="icon-button" onClick={onClose} aria-label="Fermer le lecteur"><X size={20}/></button></div>
    <div className="player-stage">{src?<video ref={videoRef} controls autoPlay playsInline poster={item.backdrop||item.poster} src={src} onTimeUpdate={e=>onProgress(item.id,e.currentTarget.currentTime,e.currentTarget.duration||0)} onError={()=>setError("La vidéo ne peut pas être lue. Vérifie que l'URL pointe vers un fichier vidéo compatible.")}/>:<div className="player-empty"><div className="empty-play">▶</div><h2>Vidéo indisponible</h2><p>Cette fiche ne possède pas encore de source vidéo.</p><p>Ajoute un fichier MP4/WebM ou une URL directe autorisée dans l'espace d'administration.</p></div>}</div>
    {error&&<p className="player-error">{error}</p>}
  </div>;
}
