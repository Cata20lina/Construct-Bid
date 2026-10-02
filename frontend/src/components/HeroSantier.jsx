import React from 'react';
import { ArrowRight, HardHat } from 'lucide-react';

// Antetul paginii de start: textul pe rol în stânga, un desen tehnic al unei
// clădiri în execuție în dreapta (ascuns pe ecrane înguste — vezi .cb-hero
// în index.css) și câteva cifre reale din proiectele publicate.

const TEXTE = {
  SUBCONTRACTOR: {
    eticheta: 'Licitații de execuție',
    titlu: 'Lucrări de construcții care așteaptă oferta ta',
    text: 'Proiecte publicate de dezvoltatori, filtrate pe județ și categorie. Trimiți prețul și termenul de execuție direct din pagina proiectului.',
  },
  FURNIZOR: {
    eticheta: 'Materiale și echipamente',
    titlu: 'Cereri de materiale de la șantierele din zona ta',
    text: 'Dezvoltatorii și subcontractorii cer ciment, oțel, gresie, utilaje. Ofertezi pe articolele pe care le ai și îți ții catalogul la zi.',
  },
  DEZVOLTATOR: {
    eticheta: 'Licitații de execuție',
    titlu: 'Publică lucrarea, primește oferte de la firme verificate',
    text: 'Descrii lucrarea, bugetul și termenul. Subcontractorii cu CUI verificat la ANAF îți trimit oferte pe care le compari într-un singur loc.',
  },
};

function formatRon(valoare) {
  if (valoare >= 1_000_000) return `${(valoare / 1_000_000).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil.`;
  if (valoare >= 1_000) return `${Math.round(valoare / 1_000).toLocaleString('ro-RO')} mii`;
  return valoare.toLocaleString('ro-RO');
}

