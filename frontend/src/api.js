// src/api.js
// Strat central pentru toate apelurile către backend.
// Tot ce înseamnă utilizatori, proiecte și oferte se stochează REAL în MongoDB,
// prin acest API — nimic nu mai e ținut în localStorage (doar token-ul de sesiune).

export const API_URL = 'http://localhost:5000/api';
export const SERVER_URL = 'http://localhost:5000';

const TOKEN_KEY = 'cb_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function handleResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const mesaj = (data && data.mesaj) || `Eroare server (${res.status})`;
    const err = new Error(mesaj);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ─── AUTH ───────────────────────────────────────────────────────────────────
export async function apiRegister(payload) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiLogin(email, parola) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, parola }),
  });
  return handleResponse(res);
}

export async function apiMe() {
  const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiActualizeazaProfil(payload) {
  const res = await fetch(`${API_URL}/auth/profil`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiVerificaCont(cod) {
  const res = await fetch(`${API_URL}/auth/verifica-cont`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ cod }),
  });
  return handleResponse(res);
}

export async function apiRetrimiteCodVerificare() {
  const res = await fetch(`${API_URL}/auth/retrimite-cod`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// Re-verifică CUI-ul din profilul contului autentificat (persistă rezultatul)
export async function apiVerificaCuiProfil() {
  const res = await fetch(`${API_URL}/cui/verifica`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiDescarcaContractPdf(ofertaId) {
  const res = await fetch(`${API_URL}/oferte/${ofertaId}/contract-pdf`, { headers: authHeaders() });
  if (!res.ok) {
    let mesaj = `Eroare server (${res.status})`;
    try { mesaj = (await res.json()).mesaj || mesaj; } catch {}
    throw new Error(mesaj);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contract-${ofertaId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── PROIECTE ───────────────────────────────────────────────────────────────
export async function apiListaProiecte(filtre = {}) {
  const params = new URLSearchParams(filtre).toString();
  const res = await fetch(`${API_URL}/projects${params ? `?${params}` : ''}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiProiect(id) {
  const res = await fetch(`${API_URL}/projects/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

// Anunțuri publicate DOAR ca "prospectare piață" (vizibile în pagina dedicată,
// nu în lista normală de șantiere)
export async function apiAnunturiProspectare() {
  const res = await fetch(`${API_URL}/projects?prospectare=true`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreazaProiect(payload) {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ─── OFERTE ─────────────────────────────────────────────────────────────────
export async function apiOferteProiect(proiectId, toate = false) {
  const res = await fetch(`${API_URL}/oferte/proiect/${proiectId}${toate ? '?toate=true' : ''}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiOferteleMele() {
  const res = await fetch(`${API_URL}/oferte/ale-mele`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiTrimiteOferta(payload) {
  const res = await fetch(`${API_URL}/oferte`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiActualizeazaStatusOferta(id, status) {
  const res = await fetch(`${API_URL}/oferte/${id}/status`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function apiRetrageOferta(id) {
  const res = await fetch(`${API_URL}/oferte/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── UPLOAD ─────────────────────────────────────────────────────────────────
export async function apiUploadFisiere(fisiere) {
  if (!fisiere || fisiere.length === 0) return { fisiere: [] };
  const formData = new FormData();
  fisiere.forEach(f => formData.append('fisiere', f));
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

// ─── CONTACT (dezvăluit doar la câștigarea unei oferte) ─────────────────────
export async function apiContactOferta(ofertaId) {
  const res = await fetch(`${API_URL}/oferte/${ofertaId}/contact`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── VERIFICARE CUI (ANAF) ───────────────────────────────────────────────────
export async function apiVerificaCui(cui) {
  const res = await fetch(`${API_URL}/cui/${encodeURIComponent(cui)}`);
  return handleResponse(res);
}

// ─── PORTOFOLIU & DISPONIBILITATE (subcontractor) ────────────────────────────
export async function apiAdaugaLucrare(payload) {
  const res = await fetch(`${API_URL}/auth/lucrari`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiStergeLucrare(id) {
  const res = await fetch(`${API_URL}/auth/lucrari/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdaugaDisponibilitate(payload) {
  const res = await fetch(`${API_URL}/auth/disponibilitate`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiStergeDisponibilitate(id) {
  const res = await fetch(`${API_URL}/auth/disponibilitate/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handleResponse(res);
}

// ─── UTILITARE (curs valutar, vreme șantier) ─────────────────────────────────
// ─── NOTIFICARI ─────────────────────────────────────────────────────────────
export async function apiNotificari() {
  const res = await fetch(`${API_URL}/notificari`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiMarcheazaNotificareCitita(id) {
  const res = await fetch(`${API_URL}/notificari/${id}/citeste`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiMarcheazaToateNotificarileCitite() {
  const res = await fetch(`${API_URL}/notificari/citeste-toate`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiStergeNotificare(id) {
  const res = await fetch(`${API_URL}/notificari/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiStergeToateNotificarile() {
  const res = await fetch(`${API_URL}/notificari`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── PROSPECTARE PIAȚĂ ──────────────────────────────────────────────────────
export async function apiOportunitatiPiata() {
  const res = await fetch(`${API_URL}/prospectare/oportunitati`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAnalizaPiata() {
  const res = await fetch(`${API_URL}/prospectare/piata`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCursValutar() {
  const res = await fetch(`${API_URL}/utile/curs-valutar`);
  return handleResponse(res);
}

export async function apiVremeProiect(oras, judet) {
  const params = new URLSearchParams({ oras: oras || '', judet: judet || '' }).toString();
  const res = await fetch(`${API_URL}/utile/vreme?${params}`);
  return handleResponse(res);
}
