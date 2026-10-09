import { useState } from "react";
import { X, Clapperboard } from "lucide-react";
export default function AuthModal({ onClose, onSuccess }) {
  const [mode,setMode]=useState("login"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setError("");setBusy(true);try{await onSuccess(mode,{name,email,password});onClose();}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="auth-modal" role="dialog" aria-modal="true" aria-label="Connexion">
    <button className="modal-close icon-button" onClick={onClose} aria-label="Fermer"><X size={20}/></button>
    <div className="auth-logo"><span className="brand-mark"><Clapperboard size={22}/></span></div><h2>{mode==="login"?"Bon retour !":"Rejoins CineBox"}</h2><p className="muted">{mode==="login"?"Connecte-toi pour retrouver tes favoris.":"Crée un compte pour enregistrer tes films."}</p>
    <form onSubmit={submit} className="auth-form">
      {mode==="register"&&<label>Nom affiché<input required minLength="2" maxLength="60" value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
      <label>Adresse e-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
      <label>Mot de passe<input required minLength="8" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"}/></label>
      {error&&<p className="form-error">{error}</p>}
      <button className="primary-button wide" disabled={busy}>{busy?"Patiente…":mode==="login"?"Se connecter":"Créer mon compte"}</button>
    </form>
    <p className="auth-switch">{mode==="login"?"Pas encore de compte ?":"Tu as déjà un compte ?"} <button onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}>{mode==="login"?"Inscription":"Connexion"}</button></p>
  </section></div>;
}
