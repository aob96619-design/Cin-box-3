import { Heart, Play, Star } from "lucide-react";
export default function TitleCard({ item, isFavorite, onToggleFavorite, onOpen }) {
  return <article className="title-card">
    <button className="poster-button" onClick={()=>onOpen(item)} aria-label={`Détails de ${item.title}`}>
      <img className="poster" src={item.poster || "https://placehold.co/500x700/151a25/ffffff?text=CineBox"} alt={`Affiche de ${item.title}`} loading="lazy"/>
      <span className="poster-overlay"><span className="play-circle"><Play size={22} fill="currentColor"/></span></span><span className="type-chip">{item.type}</span>
    </button>
    <button className={`card-heart ${isFavorite?"is-favorite":""}`} onClick={()=>onToggleFavorite(item.id)} aria-label={isFavorite?"Retirer des favoris":"Ajouter aux favoris"}><Heart size={17} fill={isFavorite?"currentColor":"none"}/></button>
    <div className="card-info"><button className="card-title" onClick={()=>onOpen(item)}>{item.title}</button><div className="card-meta"><span>{item.year}</span><span>•</span><span>{item.genre}</span><span className="rating"><Star size={13} fill="currentColor"/> {item.rating || "—"}</span></div></div>
  </article>;
}
