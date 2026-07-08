import React, { useState, useEffect } from 'react';
import {
  Building2, Mail, ShieldCheck, Briefcase, MapPin, Hash, ChevronRight, Star,
  Phone, Users, Layers, Wrench, Zap, Paintbrush2, CheckCircle2, Pencil,
  Send, TrendingUp, FolderKanban, AlertTriangle, X, Loader2,
  Plus, Trash2, Calendar, Trophy, Hammer, Search, Coins, Globe, Award, FileUp, Paperclip,
} from 'lucide-react';
import { apiActualizeazaProfil, apiAdaugaLucrare, apiStergeLucrare, apiAdaugaDisponibilitate, apiStergeDisponibilitate, apiContactOferta, apiVerificaCont, apiRetrimiteCodVerificare, apiVerificaCuiProfil, apiAdaugaRecomandare, apiStergeRecomandare, apiUploadFisiere, apiEvaluariPrimite, SERVER_URL } from '../api.js';

const CATEGORII_SERVICII = [
  { value: 'Structuri',   label: 'Structuri & Betoane',              icon: <Layers size={15} />,      color: '#2F6FED' },
  { value: 'Instalații',  label: 'Instalații (Sanitare/Termice)',    icon: <Wrench size={15} />,      color: '#f59e0b' },
  { value: 'Electrice',   label: 'Sisteme Electrice & Automatizări', icon: <Zap size={15} />,          color: '#a855f7' },
  { value: 'Finisaje',    label: 'Finisaje & Amenajări',             icon: <Paintbrush2 size={15} />, color: '#10b981' },
];

const JUDETE = ['București', 'Cluj', 'Timiș', 'Constanța', 'Iași', 'Brașov'];