export default function HeroSantier({ t, user, proiecte = [], textButon, onButonPrincipal, onProspectare }) {
  const continut = TEXTE[user?.rol] || TEXTE.DEZVOLTATOR;

  const active = proiecte.filter(p => p.activ && !p.esteProspectare);
  const bugetTotal = active.reduce((s, p) => s + (Number(p.bugetValoare) || 0), 0);
  const judete = new Set(active.map(p => p.judet || p.locatie?.split(',').pop()?.trim()).filter(Boolean)).size;
  const cifre = [
    [active.length, active.length === 1 ? 'proiect activ' : 'proiecte active'],
    [bugetTotal ? `${formatRon(bugetTotal)} RON` : '—', 'buget total licitat'],
    [judete || '—', judete === 1 ? 'județ' : 'județe'],
  ];

  return (
    <section className="cb-hero" style={{
      position: 'relative', overflow: 'hidden', borderRadius: '14px', border: `1px solid ${t.border}`,
      backgroundColor: t.bgCard, marginBottom: '8px',
    }}>
      {/* Bandă de avertizare, ca pe gardurile de șantier */}
      <div aria-hidden style={{
        height: '8px',
        backgroundImage: `repeating-linear-gradient(-45deg, ${t.amber} 0 14px, #14181F 14px 28px)`,
      }} />

      <div className="cb-hero-grila" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '24px', alignItems: 'center',
        padding: '40px 40px 32px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: t.amber, fontSize: '13px', fontWeight: '700', marginBottom: '14px' }}>
            <HardHat size={16} /> {continut.eticheta}
          </div>
          <h1 style={{
            fontFamily: t.fontDisplay, fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: '800', color: t.textPrincipal,
            margin: '0 0 14px', letterSpacing: '-0.8px', lineHeight: 1.12,
          }}>
            {continut.titlu}
          </h1>
          <p style={{ fontSize: '15.5px', color: t.textSecundar, lineHeight: 1.6, margin: '0 0 8px', maxWidth: '540px' }}>
            {continut.text}
          </p>
          {user?.nume && (
            <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: '0 0 26px' }}>
              Conectat ca <b style={{ color: t.textPrincipal }}>{user.nume}</b>
            </p>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={onButonPrincipal} style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: t.accent, color: '#fff',
              border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14.5px', fontWeight: '700', cursor: 'pointer',
            }}>
              {textButon} <ArrowRight size={16} />
            </button>
            <button onClick={onProspectare} style={{
              backgroundColor: 'transparent', color: t.textPrincipal, border: `1px solid ${t.borderStrong}`,
              borderRadius: '8px', padding: '12px 20px', fontSize: '14.5px', fontWeight: '700', cursor: 'pointer',
            }}>
              Prospectare piață
            </button>
          </div>
        </div>

        <DesenSantier t={t} />
      </div>

      {/* Cifre reale din proiectele publicate */}
      <div className="cb-hero-cifre" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderTop: `1px solid ${t.border}` }}>
        {cifre.map(([valoare, eticheta], i) => (
          <div key={eticheta} style={{ padding: '16px 24px', borderLeft: i ? `1px solid ${t.border}` : 'none' }}>
            <div style={{ fontFamily: t.fontMono, fontSize: '22px', fontWeight: '700', color: t.textPrincipal }}>{valoare}</div>
            <div style={{ fontSize: '12.5px', color: t.textSecundar }}>{eticheta}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Desen tehnic: clădire în execuție (structură în cadre, ultimul etaj doar
// trasat), macara-turn cu o grindă la cârlig și cota de înălțime.
function DesenSantier({ t }) {
  const linie = t.accent;
  const slab = t.border;
  const etaje = [0, 1, 2, 3];
  const H = 34; // înălțime etaj
  const baza = 300; // linia terenului

  return (
    <svg className="cb-hero-desen" viewBox="0 0 420 330" role="img" aria-label="Clădire în construcție cu macara-turn" style={{ width: '100%', height: 'auto', maxHeight: '320px' }}>
      {/* Teren și fundație */}
      <line x1="10" y1={baza} x2="410" y2={baza} stroke={t.textSecundar} strokeWidth="1.5" />
      {Array.from({ length: 20 }, (_, i) => (
        <line key={i} x1={20 + i * 20} y1={baza} x2={10 + i * 20} y2={baza + 10} stroke={slab} strokeWidth="1" />
      ))}

      {/* Structura clădirii: stâlpi + planșee */}
      <g stroke={linie} strokeWidth="2" fill="none">
        {[60, 120, 180, 240].map(x => (
          <line key={x} x1={x} y1={baza} x2={x} y2={baza - H * etaje.length} />
        ))}
        {etaje.map(e => (
          <line key={e} x1="54" y1={baza - H * (e + 1)} x2="246" y2={baza - H * (e + 1)} strokeWidth="3" />
        ))}
      </g>
      {/* Zidărie pe primele etaje */}
      <g fill={linie} opacity="0.12">
        <rect x="60" y={baza - H} width="180" height={H} />
        <rect x="60" y={baza - H * 2} width="120" height={H} />
      </g>
      {/* Ferestre */}
      <g stroke={linie} strokeWidth="1" fill="none" opacity="0.7">
        {[0, 1].map(e => [75, 135, 195].map(x => (
          <rect key={`${e}-${x}`} x={x} y={baza - H * (e + 1) + 9} width="30" height="16" />
        )))}
      </g>
      {/* Etajul în lucru: doar trasat */}
      <g stroke={linie} strokeWidth="1.5" strokeDasharray="5 5" fill="none" opacity="0.8">
        {[60, 120, 180, 240].map(x => (
          <line key={x} x1={x} y1={baza - H * 4} x2={x} y2={baza - H * 5} />
        ))}
        <line x1="54" y1={baza - H * 5} x2="246" y2={baza - H * 5} />
      </g>
      {/* Schelă pe latura dreaptă */}
      <g stroke={t.textSecundar} strokeWidth="1" opacity="0.7">
        <line x1="252" y1={baza} x2="252" y2={baza - H * 4} />
        <line x1="266" y1={baza} x2="266" y2={baza - H * 4} />
        {etaje.map(e => (
          <g key={e}>
            <line x1="252" y1={baza - H * (e + 1)} x2="266" y2={baza - H * (e + 1)} />
            <line x1="252" y1={baza - H * e} x2="266" y2={baza - H * (e + 1)} />
          </g>
        ))}
      </g>

      {/* Macara-turn */}
      <g stroke={t.amber} fill="none">
        {/* turn cu zăbrele */}
        <line x1="318" y1={baza} x2="318" y2="62" strokeWidth="2" />
        <line x1="336" y1={baza} x2="336" y2="62" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => {
          const y = baza - i * 20;
          return <line key={i} x1={i % 2 ? 318 : 336} y1={y} x2={i % 2 ? 336 : 318} y2={y - 20} strokeWidth="1" />;
        })}
        {/* cabină și vârf */}
        <rect x="314" y="62" width="26" height="14" strokeWidth="1.5" fill={t.amber} fillOpacity="0.25" />
        <line x1="327" y1="62" x2="327" y2="28" strokeWidth="2" />
        {/* braț și contra-braț */}
        <line x1="120" y1="56" x2="400" y2="56" strokeWidth="2" />
        <line x1="120" y1="62" x2="314" y2="62" strokeWidth="1" />
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1={130 + i * 18} y1="62" x2={139 + i * 18} y2="56" strokeWidth="1" />
        ))}
        <line x1="327" y1="28" x2="130" y2="56" strokeWidth="1" />
        <line x1="327" y1="28" x2="396" y2="56" strokeWidth="1" />
        {/* contragreutate */}
        <rect x="380" y="56" width="18" height="14" fill={t.amber} fillOpacity="0.6" strokeWidth="1" />
        {/* cablu, cârlig și grinda */}
        <line x1="160" y1="56" x2="160" y2="104" strokeWidth="1" />
        <path d="M160 104 v6 a4 4 0 1 1 -6 2" strokeWidth="1.5" />
        <line x1="146" y1="114" x2="174" y2="114" strokeWidth="1" />
        <rect x="130" y="116" width="60" height="7" fill={t.amber} fillOpacity="0.5" strokeWidth="1" />
      </g>

      {/* Cotă de înălțime, ca pe un plan */}
      <g stroke={t.textSecundar} strokeWidth="1" opacity="0.8">
        <line x1="30" y1={baza} x2="30" y2={baza - H * 5} />
        <line x1="24" y1={baza} x2="36" y2={baza} />
        <line x1="24" y1={baza - H * 5} x2="36" y2={baza - H * 5} />
      </g>
      <text x="22" y={baza - H * 2.5} fill={t.textSecundar} fontSize="10" fontFamily="IBM Plex Mono, monospace" transform={`rotate(-90 22 ${baza - H * 2.5})`} textAnchor="middle">
        P+4 · 17.00 m
      </text>
    </svg>
  );
}
