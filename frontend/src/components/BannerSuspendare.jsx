import React, { useState } from 'react';
import { PauseCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

// Banner afișat pe un proiect/cerere suspendată de admin.
// - proprietarul vede motivul, poate corecta câmpurile și trimite modificările
//   spre verificare;
// - ceilalți văd doar că anunțul e suspendat temporar.
//
// campuri: [{ cheie, eticheta, multilinie? }]
// onSalveaza(payload) și onTrimite() întorc elementul actualizat de la server.
export default function BannerSuspendare({ t, element, esteProprietar, campuri, onSalveaza, onTrimite, onActualizat }) {
  const [valori, setValori] = useState(() => Object.fromEntries(campuri.map(c => [c.cheie, element[c.cheie] ?? ''])));
  const [seLucreaza, setSeLucreaza] = useState(false);
  const [eroare, setEroare] = useState('');
  const [mesaj, setMesaj] = useState('');

  if (!element?.suspendat) return null;

  const cutie = {
    backgroundColor: t.amberSoft, border: `1px solid ${t.amber}`, borderRadius: '12px', padding: '18px 20px',
  };

  if (!esteProprietar) {
    return (
      <div style={{ ...cutie, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: t.textPrincipal }}>
        <PauseCircle size={18} color={t.amber} style={{ flexShrink: 0 }} />
        Anunțul e suspendat temporar de administrator și nu primește oferte.
      </div>
    );
  }

  const ruleaza = async (actiune, textSucces) => {
    setSeLucreaza(true);
    setEroare('');
    setMesaj('');
    try {
      const actualizat = await actiune();
      setMesaj(textSucces);
      onActualizat?.(actualizat);
    } catch (err) {
      setEroare(err.message || 'A apărut o eroare.');
    } finally {
      setSeLucreaza(false);
    }
  };

  const salveazaSiTrimite = () => ruleaza(async () => {
    await onSalveaza(valori);
    return onTrimite();
  }, 'Modificările au fost trimise. Te anunțăm după ce le verificăm.');

  const input = {
    width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`,
    backgroundColor: t.bgCard, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={cutie}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', color: t.textPrincipal, marginBottom: '6px' }}>
        <PauseCircle size={18} color={t.amber} /> Anunț suspendat până faci modificări
      </div>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: t.textSecundar }}>Ce trebuie corectat, potrivit administratorului:</p>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: t.textPrincipal, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{element.motivSuspendare}</p>

      {element.modificariTrimiseLa && !mesaj && (
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: t.textSecundar }}>
          Ai trimis modificările pe {new Date(element.modificariTrimiseLa).toLocaleString('ro-RO')}. Așteaptă verificarea sau mai poți corecta ceva și retrimite.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {campuri.map(c => (
          <div key={c.cheie}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: t.textSecundar, marginBottom: '4px' }}>{c.eticheta}</label>
            {c.multilinie ? (
              <textarea rows={5} value={valori[c.cheie]} onChange={e => setValori(v => ({ ...v, [c.cheie]: e.target.value }))} style={{ ...input, resize: 'vertical' }} />
            ) : (
              <input value={valori[c.cheie]} onChange={e => setValori(v => ({ ...v, [c.cheie]: e.target.value }))} style={input} />
            )}
          </div>
        ))}
      </div>

      {eroare && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ef4444', marginBottom: '10px' }}><AlertCircle size={14} /> {eroare}</div>}
      {mesaj && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: t.success, marginBottom: '10px' }}><CheckCircle2 size={14} /> {mesaj}</div>}

      <button
        onClick={salveazaSiTrimite} disabled={seLucreaza}
        style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: seLucreaza ? 'default' : 'pointer', opacity: seLucreaza ? 0.7 : 1 }}
      >
        {seLucreaza ? 'Se trimite...' : 'Salvează și trimite: am făcut modificările'}
      </button>
    </div>
  );
}
