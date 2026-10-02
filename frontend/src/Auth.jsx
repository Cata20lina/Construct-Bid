import React, { useState } from 'react';
import { Building2, Mail, Lock, User, ArrowRight, Map, AlertCircle, Search, CheckCircle2, Loader2, Phone, Hash, X, KeyRound } from 'lucide-react';
import { apiLogin, apiRegister, apiVerificaCui, apiSolicitaResetareParola, apiReseteazaParola, setToken } from './api.js';
import { TERMENI_TEXT, CONFIDENTIALITATE_TEXT } from './legalContent.js';

// ─── Modal simplu pentru Termeni / Confidențialitate — platforma nu are
//     rutare proprie (e un SPA cu taburi din state), așa că cel mai simplu e
//     un overlay peste ecranul de autentificare, nu o pagină separată. ───
function LegalModal({ titlu, text, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#111827', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '640px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{titlu}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 22px', overflowY: 'auto', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {text}
        </div>
      </div>
    </div>
  );
}

export default function Auth({ onLoginSuccess, mesajInitial = '' }) {
  const [isLogin, setIsLogin] = useState(true);
  const [ecranActiv, setEcranActiv] = useState('auth'); // 'auth' | 'uita-parola'
  const [modalLegal, setModalLegal] = useState(null); // 'termeni' | 'confidentialitate' | null

  // Câmpuri formular
  const [email, setEmail]                   = useState('');
  const [parola, setParola]                 = useState('');
  const [confirmaParola, setConfirmaParola]  = useState('');
  const [nume, setNume]                      = useState('');
  const [cui, setCui]                        = useState('');
  const [telefon, setTelefon]                = useState('');
  const [rol, setRol]                        = useState('SUBCONTRACTOR');
  const [judet, setJudet]                    = useState('');
  // true când județul a fost completat din sediul social de la ANAF
  const [judetDinAnaf, setJudetDinAnaf]      = useState(false);
  const [termeniAcceptati, setTermeniAcceptati] = useState(false);

  const [eroare, setEroare]         = useState(mesajInitial);
  const [seIncarca, setSeIncarca]   = useState(false);

  // ─── Resetare parolă uitată — flux în 2 pași (cere cod → introdu cod+parolă) ──
  const [resetPas, setResetPas]                     = useState('cerere'); // 'cerere' | 'cod'
  const [resetEmail, setResetEmail]                 = useState('');
  const [resetCod, setResetCod]                     = useState('');
  const [resetParolaNoua, setResetParolaNoua]       = useState('');
  const [resetConfirmaParola, setResetConfirmaParola] = useState('');
  const [resetEroare, setResetEroare]               = useState('');
  const [resetMesaj, setResetMesaj]                 = useState('');
  const [resetSeIncarca, setResetSeIncarca]         = useState(false);

  // ─── Verificare CUI la ANAF (opțional, autocompletează denumirea firmei) ───
  const [cuiVerificand, setCuiVerificand] = useState(false);
  const [cuiRezultat, setCuiRezultat] = useState(null); // { denumire, platitorTva, stareInactiv } | 'eroare'

  const judeteRomania = [
    "Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani","Brașov","Brăila","București",
    "Buzău","Caraș-Severin","Călărași","Cluj","Constanța","Covasna","Dâmbovița","Dolj","Galați","Giurgiu",
    "Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov","Maramureș","Mehedinți","Mureș","Neamț",
    "Olt","Prahova","Satu Mare","Sălaj","Sibiu","Suceava","Teleorman","Timiș","Tulcea","Vaslui","Vâlcea","Vrancea"
  ];

  // ─── ÎNREGISTRARE — salvată direct în MongoDB, prin backend ───
  const handleRegister = async (e) => {
    e.preventDefault();
    setEroare('');

    if (!cui.trim())     { setEroare('Completează CUI-ul firmei.'); return; }
    // Denumirea vine doar de la ANAF, din CUI — firma nu o poate scrie singură
    if (!nume.trim())    { setEroare('Verifică CUI-ul la ANAF (butonul de lângă câmp) ca să se completeze denumirea firmei.'); return; }
    if (!telefon.trim()) { setEroare('Completează telefonul de contact.'); return; }
    if (!judet)           { setEroare('Selectează județul în care are sediul firma.'); return; }
    if (!email.trim())   { setEroare('Completează adresa de email.'); return; }
    if (parola.length < 6) { setEroare('Parola trebuie să aibă cel puțin 6 caractere.'); return; }
    if (parola !== confirmaParola) { setEroare('Parolele nu coincid!'); return; }
    if (!termeniAcceptati) { setEroare('Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate.'); return; }

    setSeIncarca(true);
    try {
      const data = await apiRegister({
        nume: nume.trim(),
        email: email.toLowerCase().trim(),
        parola,
        cui: cui.trim(),
        telefon: telefon.trim(),
        judet,
        rol,
        termeniAcceptati,
      });
      setToken(data.token);
      onLoginSuccess(data.utilizator);
    } catch (err) {
      setEroare(err.message || 'Eroare la înregistrare. Încearcă din nou.');
    } finally {
      setSeIncarca(false);
    }
  };

  // ─── LOGIN — verificat real în baza de date ───
  const handleLogin = async (e) => {
    e.preventDefault();
    setEroare('');
    setSeIncarca(true);
    try {
      const data = await apiLogin(email.toLowerCase().trim(), parola);
      setToken(data.token);
      onLoginSuccess(data.utilizator);
    } catch (err) {
      setEroare(err.message || 'Email sau parolă incorectă!');
    } finally {
      setSeIncarca(false);
    }
  };

  const schimbaModul = () => {
    setIsLogin(prev => !prev);
    setEroare('');
  };

  // ─── Pas 1: cere codul de resetare pe email ───
  const solicitaResetare = async (e) => {
    e.preventDefault();
    setResetEroare('');
    if (!resetEmail.trim()) { setResetEroare('Introdu adresa de email a contului.'); return; }
    setResetSeIncarca(true);
    try {
      const data = await apiSolicitaResetareParola(resetEmail.toLowerCase().trim());
      setResetMesaj(data?.mesaj || 'Dacă există un cont cu acest email, ți-am trimis un cod de resetare.');
      setResetPas('cod');
    } catch (err) {
      setResetEroare(err.message || 'Nu am putut trimite codul de resetare.');
    } finally {
      setResetSeIncarca(false);
    }
  };

  // ─── Pas 2: cod + parolă nouă → schimbă parola și autentifică direct ───
  const confirmaResetare = async (e) => {
    e.preventDefault();
    setResetEroare('');
    if (!resetCod.trim()) { setResetEroare('Introdu codul primit pe email.'); return; }
    if (resetParolaNoua.length < 6) { setResetEroare('Parola trebuie să aibă cel puțin 6 caractere.'); return; }
    if (resetParolaNoua !== resetConfirmaParola) { setResetEroare('Parolele nu coincid!'); return; }
    setResetSeIncarca(true);
    try {
      const data = await apiReseteazaParola(resetEmail.toLowerCase().trim(), resetCod.trim(), resetParolaNoua);
      setToken(data.token);
      onLoginSuccess(data.utilizator);
    } catch (err) {
      setResetEroare(err.message || 'Nu am putut reseta parola.');
    } finally {
      setResetSeIncarca(false);
    }
  };

  const inchideUitareParola = () => {
    setEcranActiv('auth');
    setResetPas('cerere');
    setResetEmail(''); setResetCod(''); setResetParolaNoua(''); setResetConfirmaParola('');
    setResetEroare(''); setResetMesaj('');
  };

  // ─── Verifică CUI-ul la ANAF și auto-completează denumirea firmei ───
  const verificaCuiApasat = async () => {
    if (!cui.trim()) { setCuiRezultat('gol'); return; }
    setCuiVerificand(true);
    setCuiRezultat(null);
    try {
      const data = await apiVerificaCui(cui.trim());
      setCuiRezultat(data);
      setNume(data.gasit && data.denumire ? data.denumire : '');
      if (data.gasit && data.judetPlatforma) { setJudet(data.judetPlatforma); setJudetDinAnaf(true); }
      else setJudetDinAnaf(false);
    } catch (err) {
      // 400 = CUI invalid, 404 = negăsit la ANAF; doar restul înseamnă ANAF indisponibil
      setNume('');
      if (err.status === 400 || err.status === 404) setCuiRezultat({ gasit: false, mesaj: err.message });
      else setCuiRezultat('eroare');
    } finally {
      setCuiVerificand(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', backgroundColor: '#090e1a',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>

      {/* ── Panou brand (ascuns pe mobil) — grilă tehnică + reper de colț ── */}
      <div className="cb-blueprint-grid cb-auth-brand" style={{
        flex: '1 1 46%', position: 'relative', overflow: 'hidden', display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between', padding: '48px',
        backgroundColor: '#0B0F16', borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(47,111,237,0.22), transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', background: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)', color: '#fff', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={17} strokeWidth={2.4} />
            <span style={{ position: 'absolute', top: '-3px', left: '-3px', width: '10px', height: '10px', borderTop: '2px solid #FF9E2C', borderLeft: '2px solid #FF9E2C', borderRadius: '3px 0 0 0' }} />
            <span style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '10px', height: '10px', borderBottom: '2px solid #FF9E2C', borderRight: '2px solid #FF9E2C', borderRadius: '0 0 3px 0' }} />
          </div>
          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '19px', fontWeight: '700', color: '#fff' }}>
            Construct<span style={{ color: '#5B93FF' }}>Bid</span>
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: '#FF9E2C', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Platformă B2B · Construcții</span>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', color: '#fff', fontSize: '34px', fontWeight: '700', lineHeight: '1.2', margin: '14px 0 16px', maxWidth: '420px' }}>
            De la anunț la contract, pe un singur șantier digital.
          </h1>
          <p style={{ color: '#8b94a3', fontSize: '14.5px', lineHeight: '1.7', maxWidth: '380px', margin: 0 }}>
            Publici proiectul, primești oferte de la subcontractori verificați și negociezi direct, fără intermediari.
          </p>
        </div>

        <div style={{ position: 'relative', fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: '#5B6473' }}>
          © 2026 ConstructBid — date stocate securizat
        </div>
      </div>

      {/* ── Panou formular ── */}
      <div style={{ flex: '1 1 54%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="cb-doar-mobil-flex" style={{ display: 'none', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)', color: '#fff', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
              <Building2 size={22} />
            </div>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '24px', fontWeight: '700', color: '#fff' }}>
              Construct<span style={{ color: '#2F6FED' }}>Bid</span>
            </span>
          </div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', color: '#fff', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>
            {isLogin ? 'Bine ai revenit' : 'Creează un cont nou'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            {isLogin ? 'Conectează-te la contul firmei tale.' : 'Înregistrează firma ta pe platformă.'}
          </p>
        </div>

        <div style={{ backgroundColor: '#111827', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>

          {ecranActiv === 'uita-parola' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{ background: 'rgba(47,111,237,0.12)', borderRadius: '10px', padding: '8px', display: 'flex' }}>
                  <KeyRound size={18} color="#5B93FF" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Resetează parola</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                    {resetPas === 'cerere' ? 'Introdu emailul contului tău.' : 'Introdu codul primit pe email și noua parolă.'}
                  </div>
                </div>
              </div>

              {resetEroare && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', color: '#f87171', fontSize: '13px', fontWeight: '600' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} /> {resetEroare}
                </div>
              )}
              {resetMesaj && resetPas === 'cod' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(34,178,125,0.1)', border: '1px solid rgba(34,178,125,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', color: '#22B27D', fontSize: '12.5px' }}>
                  <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> {resetMesaj}
                </div>
              )}

              {resetPas === 'cerere' ? (
                <form onSubmit={solicitaResetare} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>E-mail Cont</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="nume@companie.ro" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={resetSeIncarca} style={{ background: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: resetSeIncarca ? 'not-allowed' : 'pointer', opacity: resetSeIncarca ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {resetSeIncarca ? 'Se trimite...' : 'Trimite codul'} <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <form onSubmit={confirmaResetare} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Cod din 6 cifre</label>
                    <input type="text" inputMode="numeric" maxLength={6} required value={resetCod} onChange={e => setResetCod(e.target.value.replace(/[^0-9]/g, ''))} placeholder="123456" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', letterSpacing: '3px', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Parolă Nouă</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input type="password" required value={resetParolaNoua} onChange={e => setResetParolaNoua(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Confirmă Parola Nouă</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input type="password" required value={resetConfirmaParola} onChange={e => setResetConfirmaParola(e.target.value)} placeholder="Repetă parola" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={resetSeIncarca} style={{ background: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: resetSeIncarca ? 'not-allowed' : 'pointer', opacity: resetSeIncarca ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {resetSeIncarca ? 'Se procesează...' : 'Schimbă parola și intră în cont'} <ArrowRight size={16} />
                  </button>
                </form>
              )}

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button onClick={inchideUitareParola} style={{ background: 'none', border: 'none', color: '#2F6FED', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  ← Înapoi la autentificare
                </button>
              </div>
            </>
          ) : (
          <>
          {eroare && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', color: '#f87171', fontSize: '13px', fontWeight: '600' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {eroare}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {!isLogin && (
              <>
                {/* Tip cont */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Tipul Contului</label>
                  <div className="cb-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <button type="button" onClick={() => setRol('SUBCONTRACTOR')} style={{ padding: '14px 8px', borderRadius: '12px', border: `2px solid ${rol === 'SUBCONTRACTOR' ? '#2F6FED' : 'rgba(255,255,255,0.06)'}`, backgroundColor: rol === 'SUBCONTRACTOR' ? 'rgba(47,111,237,0.1)' : '#1e293b', color: rol === 'SUBCONTRACTOR' ? '#fff' : '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      👷 Subcontractor
                    </button>
                    <button type="button" onClick={() => setRol('DEZVOLTATOR')} style={{ padding: '14px 8px', borderRadius: '12px', border: `2px solid ${rol === 'DEZVOLTATOR' ? '#a855f7' : 'rgba(255,255,255,0.06)'}`, backgroundColor: rol === 'DEZVOLTATOR' ? 'rgba(168,85,247,0.1)' : '#1e293b', color: rol === 'DEZVOLTATOR' ? '#fff' : '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      🏢 Dezvoltator
                    </button>
                    <button type="button" onClick={() => setRol('FURNIZOR')} style={{ padding: '14px 8px', borderRadius: '12px', border: `2px solid ${rol === 'FURNIZOR' ? '#FF9E2C' : 'rgba(255,255,255,0.06)'}`, backgroundColor: rol === 'FURNIZOR' ? 'rgba(255,158,44,0.1)' : '#1e293b', color: rol === 'FURNIZOR' ? '#fff' : '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      📦 Furnizor
                    </button>
                  </div>
                </div>

                {/* CUI + Telefon */}
                <div className="cb-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>CUI / CIF</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <Hash size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                        <input type="text" required value={cui} onChange={e => { setCui(e.target.value); setCuiRezultat(null); setNume(''); if (judetDinAnaf) { setJudet(''); setJudetDinAnaf(false); } }} onBlur={() => { if (cui.trim() && !nume) verificaCuiApasat(); }} placeholder="Cod fiscal" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                      <button type="button" onClick={verificaCuiApasat} disabled={cuiVerificand}
                        title="Verifică CUI la ANAF"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', flexShrink: 0, borderRadius: '12px', border: '1px solid rgba(47,111,237,0.3)', backgroundColor: 'rgba(47,111,237,0.1)', color: '#5B93FF', cursor: cuiVerificand ? 'default' : 'pointer' }}>
                        {cuiVerificand ? <Loader2 size={16} className="spin-icon" /> : <Search size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Telefon Contact</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                      <input type="tel" required value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="07xx xxx xxx" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* Nume firmă */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Denumire firmă (de la ANAF)</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    <input type="text" readOnly tabIndex={-1} value={nume} placeholder="Se completează automat după verificarea CUI" title="Denumirea oficială se preia de la ANAF, din CUI" style={{ cursor: 'default', opacity: nume ? 1 : 0.7, width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>

                {/* Rezultat verificare CUI */}
                {cuiRezultat && cuiRezultat !== 'gol' && cuiRezultat !== 'eroare' && (
                  cuiRezultat.gasit ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: 'rgba(34,178,125,0.1)', border: '1px solid rgba(34,178,125,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#22B27D', fontSize: '12.5px' }}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span><strong>{cuiRezultat.denumire}</strong> — firmă găsită la ANAF{cuiRezultat.platitorTva ? ', plătitoare de TVA' : ''}{cuiRezultat.radiata ? ' ⚠️ radiată' : cuiRezultat.stareInactiv ? ' ⚠️ marcată inactivă fiscal' : ''}.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '12.5px' }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} /> {cuiRezultat.mesaj || 'Nu am găsit nicio firmă cu acest CUI la ANAF.'}
                    </div>
                  )
                )}
                {cuiRezultat === 'gol' && (
                  <div style={{ fontSize: '12px', color: '#f87171' }}>Introdu CUI-ul înainte de verificare.</div>
                )}
                {cuiRezultat === 'eroare' && (
                  <div style={{ fontSize: '12px', color: '#f87171' }}>Serviciul ANAF nu a răspuns. Poți continua înregistrarea și fără verificare.</div>
                )}

                {/* Județ */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>{judetDinAnaf ? 'Sediul social (județ, de la ANAF)' : 'Sediul Central (Județ)'}</label>
                  <div style={{ position: 'relative' }}>
                    <Map size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569', zIndex: 3 }} />
                    <select required disabled={judetDinAnaf} title={judetDinAnaf ? 'Județul sediului social, preluat de la ANAF' : undefined} value={judet} onChange={e => setJudet(e.target.value)} style={{ opacity: judetDinAnaf ? 0.85 : 1, width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: judet ? '#fff' : '#64748b', fontSize: '14px', boxSizing: 'border-box', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                      <option value="" disabled hidden>Alege județul...</option>
                      {judeteRomania.map(j => <option key={j} value={j} style={{ backgroundColor: '#0f172a', color: '#fff' }}>{j}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>▼</div>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>E-mail Oficial</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nume@companie.ro" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>

            {/* Parolă */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Parolă</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input type="password" required value={parola} onChange={e => setParola(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>

            {/* Confirmă parolă */}
            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Confirmă Parola</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                  <input type="password" required value={confirmaParola} onChange={e => setConfirmaParola(e.target.value)} placeholder="Repetă parola" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
            )}

            {!isLogin && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1.5 }}>
                <input type="checkbox" checked={termeniAcceptati} onChange={e => setTermeniAcceptati(e.target.checked)} style={{ marginTop: '2px', flexShrink: 0, width: '16px', height: '16px', accentColor: '#2F6FED', cursor: 'pointer' }} />
                <span>
                  Am citit și sunt de acord cu{' '}
                  <span onClick={(e) => { e.preventDefault(); setModalLegal('termeni'); }} style={{ color: '#5B93FF', fontWeight: '600', cursor: 'pointer' }}>Termenii și Condițiile</span>
                  {' '}și{' '}
                  <span onClick={(e) => { e.preventDefault(); setModalLegal('confidentialitate'); }} style={{ color: '#5B93FF', fontWeight: '600', cursor: 'pointer' }}>Politica de Confidențialitate</span>.
                </span>
              </label>
            )}

            <button type="submit" disabled={seIncarca} style={{ background: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: seIncarca ? 'not-allowed' : 'pointer', opacity: seIncarca ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {seIncarca ? 'Se procesează...' : isLogin ? 'Intră în cont' : 'Creează cont'}
              <ArrowRight size={16} />
            </button>
          </form>

          {isLogin && (
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button onClick={() => setEcranActiv('uita-parola')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>
                Ai uitat parola?
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '18px' }}>
            <button onClick={schimbaModul} style={{ background: 'none', border: 'none', color: '#2F6FED', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {isLogin ? 'Nu ai cont? Înregistrează-te acum' : 'Ai deja cont? Conectează-te'}
            </button>
          </div>
          </>
          )}
        </div>

        <div className="cb-doar-mobil" style={{ display: 'none', textAlign: 'center', marginTop: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>© 2026 ConstructBid • Date stocate securizat în baza de date</div>
        </div>
      </div>
      </div>

      {modalLegal === 'termeni' && <LegalModal titlu="Termeni și Condiții" text={TERMENI_TEXT} onClose={() => setModalLegal(null)} />}
      {modalLegal === 'confidentialitate' && <LegalModal titlu="Politica de Confidențialitate" text={CONFIDENTIALITATE_TEXT} onClose={() => setModalLegal(null)} />}
    </div>
  );
}
