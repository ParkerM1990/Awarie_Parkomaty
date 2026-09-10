const state = {
  sourceRows: [], route: [], currentIndex: null, map: null, markers: [], lastExcelBlob: null,
  currentPosition: null, filter:'all', search:'', history:[], routeMeta:{startedAt:null,finishedAt:null},
  start: {name:'Baza CPG', lat:51.4021, lng:21.1473}
};

const $ = id => document.getElementById(id);
const views = ['setupView','routeView','deviceView','finishView','reportView'];
function showView(id){views.forEach(v=>$(v).classList.toggle('active',v===id)); window.scrollTo({top:0,behavior:'smooth'}); if(id==='routeView') setTimeout(renderMap,80)}
function money(v){return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',maximumFractionDigits:0}).format(Number(v)||0)}
function money2(v){return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)}
function num(v){if(v===null||v===undefined||v==='')return 0; if(typeof v==='number')return v; return Number(String(v).replace(/\s/g,'').replace('%','').replace(',','.').replace(/[^0-9.-]/g,''))||0}
function normKey(k){return String(k||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function pick(obj, aliases){const keys=Object.keys(obj); for(const a of aliases){const found=keys.find(k=>normKey(k)===normKey(a)); if(found!==undefined && obj[found]!==undefined && obj[found]!==null && obj[found]!=='') return obj[found]} return ''}
function normalizeRow(r,i){
  let lat=num(pick(r,['Y','lat','latitude','szerokosc','szerokoscgeograficzna']));
  let lng=num(pick(r,['X','lng','lon','longitude','dlugosc','dlugoscgeograficzna']));
  if(Math.abs(lat)>90 && Math.abs(lng)<=90){const t=lat;lat=lng;lng=t}
  return {
    id:String(pick(r,['ID','Nr','Numer','parkomat','nrparkomatu','urzadzenie'])||`P-${String(i+1).padStart(3,'0')}`),
    location:String(pick(r,['Lokalizacja','Adres','address','location','ulica'])||'Brak lokalizacji'),
    lat,lng,
    cash:num(pick(r,['Gotowka','Kwota','cash','stan gotowki','wartosc','amount'])),
    fill:num(pick(r,['Zapelnienie','Procent','fill','procent zapelnienia','poziom zapelnienia'])),
    status:'pending', seal:'', reason:'', notes:'', updatedAt:null, priority:0, collectedCash:null, qrRaw:'', qrScannedAt:null
  }
}

function sampleData(){
 const center=[51.4021,21.1473];
 state.sourceRows=Array.from({length:52},(_,i)=>({
   id:`RA-${String(101+i).padStart(3,'0')}`,
   location:`ul. ${['Żeromskiego','Sienkiewicza','Traugutta','Reja','Warszawska','Struga','Malczewskiego','25 Czerwca'][i%8]} ${3+(i%28)}`,
   lat:center[0]+((i%9)-4)*0.006+(Math.sin(i)*0.0015),
   lng:center[1]+((Math.floor(i/9))-2)*0.009+(Math.cos(i)*0.0015),
   cash:1200+((i*587)%3600), fill:48+((i*7)%50), status:'pending',seal:'',reason:'',notes:'',updatedAt:null,priority:0,collectedCash:null,qrRaw:'',qrScannedAt:null
 }));
 $('fileStatus').textContent=`Dane przykładowe: ${state.sourceRows.length} urządzeń.`;
}

$('sampleBtn').addEventListener('click',sampleData);
$('fileInput').addEventListener('change', async e=>{
 const file=e.target.files[0]; if(!file)return;
 try{
   const buf=await file.arrayBuffer(); const wb=XLSX.read(buf,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]];
   const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
   state.sourceRows=rows.map(normalizeRow).filter(r=>r.id);
   $('fileStatus').textContent=`Wczytano ${file.name}: ${state.sourceRows.length} urządzeń.`;
 }catch(err){alert('Nie udało się odczytać pliku: '+err.message)}
});

function distance(a,b){const R=6371, toRad=x=>x*Math.PI/180; const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng); const aa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2; return 2*R*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa))}
function optimizeNearest(items,start){const left=[...items], ordered=[], cur={...start}; while(left.length){let bi=0,bd=Infinity; left.forEach((p,i)=>{const d=(p.lat&&p.lng)?distance(cur,p):Infinity;if(d<bd){bd=d;bi=i}}); const p=left.splice(bi,1)[0]; ordered.push(p); if(p.lat&&p.lng){cur.lat=p.lat;cur.lng=p.lng}} return ordered}
function routeLength(route,start){let total=0,cur=start; for(const p of route){if(canNavigate(cur)&&canNavigate(p)) total+=distance(cur,p); cur=p} return total}
function optimizeLocal(items,start){
  let route=optimizeNearest(items,start);
  if(route.length<4)return route;
  let improved=true,passes=0;
  while(improved && passes<6){
    improved=false; passes++;
    for(let i=0;i<route.length-2;i++){
      for(let k=i+1;k<route.length-1;k++){
        const candidate=[...route.slice(0,i),...route.slice(i,k+1).reverse(),...route.slice(k+1)];
        if(routeLength(candidate,start)+0.01<routeLength(route,start)){route=candidate; improved=true}
      }
    }
  }
  return route;
}

