// FindFlix.js - separated JS
const carousel = document.getElementById('carousel');
const randomBtn = document.getElementById('randomBtn');
const searchInput = document.getElementById('searchInput');
const suggestionsEl = document.getElementById('suggestions');
const seasonMin = document.getElementById('seasonMin');
const seasonMax = document.getElementById('seasonMax');
const info = document.getElementById('info');
const stats = document.getElementById('stats');

let episodes = [];
const searchCache = new Map();
const loader = document.getElementById('loader');
const episodesContainer = document.getElementById('episodes');

// cache size limit
const CACHE_LIMIT = 50;
const TOP20_CACHE_KEY = 'findflix_top20_v1';
// Speed multiplier for wheel-to-horizontal scroll on episodes container
const WHEEL_SCROLL_FACTOR = 5; // increase to scroll faster, e.g., 2 or 3
// Tolerant search tuning
const TOLERANT_SEARCH = {
  weightSim: 0.75,   // weight for our normalized similarity
  weightApi: 0.25,   // weight for TVMaze API score
  minSim: 0.45,      // minimal similarity to consider a match
  minCombined: 0.5   // minimal combined score to accept
};
// Suggestions relevance tuning
const SUGGEST = {
  minScore: 0.2, // minimal composite score to keep an item in suggestions
  maxItems: 4,   // maximum suggestions to display
  minItems: 4    // try to show at least this many when possible
};

// hydrate persistent cache from localStorage
try{
  const raw = localStorage.getItem('findflix_cache_v1');
  if(raw) Object.entries(JSON.parse(raw)).forEach(([k,v])=>searchCache.set(k,v));
}catch(e){ console.warn('cache load failed',e) }

// request token to prevent race conditions
let currentRequestToken = 0;

// debounce helper
function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), wait);
  }
}

function setLoading(msg = '⏳ Chargement...'){
  // keep loader and random button preserved; show message in episodes container
  episodesContainer.innerHTML = `<p>${msg}</p>`;
}

function showErrorMessage(message){
  // Display a clean error message in the episodes area without destroying the carousel structure
  loader.style.display = 'none';
  episodesContainer.innerHTML = `<div class="error-message" role="status" aria-live="polite">${message}</div>`;
  stats.style.display = 'none';
  setSelectsEnabled(false);
}

// --- Helpers for tolerant search ---
function normalizeText(str){
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, ' ')       // keep alphanumerics, collapse others to space
    .replace(/^the\s+/,'')            // drop leading 'the '
    .trim();
}

function cacheKeyFromQuery(q){
  return normalizeText(q);
}

function levenshtein(a,b){
  const an = a.length, bn = b.length;
  if(an === 0) return bn;
  if(bn === 0) return an;
  const v0 = new Array(bn + 1);
  const v1 = new Array(bn + 1);
  for(let i=0;i<=bn;i++) v0[i] = i;
  for(let i=0;i<an;i++){
    v1[0] = i + 1;
    for(let j=0;j<bn;j++){
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j+1] = Math.min(v1[j] + 1, v0[j+1] + 1, v0[j] + cost);
    }
    for(let j=0;j<=bn;j++) v0[j] = v1[j];
  }
  return v0[bn];
}

function similarity(a,b){
  const A = normalizeText(a), B = normalizeText(b);
  if(!A && !B) return 1;
  if(!A || !B) return 0;
  const dist = levenshtein(A,B);
  const maxLen = Math.max(A.length, B.length) || 1;
  return 1 - (dist / maxLen); // 1 exact, ~0 very different
}

// subsequence: does A appear in order inside B (not necessarily contiguous)? returns ratio of matched length
function subseqScore(a,b){
  const A = normalizeText(a), B = normalizeText(b);
  if(!A) return 0;
  let i=0, j=0; let matched=0;
  while(i<A.length && j<B.length){
    if(A[i]===B[j]){ i++; j++; matched++; }
    else { j++; }
  }
  return matched / Math.max(A.length,1);
}

function prefixScore(a,b){
  const A = normalizeText(a), B = normalizeText(b);
  if(!A) return 0;
  return B.startsWith(A) ? Math.min(1, A.length / Math.max(B.length,1)) : 0;
}

