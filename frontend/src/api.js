// src/api.js
// Strat central pentru toate apelurile către backend.
// Tot ce înseamnă utilizatori, proiecte și oferte se stochează REAL în MongoDB,
// prin acest API — nimic nu mai e ținut în localStorage (doar token-ul de sesiune).

// În producție, setează VITE_API_URL în variabilele de mediu ale hosting-ului
// (ex: Vercel) la adresa backend-ului tău (ex: https://constructbid-api.onrender.com).
// Local, dacă nu setezi nimic, folosește implicit serverul de pe localhost:5000.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = `${BASE_URL}/api`;
export const SERVER_URL = BASE_URL;

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

export async function apiSolicitaResetareParola(email) {
  const res = await fetch(`${API_URL}/auth/solicita-resetare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

export async function apiReseteazaParola(email, cod, parolaNoua) {
  const res = await fetch(`${API_URL}/auth/reseteaza-parola`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, cod, parolaNoua }),
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

// ─── RECOMANDĂRI / REFERINȚE (subcontractor) ─────────────────────────────────
export async function apiAdaugaRecomandare(payload) {
  const res = await fetch(`${API_URL}/auth/recomandari`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiStergeRecomandare(id) {
  const res = await fetch(`${API_URL}/auth/recomandari/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handleResponse(res);
}

// ─── RATING / EVALUĂRI ────────────────────────────────────────────────────────
export async function apiEvaluariPrimite() {
  const res = await fetch(`${API_URL}/auth/evaluari-primite`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiLasaEvaluare(ofertaId, payload) {
  const res = await fetch(`${API_URL}/oferte/${ofertaId}/evaluare`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiEvaluareOferta(ofertaId) {
  const res = await fetch(`${API_URL}/oferte/${ofertaId}/evaluare`, { headers: authHeaders() });
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

// ─── ABONAMENT & TOKENURI ─────────────────────────────────────────────────────
export async function apiPlanuriAbonament() {
  const res = await fetch(`${API_URL}/tokenuri/planuri`);
  return handleResponse(res);
}

export async function apiSoldTokenuri() {
  const res = await fetch(`${API_URL}/tokenuri/sold`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiIstoricTokenuri() {
  const res = await fetch(`${API_URL}/tokenuri/istoric`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiUpgradeAbonament(plan) {
  const res = await fetch(`${API_URL}/tokenuri/upgrade`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ plan }),
  });
  return handleResponse(res);
}

export async function apiCumparaTokenuri(pachetId) {
  const res = await fetch(`${API_URL}/tokenuri/cumpara`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ pachetId }),
  });
  return handleResponse(res);
}

// Plată reală cu cardul (Stripe Checkout) — întoarce { url } spre care
// browserul trebuie redirecționat.
export async function apiCheckoutPachet(pachetId) {
  const res = await fetch(`${API_URL}/tokenuri/checkout-pachet`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ pachetId }),
  });
  return handleResponse(res);
}

export async function apiCheckoutAbonament(plan) {
  const res = await fetch(`${API_URL}/tokenuri/checkout-abonament`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ plan }),
  });
  return handleResponse(res);
}