$('buildRouteBtn').addEventListener('click',()=>{
 if(!state.sourceRows.length){alert('Najpierw wczytaj plik lub dane przykładowe.');return}
 const count=Math.max(1,Math.min(40,num($('deviceCount').value)||35));
 state.start={name:$('startName').value||'Punkt startowy',lat:num($('startLat').value),lng:num($('startLng').value)};
 let ranked=[...state.sourceRows].sort((a,b)=>{
   const cw=num($('cashWeight')?.value)||1, fw=num($('fillWeight')?.value)||20;
   const sa=(a.cash*cw)+(($('sortFill').checked?a.fill*fw:0));
   const sb=(b.cash*cw)+(($('sortFill').checked?b.fill*fw:0)); return sb-sa;
 }).slice(0,count).map(x=>({...x,status:'pending',seal:'',reason:'',notes:'',updatedAt:null,priority:0,collectedCash:null,qrRaw:'',qrScannedAt:null}));
 state.route=optimizeLocal(ranked,state.start);
 state.routeMeta={startedAt:new Date().toISOString(),finishedAt:null}; state.history=[];
 saveState(); renderRoute(); showView('routeView');
});

function saveState(){localStorage.setItem('cpg-inkasacja-state',JSON.stringify({route:state.route,start:state.start,routeMeta:state.routeMeta,history:state.history}))}
function clearState(){localStorage.removeItem('cpg-inkasacja-state')}
function restoreState(){try{const x=JSON.parse(localStorage.getItem('cpg-inkasacja-state'));if(x?.route?.length){state.route=x.route.map(r=>({collectedCash:null,qrRaw:'',qrScannedAt:null,...r}));state.start=x.start||state.start;state.routeMeta=x.routeMeta||{startedAt:null,finishedAt:null};state.history=x.history||[];renderRoute();showView('routeView')}}catch{}}

