import { useEffect, useState } from "react";
import { X, Plus, Trash2, Pencil, Upload, Film, Users, Heart, Tv } from "lucide-react";
import { api, json } from "../api.js";

const blank={title:"",type:"Film",year:new Date().getFullYear(),genre:"Drame",rating:"—",duration:"",poster:"",backdrop:"",description:"",videoUrl:"",featured:false};
export default function AdminPanel({ onClose, onChanged }) {
  const [items,setItems]=useState([]); const [submissions,setSubmissions]=useState([]); const [stats,setStats]=useState(null); const [form,setForm]=useState(blank); const [editing,setEditing]=useState(""); const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(false);
  async function load(){try{const [titles,s,pending]=await Promise.all([api("/titles"),api("/admin/stats"),api("/admin/submissions")]);setItems(titles.results);setStats(s);setSubmissions(pending.results||[]);}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  function change(key,value){setForm(f=>({...f,[key]:value}));}
  async function upload(kind,file){if(!file)return;setError("");setNotice("Téléversement en cours…");try{const data=new FormData();data.append(kind,file);const result=await api(`/admin/upload/${kind}`,{method:"POST",body:data});change(kind==="poster"?"poster":"videoUrl",result.url);setNotice("Fichier téléversé.");}catch(e){setError(e.message);setNotice("");}}
  async function save(e){e.preventDefault();setBusy(true);setError("");setNotice("");try{const payload={...form,year:Number(form.year),featured:Boolean(form.featured)};if(editing)await api(`/admin/titles/${editing}`,json("PUT",payload));else await api("/admin/titles",json("POST",payload));setForm(blank);setEditing("");setNotice("Titre enregistré.");await load();onChanged();}catch(e){setError(e.message);}finally{setBusy(false);}}
  function edit(item){setForm({...blank,...item});setEditing(item.id);setError("");setNotice("");window.scrollTo({top:0,behavior:"smooth"});}
  async function reviewSubmission(item, action){
    setError(""); setNotice("");
    try {
      await api(`/admin/submissions/${item.id}/${action}`, { method: "POST" });
      setNotice(action === "approve" ? `« ${item.title} » est publiée.` : `La proposition « ${item.title} » a été refusée.`);
      await load(); onChanged();
    } catch(e) { setError(e.message); }
  }
  async function remove(item){if(!confirm(`Supprimer « ${item.title} » ?`))return;try{await api(`/admin/titles/${item.id}`,{method:"DELETE"});setNotice("Titre supprimé.");await load();onChanged();}catch(e){setError(e.message);}}
  return <div className="admin-backdrop"><section className="admin-panel"><header className="admin-header"><div><span className="eyebrow">ESPACE GESTION</span><h2>Administration</h2></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X/></button></header>
    {stats&&<div className="stats-grid"><div><Film/><strong>{stats.titles}</strong><span>Titres</span></div><div><Tv/><strong>{stats.series}</strong><span>Séries</span></div><div><Users/><strong>{stats.users}</strong><span>Comptes</span></div><div><Heart/><strong>{stats.favorites}</strong><span>Favoris</span></div></div>}
    {submissions.length>0&&<section className="submission-review"><h3>Propositions de la communauté ({submissions.length})</h3><p>Vérifie que la personne a le droit de publier les contenus avant de les approuver.</p>{submissions.map(item=><article className="submission-review-item" key={item.id}><div className="admin-item-copy"><strong>{item.title}</strong><span>{item.type} · {item.year} · {item.genre}</span><small>{item.description||"Sans description"}</small>{item.videoUrl&&<a href={item.videoUrl} target="_blank" rel="noreferrer">Vérifier la vidéo</a>}</div><div className="submission-actions"><button className="primary-button" onClick={()=>reviewSubmission(item,"approve")}>Publier</button><button className="secondary-button" onClick={()=>reviewSubmission(item,"reject")}>Refuser</button></div></article>)}</section>}
    <div className="admin-columns"><form className="admin-form" onSubmit={save}><h3>{editing?"Modifier un titre":"Ajouter un titre"}</h3>
      <label>Titre<input required maxLength="140" value={form.title} onChange={e=>change("title",e.target.value)}/></label>
      <div className="form-row"><label>Type<select value={form.type} onChange={e=>change("type",e.target.value)}><option>Film</option><option>Série</option></select></label><label>Année<input type="number" min="1888" max="2100" value={form.year} onChange={e=>change("year",e.target.value)} required/></label></div>
      <div className="form-row"><label>Genre<input required value={form.genre} onChange={e=>change("genre",e.target.value)}/></label><label>Note<input value={form.rating} onChange={e=>change("rating",e.target.value)}/></label></div>
      <label>Durée / saisons<input value={form.duration} onChange={e=>change("duration",e.target.value)} placeholder="1 h 45 ou 2 saisons"/></label>
      <label>Affiche (URL ou téléversement)<input value={form.poster} onChange={e=>change("poster",e.target.value)} placeholder="https://…"/></label><label className="upload-label"><Upload size={15}/> Téléverser une affiche<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={e=>upload("poster",e.target.files?.[0])}/></label>
      <label>Image de couverture<input value={form.backdrop} onChange={e=>change("backdrop",e.target.value)} placeholder="URL de l'image"/></label>
      <label>URL directe de la vidéo<input value={form.videoUrl} onChange={e=>change("videoUrl",e.target.value)} placeholder="/media/… ou URL MP4"/></label><label className="upload-label"><Upload size={15}/> Téléverser une vidéo<input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={e=>upload("video",e.target.files?.[0])}/></label>
      <label>Description<textarea rows="4" maxLength="5000" value={form.description} onChange={e=>change("description",e.target.value)}/></label>
      <label className="check-label"><input type="checkbox" checked={form.featured} onChange={e=>change("featured",e.target.checked)}/> Mettre en avant</label>
      {error&&<p className="form-error">{error}</p>}{notice&&<p className="form-notice">{notice}</p>}
      <div className="form-row"><button className="primary-button" disabled={busy}><Plus size={16}/>{busy?"Enregistrement…":editing?"Enregistrer":"Ajouter le titre"}</button>{editing&&<button type="button" className="secondary-button" onClick={()=>{setForm(blank);setEditing("");}}>Annuler</button>}</div>
    </form>
    <div className="admin-list"><h3>Catalogue ({items.length})</h3>{items.map(item=><article className="admin-item" key={item.id}><img src={item.poster} alt=""/><div className="admin-item-copy"><strong>{item.title}</strong><span>{item.type} · {item.year} · {item.genre}</span><small>{item.videoUrl?"Vidéo configurée":"Sans vidéo"}</small></div><button className="icon-button" onClick={()=>edit(item)} aria-label="Modifier"><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>remove(item)} aria-label="Supprimer"><Trash2 size={16}/></button></article>)}</div></div>
  </section></div>;
}
