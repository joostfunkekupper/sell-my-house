// Sell My House Calculator - JavaScript functionality

const $ = (id) => document.getElementById(id);

function toNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function formatCurrency(n) {
  const currency = state.currency || 'USD';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function formatPercent(n) {
  return `${n.toFixed(2)}%`;
}

// Compound interest for t days with nominal annual rate r and m periods per year
function compoundInterest(principal, annualRatePct, days, periodsPerYear) {
  const r = annualRatePct / 100;
  const m = periodsPerYear;
  const tYears = days / 365; // convert days to years
  if (principal <= 0 || r <= 0 || days <= 0 || m <= 0) return 0;
  const amount = principal * Math.pow(1 + r / m, m * tYears);
  return amount - principal;
}

const state = {
  loanAmount: 500000,
  annualRate: 6,
  compounding: 365,
  currency: 'USD',
  theme: 'light', // 'light' or 'dark'
  offers: [] // { id, name, amount, days }
};

const STORAGE_KEY = 'sellMyHouseData';

function saveToStorage() {
  try {
    const dataToSave = {
      loanAmount: state.loanAmount,
      annualRate: state.annualRate,
      compounding: state.compounding,
      currency: state.currency,
      theme: state.theme,
      offers: state.offers
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    
    const data = JSON.parse(saved);
    if (data.loanAmount !== undefined) state.loanAmount = data.loanAmount;
    if (data.annualRate !== undefined) state.annualRate = data.annualRate;
    if (data.compounding !== undefined) state.compounding = data.compounding;
    if (data.currency !== undefined) state.currency = data.currency;
    if (data.theme !== undefined) state.theme = data.theme;
    if (Array.isArray(data.offers)) state.offers = data.offers;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
}

function currencyToSymbol(code) {
  switch (code) {
    case 'USD': return '$';
    case 'AUD': return 'A$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '$';
  }
}

function updateCurrencySymbols() {
  const symbol = currencyToSymbol(state.currency);
  const loanSym = document.getElementById('loanCurrencySymbol');
  const offerSym = document.getElementById('offerCurrencySymbol');
  if (loanSym) loanSym.textContent = symbol;
  if (offerSym) offerSym.textContent = symbol;
}

function initTheme() {
  // Check for saved theme preference or default to 'light' mode
  const savedTheme = state.theme;
  
  // Check for system preference if no saved theme
  if (!savedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = prefersDark ? 'dark' : 'light';
  }
  
  applyTheme(state.theme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  
  state.theme = theme;
  saveToStorage();
}

function toggleTheme() {
  const newTheme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

function readInputsToState() {
  state.loanAmount = toNumber($("loanAmount").value);
  state.annualRate = toNumber($("annualRate").value);
  state.compounding = toNumber($("compounding").value);
  saveToStorage();
}

function renderInterestCards() {
  const container = $("interestCards");
  const horizons = [30, 60, 90];
  const cards = horizons.map((d) => {
    const interest = compoundInterest(state.loanAmount, state.annualRate, d, state.compounding);
    return `
      <div class="rounded-lg border border-slate-200 dark:border-slate-600 p-4">
        <div class="text-sm text-slate-600 dark:text-slate-400">${d} days</div>
        <div class="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">${formatCurrency(interest)}</div>
        <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">Balance after ${d}d: ${formatCurrency(state.loanAmount + interest)}</div>
      </div>
    `;
  }).join('');
  container.innerHTML = cards;

  const note = $("interestNote");
  note.textContent = `Assumes ${formatPercent(state.annualRate)} p.a., ${state.compounding}x compounding, based on current balance ${formatCurrency(state.loanAmount)}.`;
}

function renderOffers() {
  const tbody = $("offersTbody");
  const mobileContainer = $("offersMobile");
  
  if (!state.offers.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500 dark:text-slate-400">No offers yet. Add one above.</td></tr>`;
    mobileContainer.innerHTML = `<div class="text-center text-slate-500 dark:text-slate-400 py-6">No offers yet. Add one above.</div>`;
    return;
  }
  const rows = state.offers.map((o) => {
    const interestToSettle = compoundInterest(state.loanAmount, state.annualRate, o.days, state.compounding);
    const totalToClearLoan = state.loanAmount + interestToSettle;
    const netVsLoan = o.amount - totalToClearLoan;
    const netClass = netVsLoan >= 0 ? 'text-emerald-700' : 'text-rose-700';
    const buyerName = o.name && o.name.trim() ? o.name.trim() : '—';
    return `
      <tr class="border-b border-slate-200 dark:border-slate-600 last:border-0">
        <td class="py-3 pr-3 text-slate-900 dark:text-slate-100">${buyerName}</td>
        <td class="py-3 pr-3">
          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <span class="text-slate-500 dark:text-slate-400 text-sm">${currencyToSymbol(state.currency)}</span>
            </div>
            <input type="number" inputmode="decimal" class="block w-full rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 pl-8 pr-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.amount}" min="0" step="0.01" data-id="${o.id}" data-field="amount">
          </div>
        </td>
        <td class="py-3 pr-3">
          <input type="number" inputmode="numeric" class="block w-full rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.days}" min="0" step="1" data-id="${o.id}" data-field="days">
        </td>
        <td class="py-3 pr-3 text-slate-900 dark:text-slate-100">${formatCurrency(interestToSettle)}</td>
        <td class="py-3 pr-3 ${netClass}">${formatCurrency(netVsLoan)}</td>
        <td class="py-3 pr-3">
          <button data-id="${o.id}" class="remove-offer text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-sm" title="Remove offer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  tbody.innerHTML = rows;

  // Mobile card view
  const mobileCards = state.offers.map((o) => {
    const interestToSettle = compoundInterest(state.loanAmount, state.annualRate, o.days, state.compounding);
    const totalToClearLoan = state.loanAmount + interestToSettle;
    const netVsLoan = o.amount - totalToClearLoan;
    const netClass = netVsLoan >= 0 ? 'text-emerald-700' : 'text-rose-700';
    const buyerName = o.name && o.name.trim() ? o.name.trim() : '—';
    return `
      <div class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="font-medium text-slate-900 dark:text-slate-100">${buyerName}</div>
            <div class="text-sm text-slate-500 dark:text-slate-400">Buyer</div>
          </div>
          <button data-id="${o.id}" class="remove-offer text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400" title="Remove offer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Offer Amount</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <span class="text-slate-500 dark:text-slate-400 text-xs">${currencyToSymbol(state.currency)}</span>
              </div>
              <input type="number" inputmode="decimal" class="block w-full rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 pl-6 pr-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.amount}" min="0" step="0.01" data-id="${o.id}" data-field="amount">
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Settlement (days)</label>
            <input type="number" inputmode="numeric" class="block w-full rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.days}" min="0" step="1" data-id="${o.id}" data-field="days">
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Interest to Settle</div>
              <div class="font-medium text-slate-900 dark:text-slate-100">${formatCurrency(interestToSettle)}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500 dark:text-slate-400">Net vs Loan</div>
              <div class="font-medium ${netClass}">${formatCurrency(netVsLoan)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  mobileContainer.innerHTML = mobileCards;

  // Bind remove buttons (both desktop and mobile)
  document.querySelectorAll('button.remove-offer').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      state.offers = state.offers.filter(o => String(o.id) !== String(id));
      saveToStorage();
      renderOffers();
    });
  });

  // Bind edit inputs (both desktop and mobile)
  document.querySelectorAll('input[data-field]').forEach((input) => {
    input.addEventListener('blur', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const field = e.currentTarget.getAttribute('data-field');
      const value = toNumber(e.currentTarget.value);
      
      const offer = state.offers.find(o => String(o.id) === String(id));
      if (offer && value >= 0) {
        offer[field] = value;
        saveToStorage();
        // Re-render to update calculated values
        renderOffers();
      }
    });
  });
}

function validatePositiveNumber(value, fieldName) {
  const n = toNumber(value);
  if (n < 0 || !isFinite(n)) {
    alert(`${fieldName} must be a valid non-negative number.`);
    return null;
  }
  return n;
}

function setupEvents() {
  ["loanAmount", "annualRate", "compounding"].forEach((id) => {
    $(id).addEventListener('input', () => {
      readInputsToState();
      renderInterestCards();
      renderOffers();
    });
  });

  $("currency").addEventListener('change', (e) => {
    state.currency = e.target.value;
    updateCurrencySymbols();
    saveToStorage();
    renderInterestCards();
    renderOffers();
  });

  $("themeToggle").addEventListener('click', toggleTheme);

  $("resetBtn").addEventListener('click', () => {
    $("loanAmount").value = '500000';
    $("annualRate").value = '6';
    $("compounding").value = '365';
    $("currency").value = 'USD';
    state.offers = [];
    readInputsToState();
    state.currency = 'USD';
    // Don't reset theme preference
    updateCurrencySymbols();
    saveToStorage();
    renderInterestCards();
    renderOffers();
  });

  $("addOfferBtn").addEventListener('click', () => {
    const amount = validatePositiveNumber($("offerAmount").value, 'Offer amount');
    const days = validatePositiveNumber($("offerDays").value, 'Settlement days');
    if (amount === null || days === null) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const name = $("offerName").value.trim();
    state.offers.push({ id, name, amount, days });
    $("offerName").value = '';
    $("offerAmount").value = '';
    $("offerDays").value = '';
    saveToStorage();
    renderOffers();
  });
}

// Initialize the application
function init() {
  loadFromStorage();
  initTheme();
  $("loanAmount").value = state.loanAmount;
  $("annualRate").value = state.annualRate;
  $("compounding").value = state.compounding;
  $("currency").value = state.currency;
  updateCurrencySymbols();
  renderInterestCards();
  renderOffers();
  setupEvents();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
