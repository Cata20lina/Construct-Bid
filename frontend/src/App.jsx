import React, { useState, useEffect, useCallback } from 'react';
import Auth from './Auth.jsx';
import Navbar from './components/Navbar.jsx';
import SantiereView from './pages/SantiereView.jsx';
import ProiectDetailView from './pages/ProiectDetailView.jsx';
import IndexView from './pages/IndexView.jsx';
import AdaugaAnuntView from './pages/AdaugaAnuntView.jsx';
import NotificariView from './pages/NotificariView.jsx';
import ProspectarePiataView from './pages/ProspectarePiataView.jsx';
import OfertaDetailView from './pages/OfertaDetailView.jsx';
import ProfilView from './pages/ProfilView.jsx';

import {
  getToken, setToken, apiMe, apiListaProiecte, apiCreazaProiect,
  apiTrimiteOferta, apiOferteleMele, apiActualizeazaStatusOferta,
  apiOferteProiect, apiAnunturiProspectare,
  apiNotificari, apiMarcheazaNotificareCitita, apiMarcheazaToateNotificarileCitite,
  apiStergeNotificare, apiStergeToateNotificarile,
} from './api.js';
import { getSocket } from './socket.js';

// ── Sistem de token-uri vizuale ConstructBid ──────────────────────────────
// Paletă: "Rebar Blue" (structură/planuri) + "Safety Amber" (accent hi-vis),
// pe fond de oțel/beton. Tipografie: Space Grotesk (brand/titluri),
// Inter (text) și IBM Plex Mono (sume, coduri, date — tratament tehnic).
const fontDisplay = '"Space Grotesk", "Inter", sans-serif';
const fontBody = '"Inter", system-ui, sans-serif';
const fontMono = '"IBM Plex Mono", ui-monospace, monospace';