function renderRoute(){
 const done=state.route.filter(x=>x.status==='done').length, skipped=state.route.filter(x=>x.status==='skip').length;
 $('statSelected').textContent=state.route.length; $('statCash').textContent=money(state.route.reduce((s,x)=>s+x.cash,0)); if($('statCollectedCash')) $('statCollectedCash').textContent=money2(state.route.reduce((s,x)=>s+(x.status==='done'?(Number(x.collectedCash)||0):0),0)); $('statDone').textContent=done; $('statSkipped').textContent=skipped;
 $('routeTitle').textContent=`${state.start.name} • ${state.route.length} urządzeń`;
 const pendingCount=state.route.filter(x=>x.status==='pending').length;
 const progress=state.route.length?Math.round(((state.route.length-pendingCount)/state.route.length)*100):0;
 $('routeSummary').innerHTML=`Pozostało: ${pendingCount}<div class="progressbar"><span style="width:${progress}%"></span></div>`;
 if($('routeStartedAt'))$('routeStartedAt').textContent=formatDateTime(state.routeMeta.startedAt);
 if($('routeElapsed'))$('routeElapsed').textContent=elapsedLabel(state.routeMeta.startedAt,state.routeMeta.finishedAt);
 if($('routeProgress'))$('routeProgress').textContent=`${progress}%`;
 const nextIndex=state.route.findIndex(x=>x.status==='pending');
 const q=(state.search||'').toLowerCase();
 const visible=state.route.map((x,i)=>({x,i})).filter(({x})=>(state.filter==='all'||x.status===state.filter)&&(!q||x.id.toLowerCase().includes(q)||x.location.toLowerCase().includes(q)));
 $('deviceList').innerHTML=visible.map(({x,i})=>`<div class="device-row ${i===nextIndex?'next-pending':''}" data-i="${i}"><div class="order">${i+1}</div><div><strong>${escapeHtml(x.id)}</strong><span class="priority-pill">priorytet ${Math.round(x.priority||0)}</span><div class="sub">${escapeHtml(x.location)}</div><span class="badge ${x.status==='done'?'done':x.status==='skip'?'skip':'pending'}">${x.status==='done'?'Zainkasowano':x.status==='skip'?'Nie zainkasowano':i===nextIndex?'Następny':'Do wykonania'}</span></div><div class="amount">${money(x.cash)}${x.status==='done'&&x.collectedCash!==null?`<div class="collected-value">wybrano: ${money2(x.collectedCash)}</div>`:''}<div class="sub">${Math.round(x.fill)}%</div></div></div>`).join('')||'<div class="card muted">Brak urządzeń spełniających filtr.</div>';
 document.querySelectorAll('.device-row').forEach(el=>el.addEventListener('click',()=>openDevice(Number(el.dataset.i))));
 renderNextStop();
 saveState();
}


function nextPendingIndex(){return state.route.findIndex(x=>x.status==='pending')}
function renderNextStop(){
  const i=nextPendingIndex(), card=$('nextStopCard');
  if(!card)return;
  if(i<0){card.classList.add('hidden');return}
  const x=state.route[i]; card.classList.remove('hidden');
  $('nextStopId').textContent=`${i+1}. ${x.id}`; $('nextStopLocation').textContent=x.location; $('nextStopCash').textContent=money(x.cash);
}
function canNavigate(x){return x && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)) && (Number(x.lat)!==0 || Number(x.lng)!==0)}
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)}
function navigationUrl(x){
  const coords=`${x.lat},${x.lng}`;
  if(isIOS()) return `https://maps.apple.com/?daddr=${encodeURIComponent(coords)}&dirflg=d`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}&travelmode=driving&dir_action=navigate`;
}
function navigateToDevice(x){
  if(!canNavigate(x)){alert('Brak poprawnych współrzędnych GPS dla tego urządzenia.');return}
  window.open(navigationUrl(x),'_blank','noopener,noreferrer');
}
function getCurrentPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('Urządzenie nie udostępnia geolokalizacji.'));return}
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
      e=>reject(new Error(e.message||'Nie udało się pobrać pozycji.')),
      {enableHighAccuracy:true,timeout:12000,maximumAge:15000}
    );
  });
}
function reoptimizePendingFrom(position){
  const completed=state.route.filter(x=>x.status!=='pending');
  const pending=state.route.filter(x=>x.status==='pending');
  if(!pending.length)return;
  const reordered=optimizeLocal(pending,position);
  state.route=[...completed,...reordered];
  state.currentPosition=position; renderRoute(); renderMap();
}
async function reoptimizeFromGps(){
  const btn=$('reoptimizeBtn'), status=$('gpsStatus');
  try{
    btn.disabled=true; status.textContent='Pobieram bieżącą pozycję…';
    const pos=await getCurrentPosition();
    reoptimizePendingFrom(pos);
    status.textContent=`Pozostała trasa przeliczona od bieżącej pozycji (dokładność ok. ${Math.round(pos.accuracy||0)} m).`;
  }catch(e){status.textContent='Nie udało się pobrać pozycji: '+e.message}
  finally{btn.disabled=false}
}
function openRemainingRoute(){
  const pending=state.route.filter(x=>x.status==='pending'&&canNavigate(x));
  if(!pending.length){alert('Brak pozostałych urządzeń ze współrzędnymi GPS.');return}
  if(isIOS()){
    // Apple Maps bez klucza: otwieramy kolejny punkt; aplikacja CPG zachowuje pełną kolejkę 40 urządzeń.
    window.open(navigationUrl(pending[0]),'_blank','noopener,noreferrer');
    return;
  }
  // Google Maps URL nie wymaga klucza API. Ze względu na limity waypointów pokazujemy pierwszą część trasy; aplikacja CPG nadal prowadzi punkt po punkcie.
  const destination=pending[Math.min(pending.length-1,9)];
  const waypoints=pending.slice(0,Math.min(pending.length-1,9)).map(x=>`${x.lat},${x.lng}`).join('|');
  let url=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}&travelmode=driving`;
  if(waypoints)url+=`&waypoints=${encodeURIComponent(waypoints)}`;
  window.open(url,'_blank','noopener,noreferrer');
}

