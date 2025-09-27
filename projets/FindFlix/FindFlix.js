// FindFlix.js - separated JS
const carousel = document.getElementById('carousel');
const randomBtn = document.getElementById('randomBtn');
const searchInput = document.getElementById('searchInput');
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

async function searchSeries(){
  const query = searchInput.value.trim();
  if(!query) return;
  const requestToken = ++currentRequestToken;
  setLoading();
  loader.style.display = 'inline-block';
  try{
    // cache lookups to avoid repeated network calls while typing
    if(searchCache.has(query)){
      // move to recent (LRU behavior)
      const data = searchCache.get(query);
      searchCache.delete(query);
      searchCache.set(query, data);
      episodes = data._embedded?.episodes || [];
      populateSeasonSelects(episodes);
      displayEpisodes();
      info.textContent = `Série: ${data.name}`;
      stats.textContent = `${episodes.length} épisodes — ${Math.max(...episodes.map(e=>e.season))} saisons (est)`;
      loader.style.display = 'none';
      return;
    }

    const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}&embed=episodes`);
    if(!res.ok){
      carousel.innerHTML = '<p>❌ Série introuvable !</p>';
      stats.style.display = 'none';
      setSelectsEnabled(false);
      return;
    }
    const data = await res.json();
  // ignore if a newer request was made
  if(requestToken !== currentRequestToken) return;
  // store in cache (memory + localStorage)
  // insert into cache, enforce LRU cap
  searchCache.set(query, data);
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
    carousel.innerHTML = '<p>Erreur réseau ou API.</p>';
    loader.style.display = 'none';
    setSelectsEnabled(false);
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
    return;
  }
  debouncedSearch();
});
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchSeries() });

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
