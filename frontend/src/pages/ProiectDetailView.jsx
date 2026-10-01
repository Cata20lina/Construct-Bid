import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, MapPin, Calendar, Banknote, Building2,
  Layers, Wrench, Zap, Paintbrush2, Send, CheckCircle2,
  Clock, FileText, ChevronRight, Users,
  Paperclip, X, File, Gauge, Lock, Trophy, TrendingDown,
  Crown, AlertTriangle, Phone, Mail, Hash, MapPinned, Loader2, Target,
  ShieldCheck, FileCheck, HelpCircle,
} from 'lucide-react';
import {
  apiOferteProiect, apiTrimiteOferta, apiUploadFisiere, apiContactOferta,
  apiListaClarificari, apiAdaugaClarificare, apiRaspundeClarificare,
  apiActualizeazaProiect, apiTrimiteModificariProiect,
} from '../api.js';
import BannerSuspendare from '../components/BannerSuspendare.jsx';
import { getSocket } from '../socket.js';

const CATEGORIE_CONFIG = {
  'Structuri':  { icon: <Layers size={15} />,      color: '#2F6FED', bg: 'rgba(47,111,237,0.12)'  },
  'Instalații': { icon: <Wrench size={15} />,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Electrice':  { icon: <Zap size={15} />,          color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  'Finisaje':   { icon: <Paintbrush2 size={15} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
};

// ─── Helper: formatare durată rămasă ───────────────────────────────────────
function formatDurata(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function ProiectDetailView({
  proiect,
  onBack,
  t,
  user,
  onAdaugaOferta,
  loadingOferta,
  errorOferta,
  onSelectOferta,   // callback: (oferta, idx, proiect) => void — deschide OfertaDetailView (doar pentru statică)
  onProiectActualizat, // callback: (proiect) => void — după ce dezvoltatorul corectează un anunț suspendat
}) {
  const [formOferta, setFormOferta] = useState({ pret: '', zile: '', mesaj: '' });
  const [focusat, setFocusat]       = useState(null);
  const [trimisOK, setTrimisOK]     = useState(false);
  const [fisiere, setFisiere]       = useState([]);
  const fileInputRef                = React.useRef(null);

  // ── Stare specifică LICITAȚIEI DINAMICE ──
  const [oferteLive, setOferteLive] = useState([]);     // clasament live (oferte active, sortate crescător)
  const [proiectLive, setProiectLive] = useState(proiect); // versiune locală, actualizată via socket (status licitație)
  const [acum, setAcum] = useState(Date.now());
  const [erorOfertaLive, setErorOfertaLive] = useState('');
  const [trimitOfertaLive, setTrimitOfertaLive] = useState(false);

  // ── Stare CLARIFICĂRI (întrebări & răspunsuri publice) ──
  const [clarificari, setClarificari] = useState([]);
  const [incarcClarificari, setIncarcClarificari] = useState(true);
  const [intrebareNoua, setIntrebareNoua] = useState('');
  const [erorClarificare, setErorClarificare] = useState('');
  const [raspunsuriDeschise, setRaspunsuriDeschise] = useState({});
  const [trimitRaspunsId, setTrimitRaspunsId] = useState(null);
  const [trimitIntrebareLoading, setTrimitIntrebareLoading] = useState(false);

  const esteDezvoltator = user?.rol === 'DEZVOLTATOR';
  const esteSubcontractor = user?.rol === 'SUBCONTRACTOR';
  const esteFurnizor = user?.rol === 'FURNIZOR';
  // Proiectele sunt licitații de EXECUȚIE (manoperă) — doar subcontractorii
  // pot oferta aici. Furnizorii (materiale/echipamente) au propriul flux, la
  // Cereri de Materiale, unde licitează pe articole punctuale, nu pe proiect.
  const poateOferta = esteSubcontractor;
  const esteDinamica = proiectLive?.tipOfertare === 'dinamica';

  // ── Încărcare clarificări pentru proiectul curent ──
  useEffect(() => {
    if (!proiect?._id) return;
    let activ = true;
    setIncarcClarificari(true);
    apiListaClarificari(proiect._id)
      .then(data => { if (activ) setClarificari(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (activ) setIncarcClarificari(false); });
    return () => { activ = false; };
  }, [proiect?._id]);

  const trimiteIntrebare = async (e) => {
    e.preventDefault();
    // Protecție la dublu-submit (dublu-click, Enter + click pe buton etc.) —
    // fără ea, aceeași întrebare putea fi trimisă de două ori.
    if (trimitIntrebareLoading || !intrebareNoua.trim()) return;
    setErorClarificare('');
    setTrimitIntrebareLoading(true);
    try {
      const noua = await apiAdaugaClarificare(proiect._id, intrebareNoua.trim());
      setClarificari(prev => [...prev, noua]);
      setIntrebareNoua('');
    } catch (err) {
      setErorClarificare(err.message || 'Nu s-a putut trimite întrebarea.');
    } finally {
      setTrimitIntrebareLoading(false);
    }
  };

  const trimiteRaspuns = async (id, text) => {
    if (!text || !text.trim()) return;
    setTrimitRaspunsId(id);
    try {
      const actualizata = await apiRaspundeClarificare(id, text.trim());
      setClarificari(prev => prev.map(c => c._id === id ? actualizata : c));
      setRaspunsuriDeschise(prev => ({ ...prev, [id]: undefined }));
    } catch (err) {
      setErorClarificare(err.message || 'Nu s-a putut trimite răspunsul.');
    } finally {
      setTrimitRaspunsId(null);
    }
  };

  // Sincronizăm proiectul local când prop-ul se schimbă (navigare nouă)
  useEffect(() => { setProiectLive(proiect); }, [proiect?._id]);

  // ── Tick pentru countdown ──
  useEffect(() => {
    if (!esteDinamica) return;
    const interval = setInterval(() => setAcum(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [esteDinamica]);

  // ── Conectare socket + încărcare clasament live pentru licitație dinamică ──
  useEffect(() => {
    if (!esteDinamica || !proiectLive?._id) return;

    let activ = true;
    const socket = getSocket();
    socket.emit('join_proiect', proiectLive._id);

    apiOferteProiect(proiectLive._id)
      .then(data => { if (activ) setOferteLive(data.oferte || []); })
      .catch(() => {});

    const onOfertaNoua = ({ oferta }) => {
      if (!oferta || oferta.proiect !== proiectLive._id) return;
      setOferteLive(prev => {
        // Eliminăm oferta veche a aceluiași subcontractor (a fost arhivată) și inserăm noua ofertă
        const filtrate = prev.filter(o => o.subcontractor?._id !== oferta.subcontractor?._id);
        return [...filtrate, oferta].sort((a, b) => a.valoare - b.valoare);
      });
    };

    const onLicitatieFinalizata = ({ proiect: proiectFinalizat }) => {
      if (!proiectFinalizat || proiectFinalizat._id !== proiectLive._id) return;
      setProiectLive(prev => ({ ...prev, ...proiectFinalizat }));
    };

    socket.on('oferta_noua', onOfertaNoua);
    socket.on('licitatie_finalizata', onLicitatieFinalizata);

    return () => {
      activ = false;
      socket.emit('leave_proiect', proiectLive._id);
      socket.off('oferta_noua', onOfertaNoua);
      socket.off('licitatie_finalizata', onLicitatieFinalizata);
    };
  }, [esteDinamica, proiectLive?._id]);

  if (!proiect) return null;

  const catCfg = CATEGORIE_CONFIG[proiect.categorie] || {
    icon: <Layers size={15} />, color: '#6b7280', bg: 'rgba(107,114,128,0.12)',
  };

  const locatie = proiect.judet && proiect.oras
    ? `${proiect.oras}, ${proiect.judet}`
    : proiect.locatie || 'Nespecificat';

  const inputStyle = (field) => ({
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    backgroundColor: t.bgInput,
    border: `1.5px solid ${focusat === field ? '#2F6FED' : t.border}`,
    color: t.textPrincipal, fontSize: '14px', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  });

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.8px', color: t.textSecundar, marginBottom: '7px',
  };

  // ── Trimite ofertă STATICĂ (o singură dată) ──
  const handleSubmitOfertaStatica = async (e) => {
    e.preventDefault();
    const { fisiere: fisiereSalvate } = await apiUploadFisiere(fisiere).catch(() => ({ fisiere: [] }));
    await onAdaugaOferta({
      proiect: proiect._id,
      valoare: formOferta.pret,
      termenExecutie: formOferta.zile,
      descriere: formOferta.mesaj,
      documente: fisiereSalvate.map(f => f.numeFisier),
    });
    setTrimisOK(true);
    setFormOferta({ pret: '', zile: '', mesaj: '' });
    setFisiere([]);
    setTimeout(() => setTrimisOK(false), 4000);
  };

  // ── Trimite ofertă DINAMICĂ (repetabil, descrescător) ──
  const handleSubmitOfertaLive = async (e) => {
    e.preventDefault();
    setErorOfertaLive('');
    setTrimitOfertaLive(true);
    try {
      const ofertaNoua = await apiTrimiteOferta({
        proiect: proiectLive._id,
        valoare: formOferta.pret,
        termenExecutie: formOferta.zile || proiectLive.zile || 1,
        descriere: formOferta.mesaj,
      });
      // Actualizăm imediat clasamentul local din răspunsul serverului — nu mai
      // depindem exclusiv de evenimentul socket (care s-ar putea livra cu
      // întârziere sau să se piardă dacă socket-ul s-a reconectat recent).
      setOferteLive(prev => {
        const filtrate = prev.filter(o => o.subcontractor?._id !== ofertaNoua.subcontractor?._id);
        return [...filtrate, ofertaNoua].sort((a, b) => a.valoare - b.valoare);
      });
      setFormOferta({ pret: '', zile: '', mesaj: '' });
    } catch (err) {
      setErorOfertaLive(err.message || 'Nu s-a putut trimite oferta.');
    } finally {
      setTrimitOfertaLive(false);
    }
  };

  const handleFisiere = (e) => {
    const noi = Array.from(e.target.files);
    setFisiere(prev => {
      const existente = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...noi.filter(f => !existente.has(f.name + f.size))];
    });
    e.target.value = '';
  };

  const stergeFile = (index) => setFisiere(prev => prev.filter((_, i) => i !== index));

  const formatSize = (bytes) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const StatusBadge = ({ status }) => {
    const cfg = {
      acceptata: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: '✓ Acceptată' },
      respinsa:  { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', label: '✕ Respinsă'  },
      castigatoare: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: '🏆 Câștigătoare' },
      depasita:  { bg: 'rgba(107,114,128,0.10)', color: '#6b7280', label: 'Depășită' },
      in_asteptare: { bg: 'rgba(234,179,8,0.10)',  color: '#eab308', label: '⏳ În analiză' },
    }[status || 'in_asteptare'];
    return (
      <span style={{
        fontSize: '11px', fontWeight: '800', padding: '4px 10px',
        borderRadius: '20px', backgroundColor: cfg.bg, color: cfg.color,
        whiteSpace: 'nowrap',
      }}>
        {cfg.label}
      </span>
    );
  };

  // ── Date derivate pentru licitație dinamică ──
  const startMs = proiectLive?.licitatieStart ? new Date(proiectLive.licitatieStart).getTime() : null;
  const endMs = proiectLive?.licitatieEnd ? new Date(proiectLive.licitatieEnd).getTime() : null;
  const licitatieNuAInceput = esteDinamica && startMs && acum < startMs;
  const licitatieExpirata = esteDinamica && (proiectLive.licitatieFinalizata || (endMs && acum >= endMs));
  const licitatieActiva = esteDinamica && !licitatieNuAInceput && !licitatieExpirata;

  const ceaMaiMicaOferta = oferteLive[0];
  const ofertaProprieActiva = oferteLive.find(o => o.subcontractor?._id === user?.id || o.subcontractor?._id === user?._id);
  const esteLider = ceaMaiMicaOferta && ofertaProprieActiva && ceaMaiMicaOferta._id === ofertaProprieActiva._id;

  return (
    <div style={{ maxWidth: esteDinamica ? '1100px' : '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Buton înapoi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={onBack}
          style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: `1px solid ${t.border}`, borderRadius: '8px',
            padding: '8px 14px', color: t.textSecundar, fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2F6FED'; e.currentTarget.style.color = '#2F6FED'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSecundar; }}
        >
          <ArrowLeft size={15} /> Înapoi la licitații
        </button>
      </div>

      <BannerSuspendare
        t={t}
        element={proiect}
        esteProprietar={!!user && [user.id, user._id].includes(proiect.dezvoltator?._id)}
        campuri={[
          { cheie: 'titlu', eticheta: 'Titlu' },
          { cheie: 'descriere', eticheta: 'Descriere', multilinie: true },
          { cheie: 'buget', eticheta: 'Buget' },
          { cheie: 'locatie', eticheta: 'Locație' },
        ]}
        onSalveaza={(valori) => apiActualizeazaProiect(proiect._id, valori)}
        onTrimite={() => apiTrimiteModificariProiect(proiect._id)}
        onActualizat={onProiectActualizat}
      />

      {/* ── HEADER PROIECT ── */}
      <div style={{
        backgroundColor: t.bgCard, borderRadius: '20px',
        border: `1px solid ${t.border}`, overflow: 'hidden',
        boxShadow: `0 4px 24px ${t.shadow}`,
      }}>
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${catCfg.color}, ${catCfg.color}55)` }} />
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px',
                padding: '5px 12px', borderRadius: '20px',
                backgroundColor: catCfg.bg, color: catCfg.color,
              }}>
                {catCfg.icon} {proiect.categorie}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px',
                padding: '5px 12px', borderRadius: '20px',
                backgroundColor: esteDinamica ? 'rgba(245,158,11,0.12)' : 'rgba(47,111,237,0.12)',
                color: esteDinamica ? '#f59e0b' : '#2F6FED',
              }}>
                {esteDinamica ? <Gauge size={12} /> : <Lock size={12} />}
                {esteDinamica ? 'Ofertare Dinamică' : 'Ofertare Statică'}
              </span>
              {proiect.esteProspectare && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px',
                  padding: '5px 12px', borderRadius: '20px',
                  backgroundColor: 'rgba(168,85,247,0.14)', color: '#a855f7',
                }}>
                  <Target size={12} /> Prospectare Piață
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: t.textSecundar, fontSize: '13px' }}>
              <MapPin size={14} color="#ef4444" />
              <span style={{ fontWeight: '600' }}>{locatie}</span>
            </div>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: '850', color: t.textPrincipal, margin: '0 0 10px 0', lineHeight: 1.3 }}>
            {proiect.titlu}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textSecundar, fontSize: '13px' }}>
            <Building2 size={14} />
            <span>Publicat de <strong style={{ color: t.textPrincipal }}>{proiect.dezvoltator?.nume || proiect.dezvoltator}</strong></span>
          </div>

          {proiect.esteProspectare && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '16px',
              backgroundColor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: t.textSecundar, lineHeight: 1.55,
            }}>
              <Target size={16} color="#a855f7" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                Acesta este un anunț de <strong style={{ color: t.textPrincipal }}>prospectare piață</strong> — dezvoltatorul testează
                cererea și nivelul de preț. Poți depune ofertă exact ca la un anunț normal.
              </span>
            </div>
          )}

          {/* Statistici rapide */}
          <div className="cb-grid-stat" style={{ display: 'grid', gridTemplateColumns: esteDinamica ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '12px', marginTop: '28px' }}>
            {[
              { icon: <Banknote size={14} color="#10b981" />, label: 'Buget Maxim', value: proiect.bugetValoare ? `${Number(proiect.bugetValoare).toLocaleString()} RON` : (proiect.buget || '–'), color: '#10b981' },
              { icon: <Calendar size={14} color="#f59e0b" />, label: 'Termen Execuție', value: `${proiect.zile || '–'} zile`, color: t.textPrincipal },
              { icon: <Users size={14} color="#2F6FED" />,   label: 'Oferte Active', value: esteDinamica ? oferteLive.length : (proiect.oferte ?? 0), color: '#2F6FED' },
              ...(esteDinamica ? [{
                icon: <Clock size={14} color="#ef4444" />,
                label: licitatieNuAInceput ? 'Start în' : licitatieExpirata ? 'Status' : 'Timp rămas',
                value: licitatieNuAInceput ? formatDurata(startMs - acum) : licitatieExpirata ? 'Încheiată' : formatDurata((endMs || 0) - acum),
                color: licitatieExpirata ? '#6b7280' : '#ef4444',
              }] : []),
            ].map((s, i) => (
              <div key={i} style={{ backgroundColor: t.bgInput, borderRadius: '12px', padding: '16px', border: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  {s.icon}
                  <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: t.textSecundar }}>{s.label}</span>
                </div>
                <div style={{ fontSize: i === 1 ? '16px' : '20px', fontWeight: '900', color: s.color, fontFamily: i === 3 ? 'monospace' : 'inherit' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <HartaProiect proiect={proiect} t={t} />

      {/* ════════════════════════════════════════════════════════════════
          LICITAȚIE DINAMICĂ — clasament live + formular ofertare repetată
         ════════════════════════════════════════════════════════════════ */}
      {esteDinamica ? (
        <div className="cb-layout-lateral" style={{ display: 'grid', gridTemplateColumns: poateOferta ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>

          {/* Coloana stânga: descriere + clasament live */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Descriere */}
            <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
              <SectionHeader icon={<FileText size={13} />} label="Caiet de Sarcini" t={t} />
              <div style={{ padding: '24px' }}>
                <p style={{ color: t.textPrincipal, fontSize: '14px', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {proiect.descriere || 'Fără descriere detaliată.'}
                </p>
              </div>
            </div>

            <CondițiiParticipareCard proiect={proiect} t={t} />

            <ClarificariCard
              t={t} user={user} esteDezvoltator={esteDezvoltator} poateOferta={poateOferta}
              clarificari={clarificari} incarcClarificari={incarcClarificari}
              intrebareNoua={intrebareNoua} setIntrebareNoua={setIntrebareNoua}
              trimiteIntrebare={trimiteIntrebare} erorClarificare={erorClarificare}
              trimitIntrebareLoading={trimitIntrebareLoading}
              raspunsuriDeschise={raspunsuriDeschise} setRaspunsuriDeschise={setRaspunsuriDeschise}
              trimiteRaspuns={trimiteRaspuns} trimitRaspunsId={trimitRaspunsId}
            />

            {/* Status licitație */}
            {licitatieExpirata && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 22px',
                borderRadius: '14px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              }}>
                <Trophy size={22} color="#10b981" />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: t.textPrincipal }}>Licitația s-a încheiat</div>
                  <div style={{ fontSize: '13px', color: t.textSecundar }}>
                    {proiectLive.castigator
                      ? <>Câștigător: <strong style={{ color: '#10b981' }}>{proiectLive.castigator.nume || 'subcontractor'}</strong> cu cea mai mică ofertă.</>
                      : 'Nicio ofertă nu a fost depusă în perioada licitației.'}
                  </div>
                </div>
              </div>
            )}

            {licitatieExpirata && proiectLive.castigator && proiectLive.ofertaCastigatoare && (
              (esteDezvoltator || String(proiectLive.castigator._id || proiectLive.castigator) === String(user?.id || user?._id)) && (
                <ContactCardLicitatie t={t} ofertaId={proiectLive.ofertaCastigatoare._id || proiectLive.ofertaCastigatoare} esteDezvoltator={esteDezvoltator} />
              )
            )}

            {licitatieNuAInceput && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 22px',
                borderRadius: '14px', backgroundColor: 'rgba(47,111,237,0.06)', border: `1px solid ${t.border}`,
              }}>
                <Clock size={20} color="#2F6FED" />
                <div style={{ fontSize: '13px', color: t.textSecundar }}>
                  Licitația nu a început încă. Va putea fi ofertată din <strong style={{ color: t.textPrincipal }}>{new Date(startMs).toLocaleString('ro-RO')}</strong>.
                </div>
              </div>
            )}

            {/* Clasament live */}
            <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
              <SectionHeader icon={<TrendingDown size={13} />} label={`Clasament Live (${oferteLive.length} oferte active)`} t={t} />
              <div style={{ padding: oferteLive.length === 0 ? '32px 24px' : '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {oferteLive.length === 0 ? (
                  <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0, textAlign: 'center' }}>
                    Niciun subcontractor nu a licitat încă. Fii primul!
                  </p>
                ) : (
                  oferteLive.map((o, idx) => {
                    const esteMea = o.subcontractor?._id === user?.id || o.subcontractor?._id === user?._id;
                    const esteCâștigătoare = licitatieExpirata && idx === 0;
                    return (
                      <div
                        key={o._id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 16px', borderRadius: '10px',
                          backgroundColor: idx === 0 ? 'rgba(16,185,129,0.06)' : t.bgInput,
                          border: `1.5px solid ${idx === 0 ? 'rgba(16,185,129,0.35)' : (esteMea ? '#2F6FED' : t.border)}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: idx === 0 ? '#10b981' : (t.bgCard),
                            color: idx === 0 ? '#fff' : t.textSecundar,
                            fontWeight: '800', fontSize: '13px',
                            border: idx === 0 ? 'none' : `1px solid ${t.border}`,
                          }}>
                            {idx === 0 ? <Crown size={14} /> : `#${idx + 1}`}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: t.textPrincipal, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {esteDezvoltator ? (o.subcontractor?.nume || 'Ofertant') : (esteMea ? 'Oferta ta' : 'Concurent')}
                              {esteMea && <span style={{ fontSize: '10px', fontWeight: '800', color: '#2F6FED', backgroundColor: 'rgba(47,111,237,0.12)', padding: '2px 7px', borderRadius: '10px' }}>TU</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: t.textSecundar }}>{o.termenExecutie} zile {o.subcontractor?.rol === 'FURNIZOR' ? 'livrare' : 'execuție'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: '900', fontSize: '17px', color: idx === 0 ? '#10b981' : t.textPrincipal }}>
                            {Number(o.valoare).toLocaleString()} {o.moneda}
                          </div>
                          {esteCâștigătoare && <div style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>🏆 CÂȘTIGĂTOARE</div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Coloana dreapta: formular ofertare live — DOAR SUBCONTRACTOR */}
          {poateOferta && (
            <div style={{
              backgroundColor: t.bgCard, borderRadius: '16px',
              border: `1px solid ${t.border}`, overflow: 'hidden',
              boxShadow: `0 2px 12px ${t.shadow}`, position: 'sticky', top: '24px',
            }}>
              <div style={{
                padding: '14px 24px', borderBottom: `1px solid ${t.border}`,
                background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
                fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                letterSpacing: '1px', color: '#f59e0b',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Gauge size={13} /> Licitație Live
              </div>

              <div style={{ padding: '22px 24px' }}>

                {ofertaProprieActiva && (
                  <div style={{
                    marginBottom: '16px', padding: '12px 14px', borderRadius: '10px',
                    backgroundColor: esteLider ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${esteLider ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase', marginBottom: '4px' }}>Oferta ta curentă</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: esteLider ? '#10b981' : '#ef4444' }}>
                      {Number(ofertaProprieActiva.valoare).toLocaleString()} {ofertaProprieActiva.moneda}
                    </div>
                    <div style={{ fontSize: '12px', color: esteLider ? '#10b981' : '#ef4444', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {esteLider ? <><Crown size={12} /> Ești pe primul loc</> : <><AlertTriangle size={12} /> Ai fost depășit — oferta minimă e {ceaMaiMicaOferta ? Number(ceaMaiMicaOferta.valoare).toLocaleString() : '–'} {ceaMaiMicaOferta?.moneda}</>}
                    </div>
                  </div>
                )}

                {licitatieExpirata ? (
                  <div style={{ textAlign: 'center', padding: '24px 8px', color: t.textSecundar, fontSize: '13px' }}>
                    Licitația s-a încheiat. Nu mai poți depune oferte.
                  </div>
                ) : licitatieNuAInceput ? (
                  <div style={{ textAlign: 'center', padding: '24px 8px', color: t.textSecundar, fontSize: '13px' }}>
                    Licitația nu a început încă.
                  </div>
                ) : (
                  <form onSubmit={handleSubmitOfertaLive} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}><Banknote size={12} /> Noua ta ofertă (RON)</label>
                      <input required type="number" min="1"
                        placeholder={ceaMaiMicaOferta ? `mai mic de ${Number(ceaMaiMicaOferta.valoare).toLocaleString()}` : 'ex: 45.000'}
                        value={formOferta.pret}
                        onChange={e => setFormOferta({ ...formOferta, pret: e.target.value })}
                        onFocus={() => setFocusat('pret')} onBlur={() => setFocusat(null)}
                        style={inputStyle('pret')}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}><Clock size={12} /> {esteFurnizor ? 'Termen Livrare (zile)' : 'Durată Execuție (zile)'}</label>
                      <input required type="number" min="1" placeholder="ex: 30"
                        value={formOferta.zile}
                        onChange={e => setFormOferta({ ...formOferta, zile: e.target.value })}
                        onFocus={() => setFocusat('zile')} onBlur={() => setFocusat(null)}
                        style={inputStyle('zile')}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}><FileText size={12} /> Mesaj (opțional)</label>
                      <textarea rows={3}
                        placeholder="Detalii suplimentare despre oferta ta..."
                        value={formOferta.mesaj}
                        onChange={e => setFormOferta({ ...formOferta, mesaj: e.target.value })}
                        onFocus={() => setFocusat('mesaj')} onBlur={() => setFocusat(null)}
                        style={{ ...inputStyle('mesaj'), resize: 'vertical', lineHeight: 1.6 }}
                      />
                    </div>

                    {erorOfertaLive && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
                        ⚠️ {erorOfertaLive}
                      </div>
                    )}

                    <button type="submit" disabled={trimitOfertaLive}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: trimitOfertaLive ? 'rgba(245,158,11,0.5)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#fff', border: 'none', borderRadius: '10px', padding: '13px',
                        fontSize: '14px', fontWeight: '700',
                        cursor: trimitOfertaLive ? 'not-allowed' : 'pointer',
                        boxShadow: trimitOfertaLive ? 'none' : '0 4px 16px rgba(245,158,11,0.3)',
                      }}
                    >
                      {trimitOfertaLive ? 'Se trimite...' : <><Send size={15} /> Trimite Oferta <ChevronRight size={15} /></>}
                    </button>
                    <p style={{ fontSize: '11px', color: t.textSecundar, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                      Oferta ta va fi vizibilă imediat tuturor participanților la licitație.
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (

        /* ════════════════════════════════════════════════════════════════
            OFERTARE STATICĂ — formular clasic, o singură ofertă
           ════════════════════════════════════════════════════════════════ */
        <div className="cb-layout-lateral" style={{ display: 'grid', gridTemplateColumns: poateOferta ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
              <SectionHeader icon={<FileText size={13} />} label="Caiet de Sarcini" t={t} />
              <div style={{ padding: '24px' }}>
                <p style={{ color: t.textPrincipal, fontSize: '14px', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {proiect.descriere || 'Fără descriere detaliată.'}
                </p>
              </div>
            </div>

            <CondițiiParticipareCard proiect={proiect} t={t} />

            <ClarificariCard
              t={t} user={user} esteDezvoltator={esteDezvoltator} poateOferta={poateOferta}
              clarificari={clarificari} incarcClarificari={incarcClarificari}
              intrebareNoua={intrebareNoua} setIntrebareNoua={setIntrebareNoua}
              trimiteIntrebare={trimiteIntrebare} erorClarificare={erorClarificare}
              trimitIntrebareLoading={trimitIntrebareLoading}
              raspunsuriDeschise={raspunsuriDeschise} setRaspunsuriDeschise={setRaspunsuriDeschise}
              trimiteRaspuns={trimiteRaspuns} trimitRaspunsId={trimitRaspunsId}
            />

            {esteDezvoltator && (
              <OferteleDezvoltatorStatic proiect={proiect} t={t} onSelectOferta={onSelectOferta} StatusBadge={StatusBadge} />
            )}
          </div>

          {poateOferta && (
            <div style={{
              backgroundColor: t.bgCard, borderRadius: '16px',
              border: `1px solid ${t.border}`, overflow: 'hidden',
              boxShadow: `0 2px 12px ${t.shadow}`, position: 'sticky', top: '24px',
            }}>
              <div style={{
                padding: '14px 24px', borderBottom: `1px solid ${t.border}`,
                background: 'linear-gradient(135deg, rgba(47,111,237,0.1), rgba(79,70,229,0.08))',
                fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                letterSpacing: '1px', color: '#2F6FED',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Send size={13} /> Depune Ofertă
              </div>

              <div style={{ padding: '22px 24px' }}>
                {trimisOK ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} color="#10b981" />
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: t.textPrincipal }}>Ofertă trimisă!</div>
                    <div style={{ fontSize: '13px', color: t.textSecundar, lineHeight: 1.5 }}>
                      Dezvoltatorul va analiza oferta ta. Dacă vei fi ales câștigător, vei primi automat datele lui de contact.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitOfertaStatica} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}><Banknote size={12} /> Prețul tău (RON)</label>
                      <input required type="number" min="1"
                        placeholder={proiect.bugetValoare ? `max. ${Number(proiect.bugetValoare).toLocaleString()} RON` : 'ex: 45.000'}
                        value={formOferta.pret}
                        onChange={e => setFormOferta({ ...formOferta, pret: e.target.value })}
                        onFocus={() => setFocusat('pret')} onBlur={() => setFocusat(null)}
                        style={inputStyle('pret')}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}><Clock size={12} /> {esteFurnizor ? 'Termen Livrare (zile)' : 'Durată Execuție (zile)'}</label>
                      <input required type="number" min="1" placeholder="ex: 30"
                        value={formOferta.zile}
                        onChange={e => setFormOferta({ ...formOferta, zile: e.target.value })}
                        onFocus={() => setFocusat('zile')} onBlur={() => setFocusat(null)}
                        style={inputStyle('zile')}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}><FileText size={12} /> Mesaj pentru Dezvoltator</label>
                      <textarea rows={4}
                        placeholder="Prezintă-ți experiența relevantă, echipa disponibilă, sau orice condiție specială..."
                        value={formOferta.mesaj}
                        onChange={e => setFormOferta({ ...formOferta, mesaj: e.target.value })}
                        onFocus={() => setFocusat('mesaj')} onBlur={() => setFocusat(null)}
                        style={{ ...inputStyle('mesaj'), resize: 'vertical', lineHeight: 1.65 }}
                      />
                    </div>

                    {/* Upload fișiere */}
                    <div>
                      <label style={labelStyle}><Paperclip size={12} /> Documente Atașate <span style={{ color: t.textSecundar, fontSize: '10px', fontWeight: '500', textTransform: 'none', letterSpacing: 0 }}>(opțional, max 20MB/fișier)</span></label>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: `2px dashed ${focusat === 'fisiere' ? '#2F6FED' : t.border}`,
                          borderRadius: '10px', padding: '20px',
                          textAlign: 'center', cursor: 'pointer',
                          backgroundColor: t.bgInput, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2F6FED'; e.currentTarget.style.backgroundColor = 'rgba(47,111,237,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.backgroundColor = t.bgInput; }}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#2F6FED'; }}
                        onDrop={e => {
                          e.preventDefault();
                          const dropped = Array.from(e.dataTransfer.files);
                          setFisiere(prev => {
                            const existente = new Set(prev.map(f => f.name + f.size));
                            return [...prev, ...dropped.filter(f => !existente.has(f.name + f.size))];
                          });
                          e.currentTarget.style.borderColor = t.border;
                        }}
                      >
                        <Paperclip size={20} color="#2F6FED" style={{ marginBottom: '8px' }} />
                        <div style={{ fontSize: '13px', fontWeight: '600', color: t.textPrincipal, marginBottom: '4px' }}>
                          Click sau trage fișierele aici
                        </div>
                        <div style={{ fontSize: '11px', color: t.textSecundar }}>
                          PDF, Word, Excel, imagini — orice format acceptat
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFisiere}
                      />

                      {fisiere.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {fisiere.map((f, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', borderRadius: '8px',
                              backgroundColor: 'rgba(47,111,237,0.06)',
                              border: '1px solid rgba(47,111,237,0.15)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <File size={14} color="#2F6FED" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', fontWeight: '600', color: t.textPrincipal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {f.name}
                                </span>
                                <span style={{ fontSize: '11px', color: t.textSecundar, flexShrink: 0 }}>
                                  {formatSize(f.size)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => stergeFile(i)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {errorOferta && (
                      <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
                        ⚠️ {errorOferta}
                      </div>
                    )}
                    <button type="submit" disabled={loadingOferta}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: loadingOferta ? 'rgba(47,111,237,0.5)' : 'linear-gradient(135deg, #2F6FED, #4f46e5)',
                        color: '#fff', border: 'none', borderRadius: '10px', padding: '13px',
                        fontSize: '14px', fontWeight: '700',
                        cursor: loadingOferta ? 'not-allowed' : 'pointer',
                        boxShadow: loadingOferta ? 'none' : '0 4px 16px rgba(47,111,237,0.3)',
                      }}
                    >
                      {loadingOferta ? 'Se trimite...' : <><Send size={15} /> Trimite Oferta <ChevronRight size={15} /></>}
                    </button>
                    <p style={{ fontSize: '11px', color: t.textSecundar, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                      Poți depune o singură ofertă pentru acest proiect. Oferta ta va fi vizibilă doar dezvoltatorului.
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentă: lista de oferte pentru dezvoltator, în modul STATIC ──
function OferteleDezvoltatorStatic({ proiect, t, onSelectOferta, StatusBadge }) {
  const [oferte, setOferte] = useState([]);
  const [seIncarca, setSeIncarca] = useState(true);

  useEffect(() => {
    let activ = true;
    apiOferteProiect(proiect._id)
      .then(data => { if (activ) setOferte(data.oferte || []); })
      .catch(() => {})
      .finally(() => { if (activ) setSeIncarca(false); });

    const socket = getSocket();
    socket.emit('join_proiect', proiect._id);
    const onOfertaNoua = ({ oferta }) => {
      if (oferta?.proiect !== proiect._id) return;
      setOferte(prev => [oferta, ...prev.filter(o => o._id !== oferta._id)]);
    };
    socket.on('oferta_noua', onOfertaNoua);

    return () => {
      activ = false;
      socket.emit('leave_proiect', proiect._id);
      socket.off('oferta_noua', onOfertaNoua);
    };
  }, [proiect._id]);

  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <SectionHeader icon={<Users size={13} />} label={`oferte Primite (${oferte.length})`} t={t} />
      <div style={{ padding: (seIncarca || oferte.length === 0) ? '32px 24px' : '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {seIncarca ? (
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0, textAlign: 'center' }}>Se încarcă...</p>
        ) : oferte.length === 0 ? (
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0, textAlign: 'center' }}>
            Niciun subcontractor nu a licitat încă.
          </p>
        ) : (
          oferte.map((o, idx) => (
            <div
              key={o._id}
              onClick={() => onSelectOferta && onSelectOferta(o, idx, proiect)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: '10px',
                backgroundColor: t.bgInput, border: `1px solid ${t.border}`,
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2F6FED'}
              onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '14px', color: t.textPrincipal, marginBottom: '4px' }}>
                  {o.subcontractor?.rol === 'FURNIZOR' ? '📦' : '👷'} {o.subcontractor?.nume || 'Ofertant'}
                </div>
                <div style={{ fontSize: '12px', color: t.textSecundar }}>
                  <span style={{ color: '#10b981', fontWeight: '800' }}>{Number(o.valoare).toLocaleString()} {o.moneda}</span>
                  {' '}&nbsp;•&nbsp; {o.termenExecutie} zile {o.subcontractor?.rol === 'FURNIZOR' ? 'livrare' : 'execuție'}
                </div>
                {o.descriere && (
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: t.textSecundar, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                    "{o.descriere}"
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
                <StatusBadge status={o.status} />
                <ChevronRight size={16} color={t.textSecundar} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Hartă locație proiect — embed OpenStreetMap gratuit, fără cheie de API.
// Se afișează doar dacă proiectul are coordonate (geocodate automat de
// backend la creare/editare, din câmpul `locatie`).
function HartaProiect({ proiect, t }) {
  const lat = proiect.latitudine;
  const lon = proiect.longitudine;
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;

  const delta = 0.012;
  const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  const linkComplet = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;

  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <SectionHeader icon={<MapPin size={13} />} label="Locație pe hartă" t={t} />
      <iframe
        title="Locație proiect"
        src={src}
        style={{ width: '100%', height: '260px', border: 'none', display: 'block' }}
        loading="lazy"
      />
      <div style={{ padding: '10px 24px' }}>
        <a href={linkComplet} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2F6FED', fontWeight: '600', textDecoration: 'none' }}>
          Deschide harta completă ↗
        </a>
      </div>
    </div>
  );
}

// ─── Card "Condiții de Participare" — apare doar dacă dezvoltatorul a setat
// măcar una dintre condiții la publicare (Row 4 din tracker). ───────────────
function CondițiiParticipareCard({ proiect, t }) {
  const areCeva = proiect.termenLimitaOferta || proiect.avansProcent != null || proiect.garantii || proiect.experientaMinima;
  if (!areCeva) return null;

  const randuri = [
    proiect.termenLimitaOferta && {
      icon: <Clock size={14} />, label: 'Termen limită depunere ofertă',
      value: new Date(proiect.termenLimitaOferta).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    },
    proiect.avansProcent != null && {
      icon: <Banknote size={14} />, label: 'Avans', value: `${proiect.avansProcent}%`,
    },
    proiect.garantii && {
      icon: <ShieldCheck size={14} />, label: 'Garanții', value: proiect.garantii,
    },
    proiect.experientaMinima && {
      icon: <FileCheck size={14} />, label: 'Experiență necesară', value: proiect.experientaMinima,
    },
  ].filter(Boolean);

  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <SectionHeader icon={<ShieldCheck size={13} />} label="Condiții de Participare" t={t} />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {randuri.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px', flexShrink: 0 }}>
              {r.icon} {r.label}
            </div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: t.textPrincipal, textAlign: 'right' }}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card "Clarificări" — Q&A public pe pagina proiectului. Orice ofertant
// (subcontractor/furnizor) poate întreba; doar dezvoltatorul proiectului
// poate răspunde. Toată lumea vede întrebările și răspunsurile. ────────────
function ClarificariCard({
  t, user, esteDezvoltator, poateOferta,
  clarificari, incarcClarificari,
  intrebareNoua, setIntrebareNoua, trimiteIntrebare, erorClarificare,
  raspunsuriDeschise, setRaspunsuriDeschise, trimiteRaspuns, trimitRaspunsId,
  trimitIntrebareLoading = false,
}) {
  const userId = user?.id || user?._id;

  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <SectionHeader icon={<HelpCircle size={13} />} label={`Clarificări (${clarificari.length})`} t={t} />
      <div style={{ padding: incarcClarificari || clarificari.length === 0 ? '24px' : '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {incarcClarificari ? (
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0, textAlign: 'center' }}>Se încarcă...</p>
        ) : clarificari.length === 0 ? (
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0, textAlign: 'center' }}>
            Nicio întrebare încă. {poateOferta ? 'Fii primul care întreabă ceva.' : ''}
          </p>
        ) : (
          clarificari.map(c => {
            const esteAMea = (c.autor?._id || c.autor) === userId;
            const raspunsDraft = raspunsuriDeschise[c._id];
            return (
              <div key={c._id} style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: t.textPrincipal }}>
                    {esteDezvoltator ? (c.autor?.nume || 'Ofertant') : (esteAMea ? 'Întrebarea ta' : c.autor?.nume || 'Ofertant')}
                  </span>
                  {esteAMea && <span style={{ fontSize: '10px', fontWeight: '800', color: '#2F6FED', backgroundColor: 'rgba(47,111,237,0.12)', padding: '2px 7px', borderRadius: '10px' }}>TU</span>}
                </div>
                <div style={{ fontSize: '13px', color: t.textPrincipal, lineHeight: 1.5, marginBottom: c.raspuns || esteDezvoltator ? '8px' : 0 }}>{c.intrebare}</div>

                {c.raspuns ? (
                  <div style={{ display: 'flex', gap: '8px', padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '12.5px', color: t.textPrincipal, lineHeight: 1.5 }}>
                      <strong style={{ color: '#10b981' }}>Răspuns dezvoltator: </strong>{c.raspuns}
                    </div>
                  </div>
                ) : esteDezvoltator ? (
                  raspunsDraft !== undefined ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text" autoFocus
                        value={raspunsDraft}
                        onChange={e => setRaspunsuriDeschise(prev => ({ ...prev, [c._id]: e.target.value }))}
                        placeholder="Scrie răspunsul..."
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.textPrincipal, fontSize: '12.5px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        disabled={trimitRaspunsId === c._id}
                        onClick={() => trimiteRaspuns(c._id, raspunsDraft)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#2F6FED', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {trimitRaspunsId === c._id ? '...' : 'Trimite'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRaspunsuriDeschise(prev => ({ ...prev, [c._id]: '' }))}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: '#2F6FED', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Răspunde
                    </button>
                  )
                ) : (
                  <div style={{ fontSize: '12px', color: t.textSecundar, fontStyle: 'italic' }}>În așteptarea răspunsului dezvoltatorului.</div>
                )}
              </div>
            );
          })
        )}

        {erorClarificare && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {erorClarificare}
          </div>
        )}

        {poateOferta && (
          <form onSubmit={trimiteIntrebare} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              value={intrebareNoua}
              onChange={e => setIntrebareNoua(e.target.value)}
              placeholder="Pune o întrebare despre acest proiect..."
              disabled={trimitIntrebareLoading}
              style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', outline: 'none', opacity: trimitIntrebareLoading ? 0.6 : 1 }}
            />
            <button
              type="submit"
              disabled={trimitIntrebareLoading || !intrebareNoua.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: (trimitIntrebareLoading || !intrebareNoua.trim()) ? 'rgba(47,111,237,0.5)' : '#2F6FED',
                color: '#fff', fontSize: '13px', fontWeight: '700',
                cursor: (trimitIntrebareLoading || !intrebareNoua.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={13} /> {trimitIntrebareLoading ? 'Se trimite...' : 'Întreabă'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, label, t }) {
  return (
    <div style={{
      padding: '14px 24px', borderBottom: `1px solid ${t.border}`,
      backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800',
      textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar,
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      {icon} {label}
    </div>
  );
}

// ─── Card de contact pentru licitație DINAMICĂ, afișat dezvoltatorului și
// subcontractorului câștigător după finalizarea licitației. Datele se preiau
// de la endpoint-ul dedicat (server-side gated pe status + identitate). ───
function ContactCardLicitatie({ t, ofertaId, esteDezvoltator }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');

  useEffect(() => {
    if (!ofertaId) return;
    let activ = true;
    setLoading(true);
    apiContactOferta(ofertaId)
      .then(data => { if (activ) setContact(data); })
      .catch(err => { if (activ) setEroare(err.message || 'Nu am putut încărca datele de contact.'); })
      .finally(() => { if (activ) setLoading(false); });
    return () => { activ = false; };
  }, [ofertaId]);

  const parte = contact ? (esteDezvoltator ? contact.subcontractor : contact.dezvoltator) : null;

  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: '1px solid rgba(16,185,129,0.3)', overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: 'rgba(16,185,129,0.06)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trophy size={13} /> Date de Contact — {esteDezvoltator ? 'Ofertant Câștigător' : 'Beneficiar'}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>
            <Loader2 size={15} className="spin-icon" /> Se încarcă...
          </div>
        ) : eroare ? (
          <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{eroare}</div>
        ) : parte ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <RandContact icon={<Building2 size={15} />} label="Companie" value={parte.nume} t={t} />
            {parte.email && <RandContact icon={<Mail size={15} />} label="Email" value={parte.email} href={`mailto:${parte.email}`} t={t} />}
            {parte.telefon && <RandContact icon={<Phone size={15} />} label="Telefon" value={parte.telefon} href={`tel:${parte.telefon}`} t={t} />}
            {parte.cui && <RandContact icon={<Hash size={15} />} label="CUI" value={parte.cui} t={t} />}
            {parte.judet && <RandContact icon={<MapPinned size={15} />} label="Județ" value={parte.judet} last t={t} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RandContact({ icon, label, value, href, last, t }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>{icon} {label}</div>
      {href ? <a href={href} style={{ fontWeight: '700', fontSize: '14px', color: '#2F6FED', textDecoration: 'none' }}>{value}</a>
            : <span style={{ fontWeight: '700', fontSize: '14px', color: t.textPrincipal }}>{value}</span>}
    </div>
  );
}
