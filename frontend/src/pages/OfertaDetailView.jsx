import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, XCircle,
  Building2, Banknote, Clock, FileText, MapPin,
  Layers, Wrench, Zap, Paintbrush2,
  Phone, Mail, Hash, MapPinned, Paperclip,
  Briefcase, Users, Star, Calendar, Loader2, ShieldCheck, Download,
} from 'lucide-react';
import { SERVER_URL, apiContactOferta, apiDescarcaContractPdf } from '../api.js';

const CATEGORIE_CONFIG = {
  'Structuri':  { icon: <Layers size={14} />,      color: '#2F6FED', bg: 'rgba(47,111,237,0.12)'  },
  'Instalații': { icon: <Wrench size={14} />,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Electrice':  { icon: <Zap size={14} />,          color: '#a855f7', bg: 'rgba(168,85,247,0.12)'  },
  'Finisaje':   { icon: <Paintbrush2 size={14} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
};

export default function OfertaDetailView({
  oferta,
  proiect,
  indexOferta,
  t,
  onBack,
  onAccepta,
  onRefuza,
}) {
  const [confirmare, setConformare] = useState(null); // 'accepta' | 'refuza' | null
  const [contact, setContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactEroare, setContactEroare] = useState('');
  const [pdfSeDescarca, setPdfSeDescarca] = useState(false);
  const [pdfEroare, setPdfEroare] = useState('');

  const statusCurent = oferta?.status || 'in_asteptare';
  const aCastigat = statusCurent === 'acceptata' || statusCurent === 'castigatoare';

  useEffect(() => {
    if (!oferta?._id || !aCastigat) { setContact(null); return; }
    let activ = true;
    setContactLoading(true);
    setContactEroare('');
    apiContactOferta(oferta._id)
      .then(data => { if (activ) setContact(data); })
      .catch(err => { if (activ) setContactEroare(err.message || 'Nu am putut încărca datele de contact.'); })
      .finally(() => { if (activ) setContactLoading(false); });
    return () => { activ = false; };
  }, [oferta?._id, aCastigat]);

  if (!oferta || !proiect) return null;

  const catCfg = CATEGORIE_CONFIG[proiect.categorie] || {
    icon: <Layers size={14} />, color: '#6b7280', bg: 'rgba(107,114,128,0.12)',
  };

  const esteFinalizata = statusCurent === 'acceptata' || statusCurent === 'respinsa' || statusCurent === 'castigatoare' || statusCurent === 'depasita';
  const subcontractor = oferta.subcontractor || {};

  const handleAccepta = () => {
    onAccepta(oferta._id);
    setConformare(null);
  };

  const handleRefuza = () => {
    onRefuza(oferta._id);
    setConformare(null);
  };

  const InfoRow = ({ icon, label, value, valueColor }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>
        {icon} {label}
      </div>
      <span style={{ fontWeight: '700', fontSize: '14px', color: valueColor || t.textPrincipal }}>
        {value}
      </span>
    </div>
  );

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

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
        <ArrowLeft size={15} /> Înapoi la proiect
      </button>

      {/* ── HEADER OFERTĂ ── */}
      <div style={{
        backgroundColor: t.bgCard, borderRadius: '20px',
        border: `1px solid ${t.border}`, overflow: 'hidden',
        boxShadow: `0 4px 24px ${t.shadow}`,
      }}>
        <div style={{
          height: '4px',
          background: aCastigat
            ? 'linear-gradient(90deg, #10b981, #34d399)'
            : statusCurent === 'respinsa' || statusCurent === 'depasita'
            ? 'linear-gradient(90deg, #ef4444, #f87171)'
            : 'linear-gradient(90deg, #eab308, #fbbf24)',
        }} />

        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: t.textSecundar, marginBottom: '6px' }}>
                Cotație de la
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(47,111,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="#2F6FED" />
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: '850', color: t.textPrincipal, margin: 0 }}>
                  {subcontractor.nume || 'Subcontractor'}
                </h1>
              </div>
            </div>
            <StatusBadgeMare status={statusCurent} />
          </div>

          <div style={{ borderTop: `1px solid ${t.border}` }}>
            <InfoRow
              icon={<Banknote size={15} />}
              label="Valoare Ofertată"
              value={`${Number(oferta.valoare).toLocaleString()} ${oferta.moneda || 'RON'}`}
              valueColor="#10b981"
            />
            <InfoRow
              icon={<Clock size={15} />}
              label="Durată Execuție"
              value={`${oferta.termenExecutie} zile`}
            />
          </div>
        </div>
      </div>

      {/* ── DESPRE FIRMĂ — experiență + portofoliu (info publică, ajută la evaluare) ── */}
      <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={13} /> Despre Firmă
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <MiniStat t={t} icon={<Briefcase size={14} />} label="Ani experiență" valoare={subcontractor.aniExperienta ?? '—'} />
            <MiniStat t={t} icon={<Users size={14} />} label="Angajați" valoare={subcontractor.nrAngajati ?? '—'} />
            <MiniStat t={t} icon={<MapPin size={14} />} label="Județ" valoare={subcontractor.judet || '—'} />
          </div>

          {subcontractor.descriere && (
            <p style={{ color: t.textPrincipal, fontSize: '14px', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "{subcontractor.descriere}"
            </p>
          )}

          {subcontractor.lucrari && subcontractor.lucrari.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: t.textSecundar, marginBottom: '10px' }}>
                Lucrări realizate ({subcontractor.lucrari.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {subcontractor.lucrari.slice(0, 4).map((l, i) => (
                  <div key={l._id || i} style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: t.textPrincipal }}>{l.titlu}</span>
                      {l.an && <span style={{ fontSize: '12px', color: t.textSecundar, flexShrink: 0 }}>{l.an}</span>}
                    </div>
                    {l.descriere && <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.textSecundar, lineHeight: 1.5 }}>{l.descriere}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {subcontractor.disponibilitate && subcontractor.disponibilitate.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: t.textSecundar, marginBottom: '10px' }}>
                Disponibilitate declarată
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {subcontractor.disponibilitate.map((d, i) => (
                  <span key={d._id || i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', padding: '6px 12px', borderRadius: '20px', backgroundColor: 'rgba(34,178,125,0.1)', color: '#22B27D' }}>
                    <Calendar size={12} /> {new Date(d.start).toLocaleDateString('ro-RO')} – {new Date(d.end).toLocaleDateString('ro-RO')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MESAJ OFERTANT ── */}
      {oferta.descriere && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={13} /> Mesajul Subcontractorului
          </div>
          <div style={{ padding: '24px' }}>
            <p style={{ color: t.textPrincipal, fontSize: '14px', lineHeight: 1.75, margin: 0, fontStyle: 'italic' }}>
              "{oferta.descriere}"
            </p>
          </div>
        </div>
      )}

      {/* ── DOCUMENTE ATAȘATE ── */}
      {oferta.documente && oferta.documente.length > 0 && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Paperclip size={13} /> Documente Atașate ({oferta.documente.length})
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {oferta.documente.map((numeFisier, i) => (
              <a
                key={i}
                href={`${SERVER_URL}/uploads/${numeFisier}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px',
                  backgroundColor: t.bgInput, border: `1px solid ${t.border}`,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2F6FED'; e.currentTarget.style.backgroundColor = 'rgba(47,111,237,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.backgroundColor = t.bgInput; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: t.textPrincipal }}>
                  <Paperclip size={14} color="#2F6FED" /> {numeFisier}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── ACȚIUNI DEZVOLTATOR ── */}
      {!esteFinalizata && (
        <div style={{
          backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`,
          padding: '20px 24px', boxShadow: `0 2px 12px ${t.shadow}`,
        }}>
          {confirmare ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', color: t.textPrincipal, fontWeight: '700' }}>
                {confirmare === 'accepta'
                  ? 'Confirmi acceptarea acestei oferte? Restul ofertelor în așteptare vor fi respinse automat, iar datele de contact vor deveni vizibile pentru ambele părți.'
                  : 'Confirmi respingerea acestei oferte?'}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={confirmare === 'accepta' ? handleAccepta : handleRefuza}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: confirmare === 'accepta' ? '#10b981' : '#ef4444', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  Da, confirmă
                </button>
                <button onClick={() => setConformare(null)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: t.textSecundar, fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                  Anulează
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setConformare('accepta')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 22px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', fontWeight: '700', fontSize: '14px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                }}
              >
                <CheckCircle2 size={16} /> Acceptă Cotația
              </button>

              <button
                onClick={() => setConformare('refuza')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 22px', borderRadius: '10px',
                  border: '1.5px solid rgba(239,68,68,0.35)',
                  backgroundColor: 'rgba(239,68,68,0.06)',
                  color: '#ef4444', fontWeight: '700', fontSize: '14px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)'}
              >
                <XCircle size={16} /> Refuză
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mesaj dacă e deja finalizată (fără câștig) */}
      {esteFinalizata && !aCastigat && (
        <div style={{
          padding: '18px 24px', borderRadius: '12px',
          backgroundColor: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: '10px',
          color: '#ef4444',
          fontWeight: '700', fontSize: '14px',
        }}>
          <XCircle size={18} /> {statusCurent === 'depasita' ? 'Această ofertă a fost depășită de o ofertă mai mică.' : 'Această cotație a fost respinsă.'}
        </div>
      )}

      {/* ── DATE DE CONTACT — dezvăluite doar după câștigarea ofertei ── */}
      {aCastigat && (
        <div style={{
          backgroundColor: t.bgCard, borderRadius: '16px',
          border: '1px solid rgba(16,185,129,0.3)',
          overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}`,
        }}>
          <div style={{
            padding: '14px 24px', borderBottom: `1px solid ${t.border}`,
            backgroundColor: 'rgba(16,185,129,0.06)',
            fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '1px', color: '#10b981',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ShieldCheck size={13} /> Cotație câștigătoare — Date de Contact Subcontractor
          </div>

          <div style={{ padding: '24px' }}>
            {contactLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>
                <Loader2 size={15} className="spin-icon" /> Se încarcă datele de contact...
              </div>
            ) : contactEroare ? (
              <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{contactEroare}</div>
            ) : contact ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <ContactRow icon={<Building2 size={15} />} label="Companie" value={contact.subcontractor.nume} t={t} />
                {contact.subcontractor.email && <ContactRow icon={<Mail size={15} />} label="Email" value={contact.subcontractor.email} href={`mailto:${contact.subcontractor.email}`} t={t} />}
                {contact.subcontractor.telefon && <ContactRow icon={<Phone size={15} />} label="Telefon" value={contact.subcontractor.telefon} href={`tel:${contact.subcontractor.telefon}`} t={t} />}
                {contact.subcontractor.cui && <ContactRow icon={<Hash size={15} />} label="CUI" value={contact.subcontractor.cui} t={t} />}
                {contact.subcontractor.judet && <ContactRow icon={<MapPinned size={15} />} label="Județ" value={contact.subcontractor.judet} last t={t} />}
              </div>
            ) : null}

            <button
              onClick={async () => {
                setPdfEroare('');
                setPdfSeDescarca(true);
                try {
                  await apiDescarcaContractPdf(oferta._id);
                } catch (err) {
                  setPdfEroare(err.message || 'Nu am putut genera PDF-ul.');
                } finally {
                  setPdfSeDescarca(false);
                }
              }}
              disabled={pdfSeDescarca}
              style={{
                marginTop: '18px', display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '10px',
                padding: '11px 16px', fontSize: '13px', fontWeight: '700', color: t.textPrincipal,
                cursor: pdfSeDescarca ? 'default' : 'pointer',
              }}
            >
              {pdfSeDescarca ? <Loader2 size={15} className="spin-icon" /> : <Download size={15} />}
              Descarcă rezumat contract (PDF)
            </button>
            {pdfEroare && <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '12.5px', fontWeight: '600' }}>{pdfEroare}</div>}
          </div>
        </div>
      )}

    </div>
  );
}

function ContactRow({ icon, label, value, href, last, t }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>
        {icon} {label}
      </div>
      {href ? (
        <a href={href} style={{ fontWeight: '700', fontSize: '14px', color: '#2F6FED', textDecoration: 'none' }}>{value}</a>
      ) : (
        <span style={{ fontWeight: '700', fontSize: '14px', color: t.textPrincipal }}>{value}</span>
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

function StatusBadgeMare({ status }) {
  const cfg = {
    acceptata:    { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)', label: '✓ Acceptată'  },
    castigatoare: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)', label: '🏆 Câștigătoare'  },
    respinsa:     { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', border: 'rgba(239,68,68,0.25)',  label: '✕ Respinsă'   },
    depasita:     { bg: 'rgba(107,114,128,0.10)', color: '#6b7280', border: 'rgba(107,114,128,0.25)', label: 'Depășită' },
    in_asteptare: { bg: 'rgba(234,179,8,0.10)',  color: '#eab308', border: 'rgba(234,179,8,0.25)',  label: '⏳ În analiză' },
  }[status || 'in_asteptare'];
  return (
    <span style={{
      fontSize: '13px', fontWeight: '800', padding: '7px 16px',
      borderRadius: '20px', backgroundColor: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}
