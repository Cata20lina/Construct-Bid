import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, ClipboardList, Send, ShoppingBag, Plus, X, ArrowLeft, MapPin,
  Clock, Loader2, CheckCircle2, Ban, Truck, Star, Building2, Mail, Phone,
  Hash, Search, Trash2, AlertCircle, ShoppingCart, Check, XCircle,
} from 'lucide-react';
import {
  apiCereriDeschise, apiCererileMele, apiOfertelemeleMateriale, apiCerereDetaliu,
  apiCreeazaCerere, apiAnuleazaCerere, apiTrimiteOfertaMateriale, apiRetrageOfertaMateriale,
  apiAccetaArticolCerere, apiContactFurnizorCerere, apiCatalog, apiListaProiecte,
  apiComandaCatalog, apiComenzileMeleCatalog, apiComenziPrimiteCatalog,
  apiConfirmaComandaCatalog, apiRefuzaComandaCatalog, apiAnuleazaComandaCatalog, apiContactComandaCatalog,
} from '../api.js';

const CATEGORII_CATALOG = ['Materiale de construcții', 'Instalații', 'Electrice', 'Finisaje', 'Echipamente'];
const UNITATI = ['buc', 'kg', 'to', 'mp', 'ml', 'mc', 'sac', 'palet', 'set', 'oră', 'zi'];