function computeShowScore(query, show){
  const nq = normalizeText(query);
  const name = show?.name || '';
  const sim = similarity(nq, name);
  const pref = prefixScore(nq, name);
  const sub = subseqScore(nq, name);
  const apiScore = typeof show._apiScore === 'number' ? show._apiScore : 0;
  // weight: prefer prefix > subseq > similarity, keep some API score
  const score = 0.5*pref + 0.2*sub + 0.25*sim + 0.05*apiScore;
  return { score, parts: { pref, sub, sim, apiScore } };
}

function renderSuggestions(list, query){
  if(!list || list.length===0){ hideSuggestions(); return; }
  const items = list.slice(0, SUGGEST.maxItems).map((s, idx)=>{
    const img = s.image ? (s.image.medium || s.image.original) : null;
    return `<div class="suggestion-item" role="option" data-id="${s.id}" aria-selected="${idx===0?'true':'false'}">
      ${img? `<img class="suggestion-thumb" src="${img}" alt="">` : ''}
      <div>
        <div class="suggestion-title">${escapeHtml(s.name)}</div>
        ${s.premiered? `<div class="suggestion-sub">${s.premiered.slice(0,4)}${s.status? ' · '+escapeHtml(s.status): ''}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  suggestionsEl.innerHTML = items;
  suggestionsEl.hidden = false;
  searchInput.setAttribute('aria-expanded','true');
  positionSuggestionsDropdown();
}

function hideSuggestions(){
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = '';
  searchInput.setAttribute('aria-expanded','false');
}

function positionSuggestionsDropdown(){
  if(suggestionsEl.hidden) return;
  const rect = searchInput.getBoundingClientRect();
  const padding = 4;
  const width = Math.max(rect.width, 260);
  suggestionsEl.style.left = `${Math.round(rect.left)}px`;
  suggestionsEl.style.top = `${Math.round(rect.bottom + padding)}px`;
  suggestionsEl.style.width = `${Math.round(width)}px`;
}

async function fetchSuggestions(q){
  if(!q || q.trim().length < 1){ hideSuggestions(); return; }
  try{
    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
    if(!res.ok){ hideSuggestions(); return; }
    const data = await res.json(); // [{score, show}]
    const getPopularity = (show)=> {
      const weight = typeof show.weight === 'number' ? show.weight : 0;
      const rating = (show.rating && typeof show.rating.average === 'number') ? show.rating.average : 0;
      const api = typeof show._apiScore === 'number' ? show._apiScore : 0;
      return { weight, rating, api };
    };
    const candidates = data.map(d=>({ ...d.show, _apiScore: d.score }))
      .map(show=>({ show, comp: computeShowScore(q, show) }));

    const popularitySort = (a,b)=>{
      const pa = getPopularity(a.show), pb = getPopularity(b.show);
      if(pb.weight !== pa.weight) return pb.weight - pa.weight;
      if(b.comp.score !== a.comp.score) return b.comp.score - a.comp.score;
      if(pb.rating !== pa.rating) return pb.rating - pa.rating;
      return pb.api - pa.api;
    };

    // Primary relevant results
    let primary = candidates.filter(x =>
      x.comp.score >= SUGGEST.minScore || x.comp.parts.pref > 0 || x.comp.parts.sub >= 0.5 || x.comp.parts.sim >= 0.5
    ).sort(popularitySort);

    // If not enough, relax to fill up to minItems with most popular remaining candidates that still have any similarity
    if(primary.length < SUGGEST.minItems){
      const existingIds = new Set(primary.map(x=>x.show.id));
      const secondary = candidates
        .filter(x => !existingIds.has(x.show.id))
        .filter(x => x.comp.parts.sim > 0 || x.comp.parts.sub > 0) // very lax relevance
        .sort(popularitySort);
      primary = primary.concat(secondary).slice(0, Math.max(SUGGEST.minItems, SUGGEST.maxItems));
    }

    const enriched = primary.map(x => x.show);
    renderSuggestions(enriched, q);
  }catch{
    hideSuggestions();
  }
}

async function loadShowById(id){
  setLoading();
  loader.style.display = 'inline-block';
  try{
    const res = await fetch(`https://api.tvmaze.com/shows/${id}?embed=episodes`);
    if(!res.ok){ showErrorMessage('Série introuvable !'); return; }
    const data = await res.json();
    episodes = data._embedded?.episodes || [];
    populateSeasonSelects(episodes);
    displayEpisodes();
    info.textContent = `Série: ${data.name}`;
    stats.textContent = `${episodes.length} épisodes — ${Math.max(...episodes.map(e=>e.season))} saisons (est)`;
    // update cache under normalized key
    const q = searchInput.value.trim();
    if(q){
      searchCache.set(cacheKeyFromQuery(q), data);
      while(searchCache.size > CACHE_LIMIT){ const firstKey = searchCache.keys().next().value; searchCache.delete(firstKey); }
      try{ localStorage.setItem('findflix_cache_v1', JSON.stringify(Object.fromEntries(searchCache))); }catch{}
    }
  }catch{
    showErrorMessage('Erreur réseau ou API.');
  }finally{
    loader.style.display = 'none';
  }
}

async function searchSeries(){
  const query = searchInput.value.trim();
  if(!query) return;
  const requestToken = ++currentRequestToken;
  setLoading();
  loader.style.display = 'inline-block';
  try{
    // cache lookups to avoid repeated network calls while typing
    const ck = cacheKeyFromQuery(query);
    if(searchCache.has(ck)){
      // move to recent (LRU behavior)
      const data = searchCache.get(ck);
      searchCache.delete(ck);
      searchCache.set(ck, data);
      episodes = data._embedded?.episodes || [];
      populateSeasonSelects(episodes);
      displayEpisodes();
      info.textContent = `Série: ${data.name}`;
      stats.textContent = `${episodes.length} épisodes — ${Math.max(...episodes.map(e=>e.season))} saisons (est)`;
      loader.style.display = 'none';
      return;
    }

    // Perform tolerant search
    const searchRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
    if(!searchRes.ok){ showErrorMessage('Série introuvable !'); return; }
    const results = await searchRes.json(); // [{ score, show }]
    if(!Array.isArray(results) || results.length === 0){ showErrorMessage('Série introuvable !'); return; }

    // choose best by combined score (text similarity + API score)
    const nq = normalizeText(query);
    let best = null;
    for(const item of results){
      const show = item?.show; if(!show || !show.name) continue;
      const sim = similarity(nq, show.name);
      const apiScore = typeof item.score === 'number' ? item.score : 0;
      // weight: prioritize our similarity to be robust to case/typos
      const combined = TOLERANT_SEARCH.weightSim * sim + TOLERANT_SEARCH.weightApi * apiScore;
      if(!best || combined > best.combined){ best = { combined, sim, apiScore, show }; }
    }
    if(!best){ showErrorMessage('Série introuvable !'); return; }

    // Optional threshold to avoid wild mismatches
    if(best.sim < TOLERANT_SEARCH.minSim && best.combined < TOLERANT_SEARCH.minCombined){
      showErrorMessage('Série introuvable !');
      return;
    }

    // Fetch chosen show with episodes
    const res = await fetch(`https://api.tvmaze.com/shows/${best.show.id}?embed=episodes`);
    if(!res.ok){ showErrorMessage('Série introuvable !'); return; }
    const data = await res.json();
  // ignore if a newer request was made
  if(requestToken !== currentRequestToken) return;
  // store in cache (memory + localStorage) using normalized key
  // insert into cache, enforce LRU cap
  searchCache.set(cacheKeyFromQuery(query), data);
  while(searchCache.size > CACHE_LIMIT){
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  try{ localStorage.setItem('findflix_cache_v1', JSON.stringify(Object.fromEntries(searchCache))); }catch(e){/* ignore storage errors */}
    episodes = data._embedded?.episodes || [];
    populateSeasonSelects(episodes);
    if(!episodes || episodes.length===0){
      episodesContainer.innerHTML = '<div class="empty-message">Aucun épisode trouvé avec cette recherche!</div>';
      stats.style.display = 'none';
      setSelectsEnabled(false);
    } else {
      displayEpisodes();
    }
    info.textContent = `Série: ${data.name}`;
    stats.textContent = `${episodes.length} épisodes — ${Math.max(...episodes.map(e=>e.season))} saisons (est)`;
  }catch(err){
    console.error(err);
    showErrorMessage('Erreur réseau ou API.');
  }
  loader.style.display = 'none';
}

// Catalog/default-search behaviour removed: we no longer auto-load shows when the input is empty.

function populateSeasonSelects(eps){
  const maxSeason = eps.length ? Math.max(...eps.map(e=>e.season)) : 1;
  // clear
  seasonMin.innerHTML = '';
  seasonMax.innerHTML = '';
  for(let s=1;s<=maxSeason;s++){
    // count episodes in this season (kept for tooltip)
    const count = eps.filter(ep=>ep.season===s).length;
    const opt1 = document.createElement('option'); opt1.value = s; opt1.textContent = `Saison ${s}`; opt1.title = `${count} épisodes`;
    const opt2 = document.createElement('option'); opt2.value = s; opt2.textContent = `Saison ${s}`; opt2.title = `${count} épisodes`;
    seasonMin.appendChild(opt1);
    seasonMax.appendChild(opt2);
  }
  // sensible defaults
  seasonMin.value = 1;
  seasonMax.value = maxSeason;
  // enable selects when episodes are present
  setSelectsEnabled(true);
}

function setSelectsEnabled(enabled){
  seasonMin.disabled = !enabled;
  seasonMax.disabled = !enabled;
}

// keep selects consistent: min <= max
seasonMin.addEventListener('change', ()=>{
  if(parseInt(seasonMin.value) > parseInt(seasonMax.value)){
    seasonMax.value = seasonMin.value;
  }
});
seasonMax.addEventListener('change', ()=>{
  if(parseInt(seasonMax.value) < parseInt(seasonMin.value)){
    seasonMin.value = seasonMax.value;
  }
});

function applyFilter(){
  if(episodes.length===0){
    alert("Cherche une série d'abord !");
    return;
  }
  displayEpisodes();
}

function displayEpisodes(){
  const min = parseInt(seasonMin.value) || 1;
  const max = parseInt(seasonMax.value) || Math.max(...episodes.map(ep=>ep.season));
  const filtered = episodes.filter(ep=>ep.season>=min && ep.season<=max);

  // show stats of filtered vs total
  stats.textContent = `${filtered.length}/${episodes.length} épisodes affichés (Saisons ${min} → ${max})`;
  // ensure stats visible when we have values
  stats.style.display = '';

  // preserve loader and button while updating episodes container
  episodesContainer.innerHTML = '';
  if(filtered.length===0){
    episodesContainer.innerHTML = '<div class="empty-message">Aucun épisode trouvé avec cette recherche!</div>';
    // hide stats when there are no results
    stats.style.display = 'none';
    // disable selects when there are no episodes to choose from
    setSelectsEnabled(false);
    return;
  }

  filtered.forEach(ep=>{
    const div = document.createElement('div');
    div.className = 'episode';
    // mark as clickable since clicking loads details/centers
    div.classList.add('clickable');
    div.tabIndex = 0;
  div.innerHTML = `\n      <img src="${ep.image?ep.image.medium:'https://via.placeholder.com/180x100'}" alt="${escapeHtml(ep.name)}">\n      <div class="ep-meta">\n        <p class="ep-season">S${ep.season}E${ep.number}</p>\n        <p class="ep-title">${escapeHtml(ep.name)}</p>\n      </div>\n    `;
    div.addEventListener('click', ()=>{
      // keep card visual state unchanged on click; still center it and adjust carousel if needed
      ensureCarouselFits(div);
      div.scrollIntoView({behavior:'smooth',inline:'center'});
    });
    episodesContainer.appendChild(div);
  });
  // reset carousel height for safety
  resetCarouselHeight();
}

function escapeHtml(s){ return s?.replaceAll && s.replaceAll('<','&lt;').replaceAll('>','&gt;') || s }

function ensureCarouselFits(selectedEl){
  // compute required height (selected scaled 1.25)
  const rect = selectedEl.getBoundingClientRect();
  const scale = 1.25;
  const extra = (rect.height*(scale-1));
  const currentMin = parseFloat(getComputedStyle(carousel).minHeight) || 0;
  const needed = rect.height + extra + 40; // padding
  if(needed > currentMin){
    carousel.style.minHeight = needed + 'px';
  }
}

function resetCarouselHeight(){
  // default heights now larger per design
  const base = 300;
  carousel.style.minHeight = base + 'px';
}

async function pickRandom(){
  // Pick only among the currently visible episode cards (no catalog fetches)
  const episodeDivs = Array.from(document.querySelectorAll('.episode'));
  if(episodeDivs.length===0){
    alert('Aucun épisode disponible. Vérifie le filtre ou cherche une série !');
    return;
  }
  const finalIndex = Math.floor(Math.random() * episodeDivs.length);
  const flashes = [150, 200, 300];
  let i = 0;
  episodeDivs.forEach(d => d.classList.remove('selected'));
  function doFlash(){
    const el = episodeDivs[finalIndex];
    el.classList.toggle('selected');
    ensureCarouselFits(el);
    el.scrollIntoView({behavior:'smooth', inline:'center'});
    if(i < flashes.length){
      setTimeout(()=>{ i++; doFlash(); }, flashes[i]);
    } else {
      el.classList.add('selected');
    }
  }
  doFlash();
}

// Attach handlers
// search is triggered automatically on input (debounced)
// apply filters automatically when selects change
seasonMin.addEventListener('change', ()=>{ if(episodes.length) displayEpisodes(); });
seasonMax.addEventListener('change', ()=>{ if(episodes.length) displayEpisodes(); });
randomBtn.addEventListener('click', pickRandom);
// Enter to search
// search-on-type with debounce (updates selects when results returned)
const debouncedSearch = debounce(()=>{ searchSeries(); }, 450);
searchInput.addEventListener('input', async (e)=>{
  const q = e.target.value.trim();
  if(!q){
    await loadTop20Series();
    hideSuggestions();
    return;
  }
  // kick off suggestions immediately, and also keep the debounced full search
  fetchSuggestions(q);
  debouncedSearch();
  // update dropdown position as the layout can shift while typing
  positionSuggestionsDropdown();
});
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchSeries() });

// Suggestions: click + keyboard navigation
suggestionsEl.addEventListener('click', (e)=>{
  const item = e.target.closest('.suggestion-item');
  if(!item) return;
  const id = item.getAttribute('data-id');
  const title = item.querySelector('.suggestion-title')?.textContent || '';
  searchInput.value = title;
  hideSuggestions();
  loadShowById(id);
});

searchInput.addEventListener('keydown', (e)=>{
  if(suggestionsEl.hidden) return;
  const items = Array.from(suggestionsEl.querySelectorAll('.suggestion-item'));
  if(items.length===0) return;
  const currentIndex = items.findIndex(el=> el.classList.contains('active'));
  const setActive = (idx)=>{
    items.forEach((el,i)=>{ el.classList.toggle('active', i===idx); el.setAttribute('aria-selected', i===idx ? 'true':'false'); });
    if(idx>=0) items[idx].scrollIntoView({block:'nearest'});
  };
  if(e.key==='ArrowDown'){ e.preventDefault(); const ni = Math.min((currentIndex+1)||0, items.length-1); setActive(ni); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); const ni = Math.max((currentIndex<=0? -1: currentIndex-1), -1); setActive(ni); }
  else if(e.key==='Enter'){
    const idx = currentIndex>=0? currentIndex : 0;
    const chosen = items[idx]; if(!chosen) return;
    e.preventDefault();
    const id = chosen.getAttribute('data-id');
    const title = chosen.querySelector('.suggestion-title')?.textContent || '';
    searchInput.value = title;
    hideSuggestions();
    loadShowById(id);
  } else if(e.key==='Escape'){
    hideSuggestions();
  }
});

