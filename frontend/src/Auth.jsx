import React, { useState } from 'react';
import { Building2, Mail, Lock, User, ArrowRight, Map, AlertCircle, Search, CheckCircle2, Loader2, Phone, Hash } from 'lucide-react';
import { apiLogin, apiRegister, apiVerificaCui, setToken } from './api.js';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);

  // Câmpuri formular
  const [email, setEmail]                   = useState('');
  const [parola, setParola]                 = useState('');
  const [confirmaParola, setConfirmaParola]  = useState('');
  const [nume, setNume]                      = useState('');
  const [cui, setCui]                        = useState('');
  const [telefon, setTelefon]                = useState('');
  const [rol, setRol]                        = useState('SUBCONTRACTOR');
  const [judet, setJudet]                    = useState('');

  const [eroare, setEroare]         = useState('');
  const [seIncarca, setSeIncarca]   = useState(false);

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

    if (!nume.trim())    { setEroare('Completează denumirea firmei.'); return; }
    if (!cui.trim())     { setEroare('Completează CUI-ul firmei.'); return; }
    if (!telefon.trim()) { setEroare('Completează telefonul de contact.'); return; }
    if (!judet)           { setEroare('Selectează județul în care are sediul firma.'); return; }
    if (!email.trim())   { setEroare('Completează adresa de email.'); return; }
    if (parola.length < 6) { setEroare('Parola trebuie să aibă cel puțin 6 caractere.'); return; }
    if (parola !== confirmaParola) { setEroare('Parolele nu coincid!'); return; }

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

  // ─── Verifică CUI-ul la ANAF și auto-completează denumirea firmei ───
  const verificaCuiApasat = async () => {
    if (!cui.trim()) { setCuiRezultat('gol'); return; }
    setCuiVerificand(true);
    setCuiRezultat(null);
    try {
      const data = await apiVerificaCui(cui.trim());
      setCuiRezultat(data);
      if (data.gasit && data.denumire && !nume.trim()) {
        setNume(data.denumire);
      }
    } catch (err) {
      setCuiRezultat('eroare');
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
      <div className="cb-blueprint-grid" style={{
        flex: '1 1 46%', position: 'relative', overflow: 'hidden', display: window.innerWidth < 900 ? 'none' : 'flex',
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
          <div style={{ display: window.innerWidth < 900 ? 'inline-flex' : 'none', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button type="button" onClick={() => setRol('SUBCONTRACTOR')} style={{ padding: '14px', borderRadius: '12px', border: `2px solid ${rol === 'SUBCONTRACTOR' ? '#2F6FED' : 'rgba(255,255,255,0.06)'}`, backgroundColor: rol === 'SUBCONTRACTOR' ? 'rgba(47,111,237,0.1)' : '#1e293b', color: rol === 'SUBCONTRACTOR' ? '#fff' : '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                      👷 Subcontractor
                    </button>
                    <button type="button" onClick={() => setRol('DEZVOLTATOR')} style={{ padding: '14px', borderRadius: '12px', border: `2px solid ${rol === 'DEZVOLTATOR' ? '#a855f7' : 'rgba(255,255,255,0.06)'}`, backgroundColor: rol === 'DEZVOLTATOR' ? 'rgba(168,85,247,0.1)' : '#1e293b', color: rol === 'DEZVOLTATOR' ? '#fff' : '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                      🏢 Dezvoltator
                    </button>
                  </div>
                </div>

                {/* Nume firmă */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Denumire Firmă / PFA</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    <input type="text" required value={nume} onChange={e => setNume(e.target.value)} placeholder="ex: SC Pro Construct SRL" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>

                {/* CUI + Telefon */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>CUI / CIF</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <Hash size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                        <input type="text" required value={cui} onChange={e => { setCui(e.target.value); setCuiRezultat(null); }} placeholder="Cod fiscal" style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
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

                {/* Rezultat verificare CUI */}
                {cuiRezultat && cuiRezultat !== 'gol' && cuiRezultat !== 'eroare' && (
                  cuiRezultat.gasit ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: 'rgba(34,178,125,0.1)', border: '1px solid rgba(34,178,125,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#22B27D', fontSize: '12.5px' }}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span><strong>{cuiRezultat.denumire}</strong> — firmă găsită la ANAF{cuiRezultat.platitorTva ? ', plătitoare de TVA' : ''}{cuiRezultat.stareInactiv ? ' ⚠️ marcată inactivă fiscal' : ''}.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '12.5px' }}>
                      <AlertCircle size={15} /> Nu am găsit nicio firmă cu acest CUI la ANAF.
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
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Sediul Central (Județ)</label>
                  <div style={{ position: 'relative' }}>
                    <Map size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569', zIndex: 3 }} />
                    <select required value={judet} onChange={e => setJudet(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: judet ? '#fff' : '#64748b', fontSize: '14px', boxSizing: 'border-box', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
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

            <button type="submit" disabled={seIncarca} style={{ background: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: seIncarca ? 'not-allowed' : 'pointer', opacity: seIncarca ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {seIncarca ? 'Se procesează...' : isLogin ? 'Intră în cont' : 'Creează cont'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <button onClick={schimbaModul} style={{ background: 'none', border: 'none', color: '#2F6FED', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {isLogin ? 'Nu ai cont? Înregistrează-te acum' : 'Ai deja cont? Conectează-te'}
            </button>
          </div>
        </div>

        <div style={{ display: window.innerWidth < 900 ? 'block' : 'none', textAlign: 'center', marginTop: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>© 2026 ConstructBid • Date stocate securizat în baza de date</div>
        </div>
      </div>
      </div>
    </div>
  );
}