function renderMap(){
 if(!state.route.length)return;
 if(!state.map){state.map=L.map('map',{zoomControl:false}); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(state.map); L.control.zoom({position:'bottomright'}).addTo(state.map)}
 state.markers.forEach(m=>state.map.removeLayer(m)); state.markers=[];
 const pts=[]; if(state.start.lat&&state.start.lng){pts.push([state.start.lat,state.start.lng]);state.markers.push(L.marker([state.start.lat,state.start.lng]).addTo(state.map).bindPopup(state.start.name))}
 state.route.forEach((x,i)=>{if(x.lat&&x.lng){pts.push([x.lat,x.lng]); const m=L.marker([x.lat,x.lng]).addTo(state.map).bindPopup(`${i+1}. ${escapeHtml(x.id)}<br>${escapeHtml(x.location)}`);state.markers.push(m)}});
 if(state.routeLine) state.map.removeLayer(state.routeLine); if(pts.length>1)state.routeLine=L.polyline(pts,{weight:4}).addTo(state.map); if(pts.length)state.map.fitBounds(pts,{padding:[25,25]});
 setTimeout(()=>state.map.invalidateSize(),100);
}

function openDevice(i){state.currentIndex=i; const x=state.route[i]; $('deviceIndex').textContent=`URZĄDZENIE ${i+1} Z ${state.route.length}`; $('deviceId').textContent=x.id; $('deviceLocation').textContent=x.location; $('deviceCash').textContent=money(x.cash); $('deviceFill').textContent=`${Math.round(x.fill)}%`; $('sealNumber').value=x.seal||''; if($('collectedCash')) $('collectedCash').value=(x.collectedCash===null||x.collectedCash===undefined)?'':String(x.collectedCash).replace('.',','); $('notes').value=x.notes||''; $('skipReason').value=x.reason||'Brak możliwości dojazdu'; setChoice(x.status==='skip'?'skip':'done'); updateQrStatus(x); $('undoDeviceBtn')?.classList.toggle('hidden',!state.history.some(h=>h.index===i)); showView('deviceView')}
function setChoice(choice){const skip=choice==='skip'; $('doneChoice').className='segment'+(!skip?' active':''); $('skipChoice').className='segment'+(skip?' skip-active':''); $('sealSection').classList.toggle('hidden',skip); $('skipSection').classList.toggle('hidden',!skip); $('deviceView').dataset.choice=choice}
$('doneChoice').onclick=()=>setChoice('done'); $('skipChoice').onclick=()=>setChoice('skip'); $('backToRoute').onclick=()=>showView('routeView');
function saveCurrentDevice(){
 const x=state.route[state.currentIndex], choice=$('deviceView').dataset.choice||'done';
 if(choice==='done'&&!$('sealNumber').value.trim()){alert('Wpisz numer plomby zabezpieczającej kasetę.');return false}
 const collectedRaw=$('collectedCash')?.value?.trim()||''; const collected=num(collectedRaw); if(choice==='done'&&collectedRaw===''){alert('Zeskanuj kod QR z kwotą wybranej gotówki albo wpisz kwotę ręcznie.');return false} if(choice==='done'&&(!Number.isFinite(collected)||collected<0)){alert('Podaj poprawną kwotę wybranej gotówki.');return false}
 state.history.push({index:state.currentIndex, snapshot:{...x}, at:new Date().toISOString()}); if(state.history.length>50)state.history.shift();
 x.status=choice; x.seal=choice==='done'?$('sealNumber').value.trim():''; x.collectedCash=choice==='done'?collected:null; if(choice!=='done'){x.qrRaw='';x.qrScannedAt=null} x.reason=choice==='skip'?$('skipReason').value:''; x.notes=$('notes').value.trim(); x.updatedAt=new Date().toISOString();
 renderRoute(); return true;
}
$('saveDeviceBtn').onclick=()=>{if(saveCurrentDevice())showView('routeView')};
$('saveAndNavigateBtn')?.addEventListener('click',()=>{
 if(!saveCurrentDevice())return;
 const i=nextPendingIndex();
 if(i>=0){navigateToDevice(state.route[i]);showView('routeView')}else{renderFinish();showView('finishView')}
});