document.addEventListener('click', (e)=>{
  if(e.target.closest('.search-input-wrapper')) return;
  hideSuggestions();
});

window.addEventListener('resize', positionSuggestionsDropdown);
window.addEventListener('scroll', positionSuggestionsDropdown, true);

// reset height on resize
window.addEventListener('resize', ()=>{ resetCarouselHeight(); });

// initial state
resetCarouselHeight();
// show Top 20 by default on startup
loadTop20Series();

// --- Horizontal scroll with mouse wheel on episodes ---
// When the mouse is over the #episodes container, turn vertical wheel into horizontal scroll
// Requirement: scroll down -> scroll left, scroll up -> scroll right
episodesContainer.addEventListener('wheel', (e) => {
  // Ignore zoom gestures (ctrl+wheel)
  if (e.ctrlKey) return;
  // Only hijack when the gesture is primarily vertical, to preserve natural trackpad horizontal scroll
  const verticalDominant = Math.abs(e.deltaY) > Math.abs(e.deltaX);
  if (!verticalDominant) return;
  e.preventDefault();
  // deltaY > 0 (wheel down) => move right; deltaY < 0 (wheel up) => move left
  const leftDelta = e.deltaY * WHEEL_SCROLL_FACTOR;
  episodesContainer.scrollBy({ left: leftDelta, behavior: 'smooth' });
}, { passive: false });

