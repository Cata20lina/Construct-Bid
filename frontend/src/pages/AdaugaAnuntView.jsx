import React, { useState } from 'react';
import {
  PlusCircle, Building2, Banknote, MapPin, Calendar,
  FileText, ChevronRight, Layers, Zap, Wrench, Paintbrush2,
  CheckCircle2, Loader, AlertCircle, Gauge, Lock, Clock, Trophy,
  Coins, Target, Megaphone, Info,
} from 'lucide-react';

// ── Cost în token-uri per tip de anunț (trebuie să corespundă cu backend-ul) ──
const COST_ANUNT_NORMAL = 5;
const COST_ANUNT_PROSPECTARE = 3;

const CATEGORII = [
  { value: 'Structuri',  label: 'Structuri & Betoane',              icon: <Layers size={16} />,      color: '#2F6FED' },
  { value: 'Instalații', label: 'Instalații (Sanitare/Termice)',    icon: <Wrench size={16} />,      color: '#f59e0b' },
  { value: 'Electrice',  label: 'Sisteme Electrice & Automatizări', icon: <Zap size={16} />,         color: '#a855f7' },
  { value: 'Finisaje',   label: 'Finisaje & Amenajări',             icon: <Paintbrush2 size={16} />, color: '#10b981' },
];

const DATE_GEOGRAFICE = {
  'Alba': ['Alba Iulia', 'Aiud', 'Blaj', 'Sebeș', 'Cugir', 'Ocna Mureș'],
  'Arad': ['Arad', 'Ineu', 'Lipova', 'Curtici', 'Nădlac', 'Pecica'],
  'Argeș': ['Pitești', 'Câmpulung', 'Curtea de Argeș', 'Mioveni', 'Costești', 'Topoloveni'],
  'Bacău': ['Bacău', 'Onești', 'Moinești', 'Comănești', 'Slănic-Moldova', 'Buhuși'],
  'Bihor': ['Oradea', 'Salonta', 'Beiuș', 'Marghita', 'Aleșd', 'Valea lui Mihai'],
  'Bistrița-Năsăud': ['Bistrița', 'Năsăud', 'Beclean', 'Sângeorz-Băi'],
  'Botoșani': ['Botoșani', 'Dorohoi', 'Darabani', 'Săveni', 'Bucecea'],
  'Brașov': ['Brașov', 'Făgăraș', 'Săcele', 'Codlea', 'Zărnești', 'Râșnov', 'Predeal'],
  'Brăila': ['Brăila', 'Ianca', 'Făurei'],
  'Buzău': ['Buzău', 'Râmnicu Sărat', 'Nehoiu', 'Pogoanele'],
  'Caraș-Severin': ['Reșița', 'Caransebeș', 'Bocșa', 'Moldova Nouă', 'Oravița'],
  'Călărași': ['Călărași', 'Oltenița', 'Lehliu-Gară'],
  'Cluj': ['Cluj-Napoca', 'Turda', 'Dej', 'Câmpia Turzii', 'Gherla', 'Huedin'],
  'Constanța': ['Constanța', 'Mangalia', 'Medgidia', 'Năvodari', 'Cernavodă', 'Eforie'],
  'Covasna': ['Sfântu Gheorghe', 'Târgu Secuiesc', 'Covasna', 'Baraolt'],
  'Dâmbovița': ['Târgoviște', 'Moreni', 'Pucioasa', 'Fieni', 'Găești', 'Titu'],
  'Dolj': ['Craiova', 'Băilești', 'Calafat', 'Filiaș', 'Segarcea'],
  'Galați': ['Galați', 'Tecuci', 'Târgu Bujor', 'Berești'],
  'Giurgiu': ['Giurgiu', 'Bolintin-Vale'],
  'Gorj': ['Târgu Jiu', 'Motru', 'Rovinari', 'Novaci', 'Târgu Cărbunești'],
  'Harghita': ['Miercurea Ciuc', 'Odorheiu Secuiesc', 'Gheorgheni', 'Toplița', 'Cristuru Secuiesc'],
  'Hunedoara': ['Deva', 'Hunedoara', 'Petroșani', 'Lupeni', 'Brad', 'Orăștie'],
  'Ialomița': ['Slobozia', 'Fetești', 'Urziceni', 'Amara', 'Țăndărei'],
  'Iași': ['Iași', 'Pașcani', 'Hârlău', 'Târgu Frumos', 'Podu Iloaiei'],
  'Ilfov': ['Buftea', 'Voluntari', 'Popești-Leordeni', 'Pantelimon', 'Chitila', 'Otopeni'],
  'Maramureș': ['Baia Mare', 'Sighetu Marmației', 'Borșa', 'Câmpulung la Tisa', 'Vișeu de Sus'],
  'Mehedinți': ['Drobeta-Turnu Severin', 'Orșova', 'Strehaia', 'Vânju Mare'],
  'Mureș': ['Târgu Mureș', 'Sighișoara', 'Reghin', 'Târnăveni', 'Luduș'],
  'Neamț': ['Piatra Neamț', 'Roman', 'Târgu Neamț', 'Bicaz', 'Roznov'],
  'Olt': ['Slatina', 'Caracal', 'Balș', 'Scornicești', 'Corabia'],
  'Prahova': ['Ploiești', 'Câmpina', 'Sinaia', 'Azuga', 'Bușteni', 'Breaza', 'Băicoi'],
  'Satu Mare': ['Satu Mare', 'Carei', 'Negrești-Oaș', 'Tășnad'],
  'Sălaj': ['Zalău', 'Șimleu Silvaniei', 'Jibou', 'Cehu Silvaniei'],
  'Sibiu': ['Sibiu', 'Mediaș', 'Cisnădie', 'Copșa Mică', 'Avrig', 'Agnita'],
  'Suceava': ['Suceava', 'Fălticeni', 'Rădăuți', 'Câmpulung Moldovenesc', 'Gura Humorului', 'Vatra Dornei'],
  'Teleorman': ['Alexandria', 'Turnu Măgurele', 'Roșiori de Vede', 'Zimnicea'],
  'Timiș': ['Timișoara', 'Lugoj', 'Sânnicolau Mare', 'Jimbolia', 'Recaș'],
  'Tulcea': ['Tulcea', 'Măcin', 'Babadag', 'Isaccea'],
  'Vaslui': ['Vaslui', 'Bârlad', 'Huși', 'Negrești'],
  'Vâlcea': ['Râmnicu Vâlcea', 'Drăgășani', 'Bălcești', 'Călimănești', 'Băile Olănești'],
  'Vrancea': ['Focșani', 'Adjud', 'Mărășești', 'Panciu', 'Odobești'],
  'București': ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5', 'Sector 6'],
};

