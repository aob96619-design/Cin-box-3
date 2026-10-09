import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ChevronRight, Film, Sparkles, Star, ShieldCheck } from "lucide-react";
import Header from "./components/Header.jsx";
import TitleCard from "./components/TitleCard.jsx";
import TitleModal from "./components/TitleModal.jsx";
import AuthModal from "./components/AuthModal.jsx";
import PlayerModal from "./components/PlayerModal.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import SeriesSubmissionModal from "./components/SeriesSubmissionModal.jsx";
import DownloadsModal from "./components/DownloadsModal.jsx";
import { listDownloads, saveDownload } from "./downloadStore.js";
import { api, json } from "./api.js";
import { fallbackTitles } from "./data/demo.js";

export default function App() {
  const [titles,setTitles]=useState(fallbackTitles); const [query,setQuery]=useState(""); const [activeFilter,setActiveFilter]=useState("Tout");
  const [favoritesOnly,setFavoritesOnly]=useState(false); const [favorites,setFavorites]=useState([]); const [user,setUser]=useState(null);
  const [authOpen,setAuthOpen]=useState(false); const [adminOpen,setAdminOpen]=useState(false); const [submissionOpen,setSubmissionOpen]=useState(false); const [selected,setSelected]=useState(null);
  const [playing,setPlaying]=useState(null); const [progress,setProgress]=useState({}); const [toast,setToast]=useState(""); const [apiOnline,setApiOnline]=useState(true);
  const [installPrompt,setInstallPrompt]=useState(null); const [isInstalled,setIsInstalled]=useState(false);
  const [showDownloads,setShowDownloads]=useState(false); const [downloads,setDownloads]=useState([]); const [downloadingId,setDownloadingId]=useState(""); const [downloadRefresh,setDownloadRefresh]=useState(0);

  const loadTitles=useCallback(async()=>{try{const data=await api(`/titles?q=${encodeURIComponent(query)}&type=${encodeURIComponent(activeFilter)}`);setTitles(data.results);setApiOnline(true);const sharedId=new URLSearchParams(window.location.search).get("title");if(sharedId){const sharedTitle=data.results.find(t=>String(t.id)===sharedId);if(sharedTitle){setSelected(sharedTitle);window.history.replaceState({},"",window.location.pathname+window.location.hash);}}}catch{setApiOnline(false);const localTitles=fallbackTitles.filter(t=>(activeFilter==="Tout"||t.type===activeFilter)&&(`${t.title} ${t.genre} ${t.year}`).toLowerCase().includes(query.toLowerCase()));setTitles(localTitles);const sharedId=new URLSearchParams(window.location.search).get("title");if(sharedId){const sharedTitle=localTitles.find(t=>String(t.id)===sharedId);if(sharedTitle){setSelected(sharedTitle);window.history.replaceState({},"",window.location.pathname+window.location.hash);}}}},[query,activeFilter]);
  const loadAccount=useCallback(async()=>{const token=localStorage.getItem("cinebox-token");if(!token){setUser(null);setFavorites([]);return;}try{const [me,fav,prog]=await Promise.all([api("/auth/me"),api("/favorites"),api("/progress")]);setUser(me.user);setFavorites(fav.ids);setProgress(Object.fromEntries(prog.items.map(p=>[p.titleId,p])));}catch{localStorage.removeItem("cinebox-token");setUser(null);setFavorites([]);}},[]);
  useEffect(()=>{
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    setIsInstalled(standalone);
    const onInstallPrompt = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const onInstalled = () => { setIsInstalled(true); setInstallPrompt(null); setToast("CineBox est installée sur ton appareil."); };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onInstallPrompt); window.removeEventListener("appinstalled", onInstalled); };
  },[]);

  async function installApp(){
    if(isInstalled){setToast("CineBox est déjà installée.");return;}
    if(!installPrompt){setToast("Dans Chrome sur Android : ouvre le menu ⋮ puis choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ». Le site doit être publié en HTTPS.");return;}
    try { await installPrompt.prompt(); const choice=await installPrompt.userChoice; if(choice?.outcome==="accepted") setToast("Installation de CineBox lancée."); }
    catch { setToast("Pour installer CineBox, ouvre le menu de ton navigateur puis choisis Installer l’application."); }
    finally { setInstallPrompt(null); }
  }

  useEffect(()=>{loadTitles();},[loadTitles]);
  useEffect(()=>{listDownloads().then(setDownloads).catch(()=>setDownloads([]));},[downloadRefresh]);
  useEffect(()=>{loadAccount();},[loadAccount]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(""),3200);return()=>clearTimeout(id);},[toast]);

  const filteredTitles=useMemo(()=>titles.filter(t=>(!favoritesOnly||favorites.includes(t.id))),[titles,favoritesOnly,favorites]);
  const featured=titles.find(t=>t.featured)||titles[0];
  async function auth(mode,form){const data=await api(`/auth/${mode==="login"?"login":"register"}`,json("POST",form));localStorage.setItem("cinebox-token",data.token);setUser(data.user);await loadAccount();setToast(`Bienvenue ${data.user.name} !`);}
  async function toggleFavorite(id){if(!user){setAuthOpen(true);setToast("Connecte-toi pour enregistrer tes favoris.");return;}try{const result=await api(`/favorites/${id}`,{method:"POST"});setFavorites(current=>result.active?[...new Set([...current,id])]:current.filter(x=>x!==id));setToast(result.active?"Ajouté aux favoris.":"Retiré des favoris.");}catch(e){setToast(e.message);}}
  function logout(){localStorage.removeItem("cinebox-token");setUser(null);setFavorites([]);setProgress({});setToast("Tu es déconnecté.");}
  async function play(item){if(!item.videoUrl){setToast("Cette fiche n'a pas encore de vidéo. Ajoute-en une dans l'administration.");return;}setSelected(null);setPlaying(item);}
  async function downloadVideo(item){
    if(!item?.videoUrl){setToast("Aucune vidéo disponible pour ce titre.");return;}
    if(downloads.some(d=>String(d.id)===String(item.id))){setToast("Cette vidéo est déjà dans tes téléchargements.");return;}
    setDownloadingId(String(item.id));
    try{
      const response=await fetch(new URL(item.videoUrl,window.location.origin).toString());
      if(!response.ok)throw new Error("Le serveur n'a pas fourni la vidéo. Réessaie plus tard.");
      const blob=await response.blob();
      if(!blob.type.startsWith("video/") && !/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(item.videoUrl)) throw new Error("Cette adresse ne semble pas être un fichier vidéo téléchargeable.");
      if(blob.size===0)throw new Error("Le fichier vidéo est vide.");
      await saveDownload(item,blob);setDownloadRefresh(v=>v+1);setToast("Vidéo enregistrée sur cet appareil. Elle pourra être regardée hors connexion.");
    }catch(e){setToast(e?.name==="QuotaExceededError"?"Espace de stockage insuffisant. Supprime une vidéo puis réessaie.":e.message||"Téléchargement impossible.");}
    finally{setDownloadingId("");}
  }
  async function saveProgress(id,seconds,duration){if(!user||!Number.isFinite(seconds)||!Number.isFinite(duration)||duration<=0)return;try{setProgress(p=>({...p,[id]:{titleId:id,seconds,duration}}));await api(`/progress/${id}`,json("PUT",{seconds,duration}));}catch{/* progression locale en mémoire conservée */}}
  const openAdmin=()=>setAdminOpen(true);
  const openSeriesSubmission=()=>{if(!user){setAuthOpen(true);setToast("Connecte-toi ou crée un compte pour proposer ta série.");return;}setSubmissionOpen(true);};

  return <div className="app-shell" id="home">
    <Header query={query} setQuery={setQuery} activeFilter={activeFilter} setActiveFilter={setActiveFilter} favoritesOnly={favoritesOnly} setFavoritesOnly={setFavoritesOnly} favoriteCount={favorites.length} user={user} onAuth={()=>setAuthOpen(true)} onLogout={logout} onAdmin={openAdmin} onAddSeries={openSeriesSubmission} onInstall={installApp} isInstalled={isInstalled} onDownloads={()=>setShowDownloads(true)} downloadCount={downloads.length}/>
    {!query&&!favoritesOnly&&activeFilter==="Tout"&&featured&&<section className="hero" style={{backgroundImage:`linear-gradient(90deg,#080b12 0%,rgba(8,11,18,.9) 30%,rgba(8,11,18,.2) 75%),linear-gradient(0deg,#080b12 0%,transparent 45%),url("${featured.backdrop||featured.poster}")`}}>
      <div className="hero-content"><div className="hero-kicker"><Sparkles size={15}/><span>LE CHOIX DE LA SEMAINE</span></div><h1>{featured.title}<span className="title-period">.</span></h1><div className="hero-meta"><span className="quality-tag">CINEBOX</span><span>{featured.year}</span><span>{featured.duration}</span><span className="rating"><Star size={13} fill="currentColor"/> {featured.rating}</span></div><p>{featured.description}</p><div className="hero-buttons"><button className="primary-button" onClick={()=>setSelected(featured)}><Film size={18}/> Découvrir</button><button className="ghost-button" onClick={()=>document.getElementById("catalogue")?.scrollIntoView({behavior:"smooth"})}>Explorer le catalogue <ArrowDownRight size={17}/></button></div><div className="hero-note"><span className="live-dot"/>{apiOnline?"Ton prochain coup de cœur commence ici.":"Mode démo : API hors ligne."}</div></div><div className="hero-index"><span>01</span><i/><span>{String(titles.length).padStart(2,"0")}</span></div>
    </section>}
    <main className="content" id="catalogue">
      <div className="section-heading"><div><div className="section-kicker">TA PROCHAINE SÉANCE</div><h2>{favoritesOnly?"Mes favoris":query?"Résultats":activeFilter==="Tout"?"À découvrir":`Les ${activeFilter.toLowerCase()}s`}<span className="title-period">.</span></h2><p className="section-subtitle">{filteredTitles.length} titre{filteredTitles.length!==1?"s":""} à explorer</p></div><div className="section-aside"><span>{user?`BONJOUR ${user.name.toUpperCase()}`:"UNE SÉLECTION POUR TOI"}</span><ChevronRight size={17}/></div></div>
      {filteredTitles.length?<div className="title-grid">{filteredTitles.map(item=><TitleCard key={item.id} item={item} isFavorite={favorites.includes(item.id)} onToggleFavorite={toggleFavorite} onOpen={setSelected} onNotice={setToast}/>)}</div>:<div className="empty-state"><Film size={36}/><h3>Aucun titre trouvé</h3><p>{favoritesOnly&&!user?"Connecte-toi pour retrouver tes favoris.":"Essaie un autre mot-clé ou modifie tes filtres."}</p><button className="secondary-button" onClick={()=>{setQuery("");setFavoritesOnly(false);setActiveFilter("Tout");}}>Réinitialiser</button></div>}
      {!query&&!favoritesOnly&&activeFilter==="Tout"&&<section className="newsletter"><div className="newsletter-icon"><Sparkles size={21}/></div><div><h3>Ta bibliothèque, tes découvertes.</h3><p>Connecte-toi pour conserver tes favoris et reprendre la lecture.</p></div><button className="secondary-button" onClick={()=>user?setToast("Tu es connecté à CineBox."):setAuthOpen(true)}>{user?"Compte connecté":"Créer un compte"} <ChevronRight size={16}/></button></section>}
    </main>
    <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark"><Film size={18}/></span><span>CINE<span className="brand-accent">BOX</span></span></a><span>Une expérience cinéma, à ta façon.</span><span>© {new Date().getFullYear()} CineBox · Catalogue autorisé uniquement</span></footer>
    {selected&&<TitleModal item={selected} onClose={()=>setSelected(null)} isFavorite={favorites.includes(selected.id)} onToggleFavorite={toggleFavorite} onPlay={play} progress={progress} onNotice={setToast} onDownload={downloadVideo} downloaded={downloads.some(d=>String(d.id)===String(selected.id))} downloading={downloadingId===String(selected.id)}/>}
    {showDownloads&&<DownloadsModal onClose={()=>setShowDownloads(false)} onPlay={item=>{setShowDownloads(false);setPlaying(item);}} onNotice={setToast} onChanged={()=>setDownloadRefresh(v=>v+1)} refreshKey={downloadRefresh}/>}
    {playing&&<PlayerModal item={playing} initialSeconds={progress[playing.id]?.seconds||0} onClose={()=>setPlaying(null)} onProgress={saveProgress}/>}
    {authOpen&&<AuthModal onClose={()=>setAuthOpen(false)} onSuccess={auth}/>}
    {adminOpen&&<AdminPanel onClose={()=>setAdminOpen(false)} onChanged={loadTitles}/>}
    {submissionOpen&&<SeriesSubmissionModal onClose={()=>setSubmissionOpen(false)} onSubmitted={()=>setToast("Série envoyée pour validation. Merci pour ta contribution !")}/>}
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}
