import React, { useState, useMemo } from 'react';
import { Send, Building2, ChevronRight, TrendingUp, Trophy, Clock, Inbox } from 'lucide-react';

const FILTRE = [
  { id: 'toate', label: 'Toate' },
  { id: 'in_asteptare', label: 'În așteptare' },
  { id: 'acceptata', label: 'Acceptate' },
  { id: 'castigatoare', label: 'Câștigătoare' },
  { id: 'respinsa', label: 'Respinse' },
  { id: 'depasita', label: 'Depășite' },
];

export default function OfertelemTaleView({ t, oferteleMele = [], onSelectOferta }) {
  const [filtru, setFiltru] = useState('toate');

  const oferteFiltrate = useMemo(() => {
    if (filtru === 'toate') return oferteleMele;
    return oferteleMele.filter(o => o.status === filtru);
  }, [oferteleMele, filtru]);

  const stats = useMemo(() => {
    const active = oferteleMele.filter(o => o.status === 'in_asteptare').length;
    const castigate = oferteleMele.filter(o => o.status === 'acceptata' || o.status === 'castigatoare').length;
    const valoare = oferteleMele.reduce((acc, o) => acc + Number(o.valoare || 0), 0);
    return [
      { titlu: 'Total oferte', valoare: oferteleMele.length, icon: <Send size={18} />, color: '#2F6FED', bg: 'rgba(47,111,237,0.1)' },
      { titlu: 'În așteptare', valoare: active, icon: <Clock size={18} />, color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
      { titlu: 'Câștigate', valoare: castigate, icon: <Trophy size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      { titlu: 'Valoare totală ofertată', valoare: `${valoare.toLocaleString()} RON`, icon: <TrendingUp size={18} />, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    ];
  }, [oferteleMele]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '8px 4px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div>
        <h1 style={{ fontFamily: t.fontDisplay, fontSize: '26px', fontWeight: '800', color: t.textPrincipal, margin: '0 0 6px' }}>Ofertele Tale</h1>
        <p style={{ color: t.textSecundar, fontSize: '14px', margin: 0 }}>Toate ofertele pe care le-ai trimis către dezvoltatori, într-un singur loc.</p>
      </div>

      {/* ── Statistici rapide ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '16px' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', backgroundColor: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.titlu}</div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: t.textPrincipal }}>{s.valoare}</div>
          </div>
        ))}
      </div>

      {/* ── Filtre ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTRE.map(f => {
          const activ = filtru === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltru(f.id)}
              style={{
                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                border: `1.5px solid ${activ ? t.accent : t.border}`,
                backgroundColor: activ ? t.accentSoft : t.bgCard,
                color: activ ? t.accent : t.textSecundar,
                fontSize: '13px', fontWeight: activ ? '700' : '600',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Listă oferte ── */}
      {oferteFiltrate.length === 0 ? (
        <div style={{
          backgroundColor: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: '16px',
          padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        }}>
          <Inbox size={28} color={t.textSecundar} />
          <p style={{ color: t.textSecundar, fontSize: '14px', margin: 0, textAlign: 'center' }}>
            {filtru === 'toate' ? 'Nu ai trimis nicio ofertă încă.' : 'Nu ai nicio ofertă în această categorie.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {oferteFiltrate.map(o => (
            <div
              key={o._id}
              onClick={() => onSelectOferta && onSelectOferta(o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                padding: '18px 20px', borderRadius: '14px', backgroundColor: t.bgCard,
                border: `1px solid ${t.border}`, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(47,111,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={18} color="#2F6FED" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '750', fontSize: '14.5px', color: t.textPrincipal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.proiect?.titlu || 'Proiect'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: t.textSecundar, marginTop: '2px' }}>
                    {o.proiect?.dezvoltator?.nume ? `${o.proiect.dezvoltator.nume} • ` : ''}
                    {Number(o.valoare).toLocaleString()} {o.moneda} • {o.termenExecutie} zile
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {o.proiect?.esteProspectare
                  ? <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: t.accentSoft, color: t.accent, padding: '5px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>TRIMISĂ · PROSPECTARE</span>
                  : <StatusPill status={o.status} />}
                <ChevronRight size={16} color={t.textSecundar} />
              </div>
            </div>
          ))}
        </div>
      )}
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
    <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: cfg.bg, color: cfg.color, padding: '5px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}
