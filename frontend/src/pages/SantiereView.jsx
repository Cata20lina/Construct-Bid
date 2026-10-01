import React, { useState } from 'react';
import { Search, MapPin, Calendar, ArrowRight, Filter, RefreshCw, Gauge, Lock, Clock, Sparkles } from 'lucide-react';
import { CATEGORII_LUCRARI } from '../constants/categorii.jsx';

const DATE_GEOGRAFICE = {
  "București": ["Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6"],
  "Cluj": ["Cluj-Napoca", "Turda", "Dej", "Câmpia Turzii", "Gherla"],
  "Timiș": ["Timișoara", "Lugoj", "Sânnicolau Mare", "Jimbolia"],
  "Constanța": ["Constanța", "Medgidia", "Mangalia", "Năvodari", "Cernavodă"],
  "Iași": ["Iași", "Pașcani", "Hârlău"],
  "Brașov": ["Brașov", "Făgăraș", "Săcele", "Zărnești", "Râșnov"]
};

export default function SantiereView({ t, proiecte = [], onSelect, user }) {
  const [filtruText, setFiltruText] = useState('');
  const [filtruCategorie, setFiltruCategorie] = useState('');
  const [filtruJudet, setFiltruJudet] = useState('');
  const [filtruOras, setFiltruOras] = useState('');
  const [doarCategoriileMele, setDoarCategoriileMele] = useState(false);

  // ── Filtru "doar categoriile mele" — relevant pentru orice utilizator care
  //    poate oferta (subcontractor sau furnizor) și și-a setat categoriile
  //    în profil (categoriiServicii — materiale/echipamente pentru furnizor). ──
  const categoriileMele = user?.categoriiServicii || [];
  const poateOferta = user?.rol === 'SUBCONTRACTOR' || user?.rol === 'FURNIZOR';
  const areCategoriiSetate = poateOferta && categoriileMele.length > 0;

  const getCategorieStyle = (cat) => {
    switch(cat) {
      case 'Instalații': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Structuri': return { bg: 'rgba(37, 99, 235, 0.1)', color: '#2F6FED' };
      case 'Electrice': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' };
      default: return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' };
    }
  };

  const proiecteFiltrate = proiecte.filter(p => {
    const meciText =
      (p.titlu || '').toLowerCase().includes(filtruText.toLowerCase()) ||
      (p.descriere || '').toLowerCase().includes(filtruText.toLowerCase()) ||
      (p.dezvoltator?.nume || '').toLowerCase().includes(filtruText.toLowerCase());

    const meciCategorie = filtruCategorie === '' || p.categorie === filtruCategorie;
    const meciJudet = filtruJudet === '' || p.judet === filtruJudet;
    const meciOras = filtruOras === '' || p.oras === filtruOras;
    const meciCategoriileMele = !doarCategoriileMele || categoriileMele.includes(p.categorie);

    return meciText && meciCategorie && meciJudet && meciOras && meciCategoriileMele;
  });

  const reseteazaFiltre = () => {
    setFiltruText('');
    setFiltruCategorie('');
    setFiltruJudet('');
    setFiltruOras('');
    setDoarCategoriileMele(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>

      <div>
        <span style={{ color: '#2F6FED', fontSize: '13px', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Licitații Active</span>
        <h2 style={{ fontSize: '26px', fontWeight: '850', margin: '6px 0 0 0', color: t.textPrincipal }}>Explorează Proiectele Disponibile</h2>
        <p style={{ color: t.textSecundar, fontSize: '14px', margin: '4px 0 0 0' }}>Filtrează în timp real oportunitățile de subcontractare din baza de date.</p>
      </div>

      <div style={{ backgroundColor: t.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: `0 2px 10px ${t.shadow}` }}>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', color: t.textSecundar }} />
          <input
            type="text"
            placeholder="Caută după cuvinte cheie (ex: tencuială, structură, nume firmă)..."
            value={filtruText}
            onChange={(e) => setFiltruText(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrincipal, fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>

          <select
            value={filtruCategorie}
            onChange={(e) => setFiltruCategorie(e.target.value)}
            style={{ padding: '11px', borderRadius: '8px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrincipal, fontSize: '13px', outline: 'none' }}
          >
            <option value="">Toate Categoriile</option>
            {CATEGORII_LUCRARI.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={filtruJudet}
            onChange={(e) => { setFiltruJudet(e.target.value); setFiltruOras(''); }}
            style={{ padding: '11px', borderRadius: '8px', backgroundColor: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrincipal, fontSize: '13px', outline: 'none' }}
          >
            <option value="">Toate Județele</option>
            {Object.keys(DATE_GEOGRAFICE).map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>

          <select
            disabled={!filtruJudet}
            value={filtruOras}
            onChange={(e) => setFiltruOras(e.target.value)}
            style={{ padding: '11px', borderRadius: '8px', backgroundColor: filtruJudet ? t.bgInput : 'rgba(0,0,0,0.03)', border: `1px solid ${t.border}`, color: t.textPrincipal, fontSize: '13px', opacity: filtruJudet ? 1 : 0.6, outline: 'none' }}
          >
            <option value="">Toate Orașele</option>
            {filtruJudet && DATE_GEOGRAFICE[filtruJudet].map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <button
            onClick={reseteazaFiltre}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 16px', borderRadius: '8px', backgroundColor: 'transparent', border: `1px solid ${t.border}`, color: t.textSecundar, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>

        {areCategoriiSetate && (
          <button
            onClick={() => setDoarCategoriileMele(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
              padding: '8px 14px', borderRadius: '20px',
              border: `1.5px solid ${doarCategoriileMele ? '#2F6FED' : t.border}`,
              backgroundColor: doarCategoriileMele ? 'rgba(47,111,237,0.1)' : 'transparent',
              color: doarCategoriileMele ? '#2F6FED' : t.textSecundar,
              fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Sparkles size={13} /> Doar din categoriile mele
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {proiecteFiltrate.length > 0 ? (
          proiecteFiltrate.map((p) => {
            const stilCat = getCategorieStyle(p.categorie);
            const esteDinamica = p.tipOfertare === 'dinamica';
            return (
              <div
                key={p._id}
                onClick={() => onSelect(p)}
                style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.borderCard || t.border}`, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: `0 4px 12px ${t.shadow}`, textAlign: 'left' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px', backgroundColor: stilCat.bg, color: stilCat.color }}>
                        {p.categorie}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px',
                        backgroundColor: esteDinamica ? 'rgba(245,158,11,0.12)' : 'rgba(47,111,237,0.1)',
                        color: esteDinamica ? '#f59e0b' : '#2F6FED',
                      }}>
                        {esteDinamica ? <Gauge size={11} /> : <Lock size={11} />}
                        {esteDinamica ? 'Live' : 'Statică'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: t.textSecundar, fontSize: '12px', fontWeight: '500' }}>
                      <MapPin size={13} color="#ef4444" />
                      <span>{p.judet && p.oras ? `${p.oras}, ${p.judet}` : (p.locatie || "Nespecificat")}</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px 0', color: t.textPrincipal, lineHeight: '1.3' }}>{p.titlu}</h3>
                  <p style={{ color: t.textSecundar, fontSize: '13px', margin: '0', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                    {p.descriere}
                  </p>
                </div>

                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: t.textSecundar }}>
                      Autor: <strong style={{ color: t.textPrincipal }}>{p.dezvoltator?.nume || 'Necunoscut'}</strong>
                    </div>
                    {esteDinamica && p.licitatieEnd ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '12px', fontWeight: '700' }}>
                        <Clock size={13} />
                        <span>{p.licitatieFinalizata ? 'Încheiată' : `Până la ${new Date(p.licitatieEnd).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: t.textSecundar, fontSize: '12px' }}>
                        <Calendar size={13} />
                        <span>{p.zile} zile execuție</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.bgInput, padding: '8px 12px', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: t.textSecundar, textTransform: 'uppercase', fontWeight: '700' }}>Buget Alocat</div>
                      <div style={{ color: '#10b981', fontWeight: '900', fontSize: '16px' }}>
                        {p.bugetValoare ? Number(p.bugetValoare).toLocaleString() : (p.buget || '0')} {p.bugetValoare ? <span style={{ fontSize: '11px', fontWeight: '700' }}>RON</span> : null}
                      </div>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2F6FED', fontSize: '12px', fontWeight: '800' }}>
                      Vezi detalii <ArrowRight size={14} />
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div style={{ color: t.textSecundar, textAlign: 'center', gridColumn: '1/-1', padding: '60px 20px', backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}` }}>
            <Filter size={40} style={{ marginBottom: '12px', opacity: 0.3, color: t.textSecundar }} />
            <h3 style={{ margin: '0 0 6px 0', color: t.textPrincipal }}>
              Niciun șantier găsit
            </h3>
            <p style={{ margin: '0', fontSize: '13px' }}>Nu am găsit anunțuri în baza de date care să corespundă filtrelor tale.</p>
          </div>
        )}
      </div>

    </div>
  );
}
