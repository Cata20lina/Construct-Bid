import React, { useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldCheck, Building2, Search, Hash, AlertCircle, Loader } from 'lucide-react';

export default function ChatView({
  t, modTema, user, proiecte = [],
  proiectChatActivId, setProiectChatActivId,
  chatMesejeGrupate = {}, nouMesaj, setNouMesaj,
  trimiteMesajChat, loadingMesaj = false, errorMesaj = ''
}) {
  const isDark = modTema === 'dark';
  const sidebarBg = isDark ? '#0d1525' : '#f1f5f9';
  const mesajeEndRef = useRef(null);

  // Selectează primul proiect automat dacă niciunul nu e selectat
  const idActiv = proiectChatActivId ?? proiecte[0]?._id ?? null;
  const proiectCurent = proiecte.find(p => p._id === idActiv) || proiecte[0] || null;
  const mesajeCameraCurenta = proiectCurent ? (chatMesejeGrupate[proiectCurent._id] || []) : [];

  // Auto-scroll la ultimul mesaj
  useEffect(() => {
    mesajeEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mesajeCameraCurenta.length]);

  const getCatColor = (cat) => {
    const map = { 'Structuri': '#2F6FED', 'Instalații': '#10b981', 'Electrice': '#eab308', 'Finisaje': '#a855f7' };
    return map[cat] || '#6b7280';
  };

  const getInitiale = (titlu = '') =>
    titlu.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'PR';

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 160px)', minHeight: '550px',
      backgroundColor: t.bgCard, borderRadius: '20px',
      border: `1px solid ${t.border}`, overflow: 'hidden',
    }}>

      {/* ── Sidebar proiecte ── */}
      <div style={{
        width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        backgroundColor: sidebarBg, borderRight: `1px solid ${t.border}`,
      }}>
        <div style={{ padding: '22px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <MessageSquare size={16} color="#2F6FED" />
            <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: t.textPrincipal }}>Mesaje</h3>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: t.bgCard, borderRadius: '10px',
            border: `1px solid ${t.border}`, padding: '9px 12px',
          }}>
            <Search size={13} color={t.textSecundar} style={{ flexShrink: 0 }} />
            <input
              placeholder="Caută proiect..."
              style={{ background: 'none', border: 'none', outline: 'none', color: t.textPrincipal, fontSize: '13px', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ padding: '0 18px 8px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: t.textSecundar, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Camere active — {proiecte.length}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
          {proiecte.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: t.textSecundar }}>
              Niciun proiect disponibil.
            </div>
          ) : (
            proiecte.map(proiect => {
              const esteActiv = proiect._id === proiectCurent?._id;
              const mesajeProiect = chatMesejeGrupate[proiect._id] || [];
              const ultimulMesaj = mesajeProiect[mesajeProiect.length - 1]?.text || 'Niciun mesaj încă...';
              const nrMesaje = mesajeProiect.length;
              const accentColor = getCatColor(proiect.categorie);

              return (
                <div
                  key={proiect._id}
                  onClick={() => setProiectChatActivId(proiect._id)}
                  style={{
                    padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', marginBottom: '4px',
                    backgroundColor: esteActiv ? (isDark ? 'rgba(47,111,237,0.12)' : 'rgba(47,111,237,0.07)') : 'transparent',
                    border: esteActiv ? '1px solid rgba(47,111,237,0.2)' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    backgroundColor: esteActiv ? accentColor : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '800', color: esteActiv ? '#fff' : t.textSecundar, position: 'relative',
                  }}>
                    {getInitiale(proiect.titlu)}
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10b981', border: `2px solid ${sidebarBg}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: esteActiv ? '800' : '600', color: t.textPrincipal, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                        {proiect.titlu}
                      </span>
                      {nrMesaje > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '700', backgroundColor: esteActiv ? '#2F6FED' : 'rgba(47,111,237,0.15)', color: esteActiv ? '#fff' : '#2F6FED', padding: '1px 6px', borderRadius: '999px', flexShrink: 0 }}>
                          {nrMesaje}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: t.textSecundar, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ultimulMesaj}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Zona chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {proiectCurent ? (
          <>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.bgCard }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: getCatColor(proiectCurent.categorie), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#fff' }}>
                  {getInitiale(proiectCurent.titlu)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: t.textPrincipal }}>{proiectCurent.titlu}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: t.textSecundar, marginTop: '2px' }}>
                    <Building2 size={11} /> {proiectCurent.dezvoltator?.nume || proiectCurent.dezvoltator}
                    <span style={{ opacity: 0.4 }}>•</span>
                    <Hash size={11} /> Cameră privată
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', padding: '6px 12px', borderRadius: '8px' }}>
                <ShieldCheck size={13} /> CRIPTAT B2B
              </div>
            </div>

            {/* Mesaje */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }}>
              {mesajeCameraCurenta.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                  <MessageSquare size={36} style={{ opacity: 0.2, color: t.textSecundar, marginBottom: '10px' }} />
                  <p style={{ color: t.textSecundar, fontSize: '14px', margin: 0 }}>Niciun mesaj în această cameră.</p>
                  <p style={{ color: t.textSecundar, fontSize: '12px', margin: '4px 0 0', opacity: 0.7 }}>Trimite primul mesaj pentru a începe negocierea.</p>
                </div>
              ) : (
                mesajeCameraCurenta.map((m, idx) => {
                  const idExpeditor = m.expeditor?._id || m.expeditor;
                  const idUtilizatorCurent = user?.id || user?._id;
                  const esteMesajulMeu = String(idExpeditor) === String(idUtilizatorCurent);
                  const prevExpeditor = idx > 0 ? (mesajeCameraCurenta[idx - 1].expeditor?._id || mesajeCameraCurenta[idx - 1].expeditor) : null;
                  const prevSameAuthor = idx > 0 && String(prevExpeditor) === String(idExpeditor);
                  const eOptimist = m._id?.toString().startsWith('optimist_');
                  const numeExpeditor = m.expeditor?.nume || 'Utilizator';

                  return (
                    <div key={m._id || idx} style={{
                      alignSelf: esteMesajulMeu ? 'flex-end' : 'flex-start',
                      maxWidth: '68%', display: 'flex', flexDirection: 'column',
                      alignItems: esteMesajulMeu ? 'flex-end' : 'flex-start',
                      marginTop: prevSameAuthor ? '-4px' : '8px',
                    }}>
                      {!prevSameAuthor && (
                        <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', color: t.textSecundar, textTransform: 'uppercase', marginBottom: '5px' }}>
                          {esteMesajulMeu ? 'Tu' : numeExpeditor}
                        </span>
                      )}
                      <div style={{
                        padding: '11px 15px',
                        borderRadius: esteMesajulMeu ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: esteMesajulMeu ? '#2F6FED' : t.bgCard,
                        color: esteMesajulMeu ? '#fff' : t.textPrincipal,
                        fontSize: '14px', lineHeight: '1.55',
                        boxShadow: esteMesajulMeu ? '0 4px 14px rgba(47,111,237,0.25)' : `0 2px 8px rgba(0,0,0,0.08)`,
                        border: esteMesajulMeu ? 'none' : `1px solid ${t.border}`,
                        opacity: eOptimist ? 0.7 : 1,
                        transition: 'opacity 0.2s',
                      }}>
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={mesajeEndRef} />
            </div>

            {/* Eroare mesaj */}
            {errorMesaj && (
              <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.06)', borderTop: `1px solid rgba(239,68,68,0.1)` }}>
                <AlertCircle size={13} /> {errorMesaj}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '14px 20px', backgroundColor: t.bgCard, borderTop: `1px solid ${t.border}` }}>
              <form onSubmit={trimiteMesajChat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: t.bgInput, borderRadius: '14px', border: `1px solid ${t.border}`, padding: '6px 8px 6px 16px' }}>
                  <input
                    value={nouMesaj}
                    onChange={e => setNouMesaj(e.target.value)}
                    placeholder="Scrie un mesaj, propune o ofertă sau un termen..."
                    disabled={loadingMesaj}
                    style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', outline: 'none', color: t.textPrincipal, fontSize: '14px' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && nouMesaj.trim()) {
                        e.preventDefault();
                        trimiteMesajChat(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!nouMesaj.trim() || loadingMesaj}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                      backgroundColor: (nouMesaj.trim() && !loadingMesaj) ? '#2F6FED' : 'transparent',
                      color: (nouMesaj.trim() && !loadingMesaj) ? '#fff' : t.textSecundar,
                      border: 'none', cursor: (nouMesaj.trim() && !loadingMesaj) ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {loadingMesaj
                      ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Send size={15} />
                    }
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: t.textSecundar }}>
            <MessageSquare size={44} style={{ opacity: 0.15 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: t.textPrincipal }}>Niciun proiect disponibil</p>
              <p style={{ margin: 0, fontSize: '13px' }}>Adaugă un anunț pentru a crea o cameră de chat.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