export default function ProfilView({ user, t, proiecte = [], oferteleMele = [], setActiveTab, setUser, setProiectSelectat }) {
  const esteSubcontractor = user?.rol === 'SUBCONTRACTOR';
  const userId = user?.id || user?._id;

  const proiecteleMele = proiecte.filter(p => p.dezvoltator?._id === userId);
  const totalOferteIntrate = proiecte.reduce((acc, p) => acc + (p.oferte || 0), 0);
  const totalLicitatValoare = oferteleMele.reduce((acc, o) => acc + Number(o.valoare || 0), 0);

  const statistici = esteSubcontractor
    ? [
        { titlu: 'Oferte depuse', valoare: oferteleMele.length, icon: <Send size={18} />, color: '#2F6FED', bg: 'rgba(47,111,237,0.1)' },
        { titlu: 'Valoare ofertată', valoare: `${totalLicitatValoare.toLocaleString()} RON`, icon: <TrendingUp size={18} />, color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
        { titlu: 'Scor de încredere', valoare: '4.8', icon: <Star size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      ]
    : [
        { titlu: 'Proiecte publicate', valoare: proiecteleMele.length, icon: <FolderKanban size={18} />, color: '#2F6FED', bg: 'rgba(47,111,237,0.1)' },
        { titlu: 'Oferte primite', valoare: totalOferteIntrate, icon: <Send size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { titlu: 'Token-uri disponibile', valoare: typeof user?.tokenuri === 'number' ? user.tokenuri : '–', icon: <Coins size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      ];

  const campProfil = [
    { icon: <Building2 size={16} />, label: 'Companie', valoare: user?.nume },
    { icon: <Hash size={16} />, label: 'CUI', valoare: user?.cui || 'Nespecificat' },
    { icon: <Mail size={16} />, label: 'Email', valoare: user?.email || 'Nespecificat' },
    { icon: <MapPin size={16} />, label: 'Județ Registru', valoare: user?.judet || 'Nespecificat' },
    { icon: <Phone size={16} />, label: 'Telefon', valoare: user?.telefon || 'Nespecificat' },
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8px 4px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Card principal de identitate ── */}
      <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '20px', overflow: 'hidden', boxShadow: `0 4px 24px ${t.shadow}` }}>
        <div style={{ height: '96px', background: 'linear-gradient(135deg, #1D4FC4 0%, #6d28d9 100%)', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: '-30px', left: '32px',
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #2F6FED, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `4px solid ${t.bgCard}`,
            fontSize: '24px', fontWeight: '900', color: '#fff',
          }}>
            {(user?.nume || 'C').charAt(0).toUpperCase()}
          </div>
        </div>

        <div style={{ padding: '46px 32px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '26px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: t.textPrincipal, margin: '0 0 6px' }}>{user?.nume}</h2>
              <p style={{ fontSize: '13px', color: t.textSecundar, margin: 0 }}>
                {esteSubcontractor ? 'Firmă de execuție / subcontractor specializat' : 'Dezvoltator imobiliar — entitate juridică înregistrată'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px',
                backgroundColor: esteSubcontractor ? 'rgba(47,111,237,0.1)' : 'rgba(168,85,247,0.1)',
                color: esteSubcontractor ? '#2F6FED' : '#a855f7',
                padding: '5px 12px', borderRadius: '8px', textTransform: 'uppercase',
              }}>
                {user?.rol}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: '800',
                backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981',
                padding: '5px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <ShieldCheck size={12} /> VERIFICAT
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
            {campProfil.map((camp, i) => (
              <div key={i} style={{ backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '13px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>
                  <span style={{ color: '#2F6FED' }}>{camp.icon}</span>
                  {camp.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: t.textPrincipal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp.valoare}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Statistici rapide ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {statistici.map((s, i) => (
          <div key={i} style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', backgroundColor: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.titlu}</div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: t.textPrincipal }}>{s.valoare}</div>
          </div>
        ))}
      </div>

      {/* ── Secțiune specifică rolului ── */}
      {esteSubcontractor
        ? <ServiciiProfilCard t={t} user={user} setUser={setUser} />
        : <ProiecteleMeleCard t={t} proiecte={proiecteleMele} setActiveTab={setActiveTab} setProiectSelectat={setProiectSelectat} />
      }

      {/* ── Portofoliu de lucrări + disponibilitate — doar SUBCONTRACTOR ── */}
      {esteSubcontractor && <PortofoliuCard t={t} user={user} setUser={setUser} />}
      {esteSubcontractor && <RecomandariCard t={t} user={user} setUser={setUser} />}
      {esteSubcontractor && <RatingCard t={t} user={user} />}
      {esteSubcontractor && <DisponibilitateCard t={t} user={user} setUser={setUser} />}

      {/* ── Oferte câștigate — date de contact ale beneficiarului ── */}
      {esteSubcontractor && <OferteCastigateCard t={t} oferteleMele={oferteleMele} />}

      {/* ── Activitate recentă: oferte pentru subcontractor ── */}
      {esteSubcontractor && (
        <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar }}>
            Ofertele Tale Recente
          </div>
          <div style={{ padding: '18px 24px' }}>
            {oferteleMele.length === 0 ? (
              <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0 }}>Nu ai trimis nicio ofertă financiară momentan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {oferteleMele.slice(0, 5).map(o => (
                  <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: t.textPrincipal }}>
                        {o.proiect?.titlu || 'Proiect'} — <span style={{ color: '#10b981' }}>{Number(o.valoare).toLocaleString()} {o.moneda}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: t.textSecundar, marginTop: '2px' }}>Execuție: {o.termenExecutie} zile</div>
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Banner status cont (verificare email + CUI) ── */}
      <StatusContCard t={t} user={user} setUser={setUser} setActiveTab={setActiveTab} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card status cont — verificare email (cod trimis pe email) + verificare CUI
// ─────────────────────────────────────────────────────────────────────────
function StatusContCard({ t, user, setUser, setActiveTab }) {
  const [cod, setCod] = useState('');
  const [seVerifica, setSeVerifica] = useState(false);
  const [seRetrimite, setSeRetrimite] = useState(false);
  const [eroare, setEroare] = useState('');
  const [mesajRetrimitere, setMesajRetrimitere] = useState('');
  const [cuiSeVerifica, setCuiSeVerifica] = useState(false);
  const [cuiEroare, setCuiEroare] = useState('');

  const trimiteCod = async (e) => {
    e.preventDefault();
    setEroare('');
    if (!cod.trim()) { setEroare('Introdu codul primit pe email.'); return; }
    setSeVerifica(true);
    try {
      const { utilizator } = await apiVerificaCont(cod.trim());
      setUser(prev => ({ ...prev, ...utilizator }));
    } catch (err) {
      setEroare(err.message || 'Cod invalid.');
    } finally {
      setSeVerifica(false);
    }
  };

  const retrimiteCod = async () => {
    setEroare('');
    setMesajRetrimitere('');
    setSeRetrimite(true);
    try {
      await apiRetrimiteCodVerificare();
      setMesajRetrimitere('Cod nou trimis pe email.');
    } catch (err) {
      setEroare(err.message || 'Nu am putut retrimite codul.');
    } finally {
      setSeRetrimite(false);
    }
  };

  const verificaCui = async () => {
    setCuiEroare('');
    setCuiSeVerifica(true);
    try {
      const data = await apiVerificaCuiProfil();
      setUser(prev => ({ ...prev, ...data.utilizator }));
    } catch (err) {
      setCuiEroare(err.message || 'Nu am putut verifica CUI-ul la ANAF.');
    } finally {
      setCuiSeVerifica(false);
    }
  };

  if (!user?.verificat) {
    return (
      <div style={{ backgroundColor: t.bgCard, border: '1px solid rgba(245,158,11,0.35)', borderRadius: '16px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: t.textPrincipal }}>Verifică-ți adresa de email</div>
            <div style={{ fontSize: '13px', color: t.textSecundar }}>Ți-am trimis un cod din 6 cifre pe {user?.email}. Introdu-l mai jos.</div>
          </div>
        </div>
        <form onSubmit={trimiteCod} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="Cod din 6 cifre"
            value={cod} onChange={e => setCod(e.target.value.replace(/[^0-9]/g, ''))}
            style={{ flex: '1 1 160px', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '14px', letterSpacing: '3px', outline: 'none' }}
          />
          <button type="submit" disabled={seVerifica} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2F6FED', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 18px', fontSize: '13px', fontWeight: '700', cursor: seVerifica ? 'default' : 'pointer' }}>
            {seVerifica ? <Loader2 size={14} className="spin-icon" /> : <CheckCircle2 size={14} />} Confirmă
          </button>
          <button type="button" onClick={retrimiteCod} disabled={seRetrimite} style={{ background: 'none', border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: t.textSecundar, cursor: seRetrimite ? 'default' : 'pointer' }}>
            {seRetrimite ? 'Se trimite...' : 'Retrimite codul'}
          </button>
        </form>
        {eroare && <div style={{ fontSize: '12.5px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={13} /> {eroare}</div>}
        {mesajRetrimitere && <div style={{ fontSize: '12.5px', color: '#10b981' }}>{mesajRetrimitere}</div>}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: t.textPrincipal }}>Cont activ și verificat</div>
            <div style={{ fontSize: '13px', color: t.textSecundar }}>Eligibil pentru toate licitațiile B2B de pe platformă.</div>
          </div>
        </div>
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('santiere')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#2F6FED', color: '#fff', border: 'none', borderRadius: '10px',
              padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Briefcase size={14} /> Vezi Licitații <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Hash size={16} color={user?.cuiVerificat ? '#10b981' : t.textSecundar} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: t.textPrincipal }}>
              CUI {user?.cui} {user?.cuiVerificat ? '— verificat la ANAF' : '— neverificat'}
            </div>
            {user?.cuiVerificat && user?.cuiDenumireOficiala && (
              <div style={{ fontSize: '12px', color: t.textSecundar }}>{user.cuiDenumireOficiala}</div>
            )}
          </div>
        </div>
        <button onClick={verificaCui} disabled={cuiSeVerifica} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: `1px solid ${t.border}`, borderRadius: '10px', padding: '9px 14px', fontSize: '12.5px', fontWeight: '600', color: t.textSecundar, cursor: cuiSeVerifica ? 'default' : 'pointer' }}>
          {cuiSeVerifica ? <Loader2 size={13} className="spin-icon" /> : <Search size={13} />}
          {user?.cuiVerificat ? 'Re-verifică CUI' : 'Verifică CUI la ANAF'}
        </button>
      </div>
      {cuiEroare && <div style={{ fontSize: '12.5px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={13} /> {cuiEroare}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Proiectele mele" — pentru DEZVOLTATOR
// ─────────────────────────────────────────────────────────────────────────
function ProiecteleMeleCard({ t, proiecte, setActiveTab, setProiectSelectat }) {
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar }}>
        Proiectele Tale Publicate
      </div>
      <div style={{ padding: '18px 24px' }}>
        {proiecte.length === 0 ? (
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0 }}>Nu ai publicat niciun proiect încă.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {proiecte.map(p => (
              <div
                key={p._id}
                onClick={() => { setProiectSelectat && setProiectSelectat(p); setActiveTab && setActiveTab('santiere'); }}
                style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontWeight: '800', fontSize: '14px', color: '#2F6FED' }}>{p.titlu}</span>
                  <ChevronRight size={15} color={t.textSecundar} />
                </div>
                <div style={{ fontSize: '12px', color: t.textSecundar, marginTop: '6px' }}>
                  {(p.oferte ?? 0) === 0 ? 'Niciun subcontractor nu a licitat încă.' : `${p.oferte} oferte primite`}
                  {p.licitatieFinalizata ? ' • licitație finalizată' : ''}
                  {' • '}{p.tipOfertare === 'dinamica' ? 'licitație live' : 'ofertare statică'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Serviciile mele" — pentru SUBCONTRACTOR. Asta E profilul lui de
// servicii (categorii executate, zone de activitate, descriere firmă),
// nu un loc unde se mai postează anunțuri separate.
// ─────────────────────────────────────────────────────────────────────────
function ServiciiProfilCard({ t, user, setUser }) {
  const [editare, setEditare] = useState(false);
  const [salvand, setSalvand] = useState(false);
  const [eroare, setEroare] = useState('');
  const [salvat, setSalvat] = useState(false);
  const [focusat, setFocusat] = useState(null);

  const [form, setForm] = useState({
    descriere: user?.descriere || '',
    aniExperienta: user?.aniExperienta ?? '',
    nrAngajati: user?.nrAngajati ?? '',
    telefon: user?.telefon || '',
    siteWeb: user?.siteWeb || '',
    categoriiServicii: user?.categoriiServicii || [],
    judeteServicii: user?.judeteServicii || [],
  });

  const toggleCategorie = (val) => setForm(prev => ({
    ...prev,
    categoriiServicii: prev.categoriiServicii.includes(val)
      ? prev.categoriiServicii.filter(c => c !== val)
      : [...prev.categoriiServicii, val],
  }));

  const toggleJudet = (val) => setForm(prev => ({
    ...prev,
    judeteServicii: prev.judeteServicii.includes(val)
      ? prev.judeteServicii.filter(j => j !== val)
      : [...prev.judeteServicii, val],
  }));

  const inputStyle = (field) => ({
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    backgroundColor: t.bgInput,
    border: `1.5px solid ${focusat === field ? '#2F6FED' : t.border}`,
    color: t.textPrincipal, fontSize: '14px', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  });

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.7px', color: t.textSecundar, marginBottom: '7px',
  };

  const anuleaza = () => {
    setForm({
      descriere: user?.descriere || '',
      aniExperienta: user?.aniExperienta ?? '',
      nrAngajati: user?.nrAngajati ?? '',
      telefon: user?.telefon || '',
      siteWeb: user?.siteWeb || '',
      categoriiServicii: user?.categoriiServicii || [],
      judeteServicii: user?.judeteServicii || [],
    });
    setEroare('');
    setEditare(false);
  };

  const salveaza = async (e) => {
    e.preventDefault();
    setSalvand(true);
    setEroare('');
    try {
      const { utilizator } = await apiActualizeazaProfil(form);
      setUser && setUser(prev => ({ ...prev, ...utilizator }));
      setEditare(false);
      setSalvat(true);
      setTimeout(() => setSalvat(false), 3000);
    } catch (err) {
      setEroare(err.message || 'Nu am putut salva profilul de servicii.');
    } finally {
      setSalvand(false);
    }
  };

  const categoriiActive = (user?.categoriiServicii || []);
  const judeteActive = (user?.judeteServicii || []);

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar }}>
          Serviciile Mele — Profil de Specialitate
        </span>
        {!editare && (
          <button
            onClick={() => setEditare(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: '#2F6FED', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Pencil size={12} /> Editează
          </button>
        )}
      </div>

      <div style={{ padding: '22px 24px' }}>
        {salvat && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: '700', fontSize: '13px', marginBottom: '18px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle2 size={16} /> Profilul de servicii a fost salvat!
          </div>
        )}

        {!editare ? (
          // ── Vizualizare ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={labelStyle}><Star size={12} /> Categorii de specialitate</div>
              {categoriiActive.length === 0 ? (
                <EmptyHint t={t} text="Nu ai selectat încă lucrările pe care le execuți." />
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {categoriiActive.map(val => {
                    const cat = CATEGORII_SERVICII.find(c => c.value === val);
                    return (
                      <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '20px', backgroundColor: cat ? `${cat.color}15` : t.bgInput, color: cat ? cat.color : t.textSecundar }}>
                        {cat?.icon} {cat?.label || val}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div style={labelStyle}><MapPin size={12} /> Județe de activitate</div>
              {judeteActive.length === 0 ? (
                <EmptyHint t={t} text="Nu ai selectat încă zonele unde lucrezi." />
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {judeteActive.map(j => (
                    <span key={j} style={{ fontSize: '12px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(47,111,237,0.1)', color: '#2F6FED' }}>{j}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <MiniStat t={t} icon={<Briefcase size={14} />} label="Ani de activitate" valoare={user?.aniExperienta ?? '—'} />
              <MiniStat t={t} icon={<Users size={14} />} label="Număr angajați" valoare={user?.nrAngajati ?? '—'} />
              <MiniStat t={t} icon={<Phone size={14} />} label="Telefon contact" valoare={user?.telefon || '—'} />
            </div>

            <div>
              <div style={labelStyle}><Globe size={12} /> Site de prezentare</div>
              {user?.siteWeb ? (
                <a
                  href={/^https?:\/\//i.test(user.siteWeb) ? user.siteWeb : `https://${user.siteWeb}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '14px', color: '#2F6FED', fontWeight: '600', textDecoration: 'none' }}
                >
                  {user.siteWeb}
                </a>
              ) : (
                <EmptyHint t={t} text="Adaugă linkul către website-ul firmei tale, dacă ai unul." />
              )}
            </div>

            <div>
              <div style={labelStyle}><Star size={12} /> Ce vă diferențiază</div>
              {user?.descriere ? (
                <p style={{ fontSize: '14px', color: t.textPrincipal, lineHeight: '1.65', margin: 0 }}>{user.descriere}</p>
              ) : (
                <EmptyHint t={t} text="Adaugă o scurtă prezentare a echipei, utilajelor și certificărilor tale." />
              )}
            </div>
          </div>
        ) : (
          // ── Editare ──
          <form onSubmit={salveaza} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={labelStyle}><Star size={12} /> Categorii de specialitate</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {CATEGORII_SERVICII.map(cat => {
                  const activ = form.categoriiServicii.includes(cat.value);
                  return (
                    <button
                      key={cat.value} type="button"
                      onClick={() => toggleCategorie(cat.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px',
                        border: `1.5px solid ${activ ? cat.color : t.border}`,
                        backgroundColor: activ ? `${cat.color}15` : t.bgInput,
                        color: activ ? cat.color : t.textSecundar,
                        fontSize: '13px', fontWeight: activ ? '700' : '500',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      {cat.icon} {cat.label}
                      {activ && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={labelStyle}><MapPin size={12} /> Județe de activitate</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {JUDETE.map(j => {
                  const activ = form.judeteServicii.includes(j);
                  return (
                    <button
                      key={j} type="button"
                      onClick={() => toggleJudet(j)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                        border: `1.5px solid ${activ ? '#2F6FED' : t.border}`,
                        backgroundColor: activ ? 'rgba(47,111,237,0.1)' : t.bgInput,
                        color: activ ? '#2F6FED' : t.textSecundar,
                        fontSize: '13px', fontWeight: activ ? '700' : '500',
                        transition: 'all 0.15s',
                      }}
                    >
                      {j}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}><Briefcase size={12} /> Ani de activitate</label>
                <input type="number" min="0" placeholder="ex: 8"
                  value={form.aniExperienta}
                  onChange={e => setForm({ ...form, aniExperienta: e.target.value })}
                  onFocus={() => setFocusat('ani')} onBlur={() => setFocusat(null)}
                  style={inputStyle('ani')}
                />
              </div>
              <div>
                <label style={labelStyle}><Users size={12} /> Număr angajați</label>
                <input type="number" min="0" placeholder="ex: 15"
                  value={form.nrAngajati}
                  onChange={e => setForm({ ...form, nrAngajati: e.target.value })}
                  onFocus={() => setFocusat('angajati')} onBlur={() => setFocusat(null)}
                  style={inputStyle('angajati')}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}><Phone size={12} /> Telefon contact direct</label>
              <input type="tel" placeholder="ex: 0722 123 456"
                value={form.telefon}
                onChange={e => setForm({ ...form, telefon: e.target.value })}
                onFocus={() => setFocusat('tel')} onBlur={() => setFocusat(null)}
                style={inputStyle('tel')}
              />
            </div>

            <div>
              <label style={labelStyle}><Globe size={12} /> Site de prezentare</label>
              <input type="text" placeholder="ex: www.firma-mea.ro"
                value={form.siteWeb}
                onChange={e => setForm({ ...form, siteWeb: e.target.value })}
                onFocus={() => setFocusat('site')} onBlur={() => setFocusat(null)}
                style={inputStyle('site')}
              />
            </div>

            <div>
              <label style={labelStyle}><Star size={12} /> Ce vă diferențiază</label>
              <textarea rows={4}
                placeholder="Descrie echipa, utilajele deținute, certificările, proiectele reprezentative..."
                value={form.descriere}
                onChange={e => setForm({ ...form, descriere: e.target.value })}
                onFocus={() => setFocusat('desc')} onBlur={() => setFocusat(null)}
                style={{ ...inputStyle('desc'), resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            {eroare && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: '600', fontSize: '13px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={16} /> {eroare}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={salvand}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #2F6FED, #4f46e5)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '12px 22px', fontSize: '13px', fontWeight: '700',
                  cursor: salvand ? 'default' : 'pointer', opacity: salvand ? 0.75 : 1,
                  boxShadow: '0 4px 14px rgba(47,111,237,0.3)',
                }}
              >
                {salvand ? <Loader2 size={15} className="spin-icon" /> : <CheckCircle2 size={15} />}
                {salvand ? 'Se salvează...' : 'Salvează profilul'}
              </button>
              <button type="button" onClick={anuleaza} disabled={salvand}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: 'transparent', color: t.textSecundar,
                  border: `1px solid ${t.border}`, borderRadius: '10px',
                  padding: '12px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                <X size={14} /> Anulează
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EmptyHint({ t, text }) {
  return <p style={{ fontSize: '13px', color: t.textSecundar, fontStyle: 'italic', margin: 0 }}>{text}</p>;
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Portofoliu" — lucrări realizate de subcontractor. Public, vizibil
// dezvoltatorilor pe oferta trimisă (OfertaDetailView), ajută la evaluare.
// ─────────────────────────────────────────────────────────────────────────
function PortofoliuCard({ t, user, setUser }) {
  const [formDeschis, setFormDeschis] = useState(false);
  const [form, setForm] = useState({ titlu: '', descriere: '', an: '', categorie: 'Structuri' });
  const [salvand, setSalvand] = useState(false);
  const [eroare, setEroare] = useState('');
  const [stergandId, setStergandId] = useState(null);

  const lucrari = user?.lucrari || [];

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: '9px',
    backgroundColor: t.bgInput, border: `1.5px solid ${t.border}`,
    color: t.textPrincipal, fontSize: '13.5px', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  };

  const adauga = async (e) => {
    e.preventDefault();
    if (!form.titlu.trim()) { setEroare('Titlul lucrării este obligatoriu.'); return; }
    setSalvand(true);
    setEroare('');
    try {
      const { utilizator } = await apiAdaugaLucrare(form);
      setUser(prev => ({ ...prev, ...utilizator }));
      setForm({ titlu: '', descriere: '', an: '', categorie: 'Structuri' });
      setFormDeschis(false);
    } catch (err) {
      setEroare(err.message || 'Nu am putut salva lucrarea.');
    } finally {
      setSalvand(false);
    }
  };

  const sterge = async (id) => {
    setStergandId(id);
    try {
      const { utilizator } = await apiStergeLucrare(id);
      setUser(prev => ({ ...prev, ...utilizator }));
    } catch (err) {
      console.error('Eroare ștergere lucrare:', err);
    } finally {
      setStergandId(null);
    }
  };

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar }}>
          <Hammer size={13} /> Portofoliu — Lucrări Realizate
        </span>
        {!formDeschis && (
          <button onClick={() => setFormDeschis(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.accent || '#2F6FED', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            <Plus size={12} /> Adaugă lucrare
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px' }}>
        {formDeschis && (
          <form onSubmit={adauga} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: lucrari.length ? '18px' : 0, padding: '16px', borderRadius: '12px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '10px' }}>
              <input placeholder="Titlu lucrare (ex: Hală industrială 2.000mp)" value={form.titlu} onChange={e => setForm({ ...form, titlu: e.target.value })} style={inputStyle} />
              <input type="number" placeholder="An" value={form.an} onChange={e => setForm({ ...form, an: e.target.value })} style={inputStyle} />
            </div>
            <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} style={inputStyle}>
              {CATEGORII_SERVICII.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <textarea rows={3} placeholder="Descriere scurtă a lucrării..." value={form.descriere} onChange={e => setForm({ ...form, descriere: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
            {eroare && <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>{eroare}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={salvand} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2F6FED', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: '700', cursor: salvand ? 'default' : 'pointer', opacity: salvand ? 0.7 : 1 }}>
                {salvand ? <Loader2 size={13} className="spin-icon" /> : <CheckCircle2 size={13} />} Salvează
              </button>
              <button type="button" onClick={() => { setFormDeschis(false); setEroare(''); }} style={{ backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.textSecundar, borderRadius: '8px', padding: '9px 14px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                Anulează
              </button>
            </div>
          </form>
        )}

        {lucrari.length === 0 ? (
          <EmptyHint t={t} text="Nu ai adăugat încă nicio lucrare. Un portofoliu complet crește șansele de a câștiga oferte." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lucrari.map(l => (
              <div key={l._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '13px 15px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '13.5px', color: t.textPrincipal }}>{l.titlu}</span>
                    {l.an && <span style={{ fontSize: '11px', color: t.textSecundar }}>· {l.an}</span>}
                    {l.categorie && <span style={{ fontSize: '10px', fontWeight: '700', color: '#2F6FED', backgroundColor: 'rgba(47,111,237,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{l.categorie}</span>}
                  </div>
                  {l.descriere && <p style={{ margin: '5px 0 0', fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.5 }}>{l.descriere}</p>}
                </div>
                <button onClick={() => sterge(l._id)} disabled={stergandId === l._id} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
                  {stergandId === l._id ? <Loader2 size={14} className="spin-icon" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Recomandări / Referințe" — contracte încheiate în afara platformei,
// demonstrate cu document justificativ + valoare, pentru credibilitate.
// ─────────────────────────────────────────────────────────────────────────
function RecomandariCard({ t, user, setUser }) {
  const [formDeschis, setFormDeschis] = useState(false);
  const [form, setForm] = useState({ categorie: 'Structuri', valoareContract: '', descriere: '' });
  const [fisier, setFisier] = useState(null);
  const [salvand, setSalvand] = useState(false);
  const [eroare, setEroare] = useState('');
  const [stergandId, setStergandId] = useState(null);

  const recomandari = user?.recomandari || [];

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: '9px',
    backgroundColor: t.bgInput, border: `1.5px solid ${t.border}`,
    color: t.textPrincipal, fontSize: '13.5px', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  };

  const adauga = async (e) => {
    e.preventDefault();
    setEroare('');
    setSalvand(true);
    try {
      let documentUrl = '';
      let documentNume = '';
      if (fisier) {
        const { fisiere } = await apiUploadFisiere([fisier]);
        if (fisiere && fisiere[0]) {
          documentUrl = fisiere[0].numeFisier;
          documentNume = fisiere[0].nume;
        }
      }
      const { utilizator } = await apiAdaugaRecomandare({ ...form, documentUrl, documentNume });
      setUser(prev => ({ ...prev, ...utilizator }));
      setForm({ categorie: 'Structuri', valoareContract: '', descriere: '' });
      setFisier(null);
      setFormDeschis(false);
    } catch (err) {
      setEroare(err.message || 'Nu am putut salva recomandarea.');
    } finally {
      setSalvand(false);
    }
  };

  const sterge = async (id) => {
    setStergandId(id);
    try {
      const { utilizator } = await apiStergeRecomandare(id);
      setUser(prev => ({ ...prev, ...utilizator }));
    } catch (err) {
      console.error('Eroare ștergere recomandare:', err);
    } finally {
      setStergandId(null);
    }
  };

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar }}>
          <Award size={13} /> Recomandări — Contracte Încheiate
        </span>
        {!formDeschis && (
          <button onClick={() => setFormDeschis(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.accent || '#2F6FED', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            <Plus size={12} /> Adaugă recomandare
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px' }}>
        {formDeschis && (
          <form onSubmit={adauga} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: recomandari.length ? '18px' : 0, padding: '16px', borderRadius: '12px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '10px' }}>
              <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} style={inputStyle}>
                {CATEGORII_SERVICII.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="number" min="0" placeholder="Valoare contract (RON)" value={form.valoareContract} onChange={e => setForm({ ...form, valoareContract: e.target.value })} style={inputStyle} />
            </div>
            <input placeholder="Descriere scurtă (opțional)" value={form.descriere} onChange={e => setForm({ ...form, descriere: e.target.value })} style={inputStyle} />
            <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: fisier ? t.textPrincipal : t.textSecundar }}>
              <FileUp size={15} />
              {fisier ? fisier.name : 'Încarcă document justificativ (contract, PV recepție etc.)'}
              <input type="file" onChange={e => setFisier(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </label>
            {eroare && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '12.5px', fontWeight: '600' }}><AlertTriangle size={13} /> {eroare}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={salvand} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2F6FED', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: '700', cursor: salvand ? 'default' : 'pointer', opacity: salvand ? 0.7 : 1 }}>
                {salvand ? <Loader2 size={13} className="spin-icon" /> : <CheckCircle2 size={13} />} Salvează
              </button>
              <button type="button" onClick={() => { setFormDeschis(false); setEroare(''); }} style={{ backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.textSecundar, borderRadius: '8px', padding: '9px 14px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                Anulează
              </button>
            </div>
          </form>
        )}

        {recomandari.length === 0 ? (
          <EmptyHint t={t} text="Adaugă contracte finalizate cu succes, demonstrate cu document, ca să crești credibilitatea profilului tău." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recomandari.map(r => {
              const cat = CATEGORII_SERVICII.find(c => c.value === r.categorie);
              return (
                <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', padding: '13px 16px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: '700', padding: '4px 9px', borderRadius: '20px', backgroundColor: cat ? `${cat.color}15` : t.bgCard, color: cat ? cat.color : t.textSecundar }}>
                        {cat?.icon} {cat?.label || r.categorie}
                      </span>
                      {r.valoareContract != null && (
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{Number(r.valoareContract).toLocaleString()} RON</span>
                      )}
                    </div>
                    {r.descriere && <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.5 }}>{r.descriere}</p>}
                    {r.documentUrl && (
                      <a href={`${SERVER_URL}/uploads/${r.documentUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '12px', color: '#2F6FED', fontWeight: '600', textDecoration: 'none' }}>
                        <Paperclip size={12} /> {r.documentNume || 'Document'}
                      </a>
                    )}
                  </div>
                  <button onClick={() => sterge(r._id)} disabled={stergandId === r._id} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
                    {stergandId === r._id ? <Loader2 size={14} className="spin-icon" /> : <Trash2 size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Rating firmă" — media evaluărilor primite de la dezvoltatori, după
// contracte încheiate pe platformă (1 evaluare per ofertă câștigată).
// ─────────────────────────────────────────────────────────────────────────
function RatingCard({ t, user }) {
  const [evaluari, setEvaluari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');

  useEffect(() => {
    let activ = true;
    apiEvaluariPrimite()
      .then(data => { if (activ) setEvaluari(data.evaluari || []); })
      .catch(err => { if (activ) setEroare(err.message || 'Nu am putut încărca evaluările.'); })
      .finally(() => { if (activ) setLoading(false); });
    return () => { activ = false; };
  }, []);

  const medie = user?.ratingMediu || 0;
  const numar = user?.ratingNumarEvaluari || 0;

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={13} /> Rating Firmă
      </div>
      <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '38px', fontWeight: '900', color: t.textPrincipal, lineHeight: 1 }}>
            {numar > 0 ? medie.toFixed(1) : '—'}
          </div>
          <div>
            <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={18} fill={n <= Math.round(medie) ? '#f59e0b' : 'none'} color="#f59e0b" />
              ))}
            </div>
            <div style={{ fontSize: '12.5px', color: t.textSecundar }}>
              {numar > 0 ? `Pe baza a ${numar} evaluăr${numar === 1 ? 'e' : 'i'} de la dezvoltatori` : 'Fără evaluări momentan'}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>
            <Loader2 size={14} className="spin-icon" /> Se încarcă evaluările...
          </div>
        ) : eroare ? (
          <div style={{ color: '#ef4444', fontSize: '12.5px', fontWeight: '600' }}>{eroare}</div>
        ) : evaluari.length === 0 ? (
          <EmptyHint t={t} text="Evaluările apar aici automat, după ce un dezvoltator notează colaborarea la finalul unui contract câștigat pe platformă." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {evaluari.slice(0, 6).map(e => (
              <div key={e._id} style={{ padding: '13px 16px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: e.comentariu ? '6px' : 0 }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={13} fill={n <= e.scor ? '#f59e0b' : 'none'} color="#f59e0b" />
                    ))}
                  </div>
                  <span style={{ fontSize: '11.5px', color: t.textSecundar, whiteSpace: 'nowrap' }}>{e.proiectTitlu}</span>
                </div>
                {e.comentariu && <p style={{ margin: 0, fontSize: '12.5px', color: t.textPrincipal, lineHeight: 1.5, fontStyle: 'italic' }}>"{e.comentariu}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Disponibilitate" — perioade libere declarate de subcontractor.
// ─────────────────────────────────────────────────────────────────────────
function DisponibilitateCard({ t, user, setUser }) {
  const [formDeschis, setFormDeschis] = useState(false);
  const [form, setForm] = useState({ start: '', end: '', nota: '' });
  const [salvand, setSalvand] = useState(false);
  const [eroare, setEroare] = useState('');
  const [stergandId, setStergandId] = useState(null);

  const perioade = user?.disponibilitate || [];

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: '9px',
    backgroundColor: t.bgInput, border: `1.5px solid ${t.border}`,
    color: t.textPrincipal, fontSize: '13.5px', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  };

  const adauga = async (e) => {
    e.preventDefault();
    if (!form.start || !form.end) { setEroare('Completează ambele date.'); return; }
    setSalvand(true);
    setEroare('');
    try {
      const { utilizator } = await apiAdaugaDisponibilitate(form);
      setUser(prev => ({ ...prev, ...utilizator }));
      setForm({ start: '', end: '', nota: '' });
      setFormDeschis(false);
    } catch (err) {
      setEroare(err.message || 'Nu am putut salva intervalul.');
    } finally {
      setSalvand(false);
    }
  };

  const sterge = async (id) => {
    setStergandId(id);
    try {
      const { utilizator } = await apiStergeDisponibilitate(id);
      setUser(prev => ({ ...prev, ...utilizator }));
    } catch (err) {
      console.error('Eroare ștergere interval:', err);
    } finally {
      setStergandId(null);
    }
  };

  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar }}>
          <Calendar size={13} /> Disponibilitate
        </span>
        {!formDeschis && (
          <button onClick={() => setFormDeschis(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.accent || '#2F6FED', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            <Plus size={12} /> Adaugă interval
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px' }}>
        {formDeschis && (
          <form onSubmit={adauga} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: perioade.length ? '18px' : 0, padding: '16px', borderRadius: '12px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '10.5px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase' }}>De la</label>
                <input type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} style={{ ...inputStyle, marginTop: '5px' }} />
              </div>
              <div>
                <label style={{ fontSize: '10.5px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase' }}>Până la</label>
                <input type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} style={{ ...inputStyle, marginTop: '5px' }} />
              </div>
            </div>
            <input placeholder="Notă (opțional, ex: doar echipă de finisaje)" value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} style={inputStyle} />
            {eroare && <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>{eroare}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={salvand} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2F6FED', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: '700', cursor: salvand ? 'default' : 'pointer', opacity: salvand ? 0.7 : 1 }}>
                {salvand ? <Loader2 size={13} className="spin-icon" /> : <CheckCircle2 size={13} />} Salvează
              </button>
              <button type="button" onClick={() => { setFormDeschis(false); setEroare(''); }} style={{ backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.textSecundar, borderRadius: '8px', padding: '9px 14px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                Anulează
              </button>
            </div>
          </form>
        )}

        {perioade.length === 0 ? (
          <EmptyHint t={t} text="Nu ai declarat perioade de disponibilitate. Adaugă intervale ca dezvoltatorii să știe când poți începe lucrul." />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {perioade.map(d => (
              <span key={d._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: '600', padding: '7px 8px 7px 14px', borderRadius: '20px', backgroundColor: 'rgba(34,178,125,0.1)', color: '#22B27D' }}>
                {new Date(d.start).toLocaleDateString('ro-RO')} – {new Date(d.end).toLocaleDateString('ro-RO')}
                {d.nota && <span style={{ opacity: 0.75 }}>· {d.nota}</span>}
                <button onClick={() => sterge(d._id)} style={{ background: 'none', border: 'none', color: '#22B27D', cursor: 'pointer', display: 'flex', padding: '3px', borderRadius: '50%' }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Card "Oferte câștigate" — pentru fiecare ofertă câștigată, permite
// afișarea datelor de contact ale dezvoltatorului (dezvăluite server-side
// doar pentru câștigător, via GET /oferte/:id/contact).
// ─────────────────────────────────────────────────────────────────────────
function OferteCastigateCard({ t, oferteleMele }) {
  const castigate = oferteleMele.filter(o => o.status === 'acceptata' || o.status === 'castigatoare');
  if (castigate.length === 0) return null;

  return (
    <div style={{ backgroundColor: t.bgCard, border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: 'rgba(16,185,129,0.06)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trophy size={13} /> Oferte Câștigate — Contact Beneficiar
      </div>
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {castigate.map(o => <RandOfertaCastigata key={o._id} t={t} oferta={o} />)}
      </div>
    </div>
  );
}

function RandOfertaCastigata({ t, oferta }) {
  const [deschis, setDeschis] = useState(false);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eroare, setEroare] = useState('');

  const vezi = async () => {
    setDeschis(true);
    if (contact) return;
    setLoading(true);
    setEroare('');
    try {
      const data = await apiContactOferta(oferta._id);
      setContact(data);
    } catch (err) {
      setEroare(err.message || 'Nu am putut încărca datele de contact.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13.5px', color: t.textPrincipal }}>{oferta.proiect?.titlu || 'Proiect'}</div>
          <div style={{ fontSize: '12px', color: t.textSecundar, marginTop: '2px' }}>{Number(oferta.valoare).toLocaleString()} {oferta.moneda}</div>
        </div>
        {!deschis && (
          <button onClick={vezi} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            Vezi contactul <ChevronRight size={13} />
          </button>
        )}
      </div>
      {deschis && (
        <div style={{ padding: '4px 16px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '12.5px' }}>
              <Loader2 size={13} className="spin-icon" /> Se încarcă...
            </div>
          ) : eroare ? (
            <div style={{ color: '#ef4444', fontSize: '12.5px', fontWeight: '600' }}>{eroare}</div>
          ) : contact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '13px', color: t.textPrincipal }}><strong>{contact.dezvoltator.nume}</strong></div>
              {contact.dezvoltator.email && <a href={`mailto:${contact.dezvoltator.email}`} style={{ fontSize: '12.5px', color: '#2F6FED', textDecoration: 'none' }}>{contact.dezvoltator.email}</a>}
              {contact.dezvoltator.telefon && <a href={`tel:${contact.dezvoltator.telefon}`} style={{ fontSize: '12.5px', color: '#2F6FED', textDecoration: 'none' }}>{contact.dezvoltator.telefon}</a>}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}



function MiniStat({ t, icon, label, valoare }) {
  return (
    <div style={{ backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>
        <span style={{ color: '#2F6FED' }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '700', color: t.textPrincipal }}>{valoare}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = {
    in_asteptare: { bg: 'rgba(234,179,8,0.1)', color: '#eab308', label: 'ÎN ANALIZĂ' },
    acceptata: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'ACCEPTATĂ' },
    respinsa: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'RESPINSĂ' },
    castigatoare: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: '🏆 CÂȘTIGĂTOARE' },
    depasita: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'DEPĂȘITĂ' },
  }[status] || { bg: 'rgba(234,179,8,0.1)', color: '#eab308', label: 'ÎN ANALIZĂ' };
  return (
    <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: cfg.bg, color: cfg.color, padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}
