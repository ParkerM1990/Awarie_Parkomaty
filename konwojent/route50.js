// CPG Inkasacja - Google Maps do 50 punktow.
// Trasa jest dzielona na odcinki po maks. 10 parkomatow.
// Punkt startowy NIE jest przekazywany do Google Maps: nawigacja startuje
// z biezacej lokalizacji telefonu. Baza CPG (KOR 48) sluzy tylko do obliczen
// i optymalizacji trasy wewnatrz aplikacji.
(function(){
  function el(id){ return document.getElementById(id); }

  function hasCoords(x){
    return x && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)) &&
      (Number(x.lat)!==0 || Number(x.lng)!==0);
  }

  function coord(x){
    return `${Number(x.lat).toFixed(6)},${Number(x.lng).toFixed(6)}`;
  }

  function buildGoogleMapsUrl(points){
    if(!points.length) return null;
    const destination = points[points.length - 1];
    const waypoints = points.slice(0, -1);

    // Brak parametru origin = Google Maps korzysta z biezacej lokalizacji telefonu.
    // dir_action=navigate prosi aplikacje Google Maps o uruchomienie prowadzenia,
    // zamiast otwarcia samego podgladu trasy.
    let url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&dir_action=navigate';
    url += `&destination=${encodeURIComponent(coord(destination))}`;
    if(waypoints.length){
      url += `&waypoints=${encodeURIComponent(waypoints.map(coord).join('|'))}`;
    }
    return url;
  }

  function getPendingRoute(){
    try{
      return (state?.route || [])
        .filter(x => x.status === 'pending' && hasCoords(x))
        .slice(0, 50);
    }catch(e){
      return [];
    }
  }

  function chunkRoute(points, size){
    const chunks = [];
    for(let i=0;i<points.length;i+=size){
      chunks.push(points.slice(i, i+size));
    }
    return chunks;
  }

  function closeRouteModal(){
    const modal = el('route50Modal');
    if(modal) modal.remove();
  }

  function openSegment(chunks, index){
    const url = buildGoogleMapsUrl(chunks[index]);
    if(!url) return;
    // Wywolanie jest bezposrednia reakcja na klikniecie uzytkownika, wiec
    // telefon moze przekazac adres do aplikacji Google Maps.
    window.location.href = url;
  }

  function showRouteSegments(){
    const points = getPendingRoute();
    if(!points.length){
      alert('Brak pozostalych parkomatow ze wspolrzednymi GPS.');
      return;
    }

    const chunks = chunkRoute(points, 10);
    closeRouteModal();

    const modal = document.createElement('div');
    modal.id = 'route50Modal';
    modal.className = 'route50-modal';

    const rows = chunks.map((segment, idx) => {
      const firstNo = idx * 10 + 1;
      const lastNo = firstNo + segment.length - 1;
      const first = segment[0];
      const last = segment[segment.length - 1];
      return `
        <button class="route50-segment" data-segment="${idx}">
          <span class="route50-segment-no">${idx+1}</span>
          <span class="route50-segment-text">
            <strong>Nawiguj: punkty ${firstNo}-${lastNo}</strong>
            <small>${escapeText(first.id || '')} → ${escapeText(last.id || '')}</small>
          </span>
          <span class="route50-arrow">›</span>
        </button>`;
    }).join('');

    modal.innerHTML = `
      <div class="route50-backdrop" data-close="1"></div>
      <div class="route50-sheet" role="dialog" aria-modal="true" aria-label="Nawigacja Google Maps">
        <div class="route50-head">
          <div>
            <span class="eyebrow">GOOGLE MAPS</span>
            <h2>Nawigacja do ${points.length} punktow</h2>
          </div>
          <button class="route50-close" data-close="1" aria-label="Zamknij">×</button>
        </div>
        <p class="route50-note">Kazdy odcinek uruchamia Google Maps od biezacej lokalizacji telefonu. Baza KOR 48 jest uzywana tylko do obliczenia kolejnosci trasy w aplikacji CPG.</p>
        <div class="route50-list">${rows}</div>
      </div>`;

    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close="1"]').forEach(x => x.addEventListener('click', closeRouteModal));
    modal.querySelectorAll('[data-segment]').forEach(btn => btn.addEventListener('click', () => {
      openSegment(chunks, Number(btn.dataset.segment));
    }));
  }

  function escapeText(v){
    return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  function install(){
    const oldBtn = el('fullRouteBtn');
    if(!oldBtn) return;
    // Klon usuwa listener z app.js, ktory otwieral trase z ograniczona liczba punktow.
    const btn = oldBtn.cloneNode(true);
    btn.textContent = 'Nawigacja Google Maps (do 50)';
    oldBtn.replaceWith(btn);
    btn.addEventListener('click', showRouteSegments);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
