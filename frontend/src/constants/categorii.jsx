import React from 'react';
import { Layers, Wrench, Zap, Paintbrush2 } from 'lucide-react';

// ─── Taxonomie unică de categorii de lucrări ───────────────────────────────
// Folosită peste tot în aplicație: categoria unui proiect (SantiereView,
// AdaugaAnuntView), categoriile de servicii ale unui subcontractor și
// categoriile de materiale/echipamente ale unui furnizor (ProfilView) — ca
// să existe o singură sursă de adevăr și ca filtrarea/potrivirea ("categoria
// mea" vs "categoria proiectului") să funcționeze corect indiferent de rol.
export const CATEGORII_LUCRARI = [
  { value: 'Structuri',  label: 'Structuri & Betoane',              icon: <Layers size={15} />,      color: '#2F6FED' },
  { value: 'Instalații', label: 'Instalații (Sanitare/Termice)',    icon: <Wrench size={15} />,      color: '#f59e0b' },
  { value: 'Electrice',  label: 'Sisteme Electrice & Automatizări', icon: <Zap size={15} />,          color: '#a855f7' },
  { value: 'Finisaje',   label: 'Finisaje & Amenajări',             icon: <Paintbrush2 size={15} />, color: '#10b981' },
];

export const gasesteCategorie = (value) => CATEGORII_LUCRARI.find(c => c.value === value);
