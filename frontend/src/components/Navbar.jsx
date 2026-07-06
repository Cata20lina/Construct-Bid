import React from 'react';
import { Building2, HardHat, PlusCircle, Bell, LogOut, Sun, Moon, LineChart, Coins } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, modTema, onToggleTema, t, esteSubcontractor, nrNotificariNecitite }) {
  const allMenuItems = [
    { id: 'index', text: 'Acasă', icon: <Building2 size={16} />, always: true },
    { id: 'santiere', text: 'Proiecte Disponibile', icon: <HardHat size={16} />, always: true },
    { id: 'prospectare', text: 'Prospectare Piață', icon: <LineChart size={16} />, always: true },
    { id: 'adauga_anunt', text: 'Adaugă Anunț', icon: <PlusCircle size={16} />, onlyDezvolator: true },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.always) return true;
    if (item.onlySubcontractor) return esteSubcontractor;
    if (item.onlyDezvolator) return !esteSubcontractor;
    return true;
  });

  return (
    <header style={{ width: '100%', backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 100, transition: 'all 0.25s ease', boxShadow: `0 2px 10px ${t.shadow}` }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Brand Logo — colțuri de tip "reper tehnic" pe pictogramă */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('index')}>
          <div style={{ position: 'relative', background: t.accentGradient, color: '#ffffff', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${t.accentSoft}` }}>
            <Building2 size={17} strokeWidth={2.4} />
            <span style={{ position: 'absolute', top: '-3px', left: '-3px', width: '10px', height: '10px', borderTop: `2px solid ${t.amber}`, borderLeft: `2px solid ${t.amber}`, borderRadius: '3px 0 0 0' }} />
            <span style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '10px', height: '10px', borderBottom: `2px solid ${t.amber}`, borderRight: `2px solid ${t.amber}`, borderRadius: '0 0 3px 0' }} />
          </div>
          <span style={{ fontFamily: t.fontDisplay, fontSize: '19px', fontWeight: '700', color: t.textPrincipal, letterSpacing: '-0.3px' }}>
            Construct<span style={{ color: t.accent }}>Bid</span>
          </span>
        </div>

        {/* Navigare — indicator subliniat, nu fundal */}
        <nav style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'center' }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px', borderRadius: '8px', border: 'none',
                  backgroundColor: isActive ? t.accentSoft : 'transparent',
                  color: isActive ? t.accent : t.textSecundar,
                  fontSize: '13.5px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.2s', outline: 'none',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = t.textPrincipal; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = t.textSecundar; }}
              >
                {item.icon}
                {item.text}
                {isActive && (
                  <span style={{ position: 'absolute', left: '14px', right: '14px', bottom: '-14px', height: '2px', backgroundColor: t.amber, borderRadius: '2px' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Acțiuni dreapta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

          {/* Toggle temă */}
          <button onClick={onToggleTema} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', backgroundColor: modTema === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', transition: 'all 0.2s' }} title={modTema === 'dark' ? 'Mod Luminos' : 'Mod Întunecat'}>
            {modTema === 'dark' ? <Sun size={18} style={{ color: t.amber }} /> : <Moon size={18} style={{ color: '#475569' }} />}
          </button>

          {/* Sold token-uri (relevant pentru dezvoltatori, care le consumă la publicare) */}
          {!esteSubcontractor && typeof user?.tokenuri === 'number' && (
            <div
              onClick={() => setActiveTab('profil')}
              title="Token-uri disponibile pentru publicarea de anunțuri"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
                borderRadius: '20px', backgroundColor: t.amberSoft, color: t.amber,
                fontSize: '12.5px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Coins size={14} /> {user.tokenuri}
            </div>
          )}

          {/* Notificări */}
          <button onClick={() => setActiveTab('notificari')} style={{ background: 'none', border: 'none', color: activeTab === 'notificari' ? t.accent : t.textSecundar, cursor: 'pointer', position: 'relative', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}>
            <Bell size={20} />
            {nrNotificariNecitite > 0 && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', backgroundColor: t.amber, borderRadius: '50%', border: `1.5px solid ${t.bgCard}` }} />
            )}
          </button>

          {/* Separator */}
          <div style={{ width: '1px', height: '28px', backgroundColor: t.border, margin: '0 6px' }} />

          {/* Profil */}
          <div
            onClick={() => setActiveTab('profil')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', backgroundColor: activeTab === 'profil' ? t.accentSoft : 'transparent', transition: 'all 0.2s' }}
            title="Vezi Dashboard & Profil"
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: activeTab === 'profil' ? t.accent : t.textPrincipal, fontSize: '13px', fontWeight: '700', lineHeight: '1.2' }}>
                {user?.nume || 'Compania Ta'}
              </div>
              <span style={{ fontFamily: t.fontMono, color: t.textSecundar, fontSize: '10.5px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.6px' }}>
                {user?.rol}
              </span>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: t.accentGradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.fontDisplay, fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
              {(user?.nume || 'C').charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Buton Deconectare */}
          <button
            onClick={onLogout}
            title="Deconectare"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
          >
            <LogOut size={16} />
          </button>

        </div>
      </div>
    </header>
  );
}