export async function apiFacturi() {
  const res = await fetch(`${API_URL}/tokenuri/facturi`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiDescarcaFacturaPdf(numar) {
  const res = await fetch(`${API_URL}/tokenuri/facturi/${numar}/pdf`, { headers: authHeaders() });
  if (!res.ok) {
    let mesaj = `Eroare server (${res.status})`;
    try { mesaj = (await res.json()).mesaj || mesaj; } catch {}
    throw new Error(mesaj);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `factura-${numar}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Chat de suport ────────────────────────────────────────────────────────
export async function apiSuport() {
  const res = await fetch(`${API_URL}/suport`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiSuportTrimite(text) {
  const res = await fetch(`${API_URL}/suport/mesaje`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

export async function apiSuportCitit() {
  const res = await fetch(`${API_URL}/suport/citit`, { method: 'POST', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminSuportConversatii(status = '') {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_URL}/suport/admin/conversatii${qs}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminSuportConversatie(id) {
  const res = await fetch(`${API_URL}/suport/admin/conversatii/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminSuportRaspunde(id, text) {
  const res = await fetch(`${API_URL}/suport/admin/conversatii/${id}/mesaje`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

export async function apiAdminSuportCitit(id) {
  const res = await fetch(`${API_URL}/suport/admin/conversatii/${id}/citit`, { method: 'POST', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminSuportStatus(id, status) {
  const res = await fetch(`${API_URL}/suport/admin/conversatii/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

// ─── Clarificări (întrebări & răspunsuri pe proiect) ───────────────────────
export async function apiListaClarificari(proiectId) {
  const res = await fetch(`${API_URL}/clarificari/proiect/${proiectId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdaugaClarificare(proiectId, intrebare) {
  const res = await fetch(`${API_URL}/clarificari`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ proiectId, intrebare }),
  });
  return handleResponse(res);
}

export async function apiRaspundeClarificare(id, raspuns) {
  const res = await fetch(`${API_URL}/clarificari/${id}/raspuns`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ raspuns }),
  });
  return handleResponse(res);
}

// ─── Reclamații (raportare probleme) ───────────────────────────────────────
export async function apiCreeazaReclamatie(payload) {
  const res = await fetch(`${API_URL}/reclamatii`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiReclamatiileMele() {
  const res = await fetch(`${API_URL}/reclamatii/mele`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Admin ──────────────────────────────────────────────────────────────────
export async function apiAdminStatistici() {
  const res = await fetch(`${API_URL}/admin/statistici`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminUtilizatori(filtre = {}) {
  const params = new URLSearchParams(filtre);
  const res = await fetch(`${API_URL}/admin/utilizatori?${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminSuspendaUtilizator(id, motiv) {
  const res = await fetch(`${API_URL}/admin/utilizatori/${id}/suspenda`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ motiv }),
  });
  return handleResponse(res);
}

export async function apiAdminReactiveazaUtilizator(id) {
  const res = await fetch(`${API_URL}/admin/utilizatori/${id}/reactiveaza`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiAdminReclamatii(status) {
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_URL}/admin/reclamatii${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminActualizeazaReclamatie(id, payload) {
  const res = await fetch(`${API_URL}/admin/reclamatii/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiAdminActualizeazaUtilizator(id, payload) {
  const res = await fetch(`${API_URL}/admin/utilizatori/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiAdminAjusteazaTokenuri(id, suma, motiv) {
  const res = await fetch(`${API_URL}/admin/utilizatori/${id}/ajusteaza-tokenuri`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ suma, motiv }),
  });
  return handleResponse(res);
}

export async function apiAdminProiecte(filtre = {}) {
  const params = new URLSearchParams(filtre);
  const res = await fetch(`${API_URL}/admin/proiecte?${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminDezactiveazaProiect(id) {
  const res = await fetch(`${API_URL}/admin/proiecte/${id}/dezactiveaza`, { method: 'POST', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminActiveazaProiect(id) {
  const res = await fetch(`${API_URL}/admin/proiecte/${id}/activeaza`, { method: 'POST', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiAdminStergeProiect(id) {
  const res = await fetch(`${API_URL}/admin/proiecte/${id}`, { method: 'DELETE', headers: authHeaders() });
  return handleResponse(res);
}

// ─── Cereri de materiale (furnizori) ────────────────────────────────────────
export async function apiCereriDeschise(filtre = {}) {
  const params = new URLSearchParams(filtre);
  const res = await fetch(`${API_URL}/cereri-materiale?${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCererileMele() {
  const res = await fetch(`${API_URL}/cereri-materiale/mele`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiOfertelemeleMateriale() {
  const res = await fetch(`${API_URL}/cereri-materiale/ofertele-mele`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCerereDetaliu(id) {
  const res = await fetch(`${API_URL}/cereri-materiale/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreeazaCerere(payload) {
  const res = await fetch(`${API_URL}/cereri-materiale`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiAnuleazaCerere(id) {
  const res = await fetch(`${API_URL}/cereri-materiale/${id}/anuleaza`, { method: 'POST', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiTrimiteOfertaMateriale(cerereId, payload) {
  const res = await fetch(`${API_URL}/cereri-materiale/${cerereId}/oferte`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiRetrageOfertaMateriale(cerereId, ofertaId) {
  const res = await fetch(`${API_URL}/cereri-materiale/${cerereId}/oferte/${ofertaId}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiAccetaArticolCerere(cerereId, articolId, ofertaArticolId) {
  const res = await fetch(`${API_URL}/cereri-materiale/${cerereId}/articole/${articolId}/accepta`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ofertaArticolId }),
  });
  return handleResponse(res);
}

export async function apiContactFurnizorCerere(cerereId, furnizorId) {
  const res = await fetch(`${API_URL}/cereri-materiale/${cerereId}/contact/${furnizorId}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Catalog public de furnizori ─────────────────────────────────────────────
export async function apiCatalog(filtre = {}) {
  const params = new URLSearchParams(filtre);
  const res = await fetch(`${API_URL}/catalog?${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Comenzi directe din catalog ─────────────────────────────────────────────
export async function apiComandaCatalog(produsId, payload) {
  const res = await fetch(`${API_URL}/catalog/${produsId}/comanda`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function apiComenzileMeleCatalog() {
  const res = await fetch(`${API_URL}/catalog/comenzile-mele`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiComenziPrimiteCatalog() {
  const res = await fetch(`${API_URL}/catalog/comenzi-primite`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiConfirmaComandaCatalog(id) {
  const res = await fetch(`${API_URL}/catalog/comenzi/${id}/confirma`, { method: 'PUT', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiRefuzaComandaCatalog(id, motiv) {
  const res = await fetch(`${API_URL}/catalog/comenzi/${id}/refuza`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ motiv }),
  });
  return handleResponse(res);
}

export async function apiAnuleazaComandaCatalog(id) {
  const res = await fetch(`${API_URL}/catalog/comenzi/${id}/anuleaza`, { method: 'POST', headers: authHeaders() });
  return handleResponse(res);
}

export async function apiContactComandaCatalog(id) {
  const res = await fetch(`${API_URL}/catalog/comenzi/${id}/contact`, { headers: authHeaders() });
  return handleResponse(res);
}
