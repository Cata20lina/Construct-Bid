import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Users, Flag, BarChart3, Loader, AlertCircle, Ban, CheckCircle2, Search,
  Pencil, Coins, FolderKanban, EyeOff, Eye, Trash2, X, Headset, MessageSquare, FolderOpen,
  PauseCircle, Package, ClipboardCheck, ShieldCheck, BadgeCheck, Download,
} from 'lucide-react';
import {
  apiAdminStatistici, apiAdminUtilizatori, apiAdminSuspendaUtilizator, apiAdminReactiveazaUtilizator,
  apiAdminReclamatii, apiAdminActualizeazaReclamatie,
  apiAdminActualizeazaUtilizator, apiAdminAjusteazaTokenuri,
  apiAdminProiecte, apiAdminDezactiveazaProiect, apiAdminActiveazaProiect, apiAdminStergeProiect,
  apiAdminSuspendaProiect, apiAdminAprobaProiect, apiAdminCereri, apiAdminSuspendaCerere, apiAdminAprobaCerere,
  apiAdminTrimiteMesaj, apiAdminContinutUtilizator, apiAdminStergeContinut, apiAdminStergeUtilizator,
  apiAdminDeVerificat, apiAdminVerificaCui,
  apiAdminIdentitati, apiAdminConfirmaIdentitate, apiAdminRespingeIdentitate, apiDescarcaDocumentIdentitate,
} from '../api.js';
import SuportAdmin from '../components/SuportAdmin.jsx';

const ROLURI = ['SUBCONTRACTOR', 'DEZVOLTATOR', 'FURNIZOR', 'ADMIN'];

const MOTIV_ETICHETA = {
  neplata: 'Neplată',
  lucrare_nelivrata: 'Lucrare nelivrată',
  calitate_necorespunzatoare: 'Calitate necorespunzătoare',
  comportament_abuziv: 'Comportament abuziv',
  informatii_false: 'Informații false',
  altul: 'Altul',
};

const STATUS_ETICHETA = {
  deschisa: 'Deschisă',
  in_lucru: 'În lucru',
  rezolvata: 'Rezolvată',
  respinsa: 'Respinsă',
};

function Card({ t, children, style }) {
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', boxShadow: `0 2px 10px ${t.shadow}`, ...style }}>
      {children}
    </div>
  );
}

function TabButon({ t, activ, onClick, icon, text }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px',
      border: 'none', backgroundColor: activ ? t.accentSoft : 'transparent', color: activ ? t.accent : t.textSecundar,
      fontSize: '13.5px', fontWeight: '700', cursor: 'pointer',
    }}>
      {icon} {text}
    </button>
  );
}

