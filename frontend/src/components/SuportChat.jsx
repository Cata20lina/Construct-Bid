import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Headset, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiSuport, apiSuportTrimite, apiSuportCitit } from '../api.js';
import { getSocket } from '../socket.js';
import { ListaMesaje, FormularMesaj, adaugaMesaj, inlocuiesteOptimist } from './SuportMesaje.jsx';

// ── Chat de suport: bulă flotantă în colțul din dreapta-jos, disponibilă
// pe orice pagină pentru utilizatorii autentificați (nu și pentru admini,
// care răspund din panoul de administrare). ──
export default function SuportChat({ t, user }) {
  const [deschis, setDeschis] = useState(false);
  const [mesaje, setMesaje] = useState([]);
  const [status, setStatus] = useState(null);
  const [necitite, setNecitite] = useState(0);
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');

  // Handler-ele de socket au nevoie de starea curentă fără să se reînregistreze
  const deschisRef = useRef(deschis);
  deschisRef.current = deschis;

  // Deschis din altă parte a aplicației (ex. click pe o notificare de la suport)
  useEffect(() => {
    const deschide = () => setDeschis(true);
    window.addEventListener('cb-deschide-suport', deschide);
    return () => window.removeEventListener('cb-deschide-suport', deschide);
  }, []);

  const userId = user?.id || user?._id;

  useEffect(() => {
    if (!userId) return;
    apiSuport()
      .then(data => {
        setMesaje(data.mesaje || []);
        setStatus(data.status);
        setNecitite(data.necitite || 0);
      })
      .catch(err => console.error('Eroare conversație suport:', err));
  }, [userId]);

  const marcheazaCitit = useCallback(() => {
    setNecitite(0);
    apiSuportCitit().catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    const onMesajNou = (mesaj) => {
      if (!mesaj) return;
      setMesaje(prev => adaugaMesaj(prev, mesaj));
      if (!mesaj.deLaSuport) return;
      setStatus('deschisa');
      if (deschisRef.current) marcheazaCitit();
      else setNecitite(n => n + 1);
    };

    const onStatus = ({ status: nou }) => setStatus(nou);

    socket.on('suport_mesaj_nou', onMesajNou);
    socket.on('suport_status', onStatus);
    return () => {
      socket.off('suport_mesaj_nou', onMesajNou);
      socket.off('suport_status', onStatus);
    };
  }, [userId, marcheazaCitit]);

  const deschide = () => {
    setDeschis(true);
    if (necitite > 0) marcheazaCitit();
  };

  const trimite = async (text) => {
    setEroare('');
    const idOptimist = `optimist_${Date.now()}`;
    setMesaje(prev => [...prev, { _id: idOptimist, text, deLaSuport: false, createdAt: new Date().toISOString() }]);
    setSeTrimite(true);
    try {
      const salvat = await apiSuportTrimite(text);
      setMesaje(prev => inlocuiesteOptimist(prev, idOptimist, salvat));
      setStatus('deschisa');
    } catch (err) {
      setMesaje(prev => prev.filter(m => m._id !== idOptimist));
      setEroare(err.message || 'Nu s-a putut trimite mesajul.');
    } finally {
      setSeTrimite(false);
    }
  };

  if (!userId) return null;

  return (
    <div style={{ position: 'fixed', right: '20px', bottom: '20px', zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
      {deschis && (
        <div
          role="dialog"
          aria-label="Chat suport"
          style={{
            width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 110px))',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backgroundColor: t.bgCard, border: `1px solid ${t.borderStrong}`, borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: t.accentGradient, color: '#fff' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Headset size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: t.fontDisplay, fontSize: '15px', fontWeight: '700' }}>Suport ConstructBid</div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>Îți răspundem cât de repede putem</div>
            </div>
            <button onClick={() => setDeschis(false)} aria-label="Închide chat-ul" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          {status === 'rezolvata' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '12px', color: t.success, backgroundColor: t.bgInput, borderBottom: `1px solid ${t.border}` }}>
              <CheckCircle2 size={14} /> Conversația a fost marcată rezolvată. Scrie-ne din nou dacă mai ai nevoie de ajutor.
            </div>
          )}

          <ListaMesaje
            t={t}
            mesaje={mesaje}
            perspectiva="user"
            gol={<>Ai o întrebare sau o problemă cu platforma?<br />Scrie-ne aici și echipa ConstructBid îți răspunde direct în acest chat.</>}
          />

          {eroare && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px 8px', fontSize: '12px', color: t.danger }}>
              <AlertCircle size={13} /> {eroare}
            </div>
          )}

          <FormularMesaj t={t} onTrimite={trimite} seTrimite={seTrimite} placeholder="Scrie mesajul tău..." />
        </div>
      )}

      <button
        onClick={deschis ? () => setDeschis(false) : deschide}
        aria-label={deschis ? 'Închide chat-ul de suport' : 'Deschide chat-ul de suport'}
        style={{
          position: 'relative', width: '56px', height: '56px', borderRadius: '50%', border: 'none',
          background: t.accentGradient, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(47,111,237,0.5)',
        }}
      >
        {deschis ? <X size={22} /> : <Headset size={24} />}
        {!deschis && necitite > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px', minWidth: '20px', height: '20px', padding: '0 5px',
            borderRadius: '10px', backgroundColor: t.amber, color: '#fff', fontSize: '11px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${t.bgCrap}`, boxSizing: 'border-box',
          }}>
            {necitite > 9 ? '9+' : necitite}
          </span>
        )}
      </button>
    </div>
  );
}