const teme = {
  dark: {
    bgCrap: '#090e1a',
    bgCard: '#111827',
    bgInput: '#1f2937',
    textPrincipal: '#f9fafb',
    textSecundar: '#9ca3af',
    border: 'rgba(255,255,255,0.05)',
    borderStrong: 'rgba(255,255,255,0.1)',
    shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    accent: '#2F6FED',
    accentHover: '#2557C7',
    accentSoft: 'rgba(47,111,237,0.12)',
    accentGradient: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)',
    amber: '#FF9E2C',
    amberSoft: 'rgba(255,158,44,0.12)',
    success: '#22B27D',
    danger: '#ef4444',
    fontDisplay, fontBody, fontMono,
  },
  light: {
    bgCrap: '#F1EFEA',
    bgCard: '#ffffff',
    bgInput: '#F6F5F1',
    textPrincipal: '#14181F',
    textSecundar: '#5B6473',
    border: 'rgba(20,24,31,0.08)',
    borderStrong: 'rgba(20,24,31,0.14)',
    shadow: '0 4px 6px -1px rgba(20,24,31,0.08)',
    accent: '#2F6FED',
    accentHover: '#2557C7',
    accentSoft: 'rgba(47,111,237,0.08)',
    accentGradient: 'linear-gradient(135deg, #2F6FED 0%, #1D4FC4 100%)',
    amber: '#E8830A',
    amberSoft: 'rgba(232,131,10,0.1)',
    success: '#1C9A6C',
    danger: '#dc2626',
    fontDisplay, fontBody, fontMono,
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [verificareSesiune, setVerificareSesiune] = useState(true); // verificăm token-ul existent la pornire
  const [activeTab, setActiveTab] = useState('auth');
  const [proiectSelectat, setProiectSelectat] = useState(null);
  const [modTema, setModTema] = useState('dark');
  const [proiecte, setProiecte] = useState([]);
  const [anunturiProspectare, setAnunturiProspectare] = useState([]);
  const [oferteleMele, setOferteleMele] = useState([]);

  const [notificari, setNotificari] = useState([]);
  const [ofertaSelectata, setOfertaSelectata] = useState(null);

  const [loadingAnunt, setLoadingAnunt] = useState(false);
  const [errorAnunt, setErrorAnunt] = useState('');
  const [successAnunt, setSuccessAnunt] = useState(false);
  const [loadingOferta, setLoadingOferta] = useState(false);
  const [errorOferta, setErrorOferta] = useState('');

  const [formAnunt, setFormAnunt] = useState({
    titlu: '',
    categorie: 'Structuri',
    bugetMax: '',
    judet: '',
    oras: '',
    termenLimita: '',
    descriere: '',
    tipOfertare: 'statica',
    licitatieStart: '',
    licitatieEnd: '',
    esteProspectare: false,
  });

  const t = teme[modTema];

  // ── La pornire: verificăm dacă există un token valid (sesiune persistată în baza de date) ──
  useEffect(() => {
    const token = getToken();
    if (!token) { setVerificareSesiune(false); return; }
    apiMe()
      .then(data => {
        setUser(data.utilizator);
        setActiveTab('index');
      })
      .catch(() => {
        setToken(null); // token invalid/expirat
      })
      .finally(() => setVerificareSesiune(false));
  }, []);

  const incarcaProiecte = useCallback(() => {
    apiListaProiecte()
      .then(data => setProiecte(data))
      .catch(err => console.error('Eroare proiecte:', err));
  }, []);

  const incarcaAnunturiProspectare = useCallback(() => {
    apiAnunturiProspectare()
      .then(data => setAnunturiProspectare(data))
      .catch(err => console.error('Eroare anunțuri prospectare:', err));
  }, []);

  const incarcaOferteleMele = useCallback(() => {
    if (user?.rol !== 'SUBCONTRACTOR') return;
    apiOferteleMele()
      .then(data => setOferteleMele(data))
      .catch(err => console.error('Eroare ofertele mele:', err));
  }, [user]);

  const incarcaNotificari = useCallback(() => {
    if (!user) return;
    apiNotificari()
      .then(data => setNotificari(data))
      .catch(err => console.error('Eroare notificari:', err));
  }, [user]);

  // ── Încărcare inițială date (doar după login) — totul vine din baza de date prin API ──
  useEffect(() => {
    if (!user) return;
    incarcaProiecte();
    incarcaAnunturiProspectare();
    incarcaOferteleMele();
    incarcaNotificari();
  }, [user, incarcaProiecte, incarcaAnunturiProspectare, incarcaOferteleMele, incarcaNotificari]);

  // ── Socket: camera personală a utilizatorului + camerele proiectelor proprii,
  // pentru actualizări de ofertă live pe pagina de detaliu ──
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const userId = user.id || user._id;

    socket.emit('join_user', userId);
    proiecte
      .filter(p => p.dezvoltator?._id === userId)
      .forEach(p => socket.emit('join_proiect', p._id));

    return () => socket.emit('leave_user', userId);
  }, [proiecte, user]);

  // ── Notificări persistente: push live prin socket (backend le-a salvat deja în DB) ──
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const onNotificareNoua = (notificare) => {
      if (!notificare) return;
      setNotificari(prev => [notificare, ...prev.filter(n => n.id !== notificare.id)]);
    };

    socket.on('notificare_noua', onNotificareNoua);
    return () => socket.off('notificare_noua', onNotificareNoua);
  }, [user]);

  // ── Acțiuni asupra notificărilor — persistate pe server, nu doar local ──
  const marcheazaNotificareCitita = useCallback((id) => {
    setNotificari(prev => prev.map(n => n.id === id ? { ...n, citit: true } : n));
    apiMarcheazaNotificareCitita(id).catch(err => console.error('Eroare marcare notificare:', err));
  }, []);

  const marcheazaToateNotificarileCitite = useCallback(() => {
    setNotificari(prev => prev.map(n => ({ ...n, citit: true })));
    apiMarcheazaToateNotificarileCitite().catch(err => console.error('Eroare marcare notificari:', err));
  }, []);

  const stergeNotificare = useCallback((id) => {
    setNotificari(prev => prev.filter(n => n.id !== id));
    apiStergeNotificare(id).catch(err => console.error('Eroare stergere notificare:', err));
  }, []);

  const stergeToateNotificarile = useCallback(() => {
    setNotificari([]);
    apiStergeToateNotificarile().catch(err => console.error('Eroare stergere notificari:', err));
  }, []);

  // ── Polling ușor pentru proiecte (status licitații care se schimbă) ──
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(incarcaProiecte, 15000);
    return () => clearInterval(interval);
  }, [user, incarcaProiecte]);

  const toggleTema = () => setModTema(prev => prev === 'dark' ? 'light' : 'dark');

  const deschideProiect = (p, tabTinta = 'santiere') => {
    setProiectSelectat(p);
    setOfertaSelectata(null);
    setActiveTab(tabTinta);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab('auth');
    setProiecte([]);
    setAnunturiProspectare([]);
    setOferteleMele([]);
    setNotificari([]);
    setProiectSelectat(null);
    setOfertaSelectata(null);
  };

  // ── Adaugă anunț nou (proiect) — salvat direct în MongoDB prin API ──
  const adaugaAnuntNou = async (e) => {
    e.preventDefault();
    setLoadingAnunt(true);
    setErrorAnunt('');
    setSuccessAnunt(false);

    try {
      const payload = {
        titlu: formAnunt.titlu,
        categorie: formAnunt.categorie,
        bugetValoare: Number(formAnunt.bugetMax) || undefined,
        buget: formAnunt.bugetMax ? `${Number(formAnunt.bugetMax).toLocaleString()} RON` : '0 RON',
        judet: formAnunt.judet,
        oras: formAnunt.oras,
        locatie: formAnunt.judet && formAnunt.oras ? `${formAnunt.oras}, ${formAnunt.judet}` : (formAnunt.judet || 'Nespecificat'),
        deadline: formAnunt.termenLimita || undefined,
        zile: formAnunt.termenLimita
          ? Math.max(1, Math.ceil((new Date(formAnunt.termenLimita).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 30,
        descriere: formAnunt.descriere,
        tipOfertare: formAnunt.tipOfertare,
        licitatieStart: formAnunt.tipOfertare === 'dinamica' && formAnunt.licitatieStart ? formAnunt.licitatieStart : undefined,
        licitatieEnd: formAnunt.tipOfertare === 'dinamica' ? formAnunt.licitatieEnd : undefined,
        esteProspectare: !!formAnunt.esteProspectare,
      };

      const proiectSalvat = await apiCreazaProiect(payload);

      // Anunțurile de prospectare piață apar doar în lista dedicată; cele
      // normale apar în lista de șantiere.
      if (proiectSalvat.esteProspectare) {
        setAnunturiProspectare(prev => [proiectSalvat, ...prev]);
      } else {
        setProiecte(prev => [proiectSalvat, ...prev]);
      }

      // Token-urile consumate la publicare — actualizăm soldul din răspunsul serverului.
      if (typeof proiectSalvat.tokenuriRamase === 'number') {
        setUser(prev => prev ? { ...prev, tokenuri: proiectSalvat.tokenuriRamase } : prev);
      }

      setFormAnunt({
        titlu: '', categorie: 'Structuri', bugetMax: '', judet: '', oras: '',
        termenLimita: '', descriere: '', tipOfertare: 'statica', licitatieStart: '', licitatieEnd: '',
        esteProspectare: false,
      });
      setSuccessAnunt(true);
      setTimeout(() => {
        setSuccessAnunt(false);
        setActiveTab(proiectSalvat.esteProspectare ? 'prospectare' : 'santiere');
        setProiectSelectat(null);
      }, 1200);
    } catch (error) {
      setErrorAnunt(error.message || 'Nu s-a putut salva anunțul. Verifică conexiunea cu serverul.');
      console.error(error);
    } finally {
      setLoadingAnunt(false);
    }
  };

  // ── Adaugă ofertă (folosit doar pentru OFERTARE STATICĂ; cea dinamică se trimite direct din ProiectDetailView) ──
  const adaugaOfertaLaProiect = async (payload) => {
    setLoadingOferta(true);
    setErrorOferta('');
    try {
      await apiTrimiteOferta(payload);
      incarcaOferteleMele();
      incarcaProiecte();
    } catch (error) {
      setErrorOferta(error.message || 'Nu s-a putut trimite oferta.');
      console.error(error);
    } finally {
      setLoadingOferta(false);
    }
  };

  // ── Acceptă / Refuză ofertă (doar ofertare statică) ──
  const acceptaOferta = async (ofertaId) => {
    try {
      const ofertaActualizata = await apiActualizeazaStatusOferta(ofertaId, 'acceptata');
      incarcaProiecte();
      if (ofertaSelectata) setOfertaSelectata(prev => ({ ...prev, oferta: { ...prev.oferta, status: 'acceptata' } }));
    } catch (err) { console.error('Eroare acceptare ofertă:', err); }
  };

  const refuzaOferta = async (ofertaId) => {
    try {
      await apiActualizeazaStatusOferta(ofertaId, 'respinsa');
      incarcaProiecte();
      if (ofertaSelectata) setOfertaSelectata(prev => ({ ...prev, oferta: { ...prev.oferta, status: 'respinsa' } }));
    } catch (err) { console.error('Eroare refuzare ofertă:', err); }
  };

  const esteSubcontractor = user?.rol === 'SUBCONTRACTOR';


  // ── Ecran de încărcare la verificarea sesiunii ──
  if (verificareSesiune) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090e1a', color: '#5B6473', fontFamily: fontBody }}>
        <div style={{ width: '34px', height: '34px', border: '3px solid rgba(47,111,237,0.2)', borderTopColor: '#2F6FED', borderRadius: '50%' }} className="spin-icon" />
        <span style={{ fontFamily: fontMono, fontSize: '13px', letterSpacing: '0.5px' }}>Se încarcă ConstructBid…</span>
      </div>
    );
  }

  // ── Dacă nu e autentificat, arată Auth pe tot ecranul ──
  if (!user || activeTab === 'auth') {
    return (
      <Auth onLoginSuccess={(userData) => {
        setUser(userData);
        setActiveTab('index');
      }} />
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: t.bgCrap,
      minHeight: '100vh',
      fontFamily: t.fontBody,
      color: t.textPrincipal,
      transition: 'all 0.25s ease',
      margin: 0,
      padding: 0
    }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'santiere') {
            setProiectSelectat(null);
            setOfertaSelectata(null);
          }
        }}
        user={user}
        onLogout={handleLogout}
        modTema={modTema}
        onToggleTema={toggleTema}
        t={t}
        esteSubcontractor={esteSubcontractor}
        nrNotificariNecitite={notificari.filter(n => !n.citit).length}
      />

      <main style={{ width: '100%', maxWidth: '2000px', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box', flex: 1 }}>

        {activeTab === 'santiere' && (
          ofertaSelectata ? (
            <OfertaDetailView
              oferta={ofertaSelectata.oferta}
              indexOferta={ofertaSelectata.indexOferta}
              proiect={ofertaSelectata.proiect}
              t={t}
              onBack={() => setOfertaSelectata(null)}
              onAccepta={acceptaOferta}
              onRefuza={refuzaOferta}
            />
          ) : proiectSelectat ? (
            <ProiectDetailView
              proiect={proiectSelectat}
              onBack={() => setProiectSelectat(null)}
              t={t}
              user={user}
              onAdaugaOferta={adaugaOfertaLaProiect}
              loadingOferta={loadingOferta}
              errorOferta={errorOferta}
              onSelectOferta={(oferta, idx, proiect) =>
                setOfertaSelectata({ oferta, indexOferta: idx, proiect })
              }
            />
          ) : (
            <SantiereView t={t} proiecte={proiecte} onSelect={(p) => setProiectSelectat(p)} />
          )
        )}

        {activeTab === 'index' && (
          <IndexView
            t={teme[modTema]}
            setActiveTab={setActiveTab}
            user={user}
          />
        )}

        {activeTab === 'notificari' && (
          <NotificariView
            t={t}
            notificari={notificari}
            onMarcheazaCitit={marcheazaNotificareCitita}
            onMarcheazaToateCitite={marcheazaToateNotificarileCitite}
            onStergeNotificare={stergeNotificare}
            onStergeToate={stergeToateNotificarile}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'prospectare' && (
          proiectSelectat ? (
            <ProiectDetailView
              proiect={proiectSelectat}
              onBack={() => setProiectSelectat(null)}
              t={t}
              user={user}
              onAdaugaOferta={adaugaOfertaLaProiect}
              loadingOferta={loadingOferta}
              errorOferta={errorOferta}
              onSelectOferta={(oferta, idx, proiect) =>
                setOfertaSelectata({ oferta, indexOferta: idx, proiect })
              }
            />
          ) : (
            <ProspectarePiataView
              t={t}
              user={user}
              esteSubcontractor={esteSubcontractor}
              onSelectProiect={(p) => deschideProiect(p, 'prospectare')}
              anunturiProspectare={anunturiProspectare}
            />
          )
        )}

        {activeTab === 'adauga_anunt' && (
          <AdaugaAnuntView
            t={t}
            user={user}
            formAnunt={formAnunt}
            setFormAnunt={setFormAnunt}
            adaugaAnuntNou={adaugaAnuntNou}
            loading={loadingAnunt}
            error={errorAnunt}
            success={successAnunt}
          />
        )}

        {activeTab === 'profil' && (
          <ProfilView
            user={user}
            t={t}
            proiecte={proiecte}
            oferteleMele={oferteleMele}
            setActiveTab={setActiveTab}
            setProiectSelectat={setProiectSelectat}
            setUser={setUser}
          />
        )}
      </main>
    </div>
  );
}