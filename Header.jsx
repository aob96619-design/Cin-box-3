import { Clapperboard, Search, Heart, UserRound, LogOut, ShieldCheck, Download, CheckCircle2, PlusCircle, HardDrive } from "lucide-react";

export default function Header({ query, setQuery, activeFilter, setActiveFilter, favoritesOnly, setFavoritesOnly, favoriteCount, user, onAuth, onLogout, onAdmin, onAddSeries, onInstall, isInstalled, onDownloads, downloadCount=0 }) {
  const filter = value => { setFavoritesOnly(false); setActiveFilter(value); };
  return <header className="topbar">
    <a className="brand" href="#home"><span className="brand-mark"><Clapperboard size={21}/></span><span>CINE<span className="brand-accent">BOX</span></span></a>
    <nav className="main-nav"><button className={!favoritesOnly && activeFilter==="Tout"?"nav-link active":"nav-link"} onClick={()=>filter("Tout")}>Accueil</button><button className={!favoritesOnly && activeFilter==="Film"?"nav-link active":"nav-link"} onClick={()=>filter("Film")}>Films</button><button className={!favoritesOnly && activeFilter==="Série"?"nav-link active":"nav-link"} onClick={()=>filter("Série")}>Séries</button></nav>
    <div className="header-actions">
      <button className="icon-button downloads-shortcut" onClick={onDownloads} title="Mes téléchargements" aria-label="Mes téléchargements"><HardDrive size={17}/><span>{downloadCount}</span></button>
      <button className="install-button" onClick={onInstall} title={isInstalled ? "Application installée" : "Installer CineBox"} aria-label={isInstalled ? "CineBox installée" : "Installer CineBox"}>{isInstalled ? <CheckCircle2 size={16}/> : <Download size={16}/>}<span>{isInstalled ? "Installée" : "Installer"}</span></button>
      <label className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher"/></label>
      <button className={`icon-button ${favoritesOnly?"selected":""}`} onClick={()=>setFavoritesOnly(v=>!v)} title="Mes favoris" aria-label="Mes favoris"><Heart size={18}/><span className="favorite-count">{favoriteCount}</span></button>
      {user?.role!=="admin" && <button className="add-series-button" onClick={onAddSeries} title="Proposer ta propre série"><PlusCircle size={15}/><span>Ajouter ma série</span></button>}
      {user?.role==="admin" && <button className="icon-button admin-shortcut" onClick={onAdmin} title="Administration" aria-label="Administration"><ShieldCheck size={18}/></button>}
      {user ? <button className="user-pill" onClick={onLogout} title="Se déconnecter"><UserRound size={16}/><span>{user.name}</span><LogOut size={14}/></button> : <button className="login-button" onClick={onAuth}>Connexion</button>}
    </div>
  </header>;
}
