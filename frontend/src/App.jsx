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
import AbonamentView from './pages/AbonamentView.jsx';
import OfertelemTaleView from './pages/OfertelemTaleView.jsx';
import AdminView from './pages/AdminView.jsx';
import MaterialeView from './pages/MaterialeView.jsx';
import ModificariView from './pages/ModificariView.jsx';
import SuportChat from './components/SuportChat.jsx';

import {
  getToken, setToken, apiMe, apiListaProiecte, apiCreazaProiect,
  apiTrimiteOferta, apiOferteleMele, apiActualizeazaStatusOferta,
  apiOferteProiect, apiAnunturiProspectare,
  apiNotificari, apiMarcheazaNotificareCitita, apiMarcheazaToateNotificarileCitite,
  apiStergeNotificare, apiStergeToateNotificarile,
  apiProiect, apiModificariCerute,
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

  // Anunțuri/cereri proprii suspendate de admin — pagina „Modificări cerute”
  // apare în meniu doar cât timp lista nu e goală.
  const [modificari, setModificari] = useState({ proiecte: [], cereri: [] });
  // Ținte de navigare din notificări: o cerere de deschis în „Materiale” și
  // tab-ul de deschis în panoul de admin. `cheie` forțează re-montarea.
  const [cerereDeschisa, setCerereDeschisa] = useState(null);
  const [adminTab, setAdminTab] = useState({ tab: 'statistici', cheie: 0 });
  // Mesaj afișat pe pagina de login după o deconectare forțată (cont suspendat)
  const [mesajDeconectare, setMesajDeconectare] = useState('');

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
    termenLimitaOferta: '',
    avansProcent: '',
    garantii: '',
    experientaMinima: '',
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
    // Doar subcontractorii licitează pe proiecte de execuție — furnizorii au
    // propriul flux de oferte, la Cereri de Materiale (fila "Materiale").
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

  const incarcaModificari = useCallback(() => {
    if (!user || user.rol === 'ADMIN') return;
    apiModificariCerute()
      .then(data => setModificari(data))
      .catch(err => console.error('Eroare modificari cerute:', err));
  }, [user]);

  // ── Sesiunea e una singură pe browser (token în localStorage). Dacă alt tab
  // se conectează cu alt cont, tab-ul ăsta ar trimite cereri cu token-ul
  // celuilalt cont — reîncărcăm pagina ca să afișeze contul real. ──
  useEffect(() => {
    const laSchimbare = (e) => { if (e.key === 'cb_token') window.location.reload(); };
    window.addEventListener('storage', laSchimbare);
    return () => window.removeEventListener('storage', laSchimbare);
  }, []);

  // ── Încărcare inițială date (doar după login) — totul vine din baza de date prin API ──
  useEffect(() => {
    if (!user) return;
    incarcaProiecte();
    incarcaAnunturiProspectare();
    incarcaOferteleMele();
    incarcaNotificari();
    incarcaModificari();
  }, [user, incarcaProiecte, incarcaAnunturiProspectare, incarcaOferteleMele, incarcaNotificari, incarcaModificari]);

  // ── Socket: camera personală a utilizatorului + camerele proiectelor
  // proprii, pentru actualizări de ofertă live pe pagina de detaliu.
  // Camera personală cere token-ul (serverul ia ID-ul din el) și e refăcută
  // la reconectare, pentru că socket.io pierde camerele când cade conexiunea. ──
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const userId = user.id || user._id;
    const intraInCameraPersonala = () => socket.emit('join_user', getToken());

    intraInCameraPersonala();
    socket.on('connect', intraInCameraPersonala);
    proiecte
      .filter(p => p.dezvoltator?._id === userId)
      .forEach(p => socket.emit('join_proiect', p._id));

    return () => {
      socket.off('connect', intraInCameraPersonala);
      socket.emit('leave_user');
    };
  }, [proiecte, user]);

  // ── Notificări persistente: push live prin socket (backend le-a salvat deja în DB) ──
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const onNotificareNoua = (notificare) => {
      if (!notificare) return;
      setNotificari(prev => [notificare, ...prev.filter(n => n.id !== notificare.id)]);
      // O suspendare sau o aprobare schimbă lista de modificări cerute
      if (notificare.link === 'modificari' || /reactivat/i.test(notificare.titlu || '')) incarcaModificari();
    };

    socket.on('notificare_noua', onNotificareNoua);
    return () => socket.off('notificare_noua', onNotificareNoua);
  }, [user, incarcaModificari]);

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

  // ── Click pe notificare: deschide locul la care se referă ──
  const deschideDinNotificare = async (n) => {
    const link = n.link || (n.proiectId ? `proiect:${n.proiectId}` : '');
    const [tinta, id] = link.split(':');

    if (tinta === 'proiect' && id) {
      try {
        const p = await apiProiect(id);
        deschideProiect(p, p.esteProspectare ? 'prospectare' : 'santiere');
      } catch {
        setActiveTab('santiere'); // proiectul a fost șters între timp
      }
    } else if (tinta === 'cerere' && id) {
      setCerereDeschisa({ id, cheie: Date.now() });
      setActiveTab('materiale');
    } else if (tinta === 'materiale') {
      setActiveTab('materiale');
    } else if (tinta === 'modificari') {
      incarcaModificari();
      setActiveTab('modificari');
    } else if (tinta === 'suport') {
      window.dispatchEvent(new Event('cb-deschide-suport'));
    } else if (tinta === 'admin') {
      setAdminTab({ tab: id || 'statistici', cheie: Date.now() });
      setActiveTab('admin');
    }
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

  // ── Cont suspendat de admin: deconectare imediată, cu motivul pe pagina de login.
  // Vine fie live prin socket, fie din primul răspuns 403 al API-ului. ──
  useEffect(() => {
    if (!user) return;
    const deconecteaza = (mesaj) => {
      setMesajDeconectare(mesaj);
      handleLogout();
    };
    const dinApi = (e) => deconecteaza(e.detail);
    const dinSocket = ({ motiv } = {}) => deconecteaza(`Contul tău a fost suspendat.${motiv ? ` Motiv: ${motiv}` : ''} Contactează-ne dacă crezi că e o greșeală.`);
    window.addEventListener('cb-cont-suspendat', dinApi);
    const socket = getSocket();
    socket.on('cont_suspendat', dinSocket);
    return () => {
      window.removeEventListener('cb-cont-suspendat', dinApi);
      socket.off('cont_suspendat', dinSocket);
    };
  }, [user]);

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
        termenLimitaOferta: formAnunt.termenLimitaOferta || undefined,
        avansProcent: formAnunt.avansProcent !== '' ? Number(formAnunt.avansProcent) : undefined,
        garantii: formAnunt.garantii || undefined,
        experientaMinima: formAnunt.experientaMinima || undefined,
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
        termenLimitaOferta: '', avansProcent: '', garantii: '', experientaMinima: '',
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
  const esteDezvoltator = user?.rol === 'DEZVOLTATOR';
  const esteFurnizor = user?.rol === 'FURNIZOR';
  // Doar subcontractorii licitează pe proiecte de execuție. Furnizorii au
  // propriul flux separat (Cereri de Materiale), fără legătură cu Oferta
  // de pe proiecte — vezi pagina Materiale.
  const poateOferta = esteSubcontractor;


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
      <Auth mesajInitial={mesajDeconectare} onLoginSuccess={(userData) => {
        setMesajDeconectare('');
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
        poateOferta={poateOferta}
        esteDezvoltator={esteDezvoltator}
        nrNotificariNecitite={notificari.filter(n => !n.citit).length}
      />

      <main className="cb-main" style={{ width: '100%', maxWidth: '2000px', margin: '0 auto', padding: '40px 24px', boxSizing: 'border-box', flex: 1 }}>

        {/* Anunțuri suspendate de admin: o bară discretă, nu un element de meniu */}
        {activeTab !== 'modificari' && modificari.proiecte.length + modificari.cereri.length > 0 && (
          <button
            onClick={() => setActiveTab('modificari')}
            style={{
              display: 'block', width: '100%', maxWidth: '1100px', margin: '-16px auto 24px', padding: '10px 14px',
              borderRadius: '8px', border: `1px solid ${t.amber}`, backgroundColor: t.amberSoft,
              color: t.textPrincipal, fontSize: '13.5px', textAlign: 'left', cursor: 'pointer',
            }}
          >
            Ai {modificari.proiecte.length + modificari.cereri.length === 1 ? 'un anunț suspendat' : `${modificari.proiecte.length + modificari.cereri.length} anunțuri suspendate`} până faci modificări. <b style={{ color: t.amber }}>Vezi ce trebuie corectat →</b>
          </button>
        )}

        {activeTab === 'santiere' && (
          ofertaSelectata ? (
            <OfertaDetailView
              oferta={ofertaSelectata.oferta}
              indexOferta={ofertaSelectata.indexOferta}
              proiect={ofertaSelectata.proiect}
              t={t}
              user={user}
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
              onProiectActualizat={(p) => { setProiectSelectat(p); incarcaProiecte(); incarcaAnunturiProspectare(); }}
            />
          ) : (
            <SantiereView t={t} proiecte={proiecte} onSelect={(p) => setProiectSelectat(p)} user={user} />
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
            onDeschide={deschideDinNotificare}
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
              onProiectActualizat={(p) => { setProiectSelectat(p); incarcaProiecte(); incarcaAnunturiProspectare(); }}
            />
          ) : (
            <ProspectarePiataView
              t={t}
              user={user}
              esteSubcontractor={poateOferta}
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

        {activeTab === 'ofertele_tale' && (
          ofertaSelectata ? (
            <OfertaDetailView
              oferta={ofertaSelectata.oferta}
              indexOferta={ofertaSelectata.indexOferta}
              proiect={ofertaSelectata.proiect}
              t={t}
              user={user}
              onBack={() => setOfertaSelectata(null)}
              onAccepta={acceptaOferta}
              onRefuza={refuzaOferta}
            />
          ) : (
            <OfertelemTaleView
              t={t}
              oferteleMele={oferteleMele}
              onSelectOferta={(oferta) => setOfertaSelectata({ oferta, indexOferta: 0, proiect: oferta.proiect })}
            />
          )
        )}

        {activeTab === 'abonament' && (
          <AbonamentView
            t={t}
            user={user}
            onSoldActualizat={(tokenuriNoi) => {
              if (typeof tokenuriNoi === 'number') {
                setUser(prev => prev ? { ...prev, tokenuri: tokenuriNoi } : prev);
              } 
            }}
            onUserActualizat={() => {
              apiMe().then(data => setUser(data.utilizator)).catch(() => {});
            }}
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

        {activeTab === 'materiale' && (
          <MaterialeView key={cerereDeschisa?.cheie} t={t} user={user} cerereInitiala={cerereDeschisa?.id} />
        )}

        {activeTab === 'modificari' && (
          <ModificariView t={t} modificari={modificari} onActualizat={() => { incarcaModificari(); incarcaProiecte(); }} />
        )}

        {activeTab === 'admin' && user?.rol === 'ADMIN' && (
          <AdminView key={adminTab.cheie} t={t} tabInitial={adminTab.tab} />
        )}
      </main>

      {/* Adminii răspund din panoul de administrare, nu din bulă */}
      {user.rol !== 'ADMIN' && <SuportChat t={t} user={user} />}
    </div>
  );
}