import React from 'react';
import {
  ArrowRight, Building2, HardHat, ShieldCheck, Zap, FileCheck2,
  Send, Gavel, Users, MapPin, Bell, Layers, Wrench,
  Paintbrush2, Coins, Hash, Radar, ChevronRight, CheckCircle2,
} from 'lucide-react';

// ─── Etichetă de secțiune stil "cotă de desen tehnic" (dimension line) ─────
// Semnătura vizuală a paginii: liniile scurte cu bare perpendiculare la
// capete imită cotele dintr-un plan de șantier/blueprint — ancorate în
// vocabularul vizual al construcțiilor, nu decor generic.
function EtichetaSectiune({ t, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '10px' }}>
      <span className="cb-idx-dim" style={{ width: '46px', '--cb-line': t.borderStrong }} />
      <span style={{
        fontFamily: t.fontMono, fontSize: '11px', fontWeight: '700', color: t.accent,
        textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <span className="cb-idx-dim" style={{ width: '46px', '--cb-line': t.borderStrong }} />
    </div>
  );
}

export default function IndexView({ t, setActiveTab, user }) {
  const esteSubcontractor = user?.rol === 'SUBCONTRACTOR';

  const cardStyle = {
    position: 'relative',
    backgroundColor: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '14px',
    padding: '28px',
    '--cb-accent': t.accent,
    '--cb-shadow': t.shadow,
  };

  const sectionTitleStyle = {
    fontFamily: t.fontDisplay, fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: '800',
    color: t.textPrincipal, margin: '0 0 12px', letterSpacing: '-0.5px', textAlign: 'center',
  };

  const pasi = esteSubcontractor
    ? [
        { icon: <MapPin size={18} />, titlu: 'Găsește șantiere', text: 'Vezi anunțuri active, filtrate pe județ, categorie și buget.' },
        { icon: <Send size={18} />, titlu: 'Trimite oferta ta', text: 'Ofertare statică sau licitație dinamică în timp real, direct din platformă.' },
        { icon: <Gavel size={18} />, titlu: 'Câștigă contractul', text: 'Primești notificare instant când un dezvoltator acceptă oferta ta.' },
      ]
    : [
        { icon: <FileCheck2 size={18} />, titlu: 'Publică un anunț', text: 'Descrie lucrarea, bugetul și termenul limită în câteva minute.' },
        { icon: <Users size={18} />, titlu: 'Primești oferte', text: 'Subcontractori verificați îți trimit oferte comparabile, într-un singur loc.' },
        { icon: <ShieldCheck size={18} />, titlu: 'Alegi în siguranță', text: 'Compari prețuri și termene, apoi confirmi câștigătorul direct în aplicație.' },
      ];

  const tipuriOfertare = [
    {
      icon: <Send size={20} />, titlu: 'Ofertare statică', color: t.accent, bg: t.accentSoft,
      text: 'Subcontractorii trimit câte o ofertă cu preț, descriere și termen de execuție. Dezvoltatorul le compară liniștit și acceptă oferta câștigătoare când e pregătit.',
    },
    {
      icon: <Gavel size={20} />, titlu: 'Licitație dinamică', color: t.amber, bg: t.amberSoft,
      text: 'Ofertare live, cu o fereastră de timp fixă (start/final). Ofertele se actualizează instant pentru toți participanții prin conexiune socket, ca la o licitație reală.',
    },
  ];

  const categorii = [
    { icon: <Layers size={16} />, titlu: 'Structuri & Betoane', color: '#2F6FED' },
    { icon: <Wrench size={16} />, titlu: 'Instalații (Sanitare/Termice)', color: '#f59e0b' },
    { icon: <Zap size={16} />, titlu: 'Sisteme Electrice & Automatizări', color: '#a855f7' },
    { icon: <Paintbrush2 size={16} />, titlu: 'Finisaje & Amenajări', color: '#10b981' },
  ];

  const faptRapid = [
    { icon: <Layers size={17} />, titlu: '4 categorii de lucrări', text: 'Structuri, instalații, electrice și finisaje.' },
    { icon: <Gavel size={17} />, titlu: '2 moduri de ofertare', text: 'Statică sau licitație dinamică live.' },
    { icon: <Hash size={17} />, titlu: 'Verificare CUI la ANAF', text: 'Firme verificate direct din profil.' },
    { icon: <Bell size={17} />, titlu: 'Notificări live', text: 'Actualizări instant prin socket, fără refresh.' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 100px' }}>

      {/* ── Stiluri locale: cotă tehnică, corner marks, hover-uri, animație de intrare ── */}
      <style>{`
        .cb-idx-dim { position: relative; display: inline-block; height: 1px; background: var(--cb-line); }
        .cb-idx-dim::before, .cb-idx-dim::after {
          content: ''; position: absolute; top: -3px; width: 1px; height: 7px; background: var(--cb-line);
        }
        .cb-idx-dim::before { left: 0; }
        .cb-idx-dim::after { right: 0; }

        .cb-idx-corner { position: absolute; width: 22px; height: 22px; opacity: .5; pointer-events: none; }
        .cb-idx-corner.tl { top: 0; left: 0; border-top: 1.5px solid var(--cb-accent); border-left: 1.5px solid var(--cb-accent); }
        .cb-idx-corner.tr { top: 0; right: 0; border-top: 1.5px solid var(--cb-accent); border-right: 1.5px solid var(--cb-accent); }
        .cb-idx-corner.bl { bottom: 0; left: 0; border-bottom: 1.5px solid var(--cb-accent); border-left: 1.5px solid var(--cb-accent); }
        .cb-idx-corner.br { bottom: 0; right: 0; border-bottom: 1.5px solid var(--cb-accent); border-right: 1.5px solid var(--cb-accent); }

        .cb-idx-card { transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease; }
        .cb-idx-card:hover {
          transform: translateY(-4px);
          border-color: var(--cb-accent);
          box-shadow: 0 16px 32px -12px var(--cb-shadow);
        }
        .cb-idx-icon { transition: transform .22s ease; }
        .cb-idx-card:hover .cb-idx-icon { transform: scale(1.08); }

        .cb-idx-btn-primary { transition: transform .18s ease, filter .18s ease, box-shadow .18s ease; }
        .cb-idx-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .cb-idx-btn-ghost { transition: border-color .18s ease, color .18s ease, transform .18s ease; }
        .cb-idx-btn-ghost:hover { border-color: var(--cb-accent); color: var(--cb-accent); transform: translateY(-2px); }

        .cb-idx-fact { transition: border-color .2s ease, transform .2s ease; }
        .cb-idx-fact:hover { border-color: var(--cb-accent); transform: translateY(-2px); }

        @keyframes cbIdxFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .cb-idx-in-1 { animation: cbIdxFadeUp .55s ease both; }
        .cb-idx-in-2 { animation: cbIdxFadeUp .55s ease .08s both; }
        .cb-idx-in-3 { animation: cbIdxFadeUp .55s ease .16s both; }

        @media (prefers-reduced-motion: reduce) {
          .cb-idx-card, .cb-idx-icon, .cb-idx-btn-primary, .cb-idx-btn-ghost, .cb-idx-fact,
          .cb-idx-in-1, .cb-idx-in-2, .cb-idx-in-3 { animation: none !important; transition: none !important; }
          .cb-idx-card:hover, .cb-idx-fact:hover, .cb-idx-btn-primary:hover, .cb-idx-btn-ghost:hover { transform: none !important; }
        }
      `}</style>

      {/* ── Hero — pe fundal de "hârtie milimetrică" de șantier, cu colțuri de reper ── */}
      <div
        className="cb-idx-in-1"
        style={{
          position: 'relative', textAlign: 'center', padding: '56px 28px 48px', maxWidth: '820px', margin: '0 auto 8px',
          backgroundImage: `repeating-linear-gradient(0deg, ${t.border} 0px, ${t.border} 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, ${t.border} 0px, ${t.border} 1px, transparent 1px, transparent 32px)`,
          borderRadius: '18px', '--cb-accent': t.accent,
        }}
      >
        <span className="cb-idx-corner tl" style={{ '--cb-accent': t.accent }} />
        <span className="cb-idx-corner tr" style={{ '--cb-accent': t.accent }} />
        <span className="cb-idx-corner bl" style={{ '--cb-accent': t.accent }} />
        <span className="cb-idx-corner br" style={{ '--cb-accent': t.accent }} />

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          fontFamily: t.fontMono, fontSize: '11.5px', fontWeight: '700', color: t.accent,
          textTransform: 'uppercase', letterSpacing: '1.5px', backgroundColor: t.accentSoft,
          padding: '6px 14px', borderRadius: '999px', marginBottom: '22px',
        }}>
          <HardHat size={13} /> ConstructBid
        </span>
        <h1 style={{
          fontFamily: t.fontDisplay, fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: '800',
          color: t.textPrincipal, margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.15,
        }}>
          Șantiere și oferte,{' '}
          <span style={{ background: t.accentGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            fără hârtii și telefoane
          </span>
        </h1>
        <p style={{ fontSize: '16px', color: t.textSecundar, lineHeight: 1.6, margin: '0 0 32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          {esteSubcontractor
            ? 'Bine ai revenit, ' + (user?.nume || '') + '. Găsește proiecte potrivite firmei tale și trimite oferte direct din platformă, fără intermediari.'
            : 'Bine ai revenit, ' + (user?.nume || '') + '. Publică lucrarea, primește oferte de la subcontractori verificați și alege câștigătorul în siguranță.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="cb-idx-btn-primary"
            onClick={() => setActiveTab && setActiveTab(esteSubcontractor ? 'santiere' : 'adauga_anunt')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: t.accentGradient, color: '#fff', border: 'none', borderRadius: '10px',
              padding: '13px 24px', fontSize: '14.5px', fontWeight: '700', cursor: 'pointer',
              boxShadow: `0 8px 20px ${t.accentSoft}`,
            }}
          >
            {esteSubcontractor ? 'Vezi Șantierele Active' : 'Publică un Anunț'} <ArrowRight size={16} />
          </button>
          <button
            className="cb-idx-btn-ghost"
            onClick={() => setActiveTab && setActiveTab('prospectare')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'transparent', color: t.textPrincipal, border: `1px solid ${t.borderStrong}`,
              borderRadius: '10px', padding: '13px 24px', fontSize: '14.5px', fontWeight: '700', cursor: 'pointer',
              '--cb-accent': t.accent,
            }}
          >
            Explorează Prospectare Piață
          </button>
        </div>
      </div>

      {/* ── Fapte rapide despre platformă ── */}
      <div className="cb-idx-in-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', margin: '40px 0 64px' }}>
        {faptRapid.map((f, i) => (
          <div key={i} className="cb-idx-fact" style={{ ...cardStyle, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '34px', height: '34px', flexShrink: 0, borderRadius: '9px', backgroundColor: t.accentSoft, color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {f.icon}
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: t.textPrincipal, marginBottom: '2px' }}>{f.titlu}</div>
              <div style={{ fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.5 }}>{f.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Cum funcționează ── */}
      <div style={{ marginBottom: '64px' }}>
        <EtichetaSectiune t={t}>Fluxul de lucru</EtichetaSectiune>
        <h2 style={sectionTitleStyle}>
          Cum funcționează pentru {esteSubcontractor ? 'subcontractori' : 'dezvoltatori'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '28px' }}>
          {pasi.map((p, i) => (
            <div key={i} className="cb-idx-card" style={cardStyle}>
              <div className="cb-idx-icon" style={{
                width: '36px', height: '36px', borderRadius: '10px', backgroundColor: t.accentSoft,
                color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              }}>
                {p.icon}
              </div>
              <h3 style={{ fontFamily: t.fontDisplay, fontSize: '16px', fontWeight: '700', color: t.textPrincipal, margin: '0 0 8px' }}>
                <span style={{ fontFamily: t.fontMono, color: t.accent, marginRight: '6px' }}>{String(i + 1).padStart(2, '0')}</span>
                {p.titlu}
              </h3>
              <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: 0, lineHeight: 1.6 }}>{p.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cele două moduri de ofertare ── */}
      <div style={{ marginBottom: '64px' }}>
        <EtichetaSectiune t={t}>Ofertare</EtichetaSectiune>
        <h2 style={sectionTitleStyle}>Alege modul de ofertare potrivit</h2>
        <p style={{ fontSize: '14px', color: t.textSecundar, margin: '0 auto', maxWidth: '560px', lineHeight: 1.6, textAlign: 'center' }}>
          Fiecare proiect publicat pe ConstructBid are unul din cele două moduri de ofertare, ales de dezvoltator la publicare.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '28px' }}>
          {tipuriOfertare.map((tp, i) => (
            <div key={i} className="cb-idx-card" style={cardStyle}>
              <div className="cb-idx-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: tp.bg, color: tp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                {tp.icon}
              </div>
              <h3 style={{ fontFamily: t.fontDisplay, fontSize: '17px', fontWeight: '700', color: t.textPrincipal, margin: '0 0 8px' }}>{tp.titlu}</h3>
              <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: 0, lineHeight: 1.65 }}>{tp.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Categorii de lucrări ── */}
      <div className="cb-idx-card" style={{ ...cardStyle, padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Layers size={20} color={t.accent} />
          <h2 style={{ fontFamily: t.fontDisplay, fontSize: '18px', fontWeight: '700', color: t.textPrincipal, margin: 0 }}>
            Categorii de lucrări acoperite
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {categorii.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px',
              backgroundColor: t.bgInput, borderRadius: '10px',
            }}>
              <div style={{ color: c.color, display: 'flex' }}>{c.icon}</div>
              <span style={{ fontSize: '13.5px', fontWeight: '600', color: t.textPrincipal }}>{c.titlu}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Prospectare de piață ── */}
      <div className="cb-idx-card" style={{ ...cardStyle, padding: '32px', marginBottom: '32px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: t.amberSoft, color: t.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Radar size={22} />
        </div>
        <div>
          <h2 style={{ fontFamily: t.fontDisplay, fontSize: '18px', fontWeight: '700', color: t.textPrincipal, margin: '0 0 8px' }}>
            Prospectare de piață
          </h2>
          <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: '0 0 14px', lineHeight: 1.65, maxWidth: '620px' }}>
            {esteSubcontractor
              ? 'Explorează intenții de proiect publicate de dezvoltatori înainte să devină licitații oficiale. Poți oferta la fel ca la un anunț normal, dar știi clar că e un test de piață — utilă pentru a-ți poziționa firma din timp.'
              : 'Publică o intenție de proiect ca test de piață, înainte de a lansa licitația oficială. Vezi ce interes există în rândul subcontractorilor și ajustează bugetul sau termenele înainte de anunțul final.'}
          </p>
          <button
            onClick={() => setActiveTab && setActiveTab('prospectare')}
            style={{ background: 'none', border: 'none', color: t.accent, fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
          >
            Vezi Prospectare Piață <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Încredere și siguranță + Notificări live ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="cb-idx-card" style={cardStyle}>
          <div className="cb-idx-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.10)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Hash size={20} />
          </div>
          <h3 style={{ fontFamily: t.fontDisplay, fontSize: '16px', fontWeight: '700', color: t.textPrincipal, margin: '0 0 8px' }}>Verificare CUI la ANAF</h3>
          <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: 0, lineHeight: 1.65 }}>
            Fiecare cont poate verifica CUI-ul firmei direct din profil, cu date preluate de la ANAF. Firmele verificate au un semn clar vizibil, pentru mai multă încredere între dezvoltatori și subcontractori.
          </p>
        </div>
        <div className="cb-idx-card" style={cardStyle}>
          <div className="cb-idx-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: t.accentSoft, color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Bell size={20} />
          </div>
          <h3 style={{ fontFamily: t.fontDisplay, fontSize: '16px', fontWeight: '700', color: t.textPrincipal, margin: '0 0 8px' }}>Notificări și actualizări live</h3>
          <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: 0, lineHeight: 1.65 }}>
            Oferte noi, rezultate de licitație și mesaje ajung instant prin conexiune socket, fără să reîncarci pagina. Le vezi centralizat în tab-ul de notificări.
          </p>
        </div>
      </div>

      {/* ── Sistem de tokenuri ── */}
      <div className="cb-idx-card" style={{ ...cardStyle, padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Coins size={20} color={t.amber} />
          <h2 style={{ fontFamily: t.fontDisplay, fontSize: '18px', fontWeight: '700', color: t.textPrincipal, margin: 0 }}>
            Cum funcționează token-urile
          </h2>
        </div>
        <p style={{ fontSize: '13.5px', color: t.textSecundar, margin: '0 0 20px', lineHeight: 1.65, maxWidth: '680px' }}>
          Fiecare cont nou pornește cu un sold de token-uri, consumate la publicarea unui anunț. Costul diferă în funcție de tipul anunțului:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: t.bgInput, borderRadius: '10px' }}>
            <CheckCircle2 size={18} color={t.accent} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: t.textPrincipal }}>Anunț normal — 5 token-uri</div>
              <div style={{ fontSize: '12px', color: t.textSecundar }}>Apare în lista de șantiere active.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: t.bgInput, borderRadius: '10px' }}>
            <Radar size={18} color={t.amber} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: t.textPrincipal }}>Prospectare piață — 3 token-uri</div>
              <div style={{ fontSize: '12px', color: t.textSecundar }}>Apare doar în lista de prospectare.</div>
            </div>
          </div>
        </div>
        <p style={{ fontSize: '12.5px', color: t.textSecundar, margin: '18px 0 0' }}>
          Soldul tău actual de token-uri: <b style={{ color: t.textPrincipal, fontFamily: t.fontMono }}>{user?.tokenuri ?? 0}</b>
        </p>
      </div>

      {/* ── CTA final ── */}
      <div style={{
        ...cardStyle, textAlign: 'center', padding: '44px 24px', border: 'none',
        background: t.accentGradient, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px)`,
        }} />
        <div style={{ position: 'relative' }}>
          <Building2 size={26} color="#fff" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontFamily: t.fontDisplay, fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 8px' }}>
            {esteSubcontractor ? 'Gata să găsești următorul șantier?' : 'Gata să publici primul anunț?'}
          </h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: '0 0 20px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            {esteSubcontractor
              ? 'Vezi șantierele active chiar acum și trimite prima ofertă în câteva minute.'
              : 'Publicarea unui anunț durează câteva minute și ajunge direct la subcontractori din județul tău.'}
          </p>
          <button
            className="cb-idx-btn-primary"
            onClick={() => setActiveTab && setActiveTab(esteSubcontractor ? 'santiere' : 'adauga_anunt')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#fff', color: t.accent, border: 'none', borderRadius: '10px',
              padding: '13px 26px', fontSize: '14.5px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            {esteSubcontractor ? 'Vezi Șantierele Active' : 'Publică un Anunț'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
