import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Users, Flag, BarChart3, Loader, AlertCircle, Ban, CheckCircle2, Search,
  Pencil, Coins, FolderKanban, EyeOff, Eye, Trash2, X, Headset,
} from 'lucide-react';
import {
  apiAdminStatistici, apiAdminUtilizatori, apiAdminSuspendaUtilizator, apiAdminReactiveazaUtilizator,
  apiAdminReclamatii, apiAdminActualizeazaReclamatie,
  apiAdminActualizeazaUtilizator, apiAdminAjusteazaTokenuri,
  apiAdminProiecte, apiAdminDezactiveazaProiect, apiAdminActiveazaProiect, apiAdminStergeProiect,
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

export default function AdminView({ t }) {
  const [tab, setTab] = useState('statistici');
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
  const [actiuneInCurs, setActiuneInCurs] = useState('');
  const [utilizatorEditat, setUtilizatorEditat] = useState(null);

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
    if (filtruProiectActiv) filtre.activ = filtruProiectActiv;
    apiAdminProiecte(filtre)
      .then(setProiecte)
      .catch(err => setEroare(err.message))
      .finally(() => setLoading(false));
  }, [cautaProiecte, filtruProiectActiv]);

  useEffect(() => {
    setEroare('');
    if (tab === 'statistici') { incarcaStatistici(); setLoading(false); }
    else if (tab === 'utilizatori') incarcaUtilizatori();
    else if (tab === 'reclamatii') incarcaReclamatii();
    else if (tab === 'proiecte') incarcaProiecte();
    else if (tab === 'suport') setLoading(false); // SuportAdmin își încarcă singur datele
  }, [tab, incarcaStatistici, incarcaUtilizatori, incarcaReclamatii, incarcaProiecte]);

  const suspenda = async (id) => {
    const motiv = window.prompt('Motivul suspendării (vizibil utilizatorului):');
    if (motiv === null) return;
    setActiuneInCurs(id);
    try {
      await apiAdminSuspendaUtilizator(id, motiv);
      incarcaUtilizatori();
    } catch (err) {
      setEroare(err.message);
    } finally {
      setActiuneInCurs('');
    }
  };

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

  const stergeProiect = async (id, titlu) => {
    if (!window.confirm(`Ștergi definitiv proiectul „${titlu}”? Se șterg și toate ofertele/mesajele legate de el. Nu se poate anula.`)) return;
    setActiuneInCurs(id);
    try { await apiAdminStergeProiect(id); incarcaProiecte(); }
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

      <div style={{ display: 'flex', gap: '6px', borderBottom: `1px solid ${t.border}`, paddingBottom: '4px' }}>
        <TabButon t={t} activ={tab === 'statistici'} onClick={() => setTab('statistici')} icon={<BarChart3 size={15} />} text="Statistici" />
        <TabButon t={t} activ={tab === 'utilizatori'} onClick={() => setTab('utilizatori')} icon={<Users size={15} />} text="Utilizatori" />
        <TabButon t={t} activ={tab === 'proiecte'} onClick={() => setTab('proiecte')} icon={<FolderKanban size={15} />} text="Proiecte" />
        <TabButon t={t} activ={tab === 'reclamatii'} onClick={() => setTab('reclamatii')} icon={<Flag size={15} />} text="Reclamații" />
        <TabButon t={t} activ={tab === 'suport'} onClick={() => setTab('suport')} icon={<Headset size={15} />} text="Suport" />
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          {[
            ['Utilizatori', statistici.utilizatori],
            ['Proiecte', statistici.proiecte],
            ['Oferte', statistici.oferte],
            ['Reclamații deschise', statistici.reclamatiiDeschise],
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
                  {['Firmă', 'Email', 'Rol', 'CUI verificat', 'Status', ''].map(h => (
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
                    <td style={{ padding: '10px 14px', color: u.cuiVerificat ? t.success : t.textSecundar }}>{u.cuiVerificat ? 'Da' : 'Nu'}</td>
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
                        <button onClick={() => ajusteazaTokenuri(u)} disabled={actiuneInCurs === u._id} title="Ajustează tokenuri" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.amber, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          <Coins size={13} />
                        </button>
                        {u.suspendat ? (
                          <button onClick={() => reactiveaza(u._id)} disabled={actiuneInCurs === u._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            <CheckCircle2 size={13} /> Reactivează
                          </button>
                        ) : (
                          <button onClick={() => suspenda(u._id)} disabled={actiuneInCurs === u._id || u.rol === 'ADMIN'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: u.rol === 'ADMIN' ? 'default' : 'pointer', opacity: u.rol === 'ADMIN' ? 0.4 : 1 }}>
                            <Ban size={13} /> Suspendă
                          </button>
                        )}
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
                      {p.activ
                        ? <span style={{ color: t.success, fontWeight: '700' }}>Activ</span>
                        : <span style={{ color: '#ef4444', fontWeight: '700' }}>Dezactivat</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
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
    </div>
  );
}