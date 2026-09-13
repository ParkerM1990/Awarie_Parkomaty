// CPG Inkasacja - pelna trasa Google Maps do 50 punktow
// Google Maps URL obsluguje ograniczona liczbe punktow posrednich w pojedynczym linku,
// dlatego trasa jest dzielona na odcinki po maks. 10 parkomatow.
(function(){
  function el(id){ return document.getElementById(id); }

  function hasCoords(x){
    return x && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)) &&
      (Number(x.lat)!==0 || Number(x.lng)!==0);
  }

  function coord(x){
    return `${Number(x.lat).toFixed(6)},${Number(x.lng).toFixed(6)}`;
  }

  function buildGoogleMapsUrl(points, origin){
    if(!points.length) return null;
    const destination = points[points.length - 1];
    const waypoints = points.slice(0, -1);
    let url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
    if(origin && hasCoords(origin)) url += `&origin=${encodeURIComponent(coord(origin))}`;
    url += `&destination=${encodeURIComponent(coord(destination))}`;
    if(waypoints.length){
      url += `&waypoints=${encodeURIComponent(waypoints.map(coord).join('|'))}`;
    }
    return url;
  }

  function getPendingRoute(){
    try{
      return (state?.route || []).filter(x => x.status === 'pending' && hasCoords(x)).slice(0, 50);
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

  function getOriginForSegment(chunks, index){
    if(index > 0) return chunks[index-1][chunks[index-1].length-1];
    try{
      if(state?.currentPosition && hasCoords(state.currentPosition)) return state.currentPosition;
      if(state?.start && hasCoords(state.start)) return state.start;
    }catch(e){}
    return null;
  }

  function closeRouteModal(){
    const modal = el('route50Modal');
    if(modal) modal.remove();
  }

  function openSegment(chunks, index){
    const url = buildGoogleMapsUrl(chunks[index], getOriginForSegment(chunks, index));
    if(!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function showRouteSegments(){
    const points = getPendingRoute();
    if(!points.length){
      alert('Brak pozostalych parkomatow ze wspolrzednymi GPS.');
      return;
    }

    // Maks. 10 parkomatow na jeden link Google Maps (9 waypointow + cel).
    // Przy 50 punktach powstaje maks. 5 odcinkow.
    const chunks = chunkRoute(points, 10);
    closeRouteModal();

    const modal = document.createElement('div');
    modal.id = 'route50Modal';
    modal.className = 'route50-modal';

    const rows = chunks.map((segment, idx) => {
      const firstNo = idx * 10 + 1;
      const lastNo = firstNo + segment.length - 1;
      const first = segment[0];
      const last = segment[segment.length-1];
      return `
        <button class="route50-segment" data-segment="${idx}">
          <span class="route50-segment-no">${idx+1}</span>
          <span class="route50-segment-text">
            <strong>Odcinek ${idx+1}: punkty ${firstNo}-${lastNo}</strong>
            <small>${escapeText(first.id || '')} → ${escapeText(last.id || '')}</small>
          </span>
          <span class="route50-arrow">›</span>
        </button>`;
    }).join('');

    modal.innerHTML = `
      <div class="route50-backdrop" data-close="1"></div>
      <div class="route50-sheet" role="dialog" aria-modal="true" aria-label="Trasa Google Maps">
        <div class="route50-head">
          <div>
            <span class="eyebrow">GOOGLE MAPS</span>
            <h2>Trasa do ${points.length} punktow</h2>
          </div>
          <button class="route50-close" data-close="1" aria-label="Zamknij">×</button>
        </div>
        <p class="route50-note">Google Maps nie przyjmuje 50 punktow w jednym linku. Otwieraj kolejne odcinki po 10 punktow; kazdy nastepny zaczyna sie od ostatniego punktu poprzedniego.</p>
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
    // Klon usuwa poprzedni listener z app.js, ktory ograniczal trase do 10 punktow.
    const btn = oldBtn.cloneNode(true);
    btn.textContent = 'Google Maps (do 50)';
    oldBtn.replaceWith(btn);
    btn.addEventListener('click', showRouteSegments);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
