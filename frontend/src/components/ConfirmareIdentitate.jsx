import React, { useState } from 'react';
import { BadgeCheck, Clock, AlertTriangle, Lock, Upload, Copy, Check } from 'lucide-react';
import { apiTrimiteIdentitate } from '../api.js';

// Card pe profilul firmei: dovada că persoana care folosește contul chiar
// reprezintă firma (peste verificarea ANAF, care arată doar că firma există).
// Documentele se văd doar de firmă și de echipa ConstructBid și se șterg după
// verificare — vezi backend/routes/identitate.js.

const CALITATI = { administrator: 'administrator', imputernicit: 'împuternicit' };

export default function ConfirmareIdentitate({ t, user, setUser }) {
  const identitate = user?.identitate || { status: 'NECONFIRMATA' };
  const [metoda, setMetoda] = useState('semnatura');
  const [persoana, setPersoana] = useState('');
  const [calitate, setCalitate] = useState('administrator');
  const [fisiere, setFisiere] = useState({});
  const [acord, setAcord] = useState(false);
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');
  const [copiat, setCopiat] = useState(false);

  const card = { backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px 24px' };
  const titlu = (icon, text, culoare) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '700', color: t.textPrincipal }}>
      {React.cloneElement(icon, { size: 18, color: culoare })} {text}
    </div>
  );

  if (identitate.status === 'CONFIRMATA') {
    return (
      <div style={card}>
        {titlu(<BadgeCheck />, 'Identitate confirmată', t.success)}
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: t.textSecundar, lineHeight: 1.6 }}>
          {identitate.persoana} ({CALITATI[identitate.calitate] || identitate.calitate}) reprezintă firma, confirmat
          {identitate.confirmataLa ? ` pe ${new Date(identitate.confirmataLa).toLocaleDateString('ro-RO')}` : ''}.
          Documentele trimise au fost șterse după verificare.
        </p>
      </div>
    );
  }

  if (identitate.status === 'IN_VERIFICARE') {
    return (
      <div style={card}>
        {titlu(<Clock />, 'Identitatea firmei e în verificare', t.amber)}
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: t.textSecundar, lineHeight: 1.6 }}>
          Ai trimis documentele{identitate.trimisaLa ? ` pe ${new Date(identitate.trimisaLa).toLocaleString('ro-RO')}` : ''}.
          Primești o notificare după ce le verificăm. Documentele se șterg după verificare.
        </p>
      </div>
    );
  }

  const textDeclaratie = `Subsemnatul/Subsemnata ${persoana || '[nume și prenume]'}, în calitate de ${CALITATI[calitate]} al firmei ${user?.cuiDenumireOficiala || user?.nume}, CUI ${user?.cui}, declar că reprezint această firmă și că am dreptul să folosesc contul ConstructBid ${user?.email} în numele ei.`;

  const copiaza = async () => {
    try { await navigator.clipboard.writeText(textDeclaratie); setCopiat(true); setTimeout(() => setCopiat(false), 2000); } catch { /* clipboard indisponibil */ }
  };

  const trimite = async (e) => {
    e.preventDefault();
    setEroare('');
    const fd = new FormData();
    fd.append('metoda', metoda);
    fd.append('persoana', persoana.trim());
    fd.append('calitate', calitate);
    fd.append('acord', String(acord));
    Object.entries(fisiere).forEach(([camp, f]) => { if (f) fd.append(camp, f); });
    setSeTrimite(true);
    try {
      const { utilizator } = await apiTrimiteIdentitate(fd);
      setUser(prev => ({ ...prev, ...utilizator }));
    } catch (err) {
      setEroare(err.message || 'Documentele nu au putut fi trimise.');
    } finally {
      setSeTrimite(false);
    }
  };

  const input = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13.5px', boxSizing: 'border-box' };
  const eticheta = { display: 'block', fontSize: '12px', fontWeight: '600', color: t.textSecundar, marginBottom: '5px' };
  const optiune = (activ) => ({
    flex: '1 1 220px', textAlign: 'left', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
    border: `1px solid ${activ ? t.accent : t.border}`, backgroundColor: activ ? t.accentSoft : t.bgInput, color: t.textPrincipal,
  });

  const campFisier = (camp, text, accept) => (
    <div>
      <label style={eticheta}>{text}</label>
      <label style={{ ...input, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: fisiere[camp] ? t.textPrincipal : t.textSecundar }}>
        <Upload size={14} /> {fisiere[camp]?.name || 'Alege fișierul'}
        <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => setFisiere(f => ({ ...f, [camp]: e.target.files?.[0] || null }))} />
      </label>
    </div>
  );

  return (
    <form onSubmit={trimite} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        {titlu(<BadgeCheck />, 'Confirmă identitatea firmei', t.accent)}
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: t.textSecundar, lineHeight: 1.6 }}>
          Verificarea ANAF arată doar că firma există. Ca să primești semnul „Identitate confirmată”, arată-ne că persoana
          care folosește contul reprezintă firma.
        </p>
      </div>

      {identitate.status === 'RESPINSA' && identitate.motivRespingere && (
        <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px', color: t.textPrincipal }}>
          <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>Cererea anterioară a fost respinsă: {identitate.motivRespingere}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setMetoda('semnatura')} style={optiune(metoda === 'semnatura')}>
          <div style={{ fontSize: '13.5px', fontWeight: '700' }}>Semnătură electronică (recomandat)</div>
          <div style={{ fontSize: '12px', color: t.textSecundar, marginTop: '2px' }}>O declarație PDF semnată electronic calificat.</div>
        </button>
        <button type="button" onClick={() => setMetoda('documente')} style={optiune(metoda === 'documente')}>
          <div style={{ fontSize: '13.5px', fontWeight: '700' }}>Certificat constatator</div>
          <div style={{ fontSize: '12px', color: t.textSecundar, marginTop: '2px' }}>Certificatul ONRC, din care reies administratorii.</div>
        </button>
      </div>

      <div className="cb-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={eticheta}>Numele persoanei care reprezintă firma</label>
          <input value={persoana} onChange={e => setPersoana(e.target.value)} placeholder="ex: Ion Popescu" required style={input} />
        </div>
        <div>
          <label style={eticheta}>Calitatea</label>
          <select value={calitate} onChange={e => setCalitate(e.target.value)} style={input}>
            <option value="administrator">Administrator</option>
            <option value="imputernicit">Împuternicit de administrator</option>
          </select>
        </div>
      </div>

      {metoda === 'semnatura' ? (
        <>
          <div style={{ fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.6 }}>
            Copiază textul de mai jos într-un document, salvează-l ca PDF și semnează-l cu semnătura electronică calificată
            {calitate === 'imputernicit' ? ' (a ta, ca împuternicit)' : ' a administratorului'}.
          </div>
          <div style={{ position: 'relative', padding: '12px 44px 12px 14px', borderRadius: '8px', backgroundColor: t.bgInput, border: `1px dashed ${t.borderStrong}`, fontSize: '13px', color: t.textPrincipal, lineHeight: 1.6 }}>
            {textDeclaratie}
            <button type="button" onClick={copiaza} title="Copiază textul" style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}>
              {copiat ? <Check size={16} color={t.success} /> : <Copy size={16} />}
            </button>
          </div>
          {campFisier('declaratie', 'Declarația semnată electronic (PDF)', 'application/pdf')}
        </>
      ) : (
        campFisier('certificat', 'Certificat constatator ONRC, emis în ultimele 30 de zile (PDF, JPG sau PNG)', 'application/pdf,image/jpeg,image/png')
      )}

      {calitate === 'imputernicit' && campFisier('imputernicire', 'Împuternicirea semnată de administrator (PDF, JPG sau PNG)', 'application/pdf,image/jpeg,image/png')}

      <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: t.bgInput, fontSize: '12px', color: t.textSecundar, lineHeight: 1.55 }}>
        <Lock size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          Documentele nu sunt publice: le văd doar firma ta și echipa ConstructBid, iar fiecare deschidere e înregistrată.
          Se șterg imediat după verificare; păstrăm doar rezultatul. Nu ne trimite copii după buletin.
        </span>
      </div>

      <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: t.textPrincipal, cursor: 'pointer' }}>
        <input type="checkbox" checked={acord} onChange={e => setAcord(e.target.checked)} style={{ marginTop: '3px' }} />
        Sunt de acord ca ConstructBid să prelucreze aceste documente doar pentru confirmarea identității firmei.
      </label>

      {eroare && <div style={{ fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> {eroare}</div>}

      <button type="submit" disabled={seTrimite || !acord} style={{ alignSelf: 'flex-start', padding: '11px 18px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: seTrimite || !acord ? 'default' : 'pointer', opacity: seTrimite || !acord ? 0.6 : 1 }}>
        {seTrimite ? 'Se trimite...' : 'Trimite spre verificare'}
      </button>
    </form>
  );
}
