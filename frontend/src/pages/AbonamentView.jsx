import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins, Check, Crown, Zap, Building2, Loader, AlertCircle,
  ArrowUpCircle, ArrowDownCircle, Gift, History, ShoppingBag, FileText, Download, CreditCard,
} from 'lucide-react';
import {
  apiPlanuriAbonament, apiSoldTokenuri, apiIstoricTokenuri,
  apiUpgradeAbonament, apiCumparaTokenuri,
  apiCheckoutPachet, apiCheckoutAbonament, apiFacturi, apiDescarcaFacturaPdf,
} from '../api.js';

const ICON_PLAN = {
  GRATUIT: Zap,
  PRO: Crown,
  ENTERPRISE: Building2,
};

const ETICHETA_TRANZACTIE = {
  ALOCARE_ABONAMENT: 'Alocare abonament',
  CUMPARARE: 'Cumpărare tokenuri',
  CHELTUIALA_ANUNT: 'Publicare anunț',
  CHELTUIALA_ANUNT_PROSPECTARE: 'Publicare anunț — prospectare piață',
  CHELTUIALA_PROSPECTARE: 'Prospectare piață',
  RECOMPENSA_OFERTA: 'Recompensă — ofertă depusă',
  RECOMPENSA_CASTIG: 'Recompensă — ofertă câștigată',
  AJUSTARE_ADMIN: 'Ajustare',
};

function Card({ t, children, style }) {
  return (
    <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', boxShadow: `0 2px 10px ${t.shadow}`, ...style }}>
      {children}
    </div>
  );
}

