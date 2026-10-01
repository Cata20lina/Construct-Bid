import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Headset, AlertCircle, CheckCircle2, RotateCcw, Loader } from 'lucide-react';
import {
  getToken, apiAdminSuportConversatii, apiAdminSuportConversatie,
  apiAdminSuportRaspunde, apiAdminSuportCitit, apiAdminSuportStatus,
} from '../api.js';
import { getSocket } from '../socket.js';
import { ListaMesaje, FormularMesaj, adaugaMesaj, inlocuiesteOptimist } from './SuportMesaje.jsx';

const FILTRE = [
  ['deschisa', 'Deschise'],
  ['rezolvata', 'Rezolvate'],
  ['', 'Toate'],
];

function potrivesteFiltru(conversatie, filtru) {
  return !filtru || conversatie.status === filtru;
}

function formatData(data) {
  const d = new Date(data);
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
}

// ── Tab-ul „Suport” din panoul de admin: lista firelor de suport + firul
// selectat, cu răspuns live. ──
export default function SuportAdmin({ t }) {
  const [filtru, setFiltru] = useState('deschisa');
  const [conversatii, setConversatii] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectata, setSelectata] = useState(null);
  const [mesaje, setMesaje] = useState([]);
  const [seIncarcaFirul, setSeIncarcaFirul] = useState(false);
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');

  const selectataId = selectata?._id || null;
  const selectataRef = useRef(selectataId);
  selectataRef.current = selectataId;
  const filtruRef = useRef(filtru);
  filtruRef.current = filtru;

  const incarcaConversatii = useCallback(() => {
    setLoading(true);
    apiAdminSuportConversatii(filtru)
      .then(setConversatii)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, [filtru]);

  useEffect(() => { incarcaConversatii(); }, [incarcaConversatii]);

  // Actualizează (sau inserează) o conversație în listă, păstrând ordinea
  // după ultimul mesaj și respectând filtrul activ.
  const actualizeazaInLista = useCallback((conversatie) => {
    // Firul deschis rămâne afișat chiar dacă iese din filtrul curent
    setSelectata(prev => (prev?._id === conversatie._id ? conversatie : prev));
    setConversatii(prev => {
      const fara = prev.filter(c => c._id !== conversatie._id);
      if (!potrivesteFiltru(conversatie, filtruRef.current)) return fara;
      return [conversatie, ...fara].sort((a, b) => new Date(b.ultimulMesajLa) - new Date(a.ultimulMesajLa));
    });
  }, []);

  // ── Socket: camera echipei de suport (cere token de ADMIN pe server) ──
  useEffect(() => {
    const socket = getSocket();
    const intra = () => socket.emit('join_suport_admin', getToken());

    const onMesaj = ({ conversatie, mesaj }) => {
      if (!conversatie || !mesaj) return;
      const esteDeschisa = selectataRef.current === conversatie._id;
      if (esteDeschisa) {
        setMesaje(prev => adaugaMesaj(prev, mesaj));
        if (!mesaj.deLaSuport) apiAdminSuportCitit(conversatie._id).catch(() => {});
      }
      actualizeazaInLista(esteDeschisa ? { ...conversatie, necitite: 0 } : conversatie);
    };

    intra();
    socket.on('connect', intra);
    socket.on('suport_admin_mesaj', onMesaj);
    return () => {
      socket.emit('leave_suport_admin');
      socket.off('connect', intra);
      socket.off('suport_admin_mesaj', onMesaj);
    };
  }, [actualizeazaInLista]);

  const selecteaza = async (conversatie) => {
    const id = conversatie._id;
    setSelectata(conversatie);
    selectataRef.current = id;
    setMesaje([]);
    setEroare('');
    setSeIncarcaFirul(true);
    try {
      const data = await apiAdminSuportConversatie(id);
      if (selectataRef.current !== id) return; // între timp s-a selectat alt fir
      setMesaje(data.mesaje);
      setSelectata(data.conversatie);
      setConversatii(prev => prev.map(c => (c._id === id ? { ...c, necitite: 0 } : c)));
    } catch (err) {
      setEroare(err.message);
    } finally {
      setSeIncarcaFirul(false);
    }
  };

  const raspunde = async (text) => {
    if (!selectataId) return;
    setEroare('');
    const id = selectataId;
    const idOptimist = `optimist_${Date.now()}`;
    setMesaje(prev => [...prev, { _id: idOptimist, text, deLaSuport: true, createdAt: new Date().toISOString() }]);
    setSeTrimite(true);
    try {
      const salvat = await apiAdminSuportRaspunde(id, text);
      setMesaje(prev => inlocuiesteOptimist(prev, idOptimist, salvat));
    } catch (err) {
      setMesaje(prev => prev.filter(m => m._id !== idOptimist));
      setEroare(err.message || 'Nu s-a putut trimite răspunsul.');
    } finally {
      setSeTrimite(false);
    }
  };

  const schimbaStatus = async (status) => {
    if (!selectata) return;
    setEroare('');
    try {
      await apiAdminSuportStatus(selectata._id, status);
      actualizeazaInLista({ ...selectata, status });
    } catch (err) {
      setEroare(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTRE.map(([valoare, eticheta]) => (
          <button key={valoare} onClick={() => setFiltru(valoare)} style={{
            padding: '7px 14px', borderRadius: '20px', border: `1px solid ${t.border}`,
            backgroundColor: filtru === valoare ? t.accentSoft : 'transparent',
            color: filtru === valoare ? t.accent : t.textSecundar, fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
          }}>
            {eticheta}
          </button>
        ))}
      </div>

      {eroare && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px' }}>
          <AlertCircle size={15} /> {eroare}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' }}>
        {/* ── Lista firelor ── */}
        <div style={{ flex: '1 1 280px', maxWidth: '100%', height: '600px', overflowY: 'auto', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', boxShadow: `0 2px 10px ${t.shadow}` }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px 0', color: t.textSecundar, fontSize: '13px' }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Se încarcă...
              <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
            </div>
          ) : conversatii.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: t.textSecundar, fontSize: '13px' }}>Nicio conversație de suport aici.</div>
          ) : (
            conversatii.map(c => {
              const activa = c._id === selectataId;
              return (
                <button
                  key={c._id}
                  onClick={() => selecteaza(c)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px',
                    padding: '12px 14px', border: 'none', borderBottom: `1px solid ${t.border}`,
                    borderLeft: `3px solid ${activa ? t.accent : 'transparent'}`,
                    backgroundColor: activa ? t.accentSoft : 'transparent', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '13.5px', fontWeight: c.necitite > 0 ? '800' : '650', color: t.textPrincipal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.user?.nume || 'Utilizator'}
                    </span>
                    <span style={{ fontSize: '11px', color: t.textSecundar, flexShrink: 0 }}>{formatData(c.ultimulMesajLa)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '12.5px', color: t.textSecundar, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.ultimulMesaj ? `${c.ultimulMesaj.deLaSuport ? 'Tu: ' : ''}${c.ultimulMesaj.text}` : '—'}
                    </span>
                    {c.necitite > 0 && (
                      <span style={{ minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '9px', backgroundColor: t.amber, color: '#fff', fontSize: '10.5px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', flexShrink: 0 }}>
                        {c.necitite}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Firul selectat ── */}
        <div style={{ flex: '2 1 420px', maxWidth: '100%', height: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', boxShadow: `0 2px 10px ${t.shadow}` }}>
          {!selectata ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: t.textSecundar, fontSize: '13px' }}>
              <Headset size={28} /> Alege o conversație din listă.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '750', color: t.textPrincipal }}>{selectata.user?.nume}</div>
                  <div style={{ fontSize: '12px', color: t.textSecundar }}>{selectata.user?.email} · {selectata.user?.rol}</div>
                </div>
                {selectata.status === 'deschisa' ? (
                  <button onClick={() => schimbaStatus('rezolvata')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    <CheckCircle2 size={14} /> Marchează rezolvată
                  </button>
                ) : (
                  <button onClick={() => schimbaStatus('deschisa')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textSecundar, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    <RotateCcw size={14} /> Redeschide
                  </button>
                )}
              </div>

              {seIncarcaFirul ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: t.textSecundar, fontSize: '13px' }}>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Se încarcă...
                </div>
              ) : (
                <ListaMesaje t={t} mesaje={mesaje} perspectiva="suport" gol="Niciun mesaj în această conversație." />
              )}

              <FormularMesaj t={t} onTrimite={raspunde} seTrimite={seTrimite} placeholder="Scrie un răspuns..." />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