// --- Top 20 catalogue support ---
async function loadTop20Series(){
  setLoading('Chargement Top 20...');
  loader.style.display = 'inline-block';
  try{
    // try cache first
    const raw = localStorage.getItem(TOP20_CACHE_KEY);
    if(raw){
      const cached = JSON.parse(raw);
      if(Array.isArray(cached) && cached.length>0){
        renderTop20FromData(cached);
        loader.style.display = 'none';
        return;
      }
    }

    // fetch first few pages to have enough candidates
    const PAGES = 5;
    const pagePromises = [];
    for(let p=0;p<PAGES;p++) pagePromises.push(fetch(`https://api.tvmaze.com/shows?page=${p}`).then(r=>r.ok? r.json(): []).catch(()=>[]));
    const pages = await Promise.all(pagePromises);
    const all = pages.flat();
    // keep only shows with images
    const withImg = all.filter(s=>s && s.image && (s.image.medium || s.image.original));
    if(withImg.length===0){
      episodesContainer.innerHTML = '<p>Aucune série avec image trouvée.</p>';
      setSelectsEnabled(false);
      return;
    }
    // sort by rating desc and take top 20
    const byRating = withImg.sort((a,b)=> (b.rating?.average || 0) - (a.rating?.average || 0));
    const top = byRating.slice(0,20);

    // fetch episodes for each selected show
    const promises = top.map(s=>fetch(`https://api.tvmaze.com/shows/${s.id}?embed=episodes`).then(r=>r.ok? r.json(): null).catch(()=>null));
    const results = await Promise.all(promises);

    // prepare minimal cacheable data
    const minimal = results.filter(r=>r && r.id).map(r=>({ id: r.id, name: r.name, image: r.image, episodes: (r._embedded?.episodes || []).map(ep=>({ id: ep.id, season: ep.season, number: ep.number, name: ep.name, image: ep.image })) }));
    try{ localStorage.setItem(TOP20_CACHE_KEY, JSON.stringify(minimal)); }catch(e){/* ignore storage errors */}

    renderTop20FromData(minimal);
    resetCarouselHeight();
  }catch(err){
    console.error('loadTop20Series failed', err);
    episodesContainer.innerHTML = '<p>Erreur lors du chargement du Top 20.</p>';
    setSelectsEnabled(false);
  }finally{
    loader.style.display = 'none';
  }
}