$('navigateNextBtn')?.addEventListener('click',()=>{const i=nextPendingIndex(); if(i>=0)navigateToDevice(state.route[i])});
$('openNextBtn')?.addEventListener('click',()=>{const i=nextPendingIndex(); if(i>=0)openDevice(i)});
$('reoptimizeBtn')?.addEventListener('click',reoptimizeFromGps);
$('fullRouteBtn')?.addEventListener('click',openRemainingRoute);
$('navigateDeviceBtn')?.addEventListener('click',()=>{const x=state.route[state.currentIndex]; navigateToDevice(x)});
$('copyCoordsBtn')?.addEventListener('click',async()=>{const x=state.route[state.currentIndex]; if(!canNavigate(x)){alert('Brak poprawnych współrzędnych GPS.');return} const text=`${x.lat},${x.lng}`; try{await navigator.clipboard.writeText(text);alert('Skopiowano współrzędne: '+text)}catch{prompt('Skopiuj współrzędne:',text)}});

$('finishBtn').onclick=()=>{renderFinish();showView('finishView')}; $('returnRouteBtn').onclick=()=>showView('routeView');
function renderFinish(){const done=state.route.filter(x=>x.status==='done').length,skip=state.route.filter(x=>x.status==='skip').length,pending=state.route.filter(x=>x.status==='pending').length; const actual=state.route.reduce((sum,x)=>sum+(x.status==='done'?(Number(x.collectedCash)||0):0),0); $('finishStats').innerHTML=`<div class="stat"><span>${state.route.length}</span><small>wybranych</small></div><div class="stat"><span>${done}</span><small>zainkasowano</small></div><div class="stat"><span>${money2(actual)}</span><small>wybrana gotówka</small></div><div class="stat"><span>${skip}</span><small>nie zainkasowano</small></div><div class="stat"><span>${pending}</span><small>bez statusu</small></div>`; const unfinished=state.route.filter(x=>x.status!=='done'); if($('finishTiming'))$('finishTiming').innerHTML=`<strong>Czas trasy</strong><br>Start: ${formatDateTime(state.routeMeta.startedAt)}<br>Stan na teraz: ${elapsedLabel(state.routeMeta.startedAt,null)}`; $('unfinishedList').innerHTML=unfinished.length?unfinished.map(x=>`<div class="compact-item"><span><strong>${escapeHtml(x.id)}</strong><br><small>${escapeHtml(x.location)}</small></span><span>${x.status==='skip'?escapeHtml(x.reason):'Brak statusu'}</span></div>`).join(''):'<div class="muted">Wszystkie urządzenia zostały zainkasowane.</div>'}

