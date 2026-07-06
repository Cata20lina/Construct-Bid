import React, { useState, useEffect } from 'react';
import { Building2, PlusCircle, MapPin, Coins, Calendar, User, Search } from 'lucide-react';

export default function Proiecte({ user, onLogout }) {
  const [proiecte, setProiecte] = useState([]);
  
  // Stări pentru formularul de adăugare proiect
  const [titlu, setTitlu] = useState('');
  const [descriere, setDescriere] = useState('');
  const [buget, setBuget] = useState('');
  const [valuta, setValuta] = useState('EUR'); 
  const [judetProiect, setJudetProiect] = useState('');
  const [termenLimita, setTermenLimita] = useState('');

  // Stări pentru filtrare și căutare
  const [filtruJudet, setFiltruJudet] = useState('');
  const [filtruValuta, setFiltruValuta] = useState('TOATE');
  const [cautare, setCautare] = useState('');

  const judeteRomania = [
    "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "București",
    "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
    "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț",
    "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea", "Vrancea"
  ];

  useEffect(() => {
    const salvate = JSON.parse(localStorage.getItem('baza_proiecte') || '[]');
    setProiecte(salvate);
  }, []);

  const handleAdaugaProiect = (e) => {
    e.preventDefault();
    
    const nouProiect = {
      id: Date.now(),
      titlu,
      descriere,
      buget: parseFloat(buget),
      valuta,
      judet: judetProiect,
      termenLimita,
      autor: user?.nume || 'Dezvoltator Anonim',
      dataPublicare: new Date().toLocaleDateString('ro-RO')
    };

    const proiecteActualizate = [nouProiect, ...proiecte];
    setProiecte(proiecteActualizate);
    localStorage.setItem('baza_proiecte', JSON.stringify(proiecteActualizate));

    setTitlu('');
    setDescriere('');
    setBuget('');
    setJudetProiect('');
    setTermenLimita('');
    alert('🎉 Proiectul a fost publicat cu succes în valuta ' + valuta + '!');
  };

  const proiecteFiltrate = proiecte.filter(p => {
    const matchCautare = p.titlu.toLowerCase().includes(cautare.toLowerCase()) || p.descriere.toLowerCase().includes(cautare.toLowerCase());
    const matchJudet = filtruJudet === '' || p.judet === filtruJudet;
    const matchValuta = filtruValuta === 'TOATE' || p.valuta === filtruValuta;
    return matchCautare && matchJudet && matchValuta;
  });

  const getSimbolValuta = (v) => {
    if (v === 'EUR') return '€';
    if (v === 'USD') return '$';
    return 'RON';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b1329', fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#fff', paddingBottom: '60px' }}>
      
      {/* NAVBAR TOP (Sesiune utilizator integrată global) */}
      <nav style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '8px', borderRadius: '10px' }}>
            <Building2 size={20} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>Construct<span style={{ color: '#3b82f6' }}>Bid</span></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{user?.nume}</div>
            <div style={{ fontSize: '11px', color: user?.rol === 'DEZVOLTATOR' ? '#a855f7' : '#3b82f6', fontWeight: '700', letterSpacing: '0.5px' }}>
              {user?.rol === 'DEZVOLTATOR' ? '🏢 DEZVOLTATOR' : '👷 SUBCONTRACTOR'}
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}>
            Deconectare
          </button>
        </div>
      </nav>

      {/* CONȚINUT CENTRALIZAT */}
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* SECȚIUNEA 1: Formularul de adăugare proiect (Full-Width, compact și curat) */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0' }}>Lansează un Caiet de Sarcini Nou</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Datele introduse vor fi indexate public în bursă pentru toți subcontractorii.</p>
          </div>

          <form onSubmit={handleAdaugaProiect} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Titlu Obiectiv / Proiect</label>
                <input type="text" required value={titlu} onChange={(e) => setTitlu(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} placeholder="ex: Structură Bloc Rezidențial P+4" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Estimare Buget</label>
                  <input type="number" required value={buget} onChange={(e) => setBuget(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} placeholder="Valoare numerică" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Valută</label>
                  <select value={valuta} onChange={(e) => setValuta(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="RON">RON (Lei)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Descriere Lucrări & Specificații Tehnice</label>
              <textarea required value={descriere} onChange={(e) => setDescriere(e.target.value)} rows="2" style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Detalii despre materiale, faze de execuție sau cerințe logistice speciale..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Locație Șantier (Județ)</label>
                <select required value={judetProiect} onChange={(e) => setJudetProiect(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                  <option value="" disabled hidden>Selectează județul...</option>
                  {judeteRomania.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>Termen Limită Ofertare</label>
                <input type="date" required value={termenLimita} onChange={(e) => setTermenLimita(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#1e293b', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', border: 'none', padding: '13px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.2)' }}>
                <PlusCircle size={16} /> Publică Proiect
              </button>
            </div>
          </form>
        </div>

        {/* SECȚIUNEA 2: Bursa de proiecte + Filtre standardizate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Bara de Filtre Orizontală */}
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input type="text" value={cautare} onChange={(e) => setCautare(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} placeholder="Caută după cuvinte cheie..." />
            </div>

            <select value={filtruJudet} onChange={(e) => setFiltruJudet(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '160px' }}>
              <option value="">Toate Județele</option>
              {judeteRomania.map(j => <option key={j} value={j}>{j}</option>)}
            </select>

            <select value={filtruValuta} onChange={(e) => setFiltruValuta(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#1e293b', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '160px' }}>
              <option value="TOATE">Toate Valutele</option>
              <option value="EUR">Buget în EUR (€)</option>
              <option value="USD">Buget în USD ($)</option>
              <option value="RON">Buget în RON (Lei)</option>
            </select>
          </div>

          {/* Afișarea Cardurilor (Grid curat pe 2 coloane) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))', gap: '20px' }}>
            {proiecteFiltrate.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: '#0f172a', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px', color: '#64748b', fontSize: '14px' }}>
                Niciun proiect nu corespunde criteriilor stabilite.
              </div>
            ) : (
              proiecteFiltrate.map((p) => (
                <div key={p.id} style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', transition: 'transform 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0', color: '#fff' }}>{p.titlu}</h3>
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>{p.descriere}</p>
                    </div>
                    
                    <div style={{ backgroundColor: p.valuta === 'EUR' ? 'rgba(16, 185, 129, 0.1)' : p.valuta === 'USD' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: p.valuta === 'EUR' ? '#34d399' : p.valuta === 'USD' ? '#60a5fa' : '#fbbf24', padding: '6px 14px', borderRadius: '30px', fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                      {p.buget.toLocaleString()} {getSimbolValuta(p.valuta)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '12px', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} style={{ color: '#ef4444' }} /> Județ: <span style={{ color: '#cbd5e1', fontWeight: '700' }}>{p.judet}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> Dată Limită: <span style={{ color: '#cbd5e1', fontWeight: '700' }}>{p.termenLimita}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                      <User size={14} /> Companie: <span style={{ color: '#94a3b8' }}>{p.autor}</span>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}