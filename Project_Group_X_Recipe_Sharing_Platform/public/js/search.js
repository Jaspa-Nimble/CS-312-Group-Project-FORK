// Brenden Cabrera - Phase 1: search page behavior.
import { el, formatTime, mealClass, getJson } from './common.js';

const form = document.getElementById('search-form');
const cuisineSelect = document.getElementById('cuisine');
const mealTypeBox = document.getElementById('meal-types');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

let requestCounter = 0; // lets us ignore out-of-order responses

function selectedMealType() {
  const checked = form.querySelector('input[name="mealType"]:checked');
  return checked ? checked.value : '';
}

function currentParams() {
  const params = new URLSearchParams();
  const values = {
    q: form.q.value.trim(),
    ingredient: form.ingredient.value.trim(),
    cuisine: cuisineSelect.value,
    mealType: selectedMealType(),
  };
  for (const [k, v] of Object.entries(values)) if (v) params.set(k, v);
  return params;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function renderCard(recipe) {
  const tags = (recipe.dietary_tags || []).join(' · ');
  return el('a', { class: 'card', href: `/recipe.html?id=${encodeURIComponent(recipe.id)}` },
    el('div', { class: `thumb ${mealClass(recipe.meal_type)}`, 'aria-hidden': 'true' }, recipe.cuisine),
    el('div', { class: 'card-body' },
      el('h2', {}, recipe.title),
      el('p', {}, recipe.description),
      el('div', { class: 'meta' },
        el('span', {}, recipe.meal_type),
        el('span', {}, formatTime(recipe.cook_time_minutes)),
        el('span', {}, recipe.difficulty)),
      tags ? el('div', { class: 'meta' }, tags) : null));
}

async function runSearch() {
  const params = currentParams();
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname); // shareable / back-button friendly

  const thisRequest = ++requestCounter;
  setStatus('Searching…');
  try {
    const data = await getJson(`/api/search${qs ? `?${qs}` : ''}`);
    if (thisRequest !== requestCounter) return; // a newer search already started
    resultsEl.replaceChildren(...data.results.map(renderCard));
    if (data.count === 0) setStatus('No recipes match your search. Try fewer filters or a different keyword.');
    else setStatus(`${data.count} recipe${data.count === 1 ? '' : 's'} found`);
  } catch (err) {
    if (thisRequest !== requestCounter) return;
    resultsEl.replaceChildren();
    setStatus('Could not load recipes. Please check your connection and try again.', true);
  }
}

function mealChip(value, label, checked) {
  return el('label', { class: 'chip' },
    el('input', { type: 'radio', name: 'mealType', value, checked }),
    el('span', {}, label));
}

async function init() {
  const initial = new URLSearchParams(location.search);
  form.q.value = initial.get('q') || '';
  form.ingredient.value = initial.get('ingredient') || '';

  try {
    const filters = await getJson('/api/search/filters');
    cuisineSelect.append(...filters.cuisines.map((c) => el('option', { value: c }, c)));
    cuisineSelect.value = initial.get('cuisine') || '';
    const wanted = (initial.get('mealType') || '').toLowerCase();
    mealTypeBox.replaceChildren(
      mealChip('', 'Any', !wanted),
      ...filters.mealTypes.map((m) => mealChip(m, m, m.toLowerCase() === wanted)));
  } catch {
    mealTypeBox.replaceChildren(mealChip('', 'Any', true)); // search still works without filter options
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); runSearch(); });
  cuisineSelect.addEventListener('change', runSearch);
  mealTypeBox.addEventListener('change', runSearch);
  form.addEventListener('reset', () => setTimeout(() => {
    // reset only restores initial values; re-select the "Any" chip explicitly
    const any = mealTypeBox.querySelector('input[value=""]');
    if (any) any.checked = true;
    runSearch();
  }, 0));

  runSearch();
}

init();
