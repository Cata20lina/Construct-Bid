import React from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, Briefcase } from 'lucide-react';

export default function DashboardView({ user, t }) {
  const statistici = [
    { titlu: "Șantiere Active", valoare: "5", icon: <Briefcase color="#2F6FED" />, bg: "rgba(47,111,237,0.06)", border: "rgba(47,111,237,0.15)" },
    { titlu: "Contracte Semnate", valoare: "2", icon: <ShieldCheck color="#10b981" />, bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.15)" },
    { titlu: "Volum Total Licitații", valoare: "15.1M RON", icon: <TrendingUp color="#eab308" />, bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.15)" },
    { titlu: "Termene Urgente", valoare: "2", icon: <AlertTriangle color="#ef4444" />, bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', transition: 'all 0.25s ease' }}>
      
      {/* REPARAT: Aliniere perfectă la stânga (textAlign: 'left') pentru a elimina asimetria vizuală */}
      <div style={{ textAlign: 'left', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ color: '#2F6FED', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Aplicație Web Securizată
            </span>
            <h1 style={{ fontSize: '32px', fontWeight: '850', color: t.textPrincipal, margin: '4px 0 8px 0', letterSpacing: '-0.5px' }}>
              Panou de Comandă — <span style={{ color: '#2F6FED' }}>{user?.nume || 'zero-foc'}</span>
            </h1>
            <p style={{ color: t.textSecundar, margin: 0, fontSize: '15px', maxWidth: '750px', lineHeight: '1.6' }}>
              Lansează caiete de sarcini, evaluează ofertele financiare depuse și generează contracte comerciale securizate în timp real.
            </p>
          </div>
          <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, padding: '8px 16px', borderRadius: '10px', fontSize: '13px', color: t.textSecundar, fontWeight: '600', boxShadow: `0 2px 8px ${t.shadow}`, alignSelf: 'flex-start' }}>
            📅 Sesiune activă: <span style={{ color: t.textPrincipal }}>Iunie 2026</span>
          </div>
        </div>
      </div>

      {/* Grid-ul de Statistici */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {statistici.map((stat, idx) => (
          <div key={idx} style={{ backgroundColor: t.bgCard, padding: '24px', borderRadius: '16px', border: `1px solid ${t.borderCard}`, boxShadow: `0 4px 20px ${t.shadow}`, transition: 'all 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: t.textSecundar, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.titlu}</span>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: stat.bg }}>{stat.icon}</div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '850', color: t.textPrincipal, letterSpacing: '-1px', textAlign: 'left' }}>{stat.valoare}</div>
          </div>
        ))}
      </div>

      {/* Secțiunea Inferioară în Două Coloane Fluide */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Șantiere Recomandate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: t.textPrincipal, fontSize: '20px', fontWeight: '800', textAlign: 'left' }}>Șantiere Recomandate spre Ofertare</h3>
            <span style={{ color: '#2F6FED', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Vezi Piața Completă →</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: t.bgCard, padding: '24px', borderRadius: '16px', border: `1px solid ${t.borderCard}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px ${t.shadow}`, transition: 'all 0.25s ease' }}>
              <div style={{ flex: 1, paddingRight: '20px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ backgroundColor: 'rgba(47,111,237,0.1)', color: '#2F6FED', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '5px' }}>STRUCTURĂ</span>
                  <span style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px' }}>URGENT</span>
                </div>
                <h4 style={{ margin: '0 0 6px 0', color: t.textPrincipal, fontSize: '16px', fontWeight: '700' }}>Construcție Complex Rezidențial P+6 Berceni</h4>
                <p style={{ color: t.textSecundar, fontSize: '13px', margin: 0 }}>📍 București, Sector 4 &nbsp;•&nbsp; Buget: <span style={{ color: '#2F6FED', fontWeight: '600' }}>4.2M RON</span></p>
              </div>
              <button style={{ backgroundColor: t.bgCrap, border: `1px solid ${t.border}`, color: t.textPrincipal, padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Vezi Management</button>
            </div>
          </div>
        </div>

        {/* Coloana Dreaptă */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: t.bgCard, padding: '24px', borderRadius: '16px', border: `1px solid ${t.borderCard}`, boxShadow: `0 4px 15px ${t.shadow}` }}>
            <h4 style={{ margin: '0 0 16px 0', color: t.textPrincipal, fontSize: '15px', fontWeight: '750', textAlign: 'left' }}>Stare Certificare Companie</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.border}`, paddingBottom: '10px' }}>
                <span style={{ color: t.textSecundar }}>Verificare CUI/CIF</span>
                <span style={{ color: '#10b981', fontWeight: '700', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Validat ✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.border}`, paddingBottom: '10px' }}>
                <span style={{ color: t.textSecundar }}>Scor de Încredere</span>
                <span style={{ color: '#2F6FED', fontWeight: '800' }}>8.8 / 10</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: t.textSecundar }}>Asigurare de Risc</span>
                <span style={{ color: t.textPrincipal, fontWeight: '600' }}>Activă (Allianz)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}