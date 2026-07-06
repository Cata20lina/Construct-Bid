// ─── Geocodare adresă → coordonate ────────────────────────────────────────
// Folosește Nominatim (OpenStreetMap) — gratuit, fără cheie de acces, dar cu
// politică de utilizare care cere un User-Agent descriptiv și max ~1 cerere/
// secundă. Suficient pentru geocodarea unui proiect nou/editat (evenimente
// rare, nu bulk). Documentație: https://nominatim.org/release-docs/latest/api/Search/
async function geocodeazaAdresa(text) {
  const query = String(text || '').trim();
  if (!query) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ro&q=${encodeURIComponent(query)}`;
    const raspuns = await fetch(url, {
      headers: { 'User-Agent': 'ConstructBid/1.0 (platforma licitatii constructii)' },
    });
    if (!raspuns.ok) return null;

    const rezultate = await raspuns.json();
    const primul = rezultate?.[0];
    if (!primul) return null;

    return { latitudine: Number(primul.lat), longitudine: Number(primul.lon) };
  } catch (err) {
    console.error('[geocode] eroare:', err.message);
    return null;
  }
}

module.exports = { geocodeazaAdresa };
