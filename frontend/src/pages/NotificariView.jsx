import React, { useState } from 'react';
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  Trophy, FileText, AlertTriangle, TrendingUp,
  Filter, X
} from 'lucide-react';

const TIP_CONFIG = {
  oferta:    { icon: <TrendingUp size={15} />,    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Ofertă' },
  castigat:  { icon: <Trophy size={15} />,        color: '#FF9E2C', bg: 'rgba(255,158,44,0.12)', label: 'Câștig' },
  proiect:   { icon: <FileText size={15} />,      color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  label: 'Proiect' },
  alerta:    { icon: <AlertTriangle size={15} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Alertă' },
};

export default function NotificariView({ t, notificari, onMarcheazaCitit, onMarcheazaToateCitite, onStergeNotificare, onStergeToate, setActiveTab, onDeschide }) {
  const [filtru, setFiltru] = useState('toate'); // toate | necitite | oferta | castigat | proiect | alerta

  const marcheazaCitit = (id) => {
    onMarcheazaCitit(id);
  };

  const marcheazaToateCitite = () => {
    onMarcheazaToateCitite();
  };

  const stergeNotificare = (id) => {
    onStergeNotificare(id);
  };

  const stergeToate = () => {
    onStergeToate();
  };

  const handleClick = (n) => {
    marcheazaCitit(n.id);
    if (onDeschide && (n.link || n.proiectId)) {
      onDeschide(n);
    } else if ((n.tip === 'oferta' || n.tip === 'proiect' || n.tip === 'castigat') && setActiveTab) {
      setActiveTab('santiere');
    }
  };

  const filtre = [
    { key: 'toate',    label: 'Toate' },
    { key: 'necitite', label: 'Necitite' },
    { key: 'oferta',   label: 'Oferte' },
    { key: 'castigat', label: 'Câștiguri' },
    { key: 'proiect',  label: 'Proiecte' },
    { key: 'alerta',   label: 'Alerte' },
  ];

  const notificariFiltrate = notificari.filter(n => {
    if (filtru === 'toate') return true;
    if (filtru === 'necitite') return !n.citit;
    return n.tip === filtru;
  });

  const nrNecitite = notificari.filter(n => !n.citit).length;

  const formateazaData = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const acum = new Date();
      const diff = Math.floor((acum - d) / 1000);
      if (diff < 60) return 'acum';
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(47,111,237,0.1)', color: '#2F6FED', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', padding: '5px 12px', borderRadius: '20px', marginBottom: '10px' }}>
            <Bell size={11} /> Centru de Notificări
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '850', color: t.textPrincipal, margin: '0 0 4px' }}>
            Notificări
            {nrNecitite > 0 && (
              <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: '700', backgroundColor: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '999px', verticalAlign: 'middle' }}>
                {nrNecitite}
              </span>
            )}
          </h2>
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0 }}>
            {nrNecitite === 0 ? 'Ești la zi cu toate notificările.' : `Ai ${nrNecitite} notificare${nrNecitite > 1 ? 'i' : ''} necitit${nrNecitite > 1 ? 'e' : 'ă'}.`}
          </p>
        </div>

        {/* Acțiuni bulk */}
        {notificari.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {nrNecitite > 0 && (
              <button
                onClick={marcheazaToateCitite}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.textSecundar, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                <CheckCheck size={14} /> Marchează toate citite
              </button>
            )}
            <button
              onClick={stergeToate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
            >
              <Trash2 size={14} /> Șterge toate
            </button>
          </div>
        )}
      </div>

      {/* Filtre */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {filtre.map(f => {
          const activ = filtru === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltru(f.key)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                border: activ ? '1.5px solid #2F6FED' : `1px solid ${t.border}`,
                backgroundColor: activ ? 'rgba(47,111,237,0.1)' : t.bgCard,
                color: activ ? '#2F6FED' : t.textSecundar,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f.label}
              {f.key === 'necitite' && nrNecitite > 0 && (
                <span style={{ marginLeft: '5px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0 5px', fontSize: '10px' }}>{nrNecitite}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista notificări */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notificariFiltrate.length === 0 ? (
          <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '56px 32px', textAlign: 'center' }}>
            <BellOff size={36} style={{ color: t.textSecundar, opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ color: t.textSecundar, fontSize: '14px', margin: 0, fontWeight: '600' }}>
              {filtru === 'necitite' ? 'Nicio notificare necitită.' : 'Nicio notificare în această categorie.'}
            </p>
          </div>
        ) : (
          notificariFiltrate.map(n => {
            const cfg = TIP_CONFIG[n.tip] || TIP_CONFIG.alerta;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '16px 18px',
                  borderRadius: '14px',
                  backgroundColor: n.citit ? t.bgCard : (t.bgInput),
                  border: `1px solid ${n.citit ? t.border : 'rgba(47,111,237,0.15)'}`,
                  cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#2F6FED'}
                onMouseLeave={e => e.currentTarget.style.borderColor = n.citit ? t.border : 'rgba(47,111,237,0.15)'}
              >
                {/* Dot necitit */}
                {!n.citit && (
                  <div style={{ position: 'absolute', top: '18px', right: '18px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2F6FED', flexShrink: 0 }} />
                )}

                {/* Icon tip */}
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  {cfg.icon}
                </div>

                {/* Conținut */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', color: cfg.color, backgroundColor: cfg.bg, padding: '2px 7px', borderRadius: '4px' }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '11px', color: t.textSecundar }}>{formateazaData(n.data)}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: n.citit ? t.textSecundar : t.textPrincipal, fontWeight: n.citit ? '400' : '600', margin: 0, lineHeight: 1.5 }}>
                    {n.text}
                  </p>
                  {n.subtitlu && (
                    <p style={{ fontSize: '12px', color: t.textSecundar, margin: '4px 0 0', lineHeight: 1.4 }}>{n.subtitlu}</p>
                  )}
                </div>

                {/* Acțiuni hover */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {!n.citit && (
                    <button
                      onClick={() => marcheazaCitit(n.id)}
                      title="Marchează citit"
                      style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: t.textSecundar, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => stergeNotificare(n.id)}
                    title="Șterge"
                    style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: t.textSecundar, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