function renderTop20FromData(list){
  episodesContainer.innerHTML = '';
  // disable selects while showing Top20
  setSelectsEnabled(false);
  list.forEach(s=>{
    const img = s.image? (s.image.medium || s.image.original) : 'https://via.placeholder.com/250x140?text=No+Image';
    const epCount = s.episodes?.length || 0;
    const div = document.createElement('div');
    div.className = 'episode series-card';
    div.classList.add('clickable');
    div.tabIndex = 0;
    div.innerHTML = `\n      <img src="${img}" alt="${escapeHtml(s.name)}">\n      <div class="ep-meta">\n        <p class="ep-season">${epCount} épisodes</p>\n        <p class="ep-title">${escapeHtml(s.name)}</p>\n      </div>\n    `;
    div.addEventListener('click', ()=>{
      episodes = (s.episodes || []).map(ep=>({ id: ep.id, season: ep.season, number: ep.number, name: ep.name, image: ep.image }));
      populateSeasonSelects(episodes);
      displayEpisodes();
      info.textContent = `Série: ${s.name}`;
      stats.textContent = `${episodes.length} épisodes — ${Math.max(...episodes.map(e=>e.season||1))} saisons (est)`;
    });
    episodesContainer.appendChild(div);
  });
  info.textContent = 'Top 20 séries';
  stats.textContent = `${list.length} séries affichées`;
  stats.style.display = '';
}

// clearCacheBtn removed per user request