// ─── Modal editare utilizator (date + rol) ──────────────────────────────
function ModalEditareUtilizator({ t, utilizator, onClose, onSalvat }) {
  const [nume, setNume] = useState(utilizator.nume);
  const [cui, setCui] = useState(utilizator.cui);
  const [telefon, setTelefon] = useState(utilizator.telefon);
  const [judet, setJudet] = useState(utilizator.judet);
  const [rol, setRol] = useState(utilizator.rol);
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [eroare, setEroare] = useState('');

  const salveaza = async (e) => {
    e.preventDefault();
    setSeSalveaza(true);
    setEroare('');
    try {
      await apiAdminActualizeazaUtilizator(utilizator._id, { nume, cui, telefon, judet, rol });
      onSalvat();
    } catch (err) {
      setEroare(err.message || 'Nu am putut salva modificările.');
    } finally {
      setSeSalveaza(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, maxWidth: '440px', width: '100%', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800', color: t.textPrincipal }}>
            <Pencil size={16} /> Editează utilizator
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <form onSubmit={salveaza} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {eroare && <div style={{ fontSize: '12.5px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={13} /> {eroare}</div>}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', textTransform: 'uppercase' }}>Denumire firmă</label>
            <input value={nume} onChange={e => setNume(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div className="cb-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', textTransform: 'uppercase' }}>CUI</label>
              <input value={cui} onChange={e => setCui(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', textTransform: 'uppercase' }}>Telefon</label>
              <input value={telefon} onChange={e => setTelefon(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', textTransform: 'uppercase' }}>Județ</label>
            <input value={judet} onChange={e => setJudet(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', textTransform: 'uppercase' }}>Rol</label>
            <select value={rol} onChange={e => setRol(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box' }}>
              {ROLURI.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={seSalveaza} style={{ marginTop: '6px', padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontWeight: '700', fontSize: '13.5px', cursor: seSalveaza ? 'default' : 'pointer', opacity: seSalveaza ? 0.7 : 1 }}>
            {seSalveaza ? 'Se salvează...' : 'Salvează modificările'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Status pentru proiecte/cereri: suspendarea de către admin are prioritate.
function StatusModerare({ t, element, textActiv, culoareActiv }) {
  if (!element.suspendat) return <span style={{ color: culoareActiv, fontWeight: '700' }}>{textActiv}</span>;
  return (
    <div>
      <span style={{ color: t.amber, fontWeight: '700' }}>{element.modificariTrimiseLa ? 'Modificări trimise' : 'Suspendat'}</span>
      <div title={element.motivSuspendare} style={{ fontSize: '11.5px', color: t.textSecundar, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {element.motivSuspendare}
      </div>
    </div>
  );
}

function ButonSuspendare({ t, element, ocupat, onSuspenda, onAproba }) {
  if (element.suspendat) {
    return (
      <button onClick={onAproba} disabled={ocupat} title="Aprobă modificările și reactivează" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
        <CheckCircle2 size={13} /> Aprobă
      </button>
    );
  }
  return (
    <button onClick={onSuspenda} disabled={ocupat} title="Suspendă până la modificări" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.amber, cursor: 'pointer' }}>
      <PauseCircle size={13} />
    </button>
  );
}

// ─── Modal cu un câmp de text (mesaj către firmă / motivul suspendării) ────
function ModalText({ t, titlu, descriere, eticheta, textButon, onClose, onTrimite }) {
  const [text, setText] = useState('');
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');

  const trimite = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setEroare('Scrie un mesaj.'); return; }
    setSeTrimite(true);
    setEroare('');
    try {
      await onTrimite(text.trim());
      onClose();
    } catch (err) {
      setEroare(err.message || 'Nu am putut trimite.');
      setSeTrimite(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, maxWidth: '500px', width: '100%', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: t.textPrincipal }}>{titlu}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {descriere && <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.5 }}>{descriere}</p>}
        <form onSubmit={trimite} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {eroare && <div style={{ fontSize: '12.5px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={13} /> {eroare}</div>}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase' }}>{eticheta}</label>
          <textarea
            autoFocus value={text} onChange={e => setText(e.target.value)} rows={5}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <button type="submit" disabled={seTrimite} style={{ padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontWeight: '700', fontSize: '13.5px', cursor: seTrimite ? 'default' : 'pointer', opacity: seTrimite ? 0.7 : 1 }}>
            {seTrimite ? 'Se trimite...' : textButon}
          </button>
        </form>
      </div>
    </div>
  );
}

const TIP_CONTINUT = {
  proiect: 'Proiect',
  oferta: 'Ofertă',
  cerere: 'Cerere materiale',
  'oferta-materiale': 'Ofertă materiale',
  lucrare: 'Catalog / portofoliu',
  recomandare: 'Recomandare',
  evaluare: 'Evaluare',
  clarificare: 'Întrebare',
  comanda: 'Comandă catalog',
};

// ─── Modal cu tot ce a publicat un utilizator, cu ștergere pe element ────
function ModalContinut({ t, utilizator, onClose }) {
  const [elemente, setElemente] = useState(null);
  const [eroare, setEroare] = useState('');
  const [seSterge, setSeSterge] = useState('');

  const incarca = useCallback(() => {
    apiAdminContinutUtilizator(utilizator._id).then(setElemente).catch(err => setEroare(err.message));
  }, [utilizator._id]);

  useEffect(() => { incarca(); }, [incarca]);

  const sterge = async (el) => {
    if (!window.confirm(`Ștergi definitiv: ${TIP_CONTINUT[el.tip]} „${el.titlu}”? Nu se poate anula.`)) return;
    setSeSterge(el._id);
    try { await apiAdminStergeContinut(el.tip, el._id); incarca(); }
    catch (err) { setEroare(err.message); }
    finally { setSeSterge(''); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, maxWidth: '680px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: t.textPrincipal }}>Conținut publicat de {utilizator.nume}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 20px 16px' }}>
          {eroare && <div style={{ fontSize: '12.5px', color: '#f87171', padding: '8px 0' }}>{eroare}</div>}
          {elemente === null && !eroare && <div style={{ padding: '20px 0', color: t.textSecundar, fontSize: '13px' }}>Se încarcă...</div>}
          {elemente?.length === 0 && <div style={{ padding: '20px 0', color: t.textSecundar, fontSize: '13px' }}>Utilizatorul n-a publicat nimic.</div>}
          {elemente?.map(el => (
            <div key={`${el.tip}-${el._id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: t.textSecundar, textTransform: 'uppercase', fontWeight: '700' }}>{TIP_CONTINUT[el.tip] || el.tip}</div>
                <div style={{ fontSize: '13px', color: t.textPrincipal, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.titlu}</div>
                {el.detalii && <div style={{ fontSize: '12px', color: t.textSecundar, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.detalii}</div>}
              </div>
              <button onClick={() => sterge(el)} disabled={seSterge === el._id} title="Șterge definitiv" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminView({ t, tabInitial = 'statistici' }) {
  const [tab, setTab] = useState(tabInitial);
  const [deVerificat, setDeVerificat] = useState([]);
  const [identitati, setIdentitati] = useState([]);
  const [statistici, setStatistici] = useState(null);
  const [utilizatori, setUtilizatori] = useState([]);
  const [cauta, setCauta] = useState('');
  const [reclamatii, setReclamatii] = useState([]);
  const [filtruStatus, setFiltruStatus] = useState('');
  const [proiecte, setProiecte] = useState([]);
  const [cautaProiecte, setCautaProiecte] = useState('');
  const [filtruProiectActiv, setFiltruProiectActiv] = useState('');
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');
  const [info, setInfo] = useState('');
  const [actiuneInCurs, setActiuneInCurs] = useState('');
  const [utilizatorEditat, setUtilizatorEditat] = useState(null);
  const [utilizatorContinut, setUtilizatorContinut] = useState(null);
  const [modalText, setModalText] = useState(null);
  const [cereri, setCereri] = useState([]);
  const [cautaCereri, setCautaCereri] = useState('');
  const [filtruCereriSuspendate, setFiltruCereriSuspendate] = useState('');

  const incarcaStatistici = useCallback(() => {
    apiAdminStatistici().then(setStatistici).catch(err => setEroare(err.message));
  }, []);

  const incarcaUtilizatori = useCallback(() => {
    setLoading(true);
    apiAdminUtilizatori(cauta ? { cauta } : {})
      .then(setUtilizatori)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, [cauta]);

  const incarcaReclamatii = useCallback(() => {
    setLoading(true);
    apiAdminReclamatii(filtruStatus)
      .then(setReclamatii)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, [filtruStatus]);

  const incarcaProiecte = useCallback(() => {
    setLoading(true);
    const filtre = {};
    if (cautaProiecte) filtre.cauta = cautaProiecte;
    if (filtruProiectActiv === 'suspendat') filtre.suspendat = 'true';
    else if (filtruProiectActiv) filtre.activ = filtruProiectActiv;
    apiAdminProiecte(filtre)
      .then(setProiecte)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, [cautaProiecte, filtruProiectActiv]);

  const incarcaCereri = useCallback(() => {
    setLoading(true);
    const filtre = {};
    if (cautaCereri) filtre.cauta = cautaCereri;
    if (filtruCereriSuspendate) filtre.suspendat = 'true';
    apiAdminCereri(filtre)
      .then(setCereri)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, [cautaCereri, filtruCereriSuspendate]);

  const incarcaDeVerificat = useCallback(() => {
    setLoading(true);
    apiAdminDeVerificat()
      .then(setDeVerificat)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, []);

  const incarcaIdentitati = useCallback(() => {
    setLoading(true);
    apiAdminIdentitati()
      .then(setIdentitati)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, []);

  const confirmaIdentitate = async (u) => {
    setActiuneInCurs(u._id);
    try { await apiAdminConfirmaIdentitate(u._id); setInfo(`${u.nume}: identitate confirmată. Documentele au fost șterse.`); incarcaIdentitati(); }
    catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  const respingeIdentitate = (u) => setModalText({
    titlu: `Respinge confirmarea pentru „${u.nume}”`,
    descriere: 'Firma primește motivul și poate trimite din nou documentele. Documentele actuale se șterg.',
    eticheta: 'Motivul respingerii',
    textButon: 'Respinge',
    onTrimite: async (motiv) => { await apiAdminRespingeIdentitate(u._id, motiv); incarcaIdentitati(); },
  });

  const descarca = async (d) => {
    try { await apiDescarcaDocumentIdentitate(d._id, d.numeOriginal); }
    catch (err) { setEroare(err.message); }
  };

  // După o acțiune de moderare, reîncarcă lista din tab-ul curent
  const reincarcaModerare = (tip) => {
    if (tab === 'verificare') incarcaDeVerificat();
    else if (tip === 'proiect') incarcaProiecte();
    else incarcaCereri();
  };

  useEffect(() => {
    setEroare('');
    if (tab === 'statistici') { incarcaStatistici(); setLoading(false); }
    else if (tab === 'utilizatori') incarcaUtilizatori();
    else if (tab === 'reclamatii') incarcaReclamatii();
    else if (tab === 'proiecte') incarcaProiecte();
    else if (tab === 'cereri') incarcaCereri();
    else if (tab === 'verificare') incarcaDeVerificat();
    else if (tab === 'identitati') incarcaIdentitati();
    else if (tab === 'suport') setLoading(false); // SuportAdmin își încarcă singur datele
  }, [tab, incarcaStatistici, incarcaUtilizatori, incarcaReclamatii, incarcaProiecte, incarcaCereri, incarcaDeVerificat, incarcaIdentitati]);

  // Suspendarea contului blochează login-ul și ascunde tot ce a publicat firma.
  // Firma e deconectată pe loc și vede motivul pe pagina de login.
  const suspenda = (u) => setModalText({
    titlu: `Suspendă contul „${u.nume}”`,
    descriere: 'Firma e deconectată imediat și nu se mai poate conecta. Anunțurile, cererile și produsele ei dispar din liste până o reactivezi. Motivul îl vede pe pagina de login.',
    eticheta: 'Motivul suspendării',
    textButon: 'Suspendă contul',
    onTrimite: async (motiv) => {
      await apiAdminSuspendaUtilizator(u._id, motiv);
      incarcaUtilizatori();
    },
  });

  const reactiveaza = async (id) => {
    setActiuneInCurs(id);
    try {
      await apiAdminReactiveazaUtilizator(id);
      incarcaUtilizatori();
    } catch (err) {
      setEroare(err.message);
    } finally {
      setActiuneInCurs('');
    }
  };

  const actualizeazaReclamatie = async (id, payload) => {
    setActiuneInCurs(id);
    try {
      await apiAdminActualizeazaReclamatie(id, payload);
      incarcaReclamatii();
    } catch (err) {
      setEroare(err.message);
    } finally {
      setActiuneInCurs('');
    }
  };

  const ajusteazaTokenuri = async (u) => {
    const sumaStr = window.prompt(`Ajustare tokenuri pentru ${u.nume} (are ${u.tokenuri}).\nIntrodu o sumă pozitivă (bonus) sau negativă (retragere):`);
    if (sumaStr === null || sumaStr.trim() === '') return;
    const suma = Number(sumaStr);
    if (!Number.isFinite(suma) || suma === 0) { setEroare('Sumă invalidă.'); return; }
    const motiv = window.prompt('Motivul ajustării (opțional):') || '';
    setActiuneInCurs(u._id);
    try {
      await apiAdminAjusteazaTokenuri(u._id, suma, motiv);
      incarcaUtilizatori();
    } catch (err) {
      setEroare(err.message);
    } finally {
      setActiuneInCurs('');
    }
  };

  const dezactiveazaProiect = async (id) => {
    setActiuneInCurs(id);
    try { await apiAdminDezactiveazaProiect(id); incarcaProiecte(); }
    catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  const activeazaProiect = async (id) => {
    setActiuneInCurs(id);
    try { await apiAdminActiveazaProiect(id); incarcaProiecte(); }
    catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  const verificaCui = async (u) => {
    setActiuneInCurs(u._id);
    setEroare('');
    setInfo('');
    try {
      const r = await apiAdminVerificaCui(u._id);
      const stare = r.radiata ? 'RADIATĂ' : r.stareInactiv ? 'INACTIVĂ fiscal' : 'activă';
      setInfo(`${u.nume}: ANAF a găsit „${r.denumire}” (${r.judet || r.adresa}), firmă ${stare}${r.platitorTva ? ', plătitoare de TVA' : ''}.${r.bilant?.gasit ? ` Bilanț ${r.bilant.an} preluat.` : ''}`);
      incarcaUtilizatori();
    } catch (err) {
      setEroare(`${u.nume}: ${err.message}`);
    } finally {
      setActiuneInCurs('');
    }
  };

  const trimiteMesaj = (destinatar) => setModalText({
    titlu: `Mesaj către ${destinatar.nume}`,
    descriere: 'Ajunge în chat-ul de suport al firmei, ca notificare și pe email.',
    eticheta: 'Mesaj',
    textButon: 'Trimite mesajul',
    onTrimite: (text) => apiAdminTrimiteMesaj(destinatar._id, text),
  });

  const suspendaPentruModificari = (tip, element) => setModalText({
    titlu: `Suspendă „${element.titlu}”`,
    descriere: `${tip === 'proiect' ? 'Anunțul' : 'Cererea'} dispare din liste și nu mai primește oferte. Firma primește mesajul de mai jos, face modificările și ți le trimite spre verificare.`,
    eticheta: 'Ce trebuie modificat',
    textButon: 'Suspendă și trimite mesajul',
    onTrimite: async (motiv) => {
      if (tip === 'proiect') await apiAdminSuspendaProiect(element._id, motiv);
      else await apiAdminSuspendaCerere(element._id, motiv);
      reincarcaModerare(tip);
    },
  });

  const aproba = async (tip, id) => {
    setActiuneInCurs(id);
    try {
      if (tip === 'proiect') await apiAdminAprobaProiect(id);
      else await apiAdminAprobaCerere(id);
      reincarcaModerare(tip);
    } catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  const stergeCerere = async (c) => {
    if (!window.confirm(`Ștergi definitiv cererea „${c.titlu}”? Se șterg și ofertele furnizorilor. Nu se poate anula.`)) return;
    setActiuneInCurs(c._id);
    try { await apiAdminStergeContinut('cerere', c._id); reincarcaModerare('cerere'); }
    catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  const stergeUtilizator = async (u) => {
    if (!window.confirm(`Ștergi definitiv contul „${u.nume}” (${u.email})?

Se șterg și toate proiectele, ofertele, cererile și produsele lui. Nu se poate anula.`)) return;
    if (window.prompt(`Ca să confirmi, scrie numele firmei: ${u.nume}`) !== u.nume) return;
    setActiuneInCurs(u._id);
    try { await apiAdminStergeUtilizator(u._id); incarcaUtilizatori(); }
    catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  const stergeProiect = async (id, titlu) => {
    if (!window.confirm(`Ștergi definitiv proiectul „${titlu}”? Se șterg și toate ofertele/mesajele legate de el. Nu se poate anula.`)) return;
    setActiuneInCurs(id);
    try { await apiAdminStergeProiect(id); reincarcaModerare('proiect'); }
    catch (err) { setEroare(err.message); }
    finally { setActiuneInCurs(''); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      <div>
        <span style={{ color: t.amber, fontSize: '13px', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Panou Administrare</span>
        <h2 style={{ fontSize: '26px', fontWeight: '850', margin: '6px 0 0 0', color: t.textPrincipal, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={24} /> Administrare platformă
        </h2>
      </div>

      <div className="cb-tabs" style={{ display: 'flex', gap: '6px', borderBottom: `1px solid ${t.border}`, paddingBottom: '4px' }}>
        <TabButon t={t} activ={tab === 'statistici'} onClick={() => setTab('statistici')} icon={<BarChart3 size={15} />} text="Statistici" />
        <TabButon t={t} activ={tab === 'verificare'} onClick={() => setTab('verificare')} icon={<ClipboardCheck size={15} />} text="De verificat" />
        <TabButon t={t} activ={tab === 'identitati'} onClick={() => setTab('identitati')} icon={<BadgeCheck size={15} />} text="Identități" />
        <TabButon t={t} activ={tab === 'utilizatori'} onClick={() => setTab('utilizatori')} icon={<Users size={15} />} text="Utilizatori" />
        <TabButon t={t} activ={tab === 'proiecte'} onClick={() => setTab('proiecte')} icon={<FolderKanban size={15} />} text="Proiecte" />
        <TabButon t={t} activ={tab === 'cereri'} onClick={() => setTab('cereri')} icon={<Package size={15} />} text="Cereri materiale" />
        <TabButon t={t} activ={tab === 'reclamatii'} onClick={() => setTab('reclamatii')} icon={<Flag size={15} />} text="Reclamații" />
        <TabButon t={t} activ={tab === 'suport'} onClick={() => setTab('suport')} icon={<Headset size={15} />} text="Suport" />
      </div>

      {info && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: t.accentSoft, border: `1px solid ${t.border}`, color: t.textPrincipal, fontSize: '13.5px' }}>
          <ShieldCheck size={16} color={t.accent} style={{ flexShrink: 0 }} /> <span style={{ flex: 1 }}>{info}</span>
          <button onClick={() => setInfo('')} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}><X size={15} /></button>
        </div>
      )}

      {eroare && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13.5px' }}>
          <AlertCircle size={16} /> {eroare}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: t.textSecundar, gap: '10px' }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Se încarcă...
          <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
        </div>
      )}

      {!loading && tab === 'statistici' && statistici && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '16px' }}>
          {[
            ['Utilizatori', statistici.utilizatori],
            ['Proiecte', statistici.proiecte],
            ['Oferte', statistici.oferte],
            ['Reclamații deschise', statistici.reclamatiiDeschise],
            ['Anunțuri suspendate', statistici.suspendate ?? 0],
            ['Modificări de verificat', statistici.deVerificat ?? 0],
          ].map(([label, val]) => (
            <Card key={label} t={t} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: t.textSecundar, fontWeight: '700', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontFamily: t.fontMono, fontSize: '28px', fontWeight: '850', color: t.textPrincipal, marginTop: '6px' }}>{val}</div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'utilizatori' && (
        <Card t={t} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textSecundar }} />
              <input
                value={cauta} onChange={e => setCauta(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && incarcaUtilizatori()}
                placeholder="Caută după nume, email sau CUI..."
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <button onClick={incarcaUtilizatori} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Caută</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgInput }}>
                  {['Firmă', 'Email', 'Rol', 'CUI (ANAF)', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: t.textSecundar, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utilizatori.map(u => (
                  <tr key={u._id} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td style={{ padding: '10px 14px', color: t.textPrincipal, fontWeight: '600' }}>{u.nume}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{u.email}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{u.rol}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: t.textPrincipal, fontFamily: t.fontMono, fontSize: '12.5px' }}>{u.cui || '—'}</span>
                        <button onClick={() => verificaCui(u)} disabled={actiuneInCurs === u._id} title="Verifică la ANAF" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 6px', borderRadius: '6px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.accent, cursor: 'pointer', opacity: actiuneInCurs === u._id ? 0.5 : 1 }}>
                          <ShieldCheck size={12} />
                        </button>
                      </div>
                      <div title={u.cuiDenumireOficiala} style={{ fontSize: '11.5px', color: u.cuiVerificat ? t.success : t.textSecundar, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.cuiVerificat ? `Verificat · ${u.cuiDenumireOficiala}` : 'Neverificat'}
                      </div>
                      {u.identitateStatus && u.identitateStatus !== 'NECONFIRMATA' && (
                        <div style={{ fontSize: '11.5px', color: u.identitateStatus === 'CONFIRMATA' ? t.success : u.identitateStatus === 'RESPINSA' ? '#ef4444' : t.amber }}>
                          {{ CONFIRMATA: 'Identitate confirmată', IN_VERIFICARE: 'Identitate în verificare', RESPINSA: 'Identitate respinsă' }[u.identitateStatus]}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {u.suspendat
                        ? <span style={{ color: '#ef4444', fontWeight: '700' }}>Suspendat</span>
                        : <span style={{ color: t.success, fontWeight: '700' }}>Activ</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button onClick={() => setUtilizatorEditat(u)} title="Editează date/rol" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textSecundar, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => trimiteMesaj(u)} title="Trimite mesaj" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.accent, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          <MessageSquare size={13} />
                        </button>
                        <button onClick={() => setUtilizatorContinut(u)} title="Vezi și șterge conținutul publicat" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textSecundar, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          <FolderOpen size={13} />
                        </button>
                        <button onClick={() => ajusteazaTokenuri(u)} disabled={actiuneInCurs === u._id} title="Ajustează tokenuri" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.amber, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          <Coins size={13} />
                        </button>
                        {u.suspendat ? (
                          <button onClick={() => reactiveaza(u._id)} disabled={actiuneInCurs === u._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            <CheckCircle2 size={13} /> Reactivează
                          </button>
                        ) : (
                          <button onClick={() => suspenda(u)} disabled={actiuneInCurs === u._id || u.rol === 'ADMIN'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: u.rol === 'ADMIN' ? 'default' : 'pointer', opacity: u.rol === 'ADMIN' ? 0.4 : 1 }}>
                            <Ban size={13} /> Suspendă
                          </button>
                        )}
                        <button onClick={() => stergeUtilizator(u)} disabled={actiuneInCurs === u._id || u.rol === 'ADMIN'} title="Șterge contul definitiv" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: u.rol === 'ADMIN' ? 'default' : 'pointer', opacity: u.rol === 'ADMIN' ? 0.4 : 1 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {utilizatori.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: t.textSecundar }}>Niciun utilizator găsit.</div>}
          </div>
        </Card>
      )}

      {!loading && tab === 'proiecte' && (
        <Card t={t} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textSecundar }} />
              <input
                value={cautaProiecte} onChange={e => setCautaProiecte(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && incarcaProiecte()}
                placeholder="Caută după titlu sau locație..."
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <select value={filtruProiectActiv} onChange={e => setFiltruProiectActiv(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px' }}>
              <option value="">Toate</option>
              <option value="true">Active</option>
              <option value="false">Dezactivate</option>
              <option value="suspendat">Suspendate</option>
            </select>
            <button onClick={incarcaProiecte} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Caută</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgInput }}>
                  {['Titlu', 'Dezvoltator', 'Locație', 'Oferte', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: t.textSecundar, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proiecte.map(p => (
                  <tr key={p._id} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td style={{ padding: '10px 14px', color: t.textPrincipal, fontWeight: '600', maxWidth: '260px' }}>{p.titlu}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{p.dezvoltator?.nume || '—'}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{p.locatie}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{p.oferte ?? 0}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusModerare t={t} element={p} textActiv={p.activ ? 'Activ' : 'Dezactivat'} culoareActiv={p.activ ? t.success : '#ef4444'} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {p.dezvoltator?._id && (
                          <button onClick={() => trimiteMesaj(p.dezvoltator)} title="Mesaj către dezvoltator" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.accent, cursor: 'pointer' }}>
                            <MessageSquare size={13} />
                          </button>
                        )}
                        <ButonSuspendare t={t} element={p} ocupat={actiuneInCurs === p._id} onSuspenda={() => suspendaPentruModificari('proiect', p)} onAproba={() => aproba('proiect', p._id)} />
                        {p.activ ? (
                          <button onClick={() => dezactiveazaProiect(p._id)} disabled={actiuneInCurs === p._id} title="Ascunde din listele publice" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textSecundar, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            <EyeOff size={13} />
                          </button>
                        ) : (
                          <button onClick={() => activeazaProiect(p._id)} disabled={actiuneInCurs === p._id} title="Reactivează" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            <Eye size={13} />
                          </button>
                        )}
                        <button onClick={() => stergeProiect(p._id, p.titlu)} disabled={actiuneInCurs === p._id} title="Șterge definitiv" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proiecte.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: t.textSecundar }}>Niciun proiect găsit.</div>}
          </div>
        </Card>
      )}

      {!loading && tab === 'verificare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {deVerificat.length === 0 && (
            <Card t={t} style={{ textAlign: 'center', color: t.textSecundar }}>Nu e nimic suspendat sau de verificat.</Card>
          )}
          {deVerificat.map(el => (
            <Card key={`${el.tip}-${el._id}`} t={t} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: t.textSecundar, fontWeight: '700', textTransform: 'uppercase' }}>
                    {el.tip === 'proiect' ? 'Proiect' : 'Cerere de materiale'} · {el.autor?.nume || '—'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: t.textPrincipal, marginTop: '2px' }}>{el.titlu}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', backgroundColor: el.modificariTrimiseLa ? t.accentSoft : t.amberSoft, color: el.modificariTrimiseLa ? t.accent : t.amber }}>
                  {el.modificariTrimiseLa
                    ? `Modificări trimise ${new Date(el.modificariTrimiseLa).toLocaleString('ro-RO')}`
                    : 'Așteaptă corectura firmei'}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: t.textSecundar }}>
                <b style={{ color: t.textPrincipal }}>Ce ai cerut:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{el.motivSuspendare}</span>
              </div>

              <div style={{ backgroundColor: t.bgInput, borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: t.textPrincipal, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: t.textSecundar, fontWeight: '700', textTransform: 'uppercase' }}>Conținutul actual</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{el.descriere || <i style={{ color: t.textSecundar }}>Fără descriere</i>}</div>
                {el.tip === 'proiect' ? (
                  <div style={{ color: t.textSecundar }}>Buget: {el.buget || '—'} · Locație: {el.locatie || '—'} · Oferte: {el.oferte ?? 0}</div>
                ) : (
                  <>
                    <div style={{ color: t.textSecundar }}>{el.oras ? `${el.oras}, ` : ''}{el.judet}</div>
                    {el.articole?.length > 0 && (
                      <div style={{ color: t.textSecundar }}>
                        Articole: {el.articole.map(a => `${a.denumire} (${a.cantitate} ${a.unitateMasura})`).join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => aproba(el.tip, el._id)} disabled={actiuneInCurs === el._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: t.success, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <CheckCircle2 size={14} /> Aprobă și reactivează
                </button>
                <button onClick={() => suspendaPentruModificari(el.tip, el)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.amber, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <PauseCircle size={14} /> Cere alte modificări
                </button>
                {el.autor?._id && (
                  <button onClick={() => trimiteMesaj(el.autor)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.accent, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    <MessageSquare size={14} /> Mesaj
                  </button>
                )}
                <button
                  onClick={() => (el.tip === 'proiect' ? stergeProiect(el._id, el.titlu) : stergeCerere(el))}
                  disabled={actiuneInCurs === el._id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  <Trash2 size={14} /> Șterge
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'identitati' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card t={t} style={{ fontSize: '13px', color: t.textSecundar, lineHeight: 1.6 }}>
            Verifică pentru fiecare firmă că persoana apare ca administrator în certificatul constatator, sau că semnătura
            electronică din PDF e validă și aparține unui administrator (deschide PDF-ul în Adobe Reader → panoul Semnături).
            Pentru împuterniciți, verifică și împuternicirea. Documentele se șterg automat după decizie.
          </Card>
          {identitati.length === 0 && (
            <Card t={t} style={{ textAlign: 'center', color: t.textSecundar }}>Nicio cerere de confirmare în așteptare.</Card>
          )}
          {identitati.map(u => (
            <Card key={u._id} t={t} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: t.textPrincipal }}>{u.nume}</div>
                  <div style={{ fontSize: '12.5px', color: t.textSecundar }}>
                    CUI {u.cui} · {u.email} · {u.rol}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: t.textSecundar }}>
                  Trimis {u.identitateTrimisaLa ? new Date(u.identitateTrimisaLa).toLocaleString('ro-RO') : ''}
                </span>
              </div>
              <div style={{ fontSize: '13.5px', color: t.textPrincipal }}>
                <b>{u.identitatePersoana}</b>, {u.identitateCalitate === 'imputernicit' ? 'împuternicit de administrator' : 'administrator'}
                {' · '}{u.identitateMetoda === 'semnatura' ? 'declarație cu semnătură electronică' : 'certificat constatator'}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {u.documente.map(d => (
                  <button key={d._id} onClick={() => descarca(d)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '12.5px', cursor: 'pointer' }}>
                    <Download size={13} />
                    {{ declaratie_semnata: 'Declarație semnată', certificat_constatator: 'Certificat constatator', imputernicire: 'Împuternicire' }[d.tip] || d.tip}
                    <span style={{ color: t.textSecundar }}>({Math.max(1, Math.round(d.marime / 1024))} KB)</span>
                  </button>
                ))}
                {u.documente.length === 0 && <span style={{ fontSize: '12.5px', color: t.textSecundar }}>Fișierele nu mai există pe server.</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => confirmaIdentitate(u)} disabled={actiuneInCurs === u._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: t.success, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <CheckCircle2 size={14} /> Confirmă identitatea
                </button>
                <button onClick={() => respingeIdentitate(u)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <X size={14} /> Respinge
                </button>
                <button onClick={() => trimiteMesaj(u)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.accent, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <MessageSquare size={14} /> Mesaj
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'cereri' && (
        <Card t={t} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textSecundar }} />
              <input
                value={cautaCereri} onChange={e => setCautaCereri(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && incarcaCereri()}
                placeholder="Caută după titlu sau descriere..."
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <select value={filtruCereriSuspendate} onChange={e => setFiltruCereriSuspendate(e.target.value)} style={{ padding: '9px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px' }}>
              <option value="">Toate</option>
              <option value="true">Suspendate</option>
            </select>
            <button onClick={incarcaCereri} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: t.accent, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Caută</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: t.bgInput }}>
                  {['Titlu', 'Creată de', 'Județ', 'Oferte', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: t.textSecundar, fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cereri.map(c => (
                  <tr key={c._id} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td style={{ padding: '10px 14px', color: t.textPrincipal, fontWeight: '600', maxWidth: '260px' }}>{c.titlu}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{c.creatDe?.nume || '—'}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{c.judet}</td>
                    <td style={{ padding: '10px 14px', color: t.textSecundar }}>{c.numarOferte ?? 0}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusModerare t={t} element={c} textActiv={c.status} culoareActiv={c.status === 'deschisa' ? t.success : t.textSecundar} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {c.creatDe?._id && (
                          <button onClick={() => trimiteMesaj(c.creatDe)} title="Mesaj către autor" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.accent, cursor: 'pointer' }}>
                            <MessageSquare size={13} />
                          </button>
                        )}
                        <ButonSuspendare t={t} element={c} ocupat={actiuneInCurs === c._id} onSuspenda={() => suspendaPentruModificari('cerere', c)} onAproba={() => aproba('cerere', c._id)} />
                        <button onClick={() => stergeCerere(c)} disabled={actiuneInCurs === c._id} title="Șterge definitiv" style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cereri.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: t.textSecundar }}>Nicio cerere găsită.</div>}
          </div>
        </Card>
      )}

      {!loading && tab === 'reclamatii' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['', 'deschisa', 'in_lucru', 'rezolvata', 'respinsa'].map(s => (
              <button key={s} onClick={() => setFiltruStatus(s)} style={{
                padding: '7px 14px', borderRadius: '20px', border: `1px solid ${t.border}`,
                backgroundColor: filtruStatus === s ? t.accentSoft : 'transparent',
                color: filtruStatus === s ? t.accent : t.textSecundar, fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
              }}>
                {s === '' ? 'Toate' : STATUS_ETICHETA[s]}
              </button>
            ))}
          </div>

          {reclamatii.length === 0 ? (
            <Card t={t} style={{ textAlign: 'center', color: t.textSecundar }}>Nicio reclamație {filtruStatus ? `cu statusul „${STATUS_ETICHETA[filtruStatus]}”` : ''}.</Card>
          ) : (
            reclamatii.map(r => (
              <Card key={r._id} t={t} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '750', color: t.textPrincipal }}>{MOTIV_ETICHETA[r.motiv] || r.motiv}</div>
                    <div style={{ fontSize: '12px', color: t.textSecundar, marginTop: '2px' }}>
                      Raportat de <b>{r.raportatDe?.nume || '—'}</b>
                      {r.raportatImpotriva && <> despre <b>{r.raportatImpotriva.nume}</b></>}
                      {' · '}{new Date(r.createdAt).toLocaleDateString('ro-RO')}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '750', padding: '4px 10px', borderRadius: '20px', backgroundColor: t.bgInput, color: t.textSecundar, textTransform: 'uppercase' }}>
                    {STATUS_ETICHETA[r.status]}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: t.textPrincipal, lineHeight: 1.6 }}>{r.descriere}</p>
                {r.raspunsAdmin && (
                  <div style={{ fontSize: '12.5px', color: t.textSecundar, fontStyle: 'italic', padding: '8px 12px', backgroundColor: t.bgInput, borderRadius: '8px' }}>
                    Răspuns admin: {r.raspunsAdmin}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['in_lucru', 'rezolvata', 'respinsa'].filter(s => s !== r.status).map(s => (
                    <button
                      key={s}
                      onClick={() => actualizeazaReclamatie(r._id, { status: s })}
                      disabled={actiuneInCurs === r._id}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Marchează {STATUS_ETICHETA[s].toLowerCase()}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const raspuns = window.prompt('Răspuns (opțional, vizibil în istoricul reclamației):', r.raspunsAdmin || '');
                      if (raspuns !== null) actualizeazaReclamatie(r._id, { raspunsAdmin: raspuns });
                    }}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: t.textSecundar, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Adaugă răspuns
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {!loading && tab === 'suport' && <SuportAdmin t={t} />}

      {utilizatorEditat && (
        <ModalEditareUtilizator
          t={t}
          utilizator={utilizatorEditat}
          onClose={() => setUtilizatorEditat(null)}
          onSalvat={() => { setUtilizatorEditat(null); incarcaUtilizatori(); }}
        />
      )}

      {utilizatorContinut && (
        <ModalContinut t={t} utilizator={utilizatorContinut} onClose={() => setUtilizatorContinut(null)} />
      )}

      {modalText && <ModalText t={t} {...modalText} onClose={() => setModalText(null)} />}
    </div>
  );
}