const STATUS_CFG = {
  deschisa: { label: 'Deschisă', color: '#2F6FED', bg: 'rgba(47,111,237,0.1)' },
  finalizata: { label: 'Finalizată', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  anulata: { label: 'Anulată', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  in_asteptare: { label: 'În Așteptare', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  confirmata: { label: 'Confirmată', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  refuzata: { label: 'Refuzată', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function StatusBadge({ status, t }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.deschisa;
  return (
    <span style={{ fontSize: '11px', fontWeight: '800', color: cfg.color, backgroundColor: cfg.bg, padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {cfg.label}
    </span>
  );
}

function SectionHeader({ icon, label, t }) {
  return (
    <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgInput, fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: t.textSecundar, display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon} {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HUB principal — Cereri de Materiale + Catalog. Rolul utilizatorului
// decide ce file văd: furnizorii navighează cereri deschise și văd
// ofertele lor; dezvoltatorii/subcontractorii creează cereri și le
// gestionează pe ale lor. Catalogul e comun tuturor.
// ═══════════════════════════════════════════════════════════════════════
export default function MaterialeView({ t, user }) {
  const esteFurnizor = user?.rol === 'FURNIZOR';
  const poateCreaCerere = user?.rol === 'DEZVOLTATOR' || user?.rol === 'SUBCONTRACTOR';

  const [subTab, setSubTab] = useState(esteFurnizor ? 'deschise' : 'mele');
  const [cerereSelectataId, setCerereSelectataId] = useState(null);
  const [modalCreare, setModalCreare] = useState(false);
  const [produsDeComandat, setProdusDeComandat] = useState(null);

  const tabs = [
    ...(esteFurnizor ? [{ id: 'deschise', label: 'Cereri Deschise', icon: <ClipboardList size={14} /> }] : []),
    ...(poateCreaCerere ? [{ id: 'mele', label: 'Cererile Mele', icon: <ClipboardList size={14} /> }] : []),
    ...(esteFurnizor ? [{ id: 'ofertele-mele', label: 'Ofertele Mele', icon: <Send size={14} /> }] : []),
    { id: 'catalog', label: 'Catalog Furnizori', icon: <ShoppingBag size={14} /> },
    ...(poateCreaCerere ? [{ id: 'comenzile-mele', label: 'Comenzile Mele', icon: <ShoppingCart size={14} /> }] : []),
    ...(esteFurnizor ? [{ id: 'comenzi-primite', label: 'Comenzi Primite', icon: <ShoppingCart size={14} /> }] : []),
  ];

  if (cerereSelectataId) {
    return (
      <CerereDetail
        t={t} user={user} cerereId={cerereSelectataId}
        onBack={() => setCerereSelectataId(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: t.fontDisplay, fontSize: '24px', fontWeight: '800', color: t.textPrincipal, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} color="#FF9E2C" /> Materiale & Echipamente
          </h1>
          <p style={{ color: t.textSecundar, fontSize: '13px', margin: '4px 0 0' }}>
            {esteFurnizor
              ? 'Licitează pe articole punctuale din cererile deschise, gestionează comenzile primite din catalog, sau răsfoiește catalogul altor furnizori.'
              : 'Cere oferte comparative de la mai mulți furnizori, sau comandă direct un produs din catalog la prețul afișat.'}
          </p>
        </div>
        {poateCreaCerere && (
          <button
            onClick={() => setModalCreare(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 18px', borderRadius: '10px', border: 'none', backgroundColor: '#FF9E2C', color: '#1a1206', fontWeight: '800', fontSize: '13.5px', cursor: 'pointer' }}
          >
            <Plus size={16} /> Cerere Nouă
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', borderBottom: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setSubTab(tb.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', border: 'none',
              background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
              color: subTab === tb.id ? '#FF9E2C' : t.textSecundar,
              borderBottom: subTab === tb.id ? '2px solid #FF9E2C' : '2px solid transparent',
            }}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {subTab === 'deschise' && esteFurnizor && <ListaCereri t={t} sursa="deschise" onSelect={setCerereSelectataId} />}
      {subTab === 'mele' && poateCreaCerere && <ListaCereri t={t} sursa="mele" onSelect={setCerereSelectataId} />}
      {subTab === 'ofertele-mele' && esteFurnizor && <ListaOferteleMele t={t} onSelect={setCerereSelectataId} />}
      {subTab === 'catalog' && (
        <CatalogGrid
          t={t}
          onComanda={poateCreaCerere ? (produs) => setProdusDeComandat(produs) : null}
        />
      )}
      {subTab === 'comenzile-mele' && poateCreaCerere && <ListaComenzi t={t} rol="cumparator" />}
      {subTab === 'comenzi-primite' && esteFurnizor && <ListaComenzi t={t} rol="furnizor" />}

      {modalCreare && (
        <ModalCreareCerere
          t={t} user={user}
          onClose={() => setModalCreare(false)}
          onCreata={(cerere) => { setModalCreare(false); setCerereSelectataId(cerere._id); setSubTab('mele'); }}
        />
      )}

      {produsDeComandat && (
        <ModalComandaCatalog
          t={t} produs={produsDeComandat}
          onClose={() => setProdusDeComandat(null)}
          onComandata={() => { setProdusDeComandat(null); setSubTab('comenzile-mele'); }}
        />
      )}
    </div>
  );
}

// ─── Listă cereri (deschise pentru furnizori / mele pentru creator) ────────
function ListaCereri({ t, sursa, onSelect }) {
  const [cereri, setCereri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');

  useEffect(() => {
    let activ = true;
    setLoading(true);
    const promisiune = sursa === 'deschise' ? apiCereriDeschise() : apiCererileMele();
    promisiune
      .then(data => { if (activ) setCereri(data || []); })
      .catch(err => { if (activ) setEroare(err.message || 'Nu am putut încărca cererile.'); })
      .finally(() => { if (activ) setLoading(false); });
    return () => { activ = false; };
  }, [sursa]);

  if (loading) return <CentruLoading t={t} />;
  if (eroare) return <MesajEroare t={t} text={eroare} />;
  if (cereri.length === 0) {
    return <EmptyState t={t} icon={<ClipboardList size={28} />} text={sursa === 'deschise' ? 'Nu există cereri deschise momentan.' : 'Nu ai creat nicio cerere de materiale încă.'} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {cereri.map(c => (
        <div
          key={c._id}
          onClick={() => onSelect(c._id)}
          style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '18px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', boxShadow: `0 2px 10px ${t.shadow}` }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: t.textPrincipal }}>{c.titlu}</h3>
              <StatusBadge status={c.status} t={t} />
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12.5px', color: t.textSecundar }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} /> {c.oras ? `${c.oras}, ` : ''}{c.judet}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Package size={12} /> {c.articole?.length || 0} articole</span>
              {typeof c.numarOferte === 'number' && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Send size={12} /> {c.numarOferte} oferte</span>}
              {c.proiect && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Building2 size={12} /> {c.proiect.titlu}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Ofertele mele (furnizor) ───────────────────────────────────────────────
function ListaOferteleMele({ t, onSelect }) {
  const [oferte, setOferte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');

  useEffect(() => {
    let activ = true;
    apiOfertelemeleMateriale()
      .then(data => { if (activ) setOferte(data || []); })
      .catch(err => { if (activ) setEroare(err.message || 'Nu am putut încărca ofertele tale.'); })
      .finally(() => { if (activ) setLoading(false); });
    return () => { activ = false; };
  }, []);

  if (loading) return <CentruLoading t={t} />;
  if (eroare) return <MesajEroare t={t} text={eroare} />;
  if (oferte.length === 0) return <EmptyState t={t} icon={<Send size={28} />} text="Nu ai depus nicio ofertă de materiale încă." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {oferte.map(o => {
        const nrCastigatoare = (o.articole || []).filter(a => a.acceptat).length;
        return (
          <div
            key={o._id}
            onClick={() => onSelect(o.cerere._id)}
            style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '18px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', boxShadow: `0 2px 10px ${t.shadow}` }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: t.textPrincipal }}>{o.cerere.titlu}</h3>
                <StatusBadge status={o.cerere.status} t={t} />
                {nrCastigatoare > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                    {nrCastigatoare} articol(e) câștigate
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12.5px', color: t.textSecundar, display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} /> {o.cerere.judet}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Truck size={12} /> Termen livrare oferit: {o.termenLivrare} zile</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Package size={12} /> {o.articole?.length || 0} articole ofertate</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Catalog public (produse cu preț, ale tuturor furnizorilor) ────────────
function CatalogGrid({ t, onComanda }) {
  const [produse, setProduse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');
  const [categorie, setCategorie] = useState('');
  const [cauta, setCauta] = useState('');

  const incarca = useCallback(() => {
    setLoading(true);
    const filtre = {};
    if (categorie) filtre.categorie = categorie;
    if (cauta.trim()) filtre.cauta = cauta.trim();
    apiCatalog(filtre)
      .then(data => setProduse(data || []))
      .catch(err => setEroare(err.message || 'Nu am putut încărca catalogul.'))
      .finally(() => setLoading(false));
  }, [categorie, cauta]);

  useEffect(() => {
    const timer = setTimeout(incarca, 300);
    return () => clearTimeout(timer);
  }, [incarca]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textSecundar }} />
          <input
            value={cauta} onChange={e => setCauta(e.target.value)}
            placeholder="Caută un produs (ex: ciment, gresie, macara)..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={categorie} onChange={e => setCategorie(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', outline: 'none' }}
        >
          <option value="">Toate categoriile</option>
          {CATEGORII_CATALOG.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <CentruLoading t={t} /> : eroare ? <MesajEroare t={t} text={eroare} /> : produse.length === 0 ? (
        <EmptyState t={t} icon={<ShoppingBag size={28} />} text="Niciun produs găsit în catalog." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {produse.map(p => (
            <div key={p._id} style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: `0 2px 10px ${t.shadow}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: t.textPrincipal, lineHeight: 1.3 }}>{p.titlu}</h4>
                {p.categorie && <span style={{ fontSize: '10px', fontWeight: '700', color: '#FF9E2C', backgroundColor: 'rgba(255,158,44,0.1)', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{p.categorie}</span>}
              </div>
              {p.descriere && <p style={{ margin: 0, fontSize: '12.5px', color: t.textSecundar, lineHeight: 1.5 }}>{p.descriere}</p>}
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#10b981', fontFamily: t.fontMono }}>
                {Number(p.pret).toLocaleString()} RON {p.unitateMasura && <span style={{ fontSize: '11px', color: t.textSecundar, fontWeight: '600' }}>/ {p.unitateMasura}</span>}
              </div>
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '8px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: t.textPrincipal, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={12} /> {p.furnizor?.nume || 'Furnizor'}
                  {p.furnizor?.cuiVerificat && <ShieldIcon />}
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11.5px', color: t.textSecundar }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} /> {p.furnizor?.judet}</span>
                  {p.furnizor?.ratingNumarEvaluari > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={11} fill="#f59e0b" color="#f59e0b" /> {p.furnizor.ratingMediu.toFixed(1)}</span>
                  )}
                </div>
              </div>
              {onComanda && (
                <button
                  onClick={() => onComanda(p)}
                  style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', borderRadius: '9px', border: 'none', backgroundColor: '#FF9E2C', color: '#1a1206', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer' }}
                >
                  <ShoppingCart size={13} /> Comandă la acest furnizor
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShieldIcon() {
  return <CheckCircle2 size={13} color="#10b981" title="CUI verificat" />;
}

// ─── Comenzi directe din catalog (listă comună — cumpărător sau furnizor) ──
function ListaComenzi({ t, rol }) {
  const [comenzi, setComenzi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');
  const [contacte, setContacte] = useState({}); // { comandaId: { cumparator, furnizor } }
  const esteFurnizor = rol === 'furnizor';

  const incarca = useCallback(() => {
    setLoading(true);
    const promisiune = esteFurnizor ? apiComenziPrimiteCatalog() : apiComenzileMeleCatalog();
    promisiune
      .then(data => setComenzi(data || []))
      .catch(err => setEroare(err.message || 'Nu am putut încărca comenzile.'))
      .finally(() => setLoading(false));
  }, [esteFurnizor]);

  useEffect(() => { incarca(); }, [incarca]);

  const confirma = async (id) => {
    try { await apiConfirmaComandaCatalog(id); incarca(); }
    catch (err) { alert(err.message || 'Nu am putut confirma comanda.'); }
  };
  const refuza = async (id) => {
    const motiv = window.prompt('Motiv refuz (opțional):') || '';
    try { await apiRefuzaComandaCatalog(id, motiv); incarca(); }
    catch (err) { alert(err.message || 'Nu am putut refuza comanda.'); }
  };
  const anuleaza = async (id) => {
    if (!window.confirm('Sigur anulezi această comandă?')) return;
    try { await apiAnuleazaComandaCatalog(id); incarca(); }
    catch (err) { alert(err.message || 'Nu am putut anula comanda.'); }
  };
  const vezicontact = async (id) => {
    try {
      const data = await apiContactComandaCatalog(id);
      setContacte(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      alert(err.message || 'Datele de contact nu sunt încă disponibile.');
    }
  };

  if (loading) return <CentruLoading t={t} />;
  if (eroare) return <MesajEroare t={t} text={eroare} />;
  if (comenzi.length === 0) {
    return <EmptyState t={t} icon={<ShoppingCart size={28} />} text={esteFurnizor ? 'Nu ai primit nicio comandă din catalog încă.' : 'Nu ai trimis nicio comandă din catalog încă.'} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {comenzi.map(c => {
        const contact = contacte[c._id];
        return (
          <div key={c._id} style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '18px 20px', boxShadow: `0 2px 10px ${t.shadow}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: t.textPrincipal }}>{c.denumireProdus}</h3>
                  <StatusBadge status={c.status} t={t} />
                </div>
                <div style={{ fontSize: '12.5px', color: t.textSecundar, display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <span>{c.cantitate} {c.unitateMasura} × <span style={{ fontFamily: t.fontMono, color: '#10b981', fontWeight: '700' }}>{c.pretUnitar.toLocaleString()} RON</span></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Building2 size={12} /> {esteFurnizor ? c.cumparator?.nume : c.furnizor?.nume}</span>
                </div>
                {c.mesaj && <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: t.textPrincipal, fontStyle: 'italic' }}>„{c.mesaj}"</p>}
                {c.status === 'refuzata' && c.motivRefuz && <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#ef4444' }}>Motiv refuz: {c.motivRefuz}</p>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {esteFurnizor && c.status === 'in_asteptare' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => confirma(c._id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      <Check size={13} /> Confirmă
                    </button>
                    <button onClick={() => refuza(c._id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'transparent', color: '#ef4444', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      <XCircle size={13} /> Refuză
                    </button>
                  </div>
                )}
                {!esteFurnizor && c.status === 'in_asteptare' && (
                  <button onClick={() => anuleaza(c._id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'transparent', color: '#ef4444', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    <Trash2 size={13} /> Anulează
                  </button>
                )}
                {c.status === 'confirmata' && !contact && (
                  <button onClick={() => vezicontact(c._id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', backgroundColor: 'transparent', color: '#10b981', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                    Vezi contact
                  </button>
                )}
              </div>
            </div>

            {contact && (
              <ContactCard t={t} data={esteFurnizor ? contact.cumparator : contact.furnizor} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal: comandă directă pe un produs din catalog ───────────────────────
function ModalComandaCatalog({ t, produs, onClose, onComandata }) {
  const [cantitate, setCantitate] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');

  const trimite = async (e) => {
    e.preventDefault();
    setEroare('');
    const cantitateNum = Number(cantitate);
    if (Number.isNaN(cantitateNum) || cantitateNum <= 0) { setEroare('Introdu o cantitate validă.'); return; }

    setSeTrimite(true);
    try {
      await apiComandaCatalog(produs._id, { cantitate: cantitateNum, mesaj: mesaj.trim() });
      onComandata();
    } catch (err) {
      setEroare(err.message || 'Nu am putut trimite comanda.');
    } finally {
      setSeTrimite(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '11.5px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', display: 'block' };
  const total = Number(cantitate) > 0 ? Number(cantitate) * produs.pret : null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, maxWidth: '440px', width: '100%', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '800', color: t.textPrincipal }}>
            <ShoppingCart size={16} /> Comandă Directă
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ backgroundColor: t.bgInput, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '800', fontSize: '14px', color: t.textPrincipal }}>{produs.titlu}</div>
          <div style={{ fontSize: '12.5px', color: t.textSecundar, marginTop: '2px' }}>
            De la <strong>{produs.furnizor?.nume}</strong> · <span style={{ fontFamily: t.fontMono, color: '#10b981', fontWeight: '700' }}>{Number(produs.pret).toLocaleString()} RON</span> / {produs.unitateMasura}
          </div>
        </div>

        <form onSubmit={trimite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Cantitate ({produs.unitateMasura}) *</label>
            <input type="number" min="0" step="any" value={cantitate} onChange={e => setCantitate(e.target.value)} style={inputStyle} required autoFocus />
          </div>
          {total != null && (
            <div style={{ fontSize: '13px', color: t.textSecundar }}>
              Total estimat: <strong style={{ color: '#10b981', fontFamily: t.fontMono }}>{total.toLocaleString()} RON</strong>
            </div>
          )}
          <div>
            <label style={labelStyle}>Mesaj pentru furnizor (opțional)</label>
            <textarea rows={2} value={mesaj} onChange={e => setMesaj(e.target.value)} placeholder="Detalii livrare, termen dorit..." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {eroare && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
              {eroare}
            </div>
          )}

          <button
            type="submit" disabled={seTrimite}
            style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#FF9E2C', color: '#1a1206', fontWeight: '800', fontSize: '13.5px', cursor: seTrimite ? 'default' : 'pointer', opacity: seTrimite ? 0.7 : 1 }}
          >
            {seTrimite ? 'Se trimite...' : 'Trimite Comanda'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: creare cerere de materiale ─────────────────────────────────────
function ModalCreareCerere({ t, user, onClose, onCreata, prefill }) {
  const [titlu, setTitlu] = useState(prefill?.denumire ? `Ofertă pentru ${prefill.denumire}` : '');
  const [descriere, setDescriere] = useState('');
  const [judet, setJudet] = useState(user?.judet || '');
  const [oras, setOras] = useState('');
  const [termenLimita, setTermenLimita] = useState('');
  const [proiectId, setProiectId] = useState('');
  const [proiecteProprii, setProiecteProprii] = useState([]);
  const [articole, setArticole] = useState(prefill
    ? [{ denumire: prefill.denumire, cantitate: '', unitateMasura: prefill.unitateMasura || 'buc', specificatii: '' }]
    : [{ denumire: '', cantitate: '', unitateMasura: 'buc', specificatii: '' }]);
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');

  useEffect(() => {
    const userId = user?.id || user?._id;
    apiListaProiecte()
      .then(lista => {
        const proprii = (lista || []).filter(p =>
          user?.rol === 'DEZVOLTATOR' ? p.dezvoltator?._id === userId : p.castigator?._id === userId
        );
        setProiecteProprii(proprii);
      })
      .catch(() => {});
  }, [user]);

  const actualizeazaArticol = (idx, camp, valoare) => {
    setArticole(prev => prev.map((a, i) => i === idx ? { ...a, [camp]: valoare } : a));
  };
  const adaugaArticol = () => setArticole(prev => [...prev, { denumire: '', cantitate: '', unitateMasura: 'buc', specificatii: '' }]);
  const stergeArticol = (idx) => setArticole(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const trimite = async (e) => {
    e.preventDefault();
    setEroare('');
    if (!titlu.trim() || !judet.trim()) { setEroare('Titlul și județul sunt obligatorii.'); return; }
    const articoleValide = articole.filter(a => a.denumire.trim() && Number(a.cantitate) > 0);
    if (articoleValide.length === 0) { setEroare('Adaugă cel puțin un articol cu denumire și cantitate.'); return; }

    setSeTrimite(true);
    try {
      const cerere = await apiCreeazaCerere({
        titlu: titlu.trim(),
        descriere: descriere.trim(),
        judet: judet.trim(),
        oras: oras.trim(),
        termenLimita: termenLimita || undefined,
        proiectId: proiectId || undefined,
        articole: articoleValide.map(a => ({
          denumire: a.denumire.trim(),
          cantitate: Number(a.cantitate),
          unitateMasura: a.unitateMasura,
          specificatii: a.specificatii.trim(),
        })),
      });
      onCreata(cerere);
    } catch (err) {
      setEroare(err.message || 'Nu am putut publica cererea.');
    } finally {
      setSeTrimite(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '11.5px', fontWeight: '700', color: t.textSecundar, marginBottom: '5px', display: 'block' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, maxWidth: '620px', width: '100%', padding: '24px', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', color: t.textPrincipal }}>
            <Package size={17} color="#FF9E2C" /> Cerere Nouă de Materiale
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSecundar, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <form onSubmit={trimite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Titlu cerere *</label>
            <input value={titlu} onChange={e => setTitlu(e.target.value)} placeholder="ex: Ciment și gresie pentru șantier bloc P+4" style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Descriere (opțional)</label>
            <textarea rows={2} value={descriere} onChange={e => setDescriere(e.target.value)} placeholder="Context suplimentar pentru furnizori..." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Județ *</label>
              <input value={judet} onChange={e => setJudet(e.target.value)} placeholder="ex: Cluj" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Oraș</label>
              <input value={oras} onChange={e => setOras(e.target.value)} placeholder="ex: Cluj-Napoca" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Termen limită oferte (opțional)</label>
              <input type="date" value={termenLimita} onChange={e => setTermenLimita(e.target.value)} style={inputStyle} />
            </div>
            {proiecteProprii.length > 0 && (
              <div>
                <label style={labelStyle}>Leagă de un proiect (opțional)</label>
                <select value={proiectId} onChange={e => setProiectId(e.target.value)} style={inputStyle}>
                  <option value="">Fără proiect legat</option>
                  {proiecteProprii.map(p => <option key={p._id} value={p._id}>{p.titlu}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Articole necesare *</label>
              <button type="button" onClick={adaugaArticol} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#2F6FED', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}>
                <Plus size={14} /> Adaugă articol
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {articole.map((a, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', backgroundColor: t.bgInput, padding: '10px', borderRadius: '10px' }}>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input value={a.denumire} onChange={e => actualizeazaArticol(idx, 'denumire', e.target.value)} placeholder="Denumire (ex: Ciment Portland CEM II 42.5R)" style={{ ...inputStyle, backgroundColor: t.bgCard }} />
                    <input value={a.specificatii} onChange={e => actualizeazaArticol(idx, 'specificatii', e.target.value)} placeholder="Specificații opționale (marcă, dimensiuni...)" style={{ ...inputStyle, backgroundColor: t.bgCard, fontSize: '12px' }} />
                  </div>
                  <input type="number" min="0" step="any" value={a.cantitate} onChange={e => actualizeazaArticol(idx, 'cantitate', e.target.value)} placeholder="Cant." style={{ ...inputStyle, backgroundColor: t.bgCard, width: '80px', flex: 'none' }} />
                  <select value={a.unitateMasura} onChange={e => actualizeazaArticol(idx, 'unitateMasura', e.target.value)} style={{ ...inputStyle, backgroundColor: t.bgCard, width: '80px', flex: 'none' }}>
                    {UNITATI.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {articole.length > 1 && (
                    <button type="button" onClick={() => stergeArticol(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {eroare && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} /> {eroare}
            </div>
          )}

          <button
            type="submit" disabled={seTrimite}
            style={{ padding: '13px', borderRadius: '10px', border: 'none', backgroundColor: '#FF9E2C', color: '#1a1206', fontWeight: '800', fontSize: '14px', cursor: seTrimite ? 'default' : 'pointer', opacity: seTrimite ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {seTrimite ? <Loader2 size={16} className="spin-icon" /> : <Send size={16} />}
            {seTrimite ? 'Se publică...' : 'Publică Cererea (3 tokenuri)'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Detaliu cerere — articole, oferte per articol, acceptare per articol,
// formular de ofertare pentru furnizor.
// ═══════════════════════════════════════════════════════════════════════
function CerereDetail({ t, user, cerereId, onBack }) {
  const [date, setDate] = useState(null); // { cerere, oferte, esteCreator }
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');
  const [contacteVizibile, setContacteVizibile] = useState({}); // { furnizorId: { furnizor, creator } }

  const userId = user?.id || user?._id;
  const esteFurnizor = user?.rol === 'FURNIZOR';

  const incarca = useCallback(() => {
    setLoading(true);
    apiCerereDetaliu(cerereId)
      .then(data => setDate(data))
      .catch(err => setEroare(err.message || 'Nu am putut încărca cererea.'))
      .finally(() => setLoading(false));
  }, [cerereId]);

  useEffect(() => { incarca(); }, [incarca]);

  const accepta = async (articolId, ofertaArticolId) => {
    try {
      await apiAccetaArticolCerere(cerereId, articolId, ofertaArticolId);
      incarca();
    } catch (err) {
      alert(err.message || 'Nu am putut accepta oferta.');
    }
  };

  const anuleaza = async () => {
    if (!window.confirm('Sigur anulezi această cerere?')) return;
    try {
      await apiAnuleazaCerere(cerereId);
      incarca();
    } catch (err) {
      alert(err.message || 'Nu am putut anula cererea.');
    }
  };

  const vezicontact = async (furnizorId) => {
    try {
      const data = await apiContactFurnizorCerere(cerereId, furnizorId);
      setContacteVizibile(prev => ({ ...prev, [furnizorId]: data }));
    } catch (err) {
      alert(err.message || 'Datele de contact nu sunt încă disponibile.');
    }
  };

  if (loading) return <CentruLoading t={t} />;
  if (eroare || !date) return <MesajEroare t={t} text={eroare || 'Cererea nu a putut fi încărcată.'} />;

  const { cerere, oferte, esteCreator } = date;

  // Hartă: articolId -> lista de { ofertaArticol, ofertaMateriale }
  const ofertePeArticol = {};
  oferte.forEach(o => {
    (o.articole || []).forEach(oa => {
      if (!ofertePeArticol[oa.cerereArticolId]) ofertePeArticol[oa.cerereArticolId] = [];
      ofertePeArticol[oa.cerereArticolId].push({ ofertaArticol: oa, ofertaMateriale: o });
    });
  });

  const ofertaProprie = esteFurnizor ? oferte.find(o => (o.furnizor?._id || o.furnizor) === userId) : null;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        onClick={onBack}
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 14px', color: t.textSecundar, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
      >
        <ArrowLeft size={15} /> Înapoi
      </button>

      <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, padding: '24px', boxShadow: `0 4px 24px ${t.shadow}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '850', color: t.textPrincipal }}>{cerere.titlu}</h1>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12.5px', color: t.textSecundar }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={12} /> {cerere.oras ? `${cerere.oras}, ` : ''}{cerere.judet}</span>
              {cerere.termenLimita && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12} /> Termen oferte: {new Date(cerere.termenLimita).toLocaleDateString('ro-RO')}</span>}
              {cerere.proiect?.titlu && <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Building2 size={12} /> {cerere.proiect.titlu}</span>}
            </div>
          </div>
          <StatusBadge status={cerere.status} t={t} />
        </div>
        {cerere.descriere && <p style={{ margin: '14px 0 0', fontSize: '13.5px', color: t.textPrincipal, lineHeight: 1.6 }}>{cerere.descriere}</p>}
        {esteCreator && cerere.status === 'deschisa' && (
          <button onClick={anuleaza} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '8px 14px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
            <Ban size={14} /> Anulează cererea
          </button>
        )}
      </div>

      {/* ── ARTICOLE ── */}
      <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
        <SectionHeader icon={<Package size={13} />} label={`Articole (${cerere.articole.length})`} t={t} />
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {cerere.articole.map(articol => {
            const ofertePentruArticol = ofertePeArticol[articol._id] || [];
            const castigator = articol.ofertaArticolCastigatoareId
              ? ofertePentruArticol.find(x => x.ofertaArticol._id === articol.ofertaArticolCastigatoareId)
              : null;

            return (
              <div key={articol._id} style={{ borderRadius: '12px', border: `1px solid ${t.border}`, padding: '14px 16px', backgroundColor: t.bgInput }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: t.textPrincipal }}>{articol.denumire}</div>
                    <div style={{ fontSize: '12px', color: t.textSecundar }}>
                      {articol.cantitate} {articol.unitateMasura}
                      {articol.specificatii && ` · ${articol.specificatii}`}
                    </div>
                  </div>
                  {castigator && (
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      ✓ Atribuit
                    </span>
                  )}
                </div>

                {esteCreator && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                    {ofertePentruArticol.length === 0 ? (
                      <span style={{ fontSize: '12px', color: t.textSecundar, fontStyle: 'italic' }}>Niciun furnizor nu a ofertat încă pentru acest articol.</span>
                    ) : ofertePentruArticol.map(({ ofertaArticol, ofertaMateriale }) => (
                      <div key={ofertaArticol._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.bgCard, borderRadius: '9px', padding: '9px 12px', border: ofertaArticol.acceptat ? '1px solid rgba(16,185,129,0.4)' : `1px solid ${t.border}` }}>
                        <div style={{ fontSize: '12.5px', color: t.textPrincipal }}>
                          <strong>{ofertaMateriale.furnizor?.nume || 'Furnizor'}</strong>
                          {' — '}
                          <span style={{ fontFamily: t.fontMono, color: '#10b981', fontWeight: '700' }}>{ofertaArticol.pretUnitar.toLocaleString()} RON</span>
                          {' / '}{articol.unitateMasura}
                          {ofertaArticol.cantitateOfertata != null && ` · cantitate ofertată: ${ofertaArticol.cantitateOfertata}`}
                          {' · '}{ofertaMateriale.termenLivrare} zile livrare
                        </div>
                        {ofertaArticol.acceptat ? (
                          <button onClick={() => vezicontact(ofertaMateriale.furnizor?._id || ofertaMateriale.furnizor)} style={{ fontSize: '11.5px', fontWeight: '700', color: '#10b981', background: 'none', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer' }}>
                            Vezi contact
                          </button>
                        ) : !castigator && cerere.status === 'deschisa' ? (
                          <button onClick={() => accepta(articol._id, ofertaArticol._id)} style={{ fontSize: '11.5px', fontWeight: '700', color: '#fff', background: '#2F6FED', border: 'none', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer' }}>
                            Acceptă
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {esteCreator && castigator && contacteVizibile[castigator.ofertaMateriale.furnizor?._id] && (
                  <ContactCard t={t} data={contacteVizibile[castigator.ofertaMateriale.furnizor?._id].furnizor} />
                )}

                {esteFurnizor && ofertaProprie && (() => {
                  const propriul = (ofertaProprie.articole || []).find(a => a.cerereArticolId === articol._id);
                  if (!propriul) return null;
                  return (
                    <div style={{ marginTop: '10px', fontSize: '12.5px', color: t.textSecundar, padding: '8px 12px', backgroundColor: t.bgCard, borderRadius: '8px' }}>
                      Oferta ta: <strong style={{ color: '#10b981' }}>{propriul.pretUnitar.toLocaleString()} RON</strong> / {articol.unitateMasura}
                      {propriul.acceptat && <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: '700' }}>✓ Acceptată</span>}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {esteFurnizor && cerere.status === 'deschisa' && !ofertaProprie && (
        <FormularOfertaMateriale t={t} cerere={cerere} onTrimisa={incarca} />
      )}

      {esteFurnizor && ofertaProprie && !ofertaProprie.articole.some(a => a.acceptat) && (
        <button
          onClick={async () => {
            if (!window.confirm('Retragi oferta trimisă pentru această cerere?')) return;
            try { await apiRetrageOfertaMateriale(cerereId, ofertaProprie._id); incarca(); }
            catch (err) { alert(err.message || 'Nu am putut retrage oferta.'); }
          }}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '9px 14px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}
        >
          <Trash2 size={14} /> Retrage oferta
        </button>
      )}

      {esteFurnizor && castigatorContactPersonal(cerere, ofertaProprie) && (
        <ContactCreatorCard t={t} cerereId={cerereId} userId={userId} contacteVizibile={contacteVizibile} vezicontact={vezicontact} />
      )}
    </div>
  );
}

function castigatorContactPersonal(cerere, ofertaProprie) {
  return ofertaProprie && (ofertaProprie.articole || []).some(a => a.acceptat);
}

function ContactCreatorCard({ t, cerereId, userId, contacteVizibile, vezicontact }) {
  useEffect(() => { vezicontact(userId); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const data = contacteVizibile[userId];
  if (!data) return null;
  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: '1px solid rgba(16,185,129,0.3)', padding: '20px', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle2 size={14} /> Date de contact — cel care a creat cererea
      </div>
      <ContactCard t={t} data={data.creator} />
    </div>
  );
}

function ContactCard({ t, data }) {
  if (!data) return null;
  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '12.5px', color: t.textPrincipal, backgroundColor: t.bgCard, borderRadius: '8px', padding: '10px 12px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Building2 size={12} /> {data.nume}</span>
      {data.email && <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Mail size={12} /> {data.email}</span>}
      {data.telefon && <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Phone size={12} /> {data.telefon}</span>}
      {data.cui && <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Hash size={12} /> {data.cui}</span>}
    </div>
  );
}

// ─── Formular: furnizor trimite preț pe articolele alese ───────────────────
function FormularOfertaMateriale({ t, cerere, onTrimisa }) {
  const [selectate, setSelectate] = useState({}); // { articolId: { pretUnitar, cantitateOfertata } }
  const [mesaj, setMesaj] = useState('');
  const [termenLivrare, setTermenLivrare] = useState('');
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState('');

  const toggleArticol = (id) => {
    setSelectate(prev => {
      const nou = { ...prev };
      if (nou[id]) delete nou[id];
      else nou[id] = { pretUnitar: '', cantitateOfertata: '' };
      return nou;
    });
  };
  const actualizeaza = (id, camp, valoare) => {
    setSelectate(prev => ({ ...prev, [id]: { ...prev[id], [camp]: valoare } }));
  };

  const trimite = async (e) => {
    e.preventDefault();
    setEroare('');
    const idArticole = Object.keys(selectate);
    if (idArticole.length === 0) { setEroare('Alege cel puțin un articol pentru care oferi preț.'); return; }
    if (!termenLivrare || Number(termenLivrare) <= 0) { setEroare('Introdu un termen de livrare valid (zile).'); return; }
    for (const id of idArticole) {
      if (!selectate[id].pretUnitar || Number(selectate[id].pretUnitar) <= 0) {
        setEroare('Introdu un preț unitar pozitiv pentru fiecare articol selectat.');
        return;
      }
    }

    setSeTrimite(true);
    try {
      await apiTrimiteOfertaMateriale(cerere._id, {
        mesaj: mesaj.trim(),
        termenLivrare: Number(termenLivrare),
        articole: idArticole.map(id => ({
          cerereArticolId: id,
          pretUnitar: Number(selectate[id].pretUnitar),
          cantitateOfertata: selectate[id].cantitateOfertata !== '' ? Number(selectate[id].cantitateOfertata) : undefined,
        })),
      });
      onTrimisa();
    } catch (err) {
      setEroare(err.message || 'Nu am putut trimite oferta.');
    } finally {
      setSeTrimite(false);
    }
  };

  const inputStyle = { padding: '8px 10px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.textPrincipal, fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', border: `1px solid ${t.border}`, overflow: 'hidden', boxShadow: `0 2px 12px ${t.shadow}` }}>
      <SectionHeader icon={<Send size={13} />} label="Trimite Ofertă" t={t} />
      <form onSubmit={trimite} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '12.5px', color: t.textSecundar }}>Bifează articolele pentru care poți livra și introdu prețul unitar. Nu trebuie să acoperi toate articolele.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cerere.articole.map(a => {
            const activ = !!selectate[a._id];
            return (
              <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', backgroundColor: t.bgInput, border: activ ? '1px solid #2F6FED' : `1px solid ${t.border}` }}>
                <input type="checkbox" checked={activ} onChange={() => toggleArticol(a._id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <div style={{ flex: 1, fontSize: '12.5px', color: t.textPrincipal }}>
                  <strong>{a.denumire}</strong> — {a.cantitate} {a.unitateMasura}
                </div>
                {activ && (
                  <>
                    <input
                      type="number" min="0" step="any" placeholder="Preț unitar"
                      value={selectate[a._id].pretUnitar}
                      onChange={e => actualizeaza(a._id, 'pretUnitar', e.target.value)}
                      style={{ ...inputStyle, width: '100px' }}
                    />
                    <input
                      type="number" min="0" step="any" placeholder="Cant. (opț.)"
                      value={selectate[a._id].cantitateOfertata}
                      onChange={e => actualizeaza(a._id, 'cantitateOfertata', e.target.value)}
                      style={{ ...inputStyle, width: '100px' }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
          <input value={mesaj} onChange={e => setMesaj(e.target.value)} placeholder="Mesaj opțional pentru client..." style={{ ...inputStyle, backgroundColor: t.bgInput }} />
          <input type="number" min="1" value={termenLivrare} onChange={e => setTermenLivrare(e.target.value)} placeholder="Termen livrare (zile)" style={{ ...inputStyle, backgroundColor: t.bgInput }} />
        </div>

        {eroare && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
            {eroare}
          </div>
        )}

        <button
          type="submit" disabled={seTrimite}
          style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#FF9E2C', color: '#1a1206', fontWeight: '800', fontSize: '13.5px', cursor: seTrimite ? 'default' : 'pointer', opacity: seTrimite ? 0.7 : 1 }}
        >
          {seTrimite ? 'Se trimite...' : 'Trimite Oferta'}
        </button>
      </form>
    </div>
  );
}

// ─── Helpers UI comune ───────────────────────────────────────────────────
function CentruLoading({ t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px', color: t.textSecundar }}>
      <Loader2 size={20} className="spin-icon" /> Se încarcă...
    </div>
  );
}

function MesajEroare({ t, text }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <AlertCircle size={16} /> {text}
    </div>
  );
}

function EmptyState({ t, icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '50px 20px', color: t.textSecundar, textAlign: 'center' }}>
      <div style={{ opacity: 0.4 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: '13.5px' }}>{text}</p>
    </div>
  );
}