const JUDETE = Object.keys(DATE_GEOGRAFICE).sort();

// Formatare datetime-local implicit (acum + N ore), folosit ca valoare minimă/default
function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdaugaAnuntView({
  t, user, formAnunt, setFormAnunt, adaugaAnuntNou,
  loading = false, error = '', success = false
}) {
  const [focusat, setFocusat] = useState(null);

  const esteProspectare = !!formAnunt.esteProspectare;
  const costTokenuri = esteProspectare ? COST_ANUNT_PROSPECTARE : COST_ANUNT_NORMAL;
  const tokenuriDisponibile = typeof user?.tokenuri === 'number' ? user.tokenuri : null;
  const tokenuriInsuficiente = tokenuriDisponibile !== null && tokenuriDisponibile < costTokenuri;

  const localitatiDeAfisat = formAnunt.judet ? (DATE_GEOGRAFICE[formAnunt.judet] || []) : [];

  const inputBase = (field) => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: t.bgInput,
    border: `1.5px solid ${focusat === field ? '#2F6FED' : t.border}`,
    color: t.textPrincipal,
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.18s',
  });

  const labelBase = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.8px', color: t.textSecundar, marginBottom: '7px',
  };

  if (success) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={32} color="#10b981" />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: '800', color: t.textPrincipal, margin: 0 }}>Anunț publicat cu succes!</h3>
        <p style={{ color: t.textSecundar, fontSize: '14px', margin: 0 }}>Ești redirecționat către lista de șantiere...</p>
      </div>
    );
  }

  const tipOfertare = formAnunt.tipOfertare || 'statica';
  const acumPlusOOra = toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000));

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'rgba(47,111,237,0.1)', color: '#2F6FED',
            fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '1px', padding: '5px 12px', borderRadius: '20px',
          }}>
            <Building2 size={11} /> Panou Dezvoltator
          </div>
          {tokenuriDisponibile !== null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
              fontSize: '12px', fontWeight: '800',
              padding: '6px 12px', borderRadius: '20px',
            }}>
              <Coins size={13} /> {tokenuriDisponibile} token-uri disponibile
            </div>
          )}
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '850', color: t.textPrincipal, margin: '0 0 6px' }}>
          Lansează un Anunț de Subcontractare
        </h2>
        <p style={{ color: t.textSecundar, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
          Completează cerințele tehnice pentru a primi oferte directe de la firme specializate.
        </p>
      </div>

      <form onSubmit={adaugaAnuntNou}>

        {/* Bloc 0 — Tip Anunț (Normal vs Prospectare Piață) */}
        <FormSection label="Tip Anunț" t={t}>
          <div>
            <label style={labelBase}><Target size={12} /> Cum publici acest anunț?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              {/* Card ANUNȚ NORMAL */}
              <button
                type="button"
                onClick={() => setFormAnunt({ ...formAnunt, esteProspectare: false })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                  padding: '16px', borderRadius: '12px', textAlign: 'left',
                  border: `2px solid ${!esteProspectare ? '#2F6FED' : t.border}`,
                  backgroundColor: !esteProspectare ? 'rgba(47,111,237,0.08)' : t.bgInput,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: !esteProspectare ? '#2F6FED' : t.textSecundar }}>
                    <Megaphone size={16} />
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>Anunț Normal</span>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>
                    <Coins size={12} /> {COST_ANUNT_NORMAL}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSecundar, lineHeight: 1.5 }}>
                  Apare în <strong>Proiecte Disponibile</strong>, vizibil tuturor subcontractorilor.
                </p>
              </button>

              {/* Card PROSPECTARE PIAȚĂ */}
              <button
                type="button"
                onClick={() => setFormAnunt({ ...formAnunt, esteProspectare: true })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                  padding: '16px', borderRadius: '12px', textAlign: 'left',
                  border: `2px solid ${esteProspectare ? '#a855f7' : t.border}`,
                  backgroundColor: esteProspectare ? 'rgba(168,85,247,0.08)' : t.bgInput,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: esteProspectare ? '#a855f7' : t.textSecundar }}>
                    <Target size={16} />
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>Prospectare Piață</span>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>
                    <Coins size={12} /> {COST_ANUNT_PROSPECTARE}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSecundar, lineHeight: 1.5 }}>
                  Apare <strong>doar în Prospectare Piață</strong>, la cost redus. Ideal ca să testezi cererea și prețurile pieței.
                </p>
              </button>
            </div>

            {esteProspectare && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '12px',
                backgroundColor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: '10px', padding: '12px 14px', fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.55,
              }}>
                <Info size={15} color="#a855f7" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Subcontractorii vor putea depune oferte exact ca la un anunț normal, dar vor vedea clar eticheta
                  <strong style={{ color: t.textPrincipal }}> „Prospectare de Piață”</strong>, ca să știe că e vorba de un test de piață.
                </span>
              </div>
            )}
          </div>
        </FormSection>

        {/* Bloc 1 — Identitate */}
        <FormSection label="1. Identitate Proiect" t={t}>
          <div>
            <label style={labelBase}><FileText size={12} /> Titlu Lucrare / Obiectiv</label>
            <input
              required type="text"
              value={formAnunt.titlu}
              onChange={e => setFormAnunt({ ...formAnunt, titlu: e.target.value })}
              onFocus={() => setFocusat('titlu')}
              onBlur={() => setFocusat(null)}
              placeholder="ex: Execuție tencuieli interioare automatizate 2000mp"
              style={inputBase('titlu')}
            />
          </div>
          <div>
            <label style={labelBase}><Layers size={12} /> Categorie Serviciu</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {CATEGORII.map(cat => {
                const activ = formAnunt.categorie === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormAnunt({ ...formAnunt, categorie: cat.value })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', borderRadius: '10px',
                      border: `1.5px solid ${activ ? cat.color : t.border}`,
                      backgroundColor: activ ? `${cat.color}18` : t.bgInput,
                      color: activ ? cat.color : t.textSecundar,
                      fontSize: '13px', fontWeight: activ ? '700' : '500',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </FormSection>

        {/* Bloc 2 — Financiar & Timp */}
        <FormSection label="2. Financiar & Timp" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelBase}><Banknote size={12} /> Buget Maxim (RON)</label>
              <input
                required type="number" min="1"
                value={formAnunt.bugetMax}
                onChange={e => setFormAnunt({ ...formAnunt, bugetMax: e.target.value })}
                onFocus={() => setFocusat('buget')}
                onBlur={() => setFocusat(null)}
                placeholder="ex: 75000"
                style={inputBase('buget')}
              />
            </div>
            <div>
              <label style={labelBase}><Calendar size={12} /> Termen Limită Execuție</label>
              <input
                required type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formAnunt.termenLimita}
                onChange={e => setFormAnunt({ ...formAnunt, termenLimita: e.target.value })}
                onFocus={() => setFocusat('termen')}
                onBlur={() => setFocusat(null)}
                style={inputBase('termen')}
              />
            </div>
          </div>
        </FormSection>

        {/* Bloc 3 — Locație */}
        <FormSection label="3. Locație Șantier" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelBase}><MapPin size={12} /> Județ</label>
              <select
                required
                value={formAnunt.judet}
                onChange={e => setFormAnunt({ ...formAnunt, judet: e.target.value, oras: '' })}
                onFocus={() => setFocusat('judet')}
                onBlur={() => setFocusat(null)}
                style={inputBase('judet')}
              >
                <option value="">Selectează județ...</option>
                {JUDETE.map(judet => (
                  <option key={judet} value={judet}>{judet}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelBase}><MapPin size={12} /> Oraș / Localitate</label>
              <select
                required
                disabled={!formAnunt.judet}
                value={formAnunt.oras}
                onChange={e => setFormAnunt({ ...formAnunt, oras: e.target.value })}
                onFocus={() => setFocusat('oras')}
                onBlur={() => setFocusat(null)}
                style={{ ...inputBase('oras'), opacity: formAnunt.judet ? 1 : 0.45, cursor: formAnunt.judet ? 'pointer' : 'not-allowed' }}
              >
                <option value="">Selectează oraș...</option>
                {localitatiDeAfisat.map(oras => (
                  <option key={oras} value={oras}>{oras}</option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* Bloc 4 — Mod de Ofertare (DINAMICĂ vs STATICĂ) */}
        <FormSection label="4. Modul de Ofertare" t={t}>
          <div>
            <label style={labelBase}><Gauge size={12} /> Cum vrei să primești oferte?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

              {/* Card STATICĂ */}
              <button
                type="button"
                onClick={() => setFormAnunt({ ...formAnunt, tipOfertare: 'statica' })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                  padding: '16px', borderRadius: '12px', textAlign: 'left',
                  border: `2px solid ${tipOfertare === 'statica' ? '#2F6FED' : t.border}`,
                  backgroundColor: tipOfertare === 'statica' ? 'rgba(47,111,237,0.08)' : t.bgInput,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tipOfertare === 'statica' ? '#2F6FED' : t.textSecundar }}>
                  <Lock size={16} />
                  <span style={{ fontWeight: '800', fontSize: '14px' }}>Ofertare Statică</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSecundar, lineHeight: 1.5 }}>
                  Fiecare subcontractor depune <strong>o singură ofertă</strong>. Tu alegi manual oferta câștigătoare, oricând vrei.
                </p>
              </button>

              {/* Card DINAMICĂ */}
              <button
                type="button"
                onClick={() => setFormAnunt({
                  ...formAnunt,
                  tipOfertare: 'dinamica',
                  licitatieEnd: formAnunt.licitatieEnd || acumPlusOOra,
                })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                  padding: '16px', borderRadius: '12px', textAlign: 'left',
                  border: `2px solid ${tipOfertare === 'dinamica' ? '#f59e0b' : t.border}`,
                  backgroundColor: tipOfertare === 'dinamica' ? 'rgba(245,158,11,0.08)' : t.bgInput,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tipOfertare === 'dinamica' ? '#f59e0b' : t.textSecundar }}>
                  <Gauge size={16} />
                  <span style={{ fontWeight: '800', fontSize: '14px' }}>Ofertare Dinamică</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSecundar, lineHeight: 1.5 }}>
                  Licitație <strong>live</strong>, pe o perioadă fixă. Subcontractorii oferteаză continuu și văd ofertele concurenței. Câștigă automat <strong>cea mai mică ofertă</strong>.
                </p>
              </button>
            </div>
          </div>

          {/* Setări specifice ofertării dinamice */}
          {tipOfertare === 'dinamica' && (
            <div style={{
              backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Clock size={13} /> Fereastra de Timp a Licitației Live
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelBase}>Start Licitație</label>
                  <input
                    type="datetime-local"
                    value={formAnunt.licitatieStart || ''}
                    min={toDatetimeLocal(new Date())}
                    onChange={e => setFormAnunt({ ...formAnunt, licitatieStart: e.target.value })}
                    onFocus={() => setFocusat('licStart')}
                    onBlur={() => setFocusat(null)}
                    style={inputBase('licStart')}
                  />
                  <div style={{ fontSize: '11px', color: t.textSecundar, marginTop: '4px' }}>Lasă gol pentru start imediat.</div>
                </div>
                <div>
                  <label style={labelBase}>Final Licitație *</label>
                  <input
                    required={tipOfertare === 'dinamica'}
                    type="datetime-local"
                    value={formAnunt.licitatieEnd || ''}
                    min={formAnunt.licitatieStart || toDatetimeLocal(new Date())}
                    onChange={e => setFormAnunt({ ...formAnunt, licitatieEnd: e.target.value })}
                    onFocus={() => setFocusat('licEnd')}
                    onBlur={() => setFocusat(null)}
                    style={inputBase('licEnd')}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: t.textSecundar, lineHeight: 1.5 }}>
                <Trophy size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
                La momentul exact al finalului, platforma alege automat <strong style={{ color: t.textPrincipal }}>cea mai mică ofertă activă</strong> ca câștigătoare — fără nicio acțiune din partea ta.
              </div>
            </div>
          )}
        </FormSection>

        {/* Bloc 5 — Descriere */}
        <FormSection label="5. Caiet de Sarcini" t={t}>
          <div>
            <label style={labelBase}><FileText size={12} /> Descriere Tehnică Detaliată</label>
            <textarea
              required rows={5}
              value={formAnunt.descriere}
              onChange={e => setFormAnunt({ ...formAnunt, descriere: e.target.value })}
              onFocus={() => setFocusat('descriere')}
              onBlur={() => setFocusat(null)}
              placeholder="Descrie frontul de lucru, utilajele asigurate, materialele, stadiul actual al șantierului și orice condiție specială..."
              style={{ ...inputBase('descriere'), resize: 'vertical', lineHeight: 1.65 }}
            />
            <div style={{ fontSize: '11px', color: t.textSecundar, marginTop: '6px' }}>
              Cu cât ești mai specific, cu atât primești oferte mai precise.
            </div>
          </div>
        </FormSection>

        {/* Eroare */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
            color: '#ef4444', fontSize: '13px', fontWeight: '600',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Avertisment token-uri insuficiente */}
        {tokenuriInsuficiente && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
            color: '#ef4444', fontSize: '13px', fontWeight: '600',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            Nu ai suficiente token-uri. Ai nevoie de {costTokenuri}, dar mai ai doar {tokenuriDisponibile}.
          </div>
        )}

        {/* Submit */}
        <div style={{ paddingTop: '8px' }}>
          <button
            type="submit"
            disabled={loading || tokenuriInsuficiente}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: (loading || tokenuriInsuficiente) ? 'rgba(47,111,237,0.5)' : 'linear-gradient(135deg, #2F6FED, #4f46e5)',
              color: '#fff', border: 'none', borderRadius: '12px',
              padding: '15px 28px', fontSize: '15px', fontWeight: '700',
              cursor: (loading || tokenuriInsuficiente) ? 'not-allowed' : 'pointer',
              boxShadow: (loading || tokenuriInsuficiente) ? 'none' : '0 4px 20px rgba(47,111,237,0.35)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? (
              <>
                <Loader size={17} style={{ animation: 'spin 1s linear infinite' }} />
                Se publică...
              </>
            ) : (
              <>
                <PlusCircle size={17} />
                {esteProspectare ? 'Publică în Prospectare Piață' : 'Publică Anunțul pe Platformă'}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.18)', padding: '3px 9px', borderRadius: '20px' }}>
                  <Coins size={12} /> {costTokenuri}
                </span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
          <p style={{ fontSize: '12px', color: t.textSecundar, marginTop: '10px' }}>
            {esteProspectare
              ? 'Anunțul va fi vizibil doar în pagina Prospectare Piață, etichetat clar ca test de piață.'
              : 'Anunțul va fi vizibil imediat tuturor subcontractorilor verificați, în lista de proiecte disponibile.'}
            {' '}Costă <strong>{costTokenuri} token-uri</strong> din soldul tău.
          </p>
        </div>

      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FormSection({ label, t, children }) {
  return (
    <div style={{
      backgroundColor: t.bgCard, border: `1px solid ${t.border}`,
      borderRadius: '16px', overflow: 'hidden', marginBottom: '16px',
    }}>
      <div style={{
        padding: '14px 24px', borderBottom: `1px solid ${t.border}`,
        fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
        letterSpacing: '1px', color: t.textSecundar, backgroundColor: t.bgInput,
      }}>
        {label}
      </div>
      <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {children}
      </div>
    </div>
  );
}