$('confirmFinishBtn').onclick=async()=>{state.routeMeta.finishedAt=new Date().toISOString();saveState(); await generateExcel(); const d=state.route.filter(x=>x.status==='done').length,s=state.route.filter(x=>x.status==='skip').length,p=state.route.filter(x=>x.status==='pending').length; const actual=state.route.reduce((sum,x)=>sum+(x.status==='done'?(Number(x.collectedCash)||0):0),0); $('reportSummary').textContent=`Wybrano ${state.route.length} urządzeń. Zainkasowano ${d}, pominięto ${s}, bez statusu ${p}. Faktycznie wybrano ${money2(actual)}.`; showView('reportView')};
$('downloadPdfBtn').onclick=async()=>{if(!state.lastExcelBlob)await generateExcel(); downloadBlob(state.lastExcelBlob,`CPG_Inkasacja_${new Date().toISOString().slice(0,10)}.xlsx`)};

async function generateExcel(){
  if(!window.ExcelJS){alert('Nie udało się załadować modułu Excel. Sprawdź połączenie z internetem i spróbuj ponownie.');return}
  const wb=new ExcelJS.Workbook(); wb.creator='CPG Inkasacja'; wb.created=new Date();
  const ws=wb.addWorksheet('Raport inkasacji',{views:[{state:'frozen',ySplit:1,showGridLines:false}]});
  ws.columns=[
    {header:'Lp.',key:'lp',width:7},
    {header:'Numer parkomatu',key:'id',width:20},
    {header:'Adres parkomatu',key:'location',width:46},
    {header:'Numer plomby',key:'seal',width:20},
    {header:'Kwota fizycznie wybranej gotówki [PLN]',key:'actual',width:32}
  ];
  const header=ws.getRow(1); header.height=30;
  header.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF073B73'}};c.alignment={vertical:'middle',wrapText:true}});
  state.route.forEach((x,i)=>{
    const actualValue=x.status==='done' && x.collectedCash!==null && x.collectedCash!==undefined ? Number(x.collectedCash)||0 : null;
    const row=ws.addRow({lp:i+1,id:x.id,location:x.location,seal:x.status==='done'?(x.seal||''):'',actual:actualValue});
    row.getCell('E').numFmt='#,##0.00 "zł";[Red](#,##0.00 "zł");-';
    row.eachCell(c=>{c.alignment={vertical:'top',wrapText:true}});
  });
  const totalRow=ws.addRow([]);
  totalRow.getCell('D').value='SUMA'; totalRow.getCell('D').font={bold:true};
  totalRow.getCell('E').value={formula:`SUM(E2:E${state.route.length+1})`};
  totalRow.getCell('E').font={bold:true}; totalRow.getCell('E').numFmt='#,##0.00 "zł";[Red](#,##0.00 "zł");-';
  ['D','E'].forEach(c=>totalRow.getCell(c).border={top:{style:'thin',color:{argb:'FF073B73'}}});
  ws.autoFilter={from:'A1',to:'E1'};
  const buffer=await wb.xlsx.writeBuffer(); state.lastExcelBlob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function resetAll(){if(confirm('Usunąć bieżącą trasę i rozpocząć od nowa?')){state.route=[];state.sourceRows=[];state.lastExcelBlob=null;clearState();$('fileStatus').textContent='Nie wczytano pliku.';showView('setupView')}}
$('resetBtn').onclick=resetAll; $('newRouteBtn').onclick=resetAll;

if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
restoreState();

// --- OneDrive / Microsoft 365 pilot workflow ---
function sessionPayload(){
  return {schema:'cpg-inkasacja-v3', exportedAt:new Date().toISOString(), start:state.start, route:state.route, routeMeta:state.routeMeta, history:state.history};
}
function downloadBlob(blob, filename){
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function exportSession(){
  if(!state.route.length){alert('Najpierw utwórz trasę.');return}
  const blob=new Blob([JSON.stringify(sessionPayload(),null,2)],{type:'application/json'});
  downloadBlob(blob,`CPG_Inkasacja_${new Date().toISOString().slice(0,10)}.json`);
  alert('Plik postępu został przygotowany. Na iPhone/iPad wybierz przy zapisie lokalizację OneDrive w aplikacji Pliki.');
}
async function importSessionFile(file){
  try{
    const data=JSON.parse(await file.text());
    if(!['cpg-inkasacja-v1','cpg-inkasacja-v2','cpg-inkasacja-v3'].includes(data.schema)||!Array.isArray(data.route)) throw new Error('Nieprawidłowy format pliku CPG Inkasacja.');
    state.route=data.route.map(r=>({collectedCash:null,qrRaw:'',qrScannedAt:null,...r})); state.start=data.start||state.start; state.routeMeta=data.routeMeta||{startedAt:new Date().toISOString(),finishedAt:null}; state.history=data.history||[]; saveState(); renderRoute(); showView('routeView');
  }catch(e){alert('Nie udało się wznowić trasy: '+e.message)}
}
$('exportSessionBtn')?.addEventListener('click',exportSession);
$('exportSessionReportBtn')?.addEventListener('click',exportSession);
$('sessionInput')?.addEventListener('change',e=>{const f=e.target.files?.[0]; if(f)importSessionFile(f)});


function formatDateTime(v){if(!v)return '—';try{return new Date(v).toLocaleString('pl-PL',{dateStyle:'short',timeStyle:'short'})}catch{return '—'}}
function elapsedLabel(start,end){if(!start)return '—';const a=new Date(start).getTime(),b=end?new Date(end).getTime():Date.now();const m=Math.max(0,Math.round((b-a)/60000));const h=Math.floor(m/60),mm=m%60;return h?`${h} h ${mm} min`:`${mm} min`}
function toast(msg){const old=document.querySelector('.toast');if(old)old.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function undoDevice(){const idx=state.currentIndex;for(let i=state.history.length-1;i>=0;i--){const h=state.history[i];if(h.index===idx){state.route[idx]=h.snapshot;state.history.splice(i,1);saveState();renderRoute();openDevice(idx);toast('Cofnięto ostatnią zmianę urządzenia.');return}}toast('Brak wcześniejszej zmiany do cofnięcia.')}
$('undoDeviceBtn')?.addEventListener('click',undoDevice);
document.querySelectorAll('.filter-chip').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('.filter-chip').forEach(x=>x.classList.toggle('active',x===b));renderRoute()}));
$('deviceSearch')?.addEventListener('input',e=>{state.search=e.target.value;renderRoute()});