export default function AbonamentView({ t, user, onSoldActualizat, onUserActualizat }) {
  const [planuri, setPlanuri] = useState([]);
  const [pachete, setPachete] = useState([]);
  const [sold, setSold] = useState(null);
  const [istoric, setIstoric] = useState([]);
  const [facturi, setFacturi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState('');
  const [actiuneInCurs, setActiuneInCurs] = useState('');
  const [mesajSucces, setMesajSucces] = useState('');

  const incarca = useCallback(() => {
    setLoading(true);
    setEroare('');
    Promise.all([apiPlanuriAbonament(), apiSoldTokenuri(), apiIstoricTokenuri(), apiFacturi().catch(() => ({ facturi: [] }))])
      .then(([planuriData, soldData, istoricData, facturiData]) => {
        setPlanuri(planuriData.planuri || []);
        setPachete(planuriData.pachete || []);
        setSold(soldData);
        setIstoric(istoricData.tranzactii || []);
        setFacturi(facturiData.facturi || []);
      })
      .catch(err => setEroare(err.message || 'Eroare la încărcarea datelor de abonament.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { incarca(); }, [incarca]);

  // ── Revenire de la Stripe Checkout (?plata=succes / ?plata=anulata) ──
  // SPA-ul nu are rutare proprie, deci Stripe redirecționează cu un query
  // param simplu pe care îl citim aici, ca să arătăm un mesaj și să curățăm
  // URL-ul (fără să reîncărcăm pagina).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plata = params.get('plata');
    if (!plata) return;
    if (plata === 'succes') {
      setMesajSucces('Plata a fost confirmată. Poate dura câteva secunde până apar tokenurile/planul actualizat — reîmprospătăm automat.');
      setTimeout(incarca, 2500);
    } else if (plata === 'anulata') {
      setEroare('Plata a fost anulată. Nu s-a efectuat nicio taxare.');
    }
    params.delete('plata');
    const restUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', restUrl);
  }, [incarca]);

  const handleUpgrade = async (planId, pretLunar) => {
    setActiuneInCurs(`plan-${planId}`);
    setEroare('');
    setMesajSucces('');
    try {
      // Planurile plătite trec prin Stripe Checkout — browserul e redirecționat
      // spre pagina de plată cu cardul, iar activarea planului se face după
      // confirmarea plății (webhook), nu instant.
      if (pretLunar > 0) {
        const { url } = await apiCheckoutAbonament(planId);
        window.location.href = url;
        return;
      }
      const rezultat = await apiUpgradeAbonament(planId);
      setMesajSucces(rezultat.mesaj);
      onSoldActualizat && onSoldActualizat(rezultat.tokenuri);
      onUserActualizat && onUserActualizat();
      incarca();
    } catch (err) {
      setEroare(err.message || 'Nu s-a putut schimba planul.');
    } finally {
      setActiuneInCurs('');
    }
  };

  const handleCumpara = async (pachetId) => {
    setActiuneInCurs(`pachet-${pachetId}`);
    setEroare('');
    setMesajSucces('');
    try {
      const { url } = await apiCheckoutPachet(pachetId);
      window.location.href = url;
    } catch (err) {
      if (err.status === 503) {
        // Stripe nu e configurat încă (ex: dezvoltare locală, fără cheie) —
        // rămânem pe fluxul simulat, ca testarea să nu fie blocată.
        try {
          const rezultat = await apiCumparaTokenuri(pachetId);
          setMesajSucces(`${rezultat.mesaj} (plată simulată — Stripe nu e configurat)`);
          onSoldActualizat && onSoldActualizat(rezultat.tokenuri);
          incarca();
        } catch (err2) {
          setEroare(err2.message || 'Nu s-au putut cumpăra tokenurile.');
        }
      } else {
        setEroare(err.message || 'Nu s-au putut cumpăra tokenurile.');
      }
    } finally {
      setActiuneInCurs('');
    }
  };

  if (loading && !sold) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px', color: t.textSecundar }}>
        <Loader size={26} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Se încarcă abonamentul...</span>
        <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  const planCurent = user?.planAbonament || 'GRATUIT';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>

      <div>
        <span style={{ color: t.amber, fontSize: '13px', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Abonament & Tokenuri</span>
        <h2 style={{ fontSize: '26px', fontWeight: '850', margin: '6px 0 0 0', color: t.textPrincipal }}>Gestionează abonamentul și soldul de tokenuri</h2>
        <p style={{ color: t.textSecundar, fontSize: '14px', margin: '4px 0 0 0' }}>
          Tokenurile se cheltuiesc la publicarea unui anunț. Le primești lunar, automat, din abonament,
          sau le mai poți cumpăra separat, oricând ai nevoie de mai multe.
        </p>
      </div>

      {eroare && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13.5px' }}>
          <AlertCircle size={16} /> {eroare}
        </div>
      )}
      {mesajSucces && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(34,178,125,0.08)', border: '1px solid rgba(34,178,125,0.2)', color: t.success, fontSize: '13.5px' }}>
          <Check size={16} /> {mesajSucces}
        </div>
      )}

      {/* ── Sold curent ── */}
      <Card t={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: t.amberSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Coins size={24} style={{ color: t.amber }} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: t.textSecundar, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sold curent</div>
            <div style={{ fontFamily: t.fontMono, fontSize: '30px', fontWeight: '850', color: t.textPrincipal }}>{sold?.tokenuri ?? user?.tokenuri ?? 0} <span style={{ fontSize: '15px', color: t.textSecundar, fontWeight: '600' }}>tokenuri</span></div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: t.textSecundar, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Plan activ</div>
          <div style={{ fontSize: '18px', fontWeight: '750', color: t.accent }}>{(sold?.plan?.nume) || 'Gratuit'}</div>
        </div>
      </Card>

      {/* ── Ce costă în tokenuri ── */}
      {sold?.costuri && (
        <Card t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Zap size={18} style={{ color: t.accent }} />
            <h3 style={{ fontSize: '16px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Ce costă în tokenuri</h3>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13.5px', color: t.textSecundar }}>
            <span>Publicare anunț: <b style={{ color: t.textPrincipal, fontFamily: t.fontMono }}>{sold.costuri.POSTARE_ANUNT} tokenuri</b></span>
            <span>Publicare anunț de prospectare piață: <b style={{ color: t.textPrincipal, fontFamily: t.fontMono }}>{sold.costuri.POSTARE_ANUNT_PROSPECTARE} tokenuri</b></span>
            <span>Raport detaliat de piață: <b style={{ color: t.textPrincipal, fontFamily: t.fontMono }}>{sold.costuri.RAPORT_PIATA} tokenuri</b> / generare</span>
            <span>Oportunități personalizate: <b style={{ color: t.textPrincipal, fontFamily: t.fontMono }}>{sold.costuri.OPORTUNITATI} tokenuri</b> / generare</span>
          </div>
        </Card>
      )}

      {/* ── Planuri de abonament ── */}
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: '750', margin: '0 0 12px 0', color: t.textPrincipal }}>Planuri de abonament</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
          {planuri.map(plan => {
            const Icon = ICON_PLAN[plan.id] || Zap;
            const esteCurent = plan.id === planCurent;
            return (
              <Card key={plan.id} t={t} style={{
                display: 'flex', flexDirection: 'column', gap: '14px',
                border: esteCurent ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={20} style={{ color: t.accent }} />
                    <span style={{ fontSize: '17px', fontWeight: '800', color: t.textPrincipal }}>{plan.nume}</span>
                  </div>
                  {esteCurent && (
                    <span style={{ fontSize: '10.5px', fontWeight: '750', padding: '3px 10px', borderRadius: '20px', backgroundColor: t.accentSoft, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Planul tău
                    </span>
                  )}
                </div>

                <div>
                  <span style={{ fontFamily: t.fontMono, fontSize: '26px', fontWeight: '850', color: t.textPrincipal }}>
                    {plan.pretLunar === 0 ? 'Gratuit' : `${plan.pretLunar} ${plan.moneda}`}
                  </span>
                  {plan.pretLunar > 0 && <span style={{ fontSize: '13px', color: t.textSecundar }}> /lună</span>}
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.beneficii.map((b, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: t.textSecundar }}>
                      <Check size={14} style={{ color: t.success, marginTop: '2px', flexShrink: 0 }} />
                      {b}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id, plan.pretLunar)}
                  disabled={esteCurent || actiuneInCurs === `plan-${plan.id}`}
                  style={{
                    marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                    backgroundColor: esteCurent ? t.bgInput : t.accent,
                    color: esteCurent ? t.textSecundar : '#fff',
                    fontSize: '13.5px', fontWeight: '700',
                    cursor: esteCurent ? 'default' : 'pointer',
                  }}
                >
                  {plan.pretLunar > 0 ? <CreditCard size={15} /> : <ArrowUpCircle size={15} />}
                  {esteCurent ? 'Plan activ' : actiuneInCurs === `plan-${plan.id}` ? 'Se procesează...' : plan.pretLunar > 0 ? `Plătește ${plan.pretLunar} RON/lună` : 'Activează planul'}
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Cumpără tokenuri ── */}
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: '750', margin: '0 0 12px 0', color: t.textPrincipal, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} style={{ color: t.amber }} /> Cumpără tokenuri suplimentare
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
          {pachete.map(pachet => (
            <Card key={pachet.id} t={t} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
              <Coins size={22} style={{ color: t.amber }} />
              <span style={{ fontFamily: t.fontMono, fontSize: '22px', fontWeight: '850', color: t.textPrincipal }}>{pachet.tokenuri}</span>
              <span style={{ fontSize: '12.5px', color: t.textSecundar }}>tokenuri</span>
              <button
                onClick={() => handleCumpara(pachet.id)}
                disabled={actiuneInCurs === `pachet-${pachet.id}`}
                style={{
                  width: '100%', padding: '9px 14px', borderRadius: '8px', border: `1px solid ${t.border}`,
                  backgroundColor: t.bgInput, color: t.textPrincipal, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                {actiuneInCurs === `pachet-${pachet.id}` ? 'Se procesează...' : `Plătește ${pachet.pret} RON`}
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Cum câștigi tokenuri gratuit ── */}
      <Card t={t}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Gift size={18} style={{ color: t.success }} />
          <h3 style={{ fontSize: '16px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Câștigă tokenuri gratuit</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: t.textSecundar }}>
          <div>• Fiecare abonament îți acordă automat, în fiecare lună, pachetul lunar de tokenuri al planului tău.</div>
        </div>
      </Card>

      {/* ── Facturi ── */}
      {facturi.length > 0 && (
        <Card t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <FileText size={18} style={{ color: t.accent }} />
            <h3 style={{ fontSize: '16px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Facturile tale</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {facturi.map(f => (
              <div key={f.numar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '650', color: t.textPrincipal }}>Factură {f.serie}-{f.numar}</div>
                  <div style={{ fontSize: '12px', color: t.textSecundar }}>{f.descriere}</div>
                </div>
                <div style={{ fontFamily: t.fontMono, fontSize: '13.5px', fontWeight: '750', color: t.textPrincipal, flexShrink: 0 }}>{f.suma.toLocaleString()} RON</div>
                <button
                  onClick={() => apiDescarcaFacturaPdf(f.numar).catch(err => setEroare(err.message || 'Nu am putut descărca factura.'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textSecundar, fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Download size={13} /> PDF
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Istoric tranzacții ── */}
      <Card t={t}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <History size={18} style={{ color: t.accent }} />
          <h3 style={{ fontSize: '16px', fontWeight: '750', margin: 0, color: t.textPrincipal }}>Istoric tokenuri</h3>
        </div>
        {istoric.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: t.textSecundar, fontSize: '14px' }}>
            Nu ai încă nicio mișcare de tokenuri.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {istoric.map(tz => {
              const pozitiv = tz.suma > 0;
              return (
                <div key={tz.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
                  {pozitiv
                    ? <ArrowUpCircle size={16} style={{ color: t.success, flexShrink: 0 }} />
                    : <ArrowDownCircle size={16} style={{ color: t.danger, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '650', color: t.textPrincipal }}>{ETICHETA_TRANZACTIE[tz.tip] || tz.tip}</div>
                    <div style={{ fontSize: '12px', color: t.textSecundar }}>{tz.descriere}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: t.fontMono, fontSize: '13.5px', fontWeight: '750', color: pozitiv ? t.success : t.danger }}>
                      {pozitiv ? '+' : ''}{tz.suma}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textSecundar }}>{new Date(tz.createdAt).toLocaleDateString('ro-RO')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
