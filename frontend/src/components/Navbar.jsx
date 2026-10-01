import React, { useState } from 'react';
import { Building2, HardHat, PlusCircle, Bell, LogOut, Sun, Moon, LineChart, Coins, CreditCard, Send, ShieldAlert, Package, Menu, X, User } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, modTema, onToggleTema, t, poateOferta, esteDezvoltator, nrNotificariNecitite }) {
  const esteAdmin = user?.rol === 'ADMIN';
  // Meniul pliat (tabletă/telefon) — vezi regulile .cb-nav-* din index.css
  const [meniuDeschis, setMeniuDeschis] = useState(false);
  const mergiLa = (tab) => { setActiveTab(tab); setMeniuDeschis(false); };
  const allMenuItems = [
    { id: 'index', text: 'Acasă', icon: <Building2 size={16} />, always: true },
    { id: 'santiere', text: 'Proiecte Disponibile', icon: <HardHat size={16} />, always: true },
    { id: 'prospectare', text: 'Prospectare Piață', icon: <LineChart size={16} />, always: true },
    { id: 'adauga_anunt', text: 'Adaugă Anunț', icon: <PlusCircle size={16} />, onlyDezvolator: true },
    { id: 'ofertele_tale', text: 'Ofertele Tale', icon: <Send size={16} />, onlyOfertant: true },
    { id: 'materiale', text: 'Materiale', icon: <Package size={16} />, always: true },
    { id: 'admin', text: 'Admin', icon: <ShieldAlert size={16} />, onlyAdmin: true },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.onlyAdmin) return esteAdmin;
    if (item.always) return true;
    if (item.onlyOfertant) return poateOferta;
    if (item.onlyDezvolator) return esteDezvoltator;
    return true;
  });

  return (
    <header style={{ width: '100%', backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 100, transition: 'all 0.25s ease', boxShadow: `0 2px 10px ${t.shadow}` }}>
      <div className="cb-nav-bara" style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>

        {/* Brand Logo — colțuri de tip "reper tehnic" pe pictogramă */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flexShrink: 0 }} onClick={() => mergiLa('index')}>
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
        <nav className="cb-nav-desktop" style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'center' }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => mergiLa(item.id)}
                title={item.text}
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
                <span className="cb-nav-icon" style={{ display: 'flex' }}>{item.icon}</span>
                <span className="cb-nav-text">{item.text}</span>
                {isActive && (
                  <span style={{ position: 'absolute', left: '14px', right: '14px', bottom: '-14px', height: '2px', backgroundColor: t.amber, borderRadius: '2px' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Acțiuni dreapta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

          {/* Toggle temă */}
          <button className="cb-nav-secundar" onClick={onToggleTema} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', backgroundColor: modTema === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', transition: 'all 0.2s' }} title={modTema === 'dark' ? 'Mod Luminos' : 'Mod Întunecat'}>
            {modTema === 'dark' ? <Sun size={18} style={{ color: t.amber }} /> : <Moon size={18} style={{ color: '#475569' }} />}
          </button>

          {/* Abonament & tokenuri */}
          <button
            className="cb-nav-secundar"
            onClick={() => mergiLa('abonament')}
            title="Abonament & tokenuri"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              padding: '8px', borderRadius: '8px', transition: 'all 0.2s',
              color: activeTab === 'abonament' ? t.accent : t.textSecundar,
              backgroundColor: activeTab === 'abonament' ? t.accentSoft : 'transparent',
            }}
          >
            <CreditCard size={18} />
          </button>

          {/* Sold token-uri (relevant pentru dezvoltatori, care le consumă la publicare) */}
          {esteDezvoltator && typeof user?.tokenuri === 'number' && (
            <div
              className="cb-nav-secundar"
              onClick={() => mergiLa('abonament')}
              title="Token-uri disponibile pentru publicarea de anunțuri — vezi abonamentul"
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
          <button onClick={() => mergiLa('notificari')} title="Notificări" style={{ background: 'none', border: 'none', color: activeTab === 'notificari' ? t.accent : t.textSecundar, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}>
            <Bell size={18} />
            {nrNotificariNecitite > 0 && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', backgroundColor: t.amber, borderRadius: '50%', border: `1.5px solid ${t.bgCard}` }} />
            )}
          </button>

          {/* Separator */}
          <div className="cb-nav-secundar" style={{ width: '1px', height: '28px', backgroundColor: t.border, margin: '0 6px' }} />

          {/* Profil */}
          <div
            className="cb-nav-secundar"
            onClick={() => mergiLa('profil')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '10px', cursor: 'pointer', backgroundColor: activeTab === 'profil' ? t.accentSoft : 'transparent', transition: 'all 0.2s' }}
            title="Vezi Dashboard & Profil"
          >
            <div className="cb-nav-profil-text" style={{ textAlign: 'right' }}>
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

          {/* Buton meniu — doar pe ecrane înguste */}
          <button
            className="cb-nav-burger"
            onClick={() => setMeniuDeschis(d => !d)}
            title="Meniu"
            aria-expanded={meniuDeschis}
            style={{ display: 'none', alignItems: 'center', padding: '8px', borderRadius: '8px', border: `1px solid ${t.border}`, background: 'none', color: t.textPrincipal, cursor: 'pointer' }}
          >
            {meniuDeschis ? <X size={18} /> : <Menu size={18} />}
          </button>

        </div>
      </div>

      {/* Meniul pliat */}
      {meniuDeschis && (
        <nav className="cb-nav-mobil" style={{ borderTop: `1px solid ${t.border}`, backgroundColor: t.bgCard, padding: '8px 12px 12px', display: 'none', flexDirection: 'column', gap: '2px' }}>
          {[
            ...menuItems,
            { id: 'profil', text: user?.nume || 'Profil', icon: <User size={16} /> },
            { id: 'abonament', text: esteDezvoltator && typeof user?.tokenuri === 'number' ? `Abonament · ${user.tokenuri} tokenuri` : 'Abonament', icon: <CreditCard size={16} /> },
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => mergiLa(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 12px',
                  borderRadius: '8px', border: 'none', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  backgroundColor: isActive ? t.accentSoft : 'transparent', color: isActive ? t.accent : t.textPrincipal,
                }}
              >
                {item.icon} {item.text}
              </button>
            );
          })}
          <button
            onClick={() => { onToggleTema(); setMeniuDeschis(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none', textAlign: 'left', fontSize: '14px', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: t.textPrincipal }}
          >
            {modTema === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {modTema === 'dark' ? 'Mod luminos' : 'Mod întunecat'}
          </button>
        </nav>
      )}
    </header>
  );
}
