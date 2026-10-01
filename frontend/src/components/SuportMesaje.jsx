import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader } from 'lucide-react';

// ── Piese comune pentru chat-ul de suport — folosite atât în bula
// utilizatorului (SuportChat), cât și în panoul de admin (SuportAdmin). ──

// Adaugă un mesaj sosit prin socket, fără dubluri (mesajul propriu poate
// sosi prin socket înainte de răspunsul HTTP care înlocuiește varianta optimistă).
export function adaugaMesaj(lista, mesaj) {
  if (lista.some(m => m._id === mesaj._id)) return lista;
  return [...lista, mesaj];
}

export function inlocuiesteOptimist(lista, idOptimist, mesajSalvat) {
  if (lista.some(m => m._id === mesajSalvat._id)) return lista.filter(m => m._id !== idOptimist);
  return lista.map(m => (m._id === idOptimist ? mesajSalvat : m));
}

function formatOra(data) {
  const d = new Date(data);
  const azi = new Date().toDateString() === d.toDateString();
  return azi
    ? d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// `perspectiva`: 'user' — mesajele echipei sunt în stânga; 'suport' — invers.
export function ListaMesaje({ t, mesaje, perspectiva, gol }) {
  const capat = useRef(null);

  useEffect(() => {
    capat.current?.scrollIntoView({ block: 'end' });
  }, [mesaje.length]);

  if (mesaje.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', color: t.textSecundar, fontSize: '13px', lineHeight: 1.6 }}>
        {gol}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {mesaje.map(m => {
        const alMeu = perspectiva === 'suport' ? m.deLaSuport : !m.deLaSuport;
        const optimist = String(m._id).startsWith('optimist_');
        return (
          <div key={m._id} style={{ display: 'flex', flexDirection: 'column', alignItems: alMeu ? 'flex-end' : 'flex-start' }}>
            {!alMeu && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: t.textSecundar, margin: '0 4px 3px' }}>
                {m.deLaSuport ? 'Echipa ConstructBid' : (m.autor?.nume || 'Utilizator')}
              </span>
            )}
            <div style={{
              maxWidth: '82%', padding: '9px 13px', borderRadius: '14px',
              borderBottomRightRadius: alMeu ? '4px' : '14px',
              borderBottomLeftRadius: alMeu ? '14px' : '4px',
              backgroundColor: alMeu ? t.accent : t.bgInput,
              color: alMeu ? '#fff' : t.textPrincipal,
              fontSize: '13.5px', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
              opacity: optimist ? 0.6 : 1,
            }}>
              {m.text}
            </div>
            <span style={{ fontSize: '10.5px', color: t.textSecundar, margin: '3px 4px 0' }}>
              {optimist ? 'Se trimite...' : formatOra(m.createdAt)}
            </span>
          </div>
        );
      })}
      <div ref={capat} />
    </div>
  );
}

export function FormularMesaj({ t, onTrimite, seTrimite, placeholder }) {
  const [text, setText] = useState('');
  const poateTrimite = text.trim().length > 0 && !seTrimite;

  const trimite = (e) => {
    e?.preventDefault();
    if (!poateTrimite) return;
    onTrimite(text.trim());
    setText('');
  };

  return (
    <form onSubmit={trimite} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', padding: '12px', borderTop: `1px solid ${t.border}` }}>
      <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) trimite(e); }}
        placeholder={placeholder}
        rows={1}
        maxLength={4000}
        style={{
          flex: 1, resize: 'none', maxHeight: '120px', padding: '10px 12px', borderRadius: '10px',
          border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal,
          fontSize: '13.5px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        type="submit"
        disabled={!poateTrimite}
        aria-label="Trimite mesajul"
        style={{
          width: '40px', height: '40px', flexShrink: 0, borderRadius: '10px', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: poateTrimite ? t.accent : t.bgInput,
          color: poateTrimite ? '#fff' : t.textSecundar,
          cursor: poateTrimite ? 'pointer' : 'default',
        }}
      >
        {seTrimite ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
      </button>
    </form>
  );
}
