import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import BannerSuspendare from '../components/BannerSuspendare.jsx';
import {
  apiActualizeazaProiect, apiTrimiteModificariProiect,
  apiActualizeazaCerere, apiTrimiteModificariCerere,
} from '../api.js';

// Pagina „Modificări cerute” — apare în meniu doar cât timp firma are anunțuri
// sau cereri suspendate de admin. Fiecare are motivul și formularul de corectare.
export default function ModificariView({ t, modificari, onActualizat }) {
  const { proiecte = [], cereri = [] } = modificari || {};
  const total = proiecte.length + cereri.length;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '700', color: t.textPrincipal }}>Modificări cerute</h1>
        <p style={{ margin: 0, fontSize: '14px', color: t.textSecundar, lineHeight: 1.5 }}>
          Administratorul a suspendat temporar {total === 1 ? 'un anunț' : 'câteva anunțuri'}. Corectează ce ți s-a cerut și trimite modificările. După ce le aprobăm, anunțul reapare în liste.
        </p>
      </div>

      {total === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px', borderRadius: '12px', border: `1px solid ${t.border}`, backgroundColor: t.bgCard, color: t.textPrincipal, fontSize: '14px' }}>
          <CheckCircle2 size={18} color={t.success} /> Nu ai nimic de modificat.
        </div>
      )}

      {proiecte.map(p => (
        <Element key={p._id} t={t} tip="Proiect" titlu={p.titlu}>
          <BannerSuspendare
            t={t}
            element={p}
            esteProprietar
            campuri={[
              { cheie: 'titlu', eticheta: 'Titlu' },
              { cheie: 'descriere', eticheta: 'Descriere', multilinie: true },
              { cheie: 'buget', eticheta: 'Buget' },
              { cheie: 'locatie', eticheta: 'Locație' },
            ]}
            onSalveaza={(valori) => apiActualizeazaProiect(p._id, valori)}
            onTrimite={() => apiTrimiteModificariProiect(p._id)}
            onActualizat={onActualizat}
          />
        </Element>
      ))}

      {cereri.map(c => (
        <Element key={c._id} t={t} tip="Cerere de materiale" titlu={c.titlu}>
          <BannerSuspendare
            t={t}
            element={c}
            esteProprietar
            campuri={[
              { cheie: 'titlu', eticheta: 'Titlu' },
              { cheie: 'descriere', eticheta: 'Descriere', multilinie: true },
              { cheie: 'oras', eticheta: 'Oraș' },
            ]}
            onSalveaza={(valori) => apiActualizeazaCerere(c._id, valori)}
            onTrimite={() => apiTrimiteModificariCerere(c._id)}
            onActualizat={onActualizat}
          />
        </Element>
      ))}
    </div>
  );
}

function Element({ t, tip, titlu, children }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: t.textSecundar, marginBottom: '6px' }}>
        {tip}: <b style={{ color: t.textPrincipal }}>{titlu}</b>
      </div>
      {children}
    </div>
  );
}