// --- QR scanner: kwota faktycznie wybranej gotowki ---
let qrScanner=null;
function parseQrPayload(raw){
  const text=String(raw||'').trim(); let amount=null,id=null;
  try{const obj=JSON.parse(text); amount=num(obj.amount??obj.kwota??obj.cash??obj.gotowka); id=obj.id??obj.deviceId??obj.parkomat??null; if(amount||String(obj.amount??obj.kwota??obj.cash??obj.gotowka??'').trim()==='0') return {amount,id,raw:text}}catch{}
  const idMatch=text.match(/(?:ID|PARKOMAT|URZADZENIE|URZĄDZENIE)\s*[:=]\s*([^;|,]+)/i); if(idMatch)id=idMatch[1].trim();
  const amountMatch=text.match(/(?:KWOTA|AMOUNT|CASH|GOTOWKA|GOTÓWKA|PLN)\s*[:=]?\s*(-?\d[\d\s]*(?:[.,]\d{1,2})?)/i);
  if(amountMatch) amount=num(amountMatch[1]); else if(/^\s*-?\d[\d\s]*(?:[.,]\d{1,2})?\s*(?:PLN|ZŁ|ZL)?\s*$/i.test(text)) amount=num(text);
  return Number.isFinite(amount)&&amount>=0?{amount,id,raw:text}:null;
}
function updateQrStatus(x=state.route[state.currentIndex]){if(!$('qrStatusBadge'))return; const has=$('collectedCash')?.value?.trim()!==''; $('qrStatusBadge').textContent=has?(x?.qrScannedAt?'Z QR':'WPIS RĘCZNY'):'DO UZUPEŁNIENIA'; $('qrStatusBadge').classList.toggle('ok',has); $('qrLastInfo').textContent=x?.qrScannedAt?`Ostatni skan: ${formatDateTime(x.qrScannedAt)}`:''}
async function startQrScanner(){
  const modal=$('qrModal'); modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); $('qrScannerStatus').textContent='Uruchamianie aparatu…';
  if(!window.Html5Qrcode){$('qrScannerStatus').textContent='Moduł skanera nie został załadowany. Sprawdź połączenie z internetem.';return}
  try{qrScanner=new Html5Qrcode('qrReader'); const cameras=await Html5Qrcode.getCameras(); if(!cameras.length)throw new Error('Nie znaleziono aparatu.'); const back=cameras.find(c=>/back|rear|environment|tyl/i.test(c.label))||cameras[cameras.length-1]; await qrScanner.start(back.id,{fps:10,qrbox:{width:240,height:240}},onQrScan,()=>{}); $('qrScannerStatus').textContent='Skieruj aparat na kod QR.'}catch(e){$('qrScannerStatus').textContent='Nie udało się uruchomić aparatu: '+e.message+' Na iPhone otwórz aplikację przez HTTPS i zezwól Safari na dostęp do aparatu.'}
}
async function stopQrScanner(){try{if(qrScanner){await qrScanner.stop();await qrScanner.clear()}}catch{} qrScanner=null; $('qrReader').innerHTML=''; $('qrModal').classList.add('hidden'); $('qrModal').setAttribute('aria-hidden','true')}
async function onQrScan(decodedText){const parsed=parseQrPayload(decodedText); if(!parsed){$('qrScannerStatus').textContent='Kod odczytany, ale nie znaleziono prawidłowej kwoty.';return} const x=state.route[state.currentIndex]; if(parsed.id&&x&&String(parsed.id).trim().toLowerCase()!==String(x.id).trim().toLowerCase()){if(!confirm(`Kod wskazuje urządzenie ${parsed.id}, a otwarte jest ${x.id}. Użyć tej kwoty mimo to?`))return} $('collectedCash').value=String(parsed.amount.toFixed(2)).replace('.',','); x.qrRaw=parsed.raw; x.qrScannedAt=new Date().toISOString(); updateQrStatus(x); await stopQrScanner(); toast(`Zeskanowano kwotę ${money2(parsed.amount)}.`)}
$('scanQrBtn')?.addEventListener('click',startQrScanner); $('closeQrBtn')?.addEventListener('click',stopQrScanner); $('collectedCash')?.addEventListener('input',()=>{const x=state.route[state.currentIndex]; if(x){x.qrRaw='';x.qrScannedAt=null} updateQrStatus(x)});
setInterval(()=>{if($('routeView')?.classList.contains('active')&&state.routeMeta.startedAt&&!state.routeMeta.finishedAt){if($('routeElapsed'))$('routeElapsed').textContent=elapsedLabel(state.routeMeta.startedAt,null)}},30000);
