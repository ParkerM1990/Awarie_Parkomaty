const state = {
  sourceRows: [], plan: [], route: [], currentIndex: null, map: null, markers: [], lastExcelBlob: null,
  currentPosition: null, filter:'all', search:'', history:[], routeMeta:{startedAt:null,finishedAt:null},
  mode:null, sourceMeta:null, cloudSyncTimer:null, suppressCloudSync:false,
  convoy:{id:null,date:null,status:'draft',createdAt:null,publishedAt:null,updatedAt:null,cloudProvider:null,cloudItemId:null,cloudETag:null,shareToken:null},
  start: {name:'Baza CPG — Komitetu Obrony Robotników 48, Warszawa', lat:52.183869, lng:20.966869}
};

const $ = id => document.getElementById(id);
const views = ['homeView','convoyLoadView','setupView','planView','routeView','deviceView','finishView','reportView'];
function showView(id){views.forEach(v=>$(v)?.classList.toggle('active',v===id)); window.scrollTo({top:0,behavior:'smooth'}); if(id==='routeView'){syncWorkflowUi();setTimeout(renderMap,80)}}
function money(v){return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',maximumFractionDigits:0}).format(Number(v)||0)}
function money2(v){return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0)}
function num(v){if(v===null||v===undefined||v==='')return 0; if(typeof v==='number')return v; return Number(String(v).replace(/\s/g,'').replace('%','').replace(',','.').replace(/[^0-9.-]/g,''))||0}
function normKey(k){return String(k||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function pick(obj, aliases){const keys=Object.keys(obj); for(const a of aliases){const found=keys.find(k=>normKey(k)===normKey(a)); if(found!==undefined && obj[found]!==undefined && obj[found]!==null && obj[found]!=='') return obj[found]} return ''}
function terminalKey(v){
  return String(v??'').trim().replace(/\.0+$/,'').replace(/\s+/g,'');
}
function terminalById(id){
  return (window.CPG_TERMINALS && window.CPG_TERMINALS[terminalKey(id)]) || null;
}

// Nazwy kolumn obsługiwane przy imporcie. Pierwsze pozycje odpowiadają
// bezpośrednio raportowi „Terminal Balance” z systemu CPG.
const ID_ALIASES=['Terminal - Terminal ID','Terminal ID','TerminalID','ID','Nr','Numer','parkomat','nrparkomatu','urzadzenie','terminal'];
const LOCATION_ALIASES=['Terminal - Location','Lokalizacja','location','miejsce','strefa'];
const CASH_ALIASES=['Coin - Balance','Coin Balance','Gotowka','Gotówka','Kwota','cash','stan gotowki','stan gotówki','wartosc','amount'];

function detectHeaderRow(ws){
  const preview=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
  const limit=Math.min(preview.length,20);
  for(let i=0;i<limit;i++){
    const keys=(preview[i]||[]).map(normKey).filter(Boolean);
    const hasId=ID_ALIASES.some(a=>keys.includes(normKey(a)));
    const hasCash=CASH_ALIASES.some(a=>keys.includes(normKey(a)));
    if(hasId&&hasCash)return i;
  }
  return 0;
}

function worksheetToRows(ws){
  const headerRow=detectHeaderRow(ws);
  const rows=XLSX.utils.sheet_to_json(ws,{range:headerRow,defval:'',raw:true});
  return {rows,headerRow};
}

function hasAnyColumn(rows,aliases){
  const keys=Object.keys(rows?.[0]||{});
  return aliases.some(a=>keys.some(k=>normKey(k)===normKey(a)));
}

function normalizeRow(r,i){
  const pickedId=pick(r,ID_ALIASES);
  const id=terminalKey(pickedId);
  if(!id)return null;
  const terminal=terminalById(id);

  let lat=num(pick(r,['Y','lat','latitude','szerokosc','szerokoscgeograficzna']));
  let lng=num(pick(r,['X','lng','lon','longitude','dlugosc','dlugoscgeograficzna']));
  if(Math.abs(lat)>90 && Math.abs(lng)<=90){const t=lat;lat=lng;lng=t}

  // CSV z rozliczenia nie musi miec wspolrzednych. Gdy ich brakuje,
  // aplikacja uzupelnia je po Terminal ID ze stalej bazy terminals-data.js.
  const csvHasCoords=(Number.isFinite(lat)&&Number.isFinite(lng)&&(lat!==0||lng!==0));
  if(!csvHasCoords && terminal){
    lat=num(terminal.lat);
    lng=num(terminal.lng);
  }

  const rawLocation=String(pick(r,LOCATION_ALIASES)||'').trim();
  const rawAddress=String(pick(r,['Adres','address','ulica'])||'').trim();
  const terminalAddress=String(terminal?.address||'').trim();
  const terminalNode=String(terminal?.node||'').trim();
  const address=rawAddress||terminalAddress||rawLocation||'Brak adresu';
  const location=rawLocation||terminalNode||terminalAddress||rawAddress||'Brak lokalizacji';

  return {
    id,
    location,
    address,
    lat,lng,
    cash:num(pick(r,CASH_ALIASES)),
    fill:0,
    terminalMatched:!!terminal,
    coordSource:csvHasCoords?'csv':(terminal&&lat&&lng?'terminal-db':'missing'),
    terminalStatus:terminal?.status||'',
    status:'pending', seal:'', reason:'', notes:'', updatedAt:null, priority:0, collectedCash:null, qrRaw:'', qrScannedAt:null
  }
}

function sampleData(){
 const center=[51.4021,21.1473];
 state.sourceRows=Array.from({length:52},(_,i)=>({
   id:`RA-${String(101+i).padStart(3,'0')}`,
   location:`Strefa ${1+(i%4)}`,
   address:`ul. ${['Żeromskiego','Sienkiewicza','Traugutta','Reja','Warszawska','Struga','Malczewskiego','25 Czerwca'][i%8]} ${3+(i%28)}`,
   lat:center[0]+((i%9)-4)*0.006+(Math.sin(i)*0.0015),
   lng:center[1]+((Math.floor(i/9))-2)*0.009+(Math.cos(i)*0.0015),
   cash:1200+((i*587)%3600), fill:48+((i*7)%50), status:'pending',seal:'',reason:'',notes:'',updatedAt:null,priority:0,collectedCash:null,qrRaw:'',qrScannedAt:null
 }));
 state.sourceMeta={type:'sample',name:'Dane przykładowe',loadedAt:new Date().toISOString()}; $('fileStatus').textContent=`Dane przykładowe: ${state.sourceRows.length} urządzeń.`;
}

$('sampleBtn').addEventListener('click',sampleData);
async function loadBalanceArrayBuffer(buf,fileName,sourceMeta={type:'manual'}){
 try{
   $('fileStatus').textContent='Odczytywanie pliku…';
   const wb=XLSX.read(buf,{type:'array'});
   const ws=wb.Sheets[wb.SheetNames[0]];
   const parsed=worksheetToRows(ws);
   const rows=parsed.rows;
   if(!rows.length) throw new Error('Plik nie zawiera danych.');
   if(!hasAnyColumn(rows,ID_ALIASES)) throw new Error('Nie znaleziono kolumny „Terminal - Terminal ID”.');
   if(!hasAnyColumn(rows,CASH_ALIASES)) throw new Error('Nie znaleziono kolumny „Coin - Balance”.');
   state.sourceRows=rows.map(normalizeRow).filter(Boolean);
   if(!state.sourceRows.length) throw new Error('Nie znaleziono żadnych parkomatów do wczytania.');
   state.sourceMeta={...sourceMeta,name:fileName,loadedAt:new Date().toISOString()};
   const matched=state.sourceRows.filter(r=>r.terminalMatched).length;
   const gps=state.sourceRows.filter(r=>Number(r.lat)&&Number(r.lng)).length;
   const missing=state.sourceRows.length-gps;
   const positive=state.sourceRows.filter(r=>(Number(r.cash)||0)>0).length;
   $('fileStatus').textContent=`Wczytano ${fileName}: ${state.sourceRows.length} parkomatów • powiązano z bazą: ${matched} • GPS: ${gps}${missing?` • brak GPS: ${missing}`:''} • z gotówką > 0: ${positive}.`;
   if(missing) console.warn('Brak współrzędnych GPS dla:',state.sourceRows.filter(r=>!Number(r.lat)||!Number(r.lng)).map(r=>r.id));
   return state.sourceRows;
 }catch(err){
   state.sourceRows=[];
   $('fileStatus').textContent='Nie udało się wczytać pliku.';
   throw err;
 }
}

$('fileInput').addEventListener('change', async e=>{
 const file=e.target.files[0]; if(!file)return;
 const fileName=String(file.name||'').toLowerCase();
 const allowed=['.xlsx','.xls','.csv'];
 if(!allowed.some(ext=>fileName.endsWith(ext))){e.target.value='';alert('Wybierz plik Excel XLSX/XLS albo CSV.');return;}
 try{await loadBalanceArrayBuffer(await file.arrayBuffer(),file.name,{type:'manual'});}catch(err){alert('Nie udało się odczytać pliku: '+err.message)}
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

function matrixRouteCost(order,matrix){
  let total=0,prev=0;
  for(const idx of order){
    const leg=matrix?.[prev]?.[idx];
    if(!Number.isFinite(leg))return Infinity;
    total+=leg; prev=idx;
  }
  return total;
}
function optimizeMatrixOrder(matrix,count){
  const left=Array.from({length:count},(_,i)=>i+1), ordered=[];
  let cur=0;
  while(left.length){
    let bestPos=0,best=Infinity;
    left.forEach((idx,pos)=>{const v=matrix?.[cur]?.[idx]; if(Number.isFinite(v)&&v<best){best=v;bestPos=pos}});
    const next=left.splice(bestPos,1)[0]; ordered.push(next); cur=next;
  }
  if(ordered.length<4)return ordered;
  let bestOrder=ordered,bestCost=matrixRouteCost(ordered,matrix),improved=true,passes=0;
  while(improved&&passes<5){
    improved=false; passes++;
    for(let i=0;i<bestOrder.length-1;i++){
      for(let k=i+1;k<bestOrder.length;k++){
        const candidate=[...bestOrder.slice(0,i),...bestOrder.slice(i,k+1).reverse(),...bestOrder.slice(k+1)];
        const cost=matrixRouteCost(candidate,matrix);
        if(cost+1<bestCost){bestOrder=candidate;bestCost=cost;improved=true}
      }
    }
  }
  return bestOrder;
}
async function optimizeByRoadTime(items,start){
  const valid=items.filter(canNavigate), invalid=items.filter(x=>!canNavigate(x));
  if(!canNavigate(start)||valid.length<2)return {route:optimizeLocal(items,start),mode:'gps'};
  const points=[start,...valid];
  const coords=points.map(p=>`${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const url=`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`;
    const response=await fetch(url,{headers:{'Accept':'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(data.code!=='Ok'||!Array.isArray(data.durations))throw new Error(data.message||'Brak macierzy czasów przejazdu');
    const order=optimizeMatrixOrder(data.durations,valid.length);
    return {route:[...order.map(i=>valid[i-1]),...invalid],mode:'roads'};
  }catch(err){
    console.warn('Optymalizacja drogowa niedostępna, używam GPS:',err);
    return {route:optimizeLocal(items,start),mode:'gps'};
  }finally{clearTimeout(timer)}
}

// --- Inteligentny wybór parkomatów do inkasa ---
// 1) twardy filtr kwotowy,
// 2) wybór zestawu o możliwie najkrótszym czasie przejazdu,
// 3) kwota jest tylko kryterium pomocniczym przy bardzo podobnym czasie.
const ROAD_SELECTION_MAX_CANDIDATES=80; // + punkt startowy = maks. 81 punktów w macierzy OSRM
const ROAD_SELECTION_TIMEOUT_MS=20000;

function bestInsertionForOrder(order, candidateIdx, matrix){
  if(!order.length){
    const v=matrix?.[0]?.[candidateIdx];
    return {pos:0,delta:Number.isFinite(v)?v:Infinity};
  }
  let best={pos:order.length,delta:Infinity};
  for(let pos=0;pos<=order.length;pos++){
    const prev=pos===0?0:order[pos-1];
    const next=pos===order.length?null:order[pos];
    const a=matrix?.[prev]?.[candidateIdx];
    if(!Number.isFinite(a))continue;
    let delta=a;
    if(next!==null){
      const b=matrix?.[candidateIdx]?.[next];
      const direct=matrix?.[prev]?.[next];
      if(!Number.isFinite(b)||!Number.isFinite(direct))continue;
      delta=a+b-direct;
    }
    if(delta<best.delta)best={pos,delta};
  }
  return best;
}

function twoOptMatrixOrder(order,matrix){
  if(order.length<4)return [...order];
  let bestOrder=[...order],bestCost=matrixRouteCost(bestOrder,matrix),improved=true,passes=0;
  while(improved&&passes<5){
    improved=false; passes++;
    for(let i=0;i<bestOrder.length-1;i++){
      for(let k=i+1;k<bestOrder.length;k++){
        const candidate=[...bestOrder.slice(0,i),...bestOrder.slice(i,k+1).reverse(),...bestOrder.slice(k+1)];
        const cost=matrixRouteCost(candidate,matrix);
        if(cost+1<bestCost){bestOrder=candidate;bestCost=cost;improved=true}
      }
    }
  }
  return bestOrder;
}

function chooseSeedIndexes(matrix,candidates){
  const ids=candidates.map((_,i)=>i+1).filter(i=>Number.isFinite(matrix?.[0]?.[i]));
  ids.sort((a,b)=>(matrix[0][a]??Infinity)-(matrix[0][b]??Infinity));
  if(ids.length<=18)return ids;
  const seeds=new Set(ids.slice(0,6));
  // Kilka punktów z różnych zakresów czasu od bazy, żeby nie zamykać się tylko na najbliższej dzielnicy.
  for(let q=0;q<12;q++){
    const pos=Math.round((ids.length-1)*(q/11));
    seeds.add(ids[pos]);
  }
  // Dodaj kilka urządzeń z najwyższą kwotą jako alternatywne ziarna, ale nie zmieniaj głównego kryterium czasu.
  candidates
    .map((x,i)=>({idx:i+1,cash:Number(x.cash)||0}))
    .sort((a,b)=>b.cash-a.cash)
    .slice(0,4)
    .forEach(x=>seeds.add(x.idx));
  return [...seeds].slice(0,22);
}

function buildEfficientOrderFromMatrix(matrix,candidates,count){
  const target=Math.min(count,candidates.length);
  if(!target)return [];
  const seeds=chooseSeedIndexes(matrix,candidates);
  let globalBest=null,globalCost=Infinity,globalCash=-Infinity;

  for(const seed of seeds){
    let order=[seed];
    const remaining=new Set(candidates.map((_,i)=>i+1).filter(i=>i!==seed));
    while(order.length<target&&remaining.size){
      let bestIdx=null,bestPos=order.length,bestDelta=Infinity,bestCash=-Infinity;
      for(const idx of remaining){
        const ins=bestInsertionForOrder(order,idx,matrix);
        if(!Number.isFinite(ins.delta))continue;
        const cash=Number(candidates[idx-1]?.cash)||0;
        // Czas jest kryterium głównym. Przy różnicy <=30 s preferujemy wyższą gotówkę.
        if(ins.delta<bestDelta-30 || (Math.abs(ins.delta-bestDelta)<=30 && cash>bestCash)){
          bestIdx=idx;bestPos=ins.pos;bestDelta=ins.delta;bestCash=cash;
        }
      }
      if(bestIdx===null)break;
      order.splice(bestPos,0,bestIdx);
      remaining.delete(bestIdx);
    }
    order=twoOptMatrixOrder(order,matrix);
    const cost=matrixRouteCost(order,matrix);
    const cashSum=order.reduce((sum,idx)=>sum+(Number(candidates[idx-1]?.cash)||0),0);
    // Wybieramy krótszą trasę; przy różnicy do 60 s wygrywa większa suma gotówki.
    if(cost<globalCost-60 || (Math.abs(cost-globalCost)<=60 && cashSum>globalCash)){
      globalBest=order;globalCost=cost;globalCash=cashSum;
    }
  }
  return globalBest||[];
}

function localInsertionDelta(route,item,start){
  if(!route.length)return distance(start,item);
  let best=Infinity;
  for(let pos=0;pos<=route.length;pos++){
    const prev=pos===0?start:route[pos-1];
    const next=pos===route.length?null:route[pos];
    if(!canNavigate(prev)||!canNavigate(item))continue;
    let delta=distance(prev,item);
    if(next&&canNavigate(next))delta+=distance(item,next)-distance(prev,next);
    if(delta<best)best=delta;
  }
  return best;
}

function buildLocalEfficientRoute(items,start,count){
  const target=Math.min(count,items.length);
  if(!target)return [];
  const sorted=[...items].sort((a,b)=>distance(start,a)-distance(start,b));
  const seeds=sorted.length<=10?sorted:sorted.filter((_,i)=>i<5||i%Math.max(1,Math.floor(sorted.length/8))===0).slice(0,14);
  let bestRoute=null,bestLen=Infinity,bestCash=-Infinity;
  for(const seed of seeds){
    const route=[seed];
    const remaining=items.filter(x=>x!==seed);
    while(route.length<target&&remaining.length){
      let bi=0,bpos=route.length,bd=Infinity,bc=-Infinity;
      remaining.forEach((x,i)=>{
        let posBest=route.length,deltaBest=Infinity;
        for(let pos=0;pos<=route.length;pos++){
          const prev=pos===0?start:route[pos-1];
          const next=pos===route.length?null:route[pos];
          let d=distance(prev,x);
          if(next)d+=distance(x,next)-distance(prev,next);
          if(d<deltaBest){deltaBest=d;posBest=pos}
        }
        const cash=Number(x.cash)||0;
        // 0,5 km tolerancji dla remisu - wtedy wybieramy wyższą kwotę.
        if(deltaBest<bd-0.5 || (Math.abs(deltaBest-bd)<=0.5&&cash>bc)){bi=i;bpos=posBest;bd=deltaBest;bc=cash}
      });
      const [picked]=remaining.splice(bi,1);
      route.splice(bpos,0,picked);
    }
    const improved=optimizeLocal(route,start);
    const len=routeLength(improved,start);
    const cash=improved.reduce((sum,x)=>sum+(Number(x.cash)||0),0);
    if(len<bestLen-0.5 || (Math.abs(len-bestLen)<=0.5&&cash>bestCash)){bestRoute=improved;bestLen=len;bestCash=cash}
  }
  return bestRoute||optimizeLocal(items.slice(0,target),start);
}

function buildRoadCandidateShortlist(items,start,count){
  if(items.length<=ROAD_SELECTION_MAX_CANDIDATES)return [...items];
  const geoTarget=Math.min(ROAD_SELECTION_MAX_CANDIDATES,Math.max(count+25,Math.ceil(count*1.5)));
  const efficient=buildLocalEfficientRoute(items,start,geoTarget);
  const seen=new Set(efficient.map(x=>x.id));
  const shortlist=[...efficient];
  // Zachowujemy też część wysokokwotowych urządzeń jako kandydatów, jeśli są blisko sensownej trasy drogowej.
  const byCash=[...items].sort((a,b)=>(Number(b.cash)||0)-(Number(a.cash)||0));
  for(const x of byCash){
    if(shortlist.length>=ROAD_SELECTION_MAX_CANDIDATES)break;
    if(!seen.has(x.id)){shortlist.push(x);seen.add(x.id)}
  }
  return shortlist;
}

async function fetchRoadTimeMatrix(points){
  const coords=points.map(p=>`${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ROAD_SELECTION_TIMEOUT_MS);
  try{
    const url=`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`;
    const response=await fetch(url,{headers:{'Accept':'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(data.code!=='Ok'||!Array.isArray(data.durations))throw new Error(data.message||'Brak macierzy czasów przejazdu');
    return data.durations;
  }finally{clearTimeout(timer)}
}

async function selectEfficientMeters(eligible,start,count){
  const valid=eligible.filter(canNavigate);
  const invalid=eligible.filter(x=>!canNavigate(x));
  const target=Math.min(count,valid.length);
  if(!target)return {items:[],mode:'none',eligible:eligible.length,valid:0,invalid:invalid.length,candidates:0};
  if(valid.length<=target){
    const optimized=await optimizeByRoadTime(valid,start);
    return {items:optimized.route.slice(0,target),mode:optimized.mode,eligible:eligible.length,valid:valid.length,invalid:invalid.length,candidates:valid.length};
  }

  const shortlist=buildRoadCandidateShortlist(valid,start,count);
  try{
    const matrix=await fetchRoadTimeMatrix([start,...shortlist]);
    const order=buildEfficientOrderFromMatrix(matrix,shortlist,target);
    if(order.length!==target)throw new Error('Nie udało się wybrać pełnej grupy na podstawie macierzy drogowej.');
    return {
      items:order.map(i=>shortlist[i-1]),mode:'roads-selection',eligible:eligible.length,valid:valid.length,invalid:invalid.length,candidates:shortlist.length
    };
  }catch(err){
    console.warn('Wybór drogowy niedostępny, używam analizy GPS:',err);
    const items=buildLocalEfficientRoute(valid,start,target);
    return {items,mode:'gps-selection',eligible:eligible.length,valid:valid.length,invalid:invalid.length,candidates:valid.length};
  }
}

function cloneForPlan(x, priority=0){return {...x,address:x.address||x.location||'Brak adresu',location:x.location||x.address||'Brak lokalizacji',status:'pending',seal:'',reason:'',notes:'',updatedAt:null,priority,collectedCash:null,qrRaw:'',qrScannedAt:null}}
async function preparePlan(){
 if(!state.sourceRows.length){alert('Najpierw wczytaj plik lub dane przykładowe.');return}
 const count=Math.max(1,Math.min(50,num($('deviceCount').value)||35));
 const threshold=Math.max(0,num($('cashThreshold')?.value));
 const convoyDate=$('convoyDate')?.value||nextWorkday();
 const now=new Date().toISOString();
 state.convoy={id:`convoy-${convoyDate}`,date:convoyDate,status:'draft',createdAt:now,publishedAt:null,updatedAt:now,cloudProvider:null,cloudItemId:null,cloudETag:null,shareToken:null};
 state.start={name:$('startName').value||'Punkt startowy',lat:num($('startLat').value),lng:num($('startLng').value)};
 const eligible=[...state.sourceRows].filter(x=>(Number(x.cash)||0)>=threshold);
 if(!eligible.length){
   alert(`Brak parkomatów ze stanem gotówki co najmniej ${money2(threshold)}.`);
   return;
 }
 const status=$('routeBuildStatus');
 const btn=$('buildRouteBtn');
 if(status)status.textContent=`Analizuję ${eligible.length} parkomatów powyżej progu ${money2(threshold)}…`;
 btn.disabled=true; const oldText=btn.textContent; btn.textContent='Analizuję trasę…';
 try{
   const selection=await selectEfficientMeters(eligible,state.start,count);
   if(!selection.items.length){
     alert('Brak parkomatów powyżej progu z prawidłowymi współrzędnymi GPS.');
     return;
   }
   state.plan=selection.items.map(x=>cloneForPlan(x,0));
   const modeLabel=selection.mode==='roads-selection'||selection.mode==='roads'?'czas przejazdu po drogach (OSRM)':'odległość GPS – tryb awaryjny';
   const totalCash=state.plan.reduce((sum,x)=>sum+(Number(x.cash)||0),0);
   const summary=`Wybrano ${state.plan.length} z ${selection.eligible} urządzeń powyżej progu • kryterium: ${modeLabel} • kandydaci do analizy drogowej: ${selection.candidates} • suma szacowanej gotówki: ${money2(totalCash)}${selection.invalid?` • pominięto bez GPS: ${selection.invalid}`:''}.`;
   if(status)status.textContent=summary;
   if($('planOptimizeStatus'))$('planOptimizeStatus').textContent=summary;
   if(state.plan.length<count){
     alert(`Próg ${money2(threshold)} spełnia ${selection.eligible} parkomatów, ale tylko ${selection.valid} ma prawidłowe GPS. Przygotowano ${state.plan.length} urządzeń.`);
   }
   renderPlan(); showView('planView');
 }catch(err){
   console.error(err);
   if(status)status.textContent='Nie udało się przygotować inteligentnej selekcji parkomatów.';
   alert('Nie udało się przygotować listy: '+err.message);
 }finally{
   btn.disabled=false; btn.textContent=oldText;
 }
}
$('buildRouteBtn').addEventListener('click',preparePlan);

function renderPlan(){
 const list=$('planList'); if(!list)return;
 $('planCount').textContent=state.plan.length;
 list.innerHTML=state.plan.map((x,i)=>`<div class="plan-row" data-i="${i}">
   <div class="plan-lp">${i+1}</div>
   <div class="plan-field"><label>ID parkomatu</label><input data-field="id" value="${escapeHtml(x.id)}"></div>
   <div class="plan-field"><label>Lokalizacja</label><input data-field="location" value="${escapeHtml(x.location||'')}"></div>
   <div class="plan-field"><label>Adres</label><input data-field="address" value="${escapeHtml(x.address||x.location||'')}"></div>
   <div class="plan-actions">
     <button class="plan-move" data-act="up" title="Przesuń w górę" ${i===0?'disabled':''}>↑</button>
     <button class="plan-move" data-act="down" title="Przesuń w dół" ${i===state.plan.length-1?'disabled':''}>↓</button>
     <button class="plan-remove" data-act="remove" title="Usuń z planu">Usuń</button>
   </div>
 </div>`).join('');
 list.querySelectorAll('input[data-field]').forEach(inp=>inp.addEventListener('input',e=>{
   const row=e.target.closest('.plan-row'), idx=Number(row.dataset.i), field=e.target.dataset.field;
   state.plan[idx][field]=e.target.value;
 }));
 list.querySelectorAll('button[data-act]').forEach(btn=>btn.addEventListener('click',e=>{
   const row=e.target.closest('.plan-row'), idx=Number(row.dataset.i), act=e.target.dataset.act;
   if(act==='remove') state.plan.splice(idx,1);
   if(act==='up'&&idx>0) [state.plan[idx-1],state.plan[idx]]=[state.plan[idx],state.plan[idx-1]];
   if(act==='down'&&idx<state.plan.length-1) [state.plan[idx+1],state.plan[idx]]=[state.plan[idx],state.plan[idx+1]];
   renderPlan();
 }));
 const selected=new Set(state.plan.map(x=>String(x.id)));
 const candidates=state.sourceRows.filter(x=>!selected.has(String(x.id)));
 const sel=$('planAddSelect');
 if(sel) sel.innerHTML='<option value="">Wybierz parkomat z pliku…</option>'+candidates.map(x=>`<option value="${state.sourceRows.indexOf(x)}">${escapeHtml(x.id)} — ${escapeHtml(x.address||x.location||'')}</option>`).join('');
}

async function exportPlannedMetersExcel(items, fileLabel='Plan_konwoju'){
  if(!Array.isArray(items)||!items.length){alert('Lista planowanych parkomatów jest pusta.');return}
  if(!window.ExcelJS){alert('Nie udało się załadować modułu Excel. Sprawdź połączenie z internetem i spróbuj ponownie.');return}
  const wb=new ExcelJS.Workbook();
  wb.creator='CPG Inkasacja'; wb.created=new Date();
  const ws=wb.addWorksheet('Plan konwoju',{views:[{state:'frozen',ySplit:1,showGridLines:false}]});
  ws.columns=[
    {header:'Lp.',key:'lp',width:7},
    {header:'ID parkomatu',key:'id',width:20},
    {header:'Adres',key:'address',width:52}
  ];
  const header=ws.getRow(1); header.height=28;
  header.eachCell(c=>{
    c.font={bold:true,color:{argb:'FFFFFFFF'}};
    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF073B73'}};
    c.alignment={vertical:'middle',wrapText:true};
  });
  items.forEach((x,i)=>{
    const row=ws.addRow({lp:i+1,id:x.id||'',address:x.address||x.location||''});
    row.eachCell(c=>{c.alignment={vertical:'top',wrapText:true}});
  });
  ws.autoFilter={from:'A1',to:'C1'};
  const buffer=await wb.xlsx.writeBuffer();
  const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const date=new Date().toISOString().slice(0,10);
  downloadBlob(blob,`CPG_${fileLabel}_${date}.xlsx`);
}
$('exportPlanExcelBtn')?.addEventListener('click',()=>exportPlannedMetersExcel(state.plan,'Planowane_parkomaty'));
$('exportRoutePlanExcelBtn')?.addEventListener('click',()=>exportPlannedMetersExcel(state.route,'Plan_konwoju'));

$('planBackBtn')?.addEventListener('click',()=>showView('setupView'));
$('planAddBtn')?.addEventListener('click',()=>{
 const raw=$('planAddSelect')?.value, idx=Number(raw);
 if(raw===''||!Number.isInteger(idx)||idx<0||!state.sourceRows[idx]){alert('Wybierz urządzenie do dodania.');return}
 if(state.plan.length>=50){alert('Plan może zawierać maksymalnie 50 urządzeń.');return}
 state.plan.push(cloneForPlan(state.sourceRows[idx],0)); renderPlan();
});
$('planOptimizeBtn')?.addEventListener('click',async()=>{
 if(!state.plan.length){alert('Lista planowanych urządzeń jest pusta.');return}
 if(state.plan.some(x=>!String(x.id||'').trim())){alert('Każdy parkomat musi mieć numer ID.');return}
 const btn=$('planOptimizeBtn'), status=$('planOptimizeStatus');
 try{
   btn.disabled=true; btn.textContent='Optymalizuję trasę po drogach…'; if(status)status.textContent='Pobieram czasy przejazdu po ulicach i układam kolejność przejazdu…';
   const optimized=await optimizeByRoadTime(state.plan.map(x=>({...x})),state.start);
   state.route=optimized.route.map(x=>({...x,address:x.address||x.location||'Brak adresu'}));
   state.routeMeta={startedAt:null,finishedAt:null,plannedAt:new Date().toISOString(),optimizationMode:optimized.mode}; state.history=[]; state.convoy.status='draft'; state.convoy.updatedAt=new Date().toISOString();
   if(status)status.textContent=optimized.mode==='roads'?'Kolejność została zoptymalizowana według czasu przejazdu po drogach.':'Serwer drogowy był niedostępny — użyto awaryjnej optymalizacji GPS.';
   saveState(); renderRoute(); showView('routeView');
 }finally{btn.disabled=false;btn.textContent='Zatwierdź listę i wyznacz trasę'}
});
$('editPlanBtn')?.addEventListener('click',()=>{
 if(state.mode!=='planner'){toast('Opublikowanej listy nie edytuje się w trybie realizacji.');return}
 if(state.route.some(x=>x.status!=='pending')){alert('Nie można już edytować listy po rozpoczęciu obsługi urządzeń. Możesz rozpocząć nową trasę.');return}
 state.plan=state.route.map(x=>({...x,address:x.address||x.location||'Brak adresu'})); renderPlan(); showView('planView');
});

function saveState(){localStorage.setItem('cpg-inkasacja-state',JSON.stringify({plan:state.plan,route:state.route,start:state.start,routeMeta:state.routeMeta,history:state.history,mode:state.mode,convoy:state.convoy,sourceMeta:state.sourceMeta})); if(!state.suppressCloudSync)scheduleCloudSave()}
function clearState(){localStorage.removeItem('cpg-inkasacja-state')}
function restoreState(){try{const x=JSON.parse(localStorage.getItem('cpg-inkasacja-state'));if(x?.route?.length){state.plan=(x.plan||[]).map(r=>({address:r.address||r.location||'Brak adresu',...r}));state.route=x.route.map(r=>({collectedCash:null,qrRaw:'',qrScannedAt:null,address:r.address||r.location||'Brak adresu',...r}));state.start=x.start||state.start;state.routeMeta=x.routeMeta||{startedAt:null,finishedAt:null};state.history=x.history||[];state.mode=x.mode||null;state.convoy={...state.convoy,...(x.convoy||{})};state.sourceMeta=x.sourceMeta||null;}}catch{}}

function renderRoute(){syncWorkflowUi();
 const done=state.route.filter(x=>x.status==='done').length, skipped=state.route.filter(x=>x.status==='skip').length;
 $('statSelected').textContent=state.route.length; $('statCash').textContent=money(state.route.reduce((s,x)=>s+x.cash,0)); if($('statCollectedCash')) $('statCollectedCash').textContent=money2(state.route.reduce((s,x)=>s+(x.status==='done'?(Number(x.collectedCash)||0):0),0)); $('statDone').textContent=done; $('statSkipped').textContent=skipped;
 $('routeTitle').textContent=state.mode==='planner'?`Plan • ${state.route.length} urządzeń`:`Konwój • ${state.route.length} urządzeń`;
 const pendingCount=state.route.filter(x=>x.status==='pending').length;
 const progress=state.route.length?Math.round(((state.route.length-pendingCount)/state.route.length)*100):0;
 $('routeSummary').innerHTML=`Pozostało: ${pendingCount}<div class="progressbar"><span style="width:${progress}%"></span></div>`;
 if($('routeStartedAt'))$('routeStartedAt').textContent=formatDateTime(state.routeMeta.startedAt);
 if($('routeElapsed'))$('routeElapsed').textContent=elapsedLabel(state.routeMeta.startedAt,state.routeMeta.finishedAt);
 if($('routeProgress'))$('routeProgress').textContent=`${progress}%`;
 const nextIndex=state.route.findIndex(x=>x.status==='pending');
 const q=(state.search||'').toLowerCase();
 const visible=state.route.map((x,i)=>({x,i})).filter(({x})=>(state.filter==='all'||x.status===state.filter)&&(!q||x.id.toLowerCase().includes(q)||x.location.toLowerCase().includes(q)||(x.address||'').toLowerCase().includes(q)));
 $('deviceList').innerHTML=visible.map(({x,i})=>`<div class="device-row ${i===nextIndex?'next-pending':''}" data-i="${i}"><div class="order">${i+1}</div><div><strong>${escapeHtml(x.id)}</strong><div class="sub">${escapeHtml(x.location)}${x.address&&x.address!==x.location?` • ${escapeHtml(x.address)}`:''}</div><span class="badge ${x.status==='done'?'done':x.status==='skip'?'skip':'pending'}">${x.status==='done'?'Zainkasowano':x.status==='skip'?'Nie zainkasowano':i===nextIndex?'Następny':'Do wykonania'}</span></div><div class="amount">${money(x.cash)}${x.status==='done'&&x.collectedCash!==null?`<div class="collected-value">wybrano: ${money2(x.collectedCash)}</div>`:''}</div></div>`).join('')||'<div class="card muted">Brak urządzeń spełniających filtr.</div>';
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
async function reoptimizePendingFrom(position){
  const completed=state.route.filter(x=>x.status!=='pending');
  const pending=state.route.filter(x=>x.status==='pending');
  if(!pending.length)return 'none';
  const optimized=await optimizeByRoadTime(pending,position);
  state.route=[...completed,...optimized.route];
  state.currentPosition=position; state.routeMeta.optimizationMode=optimized.mode; renderRoute(); renderMap();
  return optimized.mode;
}
async function reoptimizeFromGps(){
  const btn=$('reoptimizeBtn'), status=$('gpsStatus');
  try{
    btn.disabled=true; status.textContent='Pobieram bieżącą pozycję…';
    const pos=await getCurrentPosition();
    status.textContent='Przeliczam pozostałe punkty według czasu przejazdu po drogach…';
    const mode=await reoptimizePendingFrom(pos);
    status.textContent=mode==='roads'?`Pozostała trasa zoptymalizowana po drogach od bieżącej pozycji (dokładność GPS ok. ${Math.round(pos.accuracy||0)} m).`:`Nie udało się pobrać macierzy drogowej — pozostała trasa została awaryjnie przeliczona wg GPS.`;
  }catch(e){status.textContent='Nie udało się pobrać pozycji: '+e.message}
  finally{btn.disabled=false}
}
function openRemainingRoute(){
  const pending=state.route.filter(x=>x.status==='pending'&&canNavigate(x));
  if(!pending.length){alert('Brak pozostałych urządzeń ze współrzędnymi GPS.');return}
  if(isIOS()){
    // Apple Maps bez klucza: otwieramy kolejny punkt; aplikacja CPG zachowuje pełną kolejkę do 50 urządzeń.
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

let roadRouteRequestId=0;
function formatDriveTime(seconds){
  const mins=Math.max(0,Math.round((Number(seconds)||0)/60));
  if(mins<60)return `${mins} min`;
  const h=Math.floor(mins/60),m=mins%60;
  return m?`${h} godz. ${m} min`:`${h} godz.`;
}
function setRoadRouteStatus(text,kind=''){
  const el=$('roadRouteStatus'); if(!el)return;
  el.textContent=text; el.className=`road-route-status${kind?' '+kind:''}`;
}
async function drawRoadRoute(pts){
  const requestId=++roadRouteRequestId;
  if(pts.length<2)return;
  setRoadRouteStatus('Wyznaczam przebieg trasy po ulicach…','loading');
  try{
    const coords=pts.map(p=>`${Number(p[1]).toFixed(6)},${Number(p[0]).toFixed(6)}`).join(';');
    const url=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    const response=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(requestId!==roadRouteRequestId)return;
    if(data.code!=='Ok'||!data.routes?.length)throw new Error(data.message||'Brak trasy drogowej');
    const route=data.routes[0];
    const roadPts=route.geometry.coordinates.map(([lng,lat])=>[lat,lng]);
    if(state.routeLine)state.map.removeLayer(state.routeLine);
    state.routeLine=L.polyline(roadPts,{weight:5,opacity:.85}).addTo(state.map);
    state.map.fitBounds(state.routeLine.getBounds(),{padding:[25,25]});
    const km=(Number(route.distance)||0)/1000;
    setRoadRouteStatus(`${state.routeMeta?.optimizationMode==='roads'?'Kolejność zoptymalizowana wg czasu przejazdu po drogach':'Kolejność awaryjnie wg GPS'} • Trasa po ulicach: ${km.toLocaleString('pl-PL',{maximumFractionDigits:1})} km • orientacyjny czas jazdy ${formatDriveTime(route.duration)}.`, 'ok');
  }catch(err){
    if(requestId!==roadRouteRequestId)return;
    setRoadRouteStatus('Nie udało się chwilowo pobrać przebiegu po drogach. Pokazuję awaryjnie kolejność punktów linią prostą.', 'warning');
  }
}
function renderMap(){
 if(!state.route.length)return;
 if(!state.map){state.map=L.map('map',{zoomControl:false}); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(state.map); L.control.zoom({position:'bottomright'}).addTo(state.map)}
 state.markers.forEach(m=>state.map.removeLayer(m)); state.markers=[];
 const pts=[];
 if(canNavigate(state.start)){pts.push([state.start.lat,state.start.lng]);state.markers.push(L.marker([state.start.lat,state.start.lng]).addTo(state.map).bindPopup(escapeHtml(state.start.name)))}
 state.route.forEach((x,i)=>{if(canNavigate(x)){pts.push([x.lat,x.lng]); const m=L.marker([x.lat,x.lng]).addTo(state.map).bindPopup(`${i+1}. ${escapeHtml(x.id)}<br>${escapeHtml(x.location)}${x.address&&x.address!==x.location?`<br>${escapeHtml(x.address)}`:''}`);state.markers.push(m)}});
 if(state.routeLine)state.map.removeLayer(state.routeLine);
 if(pts.length>1)state.routeLine=L.polyline(pts,{weight:3,opacity:.35,dashArray:'7 7'}).addTo(state.map);
 if(pts.length)state.map.fitBounds(pts,{padding:[25,25]});
 setTimeout(()=>state.map.invalidateSize(),100);
 drawRoadRoute(pts);
}

function openDevice(i){if(state.mode==='planner'){toast('Planista może przeglądać trasę. Dane inkasa uzupełnia konwojent po rozpoczęciu konwoju.');return} if(!state.routeMeta.startedAt){toast('Najpierw rozpocznij konwój.');return} state.currentIndex=i; const x=state.route[i]; $('deviceIndex').textContent=`URZĄDZENIE ${i+1} Z ${state.route.length}`; $('deviceId').textContent=x.id; $('deviceLocation').textContent=x.address&&x.address!==x.location?`${x.location} • ${x.address}`:x.location; $('deviceCash').textContent=money(x.cash); $('sealNumber').value=x.seal||''; if($('collectedCash')) $('collectedCash').value=(x.collectedCash===null||x.collectedCash===undefined)?'':String(x.collectedCash).replace('.',','); $('notes').value=x.notes||''; $('skipReason').value=x.reason||'Brak możliwości dojazdu'; setChoice(x.status==='skip'?'skip':'done'); updateQrStatus(x); $('undoDeviceBtn')?.classList.toggle('hidden',!state.history.some(h=>h.index===i)); showView('deviceView')}
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

$('confirmFinishBtn').onclick=async()=>{state.routeMeta.finishedAt=new Date().toISOString();state.convoy.status='completed';state.convoy.updatedAt=new Date().toISOString();saveState(); await flushCloudSave(); await generateExcel(); const d=state.route.filter(x=>x.status==='done').length,s=state.route.filter(x=>x.status==='skip').length,p=state.route.filter(x=>x.status==='pending').length; const actual=state.route.reduce((sum,x)=>sum+(x.status==='done'?(Number(x.collectedCash)||0):0),0); $('reportSummary').textContent=`Wybrano ${state.route.length} urządzeń. Zainkasowano ${d}, pominięto ${s}, bez statusu ${p}. Faktycznie wybrano ${money2(actual)}.`; showView('reportView')};
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
    const row=ws.addRow({lp:i+1,id:x.id,location:x.address||x.location,seal:x.status==='done'?(x.seal||''):'',actual:actualValue});
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
function resetAll(){if(confirm('Wyczyścić dane lokalne na tym urządzeniu? Opublikowany plan w chmurze nie zostanie usunięty.')){state.plan=[];state.route=[];state.sourceRows=[];state.lastExcelBlob=null;state.mode=null;state.sourceMeta=null;state.convoy={id:null,date:null,status:'draft',createdAt:null,publishedAt:null,updatedAt:null,cloudProvider:null,cloudItemId:null,cloudETag:null,shareToken:null};state.routeMeta={startedAt:null,finishedAt:null};clearState();if($('fileStatus'))$('fileStatus').textContent='Nie wczytano pliku.';showView('homeView')}}
$('resetBtn').onclick=resetAll; $('newRouteBtn').onclick=resetAll;


function yyyyMmDd(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function nextWorkday(from=new Date()){const d=new Date(from);d.setHours(12,0,0,0);d.setDate(d.getDate()+1);while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()+1);return yyyyMmDd(d)}
function setDefaultDates(){if($('convoyDate')&&!$('convoyDate').value)$('convoyDate').value=nextWorkday();if($('executorConvoyDate')&&!$('executorConvoyDate').value)$('executorConvoyDate').value=yyyyMmDd(new Date())}
function setPlannerMode(){state.mode='planner';setDefaultDates();showView('setupView')}
function setExecutorMode(){state.mode='executor';setDefaultDates();showView('convoyLoadView')}
$('plannerModeBtn')?.addEventListener('click',setPlannerMode);
$('executorModeBtn')?.addEventListener('click',setExecutorMode);
$('plannerBackBtn')?.addEventListener('click',()=>showView('homeView'));
$('executorBackBtn')?.addEventListener('click',()=>showView('homeView'));
$('nextWorkdayBtn')?.addEventListener('click',()=>{$('convoyDate').value=nextWorkday()});

function convoyFileName(date=state.convoy.date){return `Konwoj_${date||yyyyMmDd(new Date())}.json`}
function convoyShareUrl(date=state.convoy.date,token=state.convoy.shareToken){
 const u=new URL(window.location.href);u.hash='';u.search='';u.searchParams.set('convoy',date||'');u.searchParams.set('token',token||'');return u.toString();
}
function syncShareUi(){
 const box=$('shareConvoyBox');if(!box)return;
 const ready=state.mode==='planner'&&state.convoy.status==='published'&&state.convoy.date&&state.convoy.shareToken;
 box.classList.toggle('hidden',!ready);
 if(ready){const link=convoyShareUrl();$('shareConvoyLink').value=link;$('shareConvoyCode').textContent=`Kod konwoju: ${state.convoy.shareToken}`;}
}
function syncWorkflowUi(){
 const planner=state.mode==='planner', executor=state.mode==='executor';
 const planned=!state.routeMeta?.startedAt;
 $('plannerPublishBar')?.classList.toggle('hidden',!(planner&&state.route.length&&planned));
 $('executorStartBar')?.classList.toggle('hidden',!(executor&&state.route.length&&planned&&state.convoy.status!=='completed'));
 if($('plannerPlanDate'))$('plannerPlanDate').textContent=state.convoy.date?`Konwój na ${state.convoy.date}`:'Plan konwoju';
 if($('executorPlanDate'))$('executorPlanDate').textContent=state.convoy.date?`Konwój na ${state.convoy.date}`:'Plan konwoju';
 if($('executorPlanStatus'))$('executorPlanStatus').textContent=state.convoy.status==='in_progress'?'Konwój był już rozpoczęty. Możesz kontynuować.':'Plan opublikowany i gotowy do realizacji.';
 $('finishBtn')?.classList.toggle('hidden',!executor||!state.routeMeta?.startedAt||!!state.routeMeta?.finishedAt);
 $('editPlanBtn')?.classList.toggle('hidden',!planner);
 $('reoptimizeBtn')?.classList.toggle('hidden',!executor||!state.routeMeta?.startedAt);
 $('nextStopCard')?.classList.toggle('workflow-locked',!executor||!state.routeMeta?.startedAt);
 if($('routeTitle'))$('routeTitle').textContent=planner?'Podgląd planu':'Konwój';
 const googleActive=state.convoy.cloudProvider==='google'&&!!state.convoy.shareToken&&window.CPG_GOOGLE?.isConfigured?.();
 const m365Active=state.convoy.cloudProvider==='m365'&&!!state.convoy.cloudItemId&&window.CPG_M365?.isConfigured?.();
 $('cloudSyncBar')?.classList.toggle('hidden',!(googleActive||m365Active));
 syncShareUi();
}

async function loadLatestBalanceFromCloud(){
 try{
   if(!window.CPG_M365?.isConfigured?.())throw new Error('Microsoft 365 nie jest jeszcze skonfigurowany. Uzupełnij ms365-config.js.');
   $('fileStatus').textContent='Szukam najnowszego pliku Terminal Balance w OneDrive…';
   const item=await window.CPG_M365.getLatestBalanceFile();
   const buf=await window.CPG_M365.downloadItem(item.id);
   await loadBalanceArrayBuffer(buf,item.name,{type:'onedrive',itemId:item.id,lastModifiedDateTime:item.lastModifiedDateTime,webUrl:item.webUrl||''});
   $('fileStatus').textContent+=` • OneDrive: ${item.lastModifiedDateTime?new Date(item.lastModifiedDateTime).toLocaleString('pl-PL'):''}`;
 }catch(e){$('fileStatus').textContent='Nie pobrano pliku z OneDrive.';alert(e.message)}
}
$('loadLatestBalanceBtn')?.addEventListener('click',loadLatestBalanceFromCloud);

async function publishConvoy(){
 if(!state.route.length||!state.convoy.date){alert('Najpierw przygotuj i wyznacz trasę.');return}
 if(!window.CPG_GOOGLE?.isConfigured?.()){
   exportSession();
   alert('Google Apps Script nie jest jeszcze skonfigurowany. Przygotowałem plik planu awaryjnego. Po wdrożeniu Code.gs wklej adres /exec do google-config.js.');
   return;
 }
 let pin=sessionStorage.getItem('cpg-planner-pin')||'';
 if(!pin){pin=prompt('Podaj PIN planisty do publikacji konwoju:')||'';if(!pin)return;sessionStorage.setItem('cpg-planner-pin',pin)}
 const token=state.convoy.shareToken||window.CPG_GOOGLE.createToken();
 state.convoy.status='published';state.convoy.publishedAt=new Date().toISOString();state.convoy.updatedAt=state.convoy.publishedAt;state.convoy.cloudProvider='google';state.convoy.shareToken=token;state.convoy.cloudItemId=`google:${state.convoy.date}:${token}`;
 saveState();
 try{
   setCloudSyncStatus('Publikuję plan w Google…');
   await window.CPG_GOOGLE.publishConvoy(sessionPayload(),pin,token);
   setCloudSyncStatus('Plan opublikowany w Google.');syncWorkflowUi();
   const link=convoyShareUrl();
   try{await navigator.clipboard.writeText(link);toast('Konwój opublikowany. Link skopiowano do schowka.')}catch{toast('Konwój opublikowany. Skopiuj link dla konwojenta.')}
 }catch(e){
   state.convoy.status='draft';state.convoy.cloudProvider=null;state.convoy.cloudItemId=null;
   if(/PIN/i.test(e.message||''))sessionStorage.removeItem('cpg-planner-pin');
   saveState();setCloudSyncStatus('Błąd publikacji');alert('Nie udało się opublikować planu: '+e.message);
 }
}
$('publishConvoyBtn')?.addEventListener('click',publishConvoy);
$('copyShareLinkBtn')?.addEventListener('click',async()=>{const link=convoyShareUrl();try{await navigator.clipboard.writeText(link);toast('Skopiowano link dla konwojenta.')}catch{prompt('Skopiuj link:',link)}});
$('copyShareCodeBtn')?.addEventListener('click',async()=>{const code=state.convoy.shareToken||'';try{await navigator.clipboard.writeText(code);toast('Skopiowano kod konwoju.')}catch{prompt('Skopiuj kod:',code)}});

async function loadConvoyPayload(data,cloudItem=null){
 if(!data||!Array.isArray(data.route))throw new Error('Plik nie zawiera prawidłowej trasy.');
 state.suppressCloudSync=true;
 try{
  const provider=cloudItem?.provider||data.convoy?.cloudProvider||null;
  const token=cloudItem?.token||data.convoy?.shareToken||null;
  state.mode='executor';state.plan=(data.plan||data.route||[]).map(r=>({...r,address:r.address||r.location||'Brak adresu'}));state.route=(data.route||[]).map(r=>({...r,address:r.address||r.location||'Brak adresu'}));state.start=data.start||state.start;state.routeMeta=data.routeMeta||{startedAt:null,finishedAt:null};state.history=data.history||[];state.convoy={...state.convoy,...(data.convoy||{}),cloudProvider:provider,shareToken:token,cloudItemId:provider==='google'?`google:${data.convoy?.date||''}:${token||''}`:(cloudItem?.id||data.convoy?.cloudItemId||null),cloudETag:cloudItem?.eTag||data.convoy?.cloudETag||null};state.sourceMeta=data.sourceMeta||null;saveState();renderRoute();showView('routeView');
 }finally{state.suppressCloudSync=false}
}
async function loadConvoyByDate(){
 const date=$('executorConvoyDate')?.value;const token=String($('executorAccessCode')?.value||'').trim();
 if(!date){alert('Wybierz datę konwoju.');return}if(!token){alert('Wpisz kod konwoju albo otwórz link otrzymany od planisty.');return}
 try{
   if(!window.CPG_GOOGLE?.isConfigured?.())throw new Error('Google Apps Script nie jest skonfigurowany.');
   $('convoyLoadStatus').textContent='Pobieram plan z Google…';
   const result=await window.CPG_GOOGLE.getConvoy(date,token);
   await loadConvoyPayload(result.data,{provider:'google',token});
   $('convoyLoadStatus').textContent='Plan pobrany.';
 }catch(e){$('convoyLoadStatus').textContent='Nie udało się pobrać planu.';alert(e.message)}
}
$('loadConvoyCloudBtn')?.addEventListener('click',loadConvoyByDate);

async function autoLoadSharedConvoyFromUrl(){
 const u=new URL(window.location.href);const date=u.searchParams.get('convoy');const token=u.searchParams.get('token');
 if(!date||!token)return;
 state.mode='executor';setDefaultDates();if($('executorConvoyDate'))$('executorConvoyDate').value=date;if($('executorAccessCode'))$('executorAccessCode').value=token;showView('convoyLoadView');
 setTimeout(()=>loadConvoyByDate(),250);
}
$('executorPlanInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{await loadConvoyPayload(JSON.parse(await f.text()),null)}catch(err){alert('Nie udało się wczytać planu: '+err.message)}});

async function startConvoy(){
 if(!state.route.length)return;
 if(!state.routeMeta.startedAt)state.routeMeta.startedAt=new Date().toISOString();
 state.convoy.status='in_progress';state.convoy.updatedAt=new Date().toISOString();saveState();renderRoute();syncWorkflowUi();await flushCloudSave();toast('Konwój rozpoczęty.');
}
$('startConvoyBtn')?.addEventListener('click',startConvoy);

function setCloudSyncStatus(msg){if($('cloudSyncStatus'))$('cloudSyncStatus').textContent=msg}
function scheduleCloudSave(){
 if(state.suppressCloudSync||state.mode!=='executor')return;
 const google=state.convoy.cloudProvider==='google'&&state.convoy.shareToken&&window.CPG_GOOGLE?.isConfigured?.();
 const m365=state.convoy.cloudProvider==='m365'&&state.convoy.cloudItemId&&window.CPG_M365?.isConfigured?.();
 if(!google&&!m365)return;
 clearTimeout(state.cloudSyncTimer);setCloudSyncStatus('Zmiany oczekują na zapis…');state.cloudSyncTimer=setTimeout(()=>flushCloudSave(),700);
}
async function flushCloudSave(){
 if(state.suppressCloudSync||state.mode!=='executor')return;
 const google=state.convoy.cloudProvider==='google'&&state.convoy.shareToken&&window.CPG_GOOGLE?.isConfigured?.();
 const m365=state.convoy.cloudProvider==='m365'&&state.convoy.cloudItemId&&window.CPG_M365?.isConfigured?.();
 if(!google&&!m365)return;
 try{
   clearTimeout(state.cloudSyncTimer);state.cloudSyncTimer=null;state.convoy.updatedAt=new Date().toISOString();setCloudSyncStatus('Zapisuję w chmurze…');
   if(google){await window.CPG_GOOGLE.saveConvoy(state.convoy.date,state.convoy.shareToken,sessionPayload());setCloudSyncStatus(`Zapisano w Google ${new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}`);}
   else{const saved=await window.CPG_M365.saveConvoy(convoyFileName(),sessionPayload());state.convoy.cloudItemId=saved.id||state.convoy.cloudItemId;state.convoy.cloudETag=saved.eTag||saved.etag||state.convoy.cloudETag;setCloudSyncStatus(`Zapisano ${new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}`);}
 }catch(e){setCloudSyncStatus('Nie udało się zapisać — dane pozostają na telefonie');console.error(e)}
}

async function refreshM365Ui(){
 const configured=window.CPG_M365?.isConfigured?.();const label=$('m365UserLabel'),status=$('m365Status'),btn=$('m365ConnectBtn');if(!configured){if(label)label.textContent='Wymaga konfiguracji';if(status)status.textContent='Uzupełnij clientId, tenantId i wspólny driveId w ms365-config.js.';if(btn)btn.textContent='Instrukcja';return}try{const account=await window.CPG_M365.getAccount();if(account){if(label)label.textContent=account.name||account.username;if(status)status.textContent='Połączono. Możesz pobierać najnowszy Terminal Balance z OneDrive/SharePoint.';if(btn)btn.textContent='Połączono'}else{if(label)label.textContent='Microsoft 365';if(status)status.textContent='Zaloguj się kontem firmowym.';if(btn)btn.textContent='Połącz'}}catch(e){if(status)status.textContent=e.message}}
$('m365ConnectBtn')?.addEventListener('click',async()=>{if(!window.CPG_M365?.isConfigured?.()){alert('Najpierw skonfiguruj Microsoft 365 według pliku README_MICROSOFT365.md.');return}try{await window.CPG_M365.signIn();await refreshM365Ui()}catch(e){alert(e.message)}});
window.addEventListener('cpg-m365-ready',refreshM365Ui);
async function refreshGoogleUi(){const status=$('googleCloudStatus'),badge=$('googleCloudBadge');if(!window.CPG_GOOGLE?.isConfigured?.()){if(status)status.textContent='Wdróż Code.gs i wklej adres /exec do google-config.js.';if(badge){badge.textContent='NIEAKTYWNE';badge.classList.remove('ok')}return}try{const h=await window.CPG_GOOGLE.health();if(status)status.textContent='Google Drive gotowy do publikacji i synchronizacji konwojów.';if(badge){badge.textContent='AKTYWNE';badge.classList.add('ok')}}catch(e){if(status)status.textContent='Google jest skonfigurowany, ale usługa nie odpowiada: '+e.message;if(badge){badge.textContent='BŁĄD';badge.classList.remove('ok')}}}
window.addEventListener('cpg-google-ready',refreshGoogleUi);
setDefaultDates();

if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
restoreState();
refreshGoogleUi();
autoLoadSharedConvoyFromUrl();

// --- OneDrive / Microsoft 365 pilot workflow ---
function sessionPayload(){
  return {schema:'cpg-inkasacja-v5', exportedAt:new Date().toISOString(), convoy:state.convoy, sourceMeta:state.sourceMeta, start:state.start, plan:state.plan, route:state.route, routeMeta:state.routeMeta, history:state.history};
}
function downloadBlob(blob, filename){
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function exportSession(){
  if(!state.route.length){alert('Najpierw utwórz trasę.');return}
  const blob=new Blob([JSON.stringify(sessionPayload(),null,2)],{type:'application/json'});
  downloadBlob(blob,`CPG_Inkasacja_${new Date().toISOString().slice(0,10)}.json`);
  alert('Plik planu/postępu został przygotowany jako kopia awaryjna.');
}
async function importSessionFile(file){
  try{
    const data=JSON.parse(await file.text());
    if(!['cpg-inkasacja-v1','cpg-inkasacja-v2','cpg-inkasacja-v3','cpg-inkasacja-v4','cpg-inkasacja-v5'].includes(data.schema)||!Array.isArray(data.route)) throw new Error('Nieprawidłowy format pliku CPG Inkasacja.');
    state.plan=(data.plan||[]).map(r=>({address:r.address||r.location||'Brak adresu',...r})); state.route=data.route.map(r=>({collectedCash:null,qrRaw:'',qrScannedAt:null,address:r.address||r.location||'Brak adresu',...r})); state.start=data.start||state.start; state.routeMeta=data.routeMeta||{startedAt:null,finishedAt:null}; state.history=data.history||[]; state.convoy={...state.convoy,...(data.convoy||{})}; state.sourceMeta=data.sourceMeta||null; state.mode='executor'; saveState(); renderRoute(); showView('routeView');
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
