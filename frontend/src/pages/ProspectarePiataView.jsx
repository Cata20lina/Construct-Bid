import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, TrendingUp, BarChart3, MapPin, Sparkles,
  Loader, AlertCircle, RefreshCw, Zap, Users, ArrowRight,
  Megaphone, Calendar, Banknote,
} from 'lucide-react';
import { apiOportunitatiPiata, apiAnalizaPiata } from '../api.js';

const CATEGORIE_CULOARE = {
  'Structuri': '#2F6FED',
  'Instalații': '#10b981',
  'Electrice': '#eab308',
  'Finisaje': '#a855f7',
};
const culoareCategorie = (cat) => CATEGORIE_CULOARE[cat] || '#94a3b8';

function Card({ t, children, style }) {
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', boxShadow: `0 2px 10px ${t.shadow}`, ...style }}>
      {children}
    </div>
  );
}

function BaraOrizontala({ t, procent, culoare }) {
  return (
    <div style={{ width: '100%', height: '6px', borderRadius: '4px', backgroundColor: t.bgInput, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(2, procent))}%`, height: '100%', backgroundColor: culoare, borderRadius: '4px', transition: 'width 0.4s ease' }} />
    </div>
  );
}

export default function ProspectarePiataView({ t, user, esteSubcontractor, onSelectProiect, anunturiProspectare = [] }) {
  const [oportunitati, setOportunitati] = useState(null);
  const [piata, setPiata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');

  const incarca = useCallback(() => {
    setLoading(true);
    setEroare('');
    const cereri = [apiAnalizaPiata()];
    if (esteSubcontractor) cereri.push(apiOportunitatiPiata());

    Promise.all(cereri)
      .then(([piataData, oportunitatiData]) => {
        setPiata(piataData);
        if (oportunitatiData) setOportunitati(oportunitatiData);
      })
      .catch(err => setEroare(err.message || 'Eroare la încărcarea analizei de piață.'))
      .finally(() => setLoading(false));
  }, [esteSubcontractor]);

  useEffect(() => { incarca(); }, [incarca]);

  if (loading && !piata) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px', color: t.textSecundar }}>
        <Loader size={26} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <span>Analizăm piața...</span>
        <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  const maxTendinta = piata ? Math.max(1, ...piata.tendintaLunara.map(l => l.nrProiecte)) : 1;
  const maxConcurenta = piata ? Math.max(1, ...piata.categorii.map(c => c.concurentaMedie)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ color: t.accent, fontSize: '13px', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prospectare Piață</span>
          <h2 style={{ fontSize: '26px', fontWeight: '850', margin: '6px 0 0 0', color: t.textPrincipal }}>
            {esteSubcontractor ? 'Oportunități & Analiza Pieței' : 'Analiza Pieței'}
          </h2>
          <p style={{ color: t.textSecundar, fontSize: '14px', margin: '4px 0 0 0' }}>
            {esteSubcontractor
              ? 'Proiecte potrivite profilului tău, plus cerere și concurență reală pe categorii și județe.'
              : 'Cerere, concurență și valori medii pe categorii și județe, calculate din proiectele active.'}
          </p>
        </div>
        <button
          onClick={incarca}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.textSecundar, fontSize: '13px', fontWeight: '600', cursor: loading ? 'default' : 'pointer' }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizează
        </button>
      </div>

      {eroare && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13.5px' }}>
          <AlertCircle size={16} /> {eroare}
        </div>
      )}

      {/* ── Anunțuri publicate special pentru prospectare piață ── */}
      <Card t={t}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Megaphone size={18} style={{ color: '#a855f7' }} />
          <h3 style={{ fontSize: '17px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Anunțuri de Prospectare Piață</h3>
        </div>
        <p style={{ fontSize: '13px', color: t.textSecundar, margin: '8px 0 16px' }}>
          {esteSubcontractor
            ? 'Anunțuri publicate ca test de piață — poți depune ofertă la fel ca la un anunț normal'
            : 'Anunțurile pe care le publici cu opțiunea "Prospectare Piață" apar doar aici, nu în lista publică de proiecte.'}
        </p>

        {anunturiProspectare.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: t.textSecundar, fontSize: '14px' }}>
            Nu există momentan anunțuri de prospectare piață active.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '14px' }}>
            {anunturiProspectare.map(p => (
              <div
                key={p._id}
                onClick={() => onSelectProiect && onSelectProiect(p)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}`,
                  backgroundColor: t.bgInput, cursor: onSelectProiect ? 'pointer' : 'default',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#a855f7'}
                onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px',
                    padding: '3px 9px', borderRadius: '20px',
                    backgroundColor: 'rgba(168,85,247,0.14)', color: '#a855f7',
                  }}>
                    <Target size={10} /> Prospectare Piață
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', backgroundColor: `${culoareCategorie(p.categorie)}1a`, color: culoareCategorie(p.categorie) }}>
                    {p.categorie}
                  </span>
                </div>

                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '750', color: t.textPrincipal, lineHeight: 1.3 }}>{p.titlu}</h4>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: t.textSecundar }}>
                  <MapPin size={12} /> {p.oras ? `${p.oras}, ` : ''}{p.judet || p.locatie || 'Nespecificat'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: t.textSecundar }}>
                    <Banknote size={12} /> {p.bugetValoare ? `${Number(p.bugetValoare).toLocaleString()} RON` : (p.buget || 'Nespecificat')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#a855f7' }}>
                    Vezi <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Oportunități personalizate (doar subcontractori) ── */}
      {esteSubcontractor && oportunitati && (
        <Card t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Target size={18} style={{ color: t.amber }} />
            <h3 style={{ fontSize: '17px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Oportunități pentru tine</h3>
          </div>

          {!oportunitati.profilConfigurat && (
            <p style={{ fontSize: '13px', color: t.textSecundar, margin: '8px 0 16px' }}>
              Nu ai încă setate categoriile de servicii și județele acoperite în profil, așa că îți arătăm cele mai
              accesibile proiecte active (fără ofertă sau cu concurență redusă). Completează profilul pentru
              recomandări mai precise.
            </p>
          )}
          {oportunitati.profilConfigurat && (
            <p style={{ fontSize: '13px', color: t.textSecundar, margin: '8px 0 16px' }}>
              Proiecte active, pe care încă nu ai depus ofertă, potrivite cu categoriile și județele din profilul tău.
            </p>
          )}

          {oportunitati.oportunitati.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: t.textSecundar, fontSize: '14px' }}>
              Nu am găsit oportunități noi chiar acum — revino mai târziu sau lărgește categoriile din profil.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {oportunitati.oportunitati.slice(0, 8).map(o => (
                <div
                  key={o.proiect._id}
                  onClick={() => onSelectProiect && onSelectProiect(o.proiect)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, cursor: onSelectProiect ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = t.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = t.border}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '10px', backgroundColor: t.accentSoft, flexShrink: 0 }}>
                    <span style={{ fontFamily: t.fontMono, fontSize: '15px', fontWeight: '800', color: t.accent }}>{o.scorPotrivire}</span>
                    <span style={{ fontSize: '9px', color: t.textSecundar, textTransform: 'uppercase', letterSpacing: '0.3px' }}>scor</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: '700', color: t.textPrincipal }}>{o.proiect.titlu}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', backgroundColor: `${culoareCategorie(o.proiect.categorie)}1a`, color: culoareCategorie(o.proiect.categorie) }}>
                        {o.proiect.categorie}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: t.textSecundar, marginTop: '4px' }}>
                      <MapPin size={12} /> {o.proiect.oras ? `${o.proiect.oras}, ` : ''}{o.proiect.judet}
                      <span style={{ margin: '0 4px' }}>·</span>
                      {o.proiect.buget}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {o.motive.map((m, i) => (
                        <span key={i} style={{ fontSize: '11px', color: t.textSecundar, backgroundColor: t.bgCard, border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: '20px' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ArrowRight size={16} style={{ color: t.textSecundar, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Rezumat piață ── */}
      {piata && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
          <Card t={t} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '12.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <Zap size={14} /> Proiecte active
            </div>
            <div style={{ fontSize: '28px', fontWeight: '850', color: t.textPrincipal, marginTop: '6px' }}>{piata.totalProiecteActive}</div>
          </Card>
          <Card t={t} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '12.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <BarChart3 size={14} /> Proiecte totale (istoric)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '850', color: t.textPrincipal, marginTop: '6px' }}>{piata.totalProiecte}</div>
          </Card>
          <Card t={t} style={{ padding: '18px 20px', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.textSecundar, fontSize: '12.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <Sparkles size={14} style={{ color: t.amber }} /> Categorii cu cea mai mică concurență
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {piata.categoriiOportunitate.length === 0 && <span style={{ fontSize: '13px', color: t.textSecundar }}>Nu sunt suficiente date încă.</span>}
              {piata.categoriiOportunitate.map(cat => (
                <span key={cat} style={{ fontSize: '12.5px', fontWeight: '700', padding: '6px 12px', borderRadius: '20px', backgroundColor: `${culoareCategorie(cat)}1a`, color: culoareCategorie(cat) }}>
                  {cat}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Analiza pe categorii ── */}
      {piata && (
        <Card t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <BarChart3 size={18} style={{ color: t.accent }} />
            <h3 style={{ fontSize: '17px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Cerere și concurență pe categorie</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {piata.categorii.map(c => (
              <div key={c.categorie}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: culoareCategorie(c.categorie), display: 'inline-block' }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: t.textPrincipal }}>{c.categorie}</span>
                    <span style={{ fontSize: '12px', color: t.textSecundar }}>({c.proiecteActive} active din {c.proiecteTotal} total)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: t.textSecundar, fontFamily: t.fontMono }}>
                    {c.bugetMediu != null && <span>buget mediu: <b style={{ color: t.textPrincipal }}>{c.bugetMediu.toLocaleString()} RON</b></span>}
                    {c.valoareMedieCastigatoare != null && <span>ofertă câștigătoare medie: <b style={{ color: t.success }}>{c.valoareMedieCastigatoare.toLocaleString()} RON</b></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BaraOrizontala t={t} procent={(c.concurentaMedie / maxConcurenta) * 100} culoare={culoareCategorie(c.categorie)} />
                  <span style={{ fontSize: '11.5px', color: t.textSecundar, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} /> {c.concurentaMedie} oferte/proiect
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Tendință lunară + top județe ── */}
      {piata && (
        <div className="cb-layout-lateral" style={{ display: 'grid', gridTemplateColumns: 'minmax(min(300px, 100%), 1.3fr) minmax(min(260px, 100%), 1fr)', gap: '16px' }}>
          <Card t={t}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <TrendingUp size={18} style={{ color: t.success }} />
              <h3 style={{ fontSize: '17px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Proiecte publicate, ultimele 6 luni</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px', padding: '0 4px' }}>
              {piata.tendintaLunara.map(l => (
                <div key={l.cheie} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: t.textPrincipal, fontFamily: t.fontMono }}>{l.nrProiecte}</span>
                  <div style={{ width: '100%', maxWidth: '36px', borderRadius: '6px 6px 0 0', backgroundColor: t.accent, height: `${Math.max(4, (l.nrProiecte / maxTendinta) * 100)}px`, transition: 'height 0.4s ease' }} />
                  <span style={{ fontSize: '11px', color: t.textSecundar, textTransform: 'capitalize' }}>{l.eticheta}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card t={t}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <MapPin size={18} style={{ color: '#a855f7' }} />
              <h3 style={{ fontSize: '17px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Top județe după cerere</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {piata.judete.slice(0, 8).map((j, idx) => (
                <div key={j.judet} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: t.textSecundar, width: '16px' }}>{idx + 1}</span>
                  <span style={{ fontSize: '13px', color: t.textPrincipal, flex: 1 }}>{j.judet}</span>
                  <span style={{ fontSize: '12px', fontFamily: t.fontMono, color: t.textSecundar }}>{j.proiecteActive} active</span>
                </div>
              ))}
              {piata.judete.length === 0 && <span style={{ fontSize: '13px', color: t.textSecundar }}>Nu sunt încă date suficiente.</span>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
