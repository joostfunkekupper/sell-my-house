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
        <div class="mt-1 text-1xl font-semibold text-slate-900 dark:text-slate-100">${formatCurrency(interest)}</div>
        <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">Balance after ${d}d: ${formatCurrency(state.loanAmount + interest)}</div>
      </div>
    `;
  }).join('');
  container.innerHTML = cards;

  const note = $("interestNote");
  note.textContent = `Assumes ${formatPercent(state.annualRate)} p.a., ${state.compounding}x compounding, based on current balance ${formatCurrency(state.loanAmount)}.`;
}

function renderOffers() {
  const desktopContainer = $("offersDesktop");
  const mobileContainer = $("offersMobile");

  if (!state.offers.length) {
    if (desktopContainer) {
      desktopContainer.innerHTML = `<div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/30 px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No offers yet. Add one above.</div>`;
    }
    mobileContainer.innerHTML = `<div class="text-center text-slate-500 dark:text-slate-400 py-6">No offers yet. Add one above.</div>`;
    return;
  }

  const sortedOffers = [...state.offers].sort((a, b) => {
    const aInterest = compoundInterest(state.loanAmount, state.annualRate, a.days, state.compounding);
    const bInterest = compoundInterest(state.loanAmount, state.annualRate, b.days, state.compounding);
    const aNetVsLoan = a.amount - (state.loanAmount + aInterest);
    const bNetVsLoan = b.amount - (state.loanAmount + bInterest);
    return bNetVsLoan - aNetVsLoan;
  });

  if (desktopContainer) {
    const cardMarkup = sortedOffers.map((o, index) => {
      const interestToSettle = compoundInterest(state.loanAmount, state.annualRate, o.days, state.compounding);
      const totalToClearLoan = state.loanAmount + interestToSettle;
      const netVsLoan = o.amount - totalToClearLoan;
      const netPositive = netVsLoan >= 0;
      const netClass = netPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400';
      const buyerName = o.name && o.name.trim() ? o.name.trim() : '—';
      const hasNotes = o.notes && o.notes.trim();
      const isBestOffer = index === 0;
      const cardAccent = isBestOffer
        ? 'border-primary-200/80 bg-primary-50/60 dark:border-primary-800/70 dark:bg-primary-900/15 shadow-sm'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40';
      const bestBadge = isBestOffer
        ? `<span class="inline-flex items-center rounded-full bg-primary-100/90 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-900/60 dark:text-primary-200">Top offer</span>`
        : '';
      const notesHint = hasNotes
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M12 4h9"/><rect x="3" y="9" width="13" height="6" rx="2"/></svg>
              Notes added
            </span>`
        : '';
      const tagRow = bestBadge || notesHint
        ? `<div class="mt-2 flex flex-wrap items-center gap-2">${bestBadge}${notesHint}</div>`
        : '';

      return `
        <article class="relative rounded-2xl border ${cardAccent} px-5 pb-5 pt-6 transition-colors hover:border-primary-300/70 dark:hover:border-primary-700/70">
          <button data-id="${o.id}" class="remove-offer absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-slate-100/90 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-300" title="Remove offer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
          <div class="flex flex-wrap items-start gap-4 pr-10">
            <div>
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Buyer</div>
              <div class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">${buyerName}</div>
              ${tagRow}
            </div>
            <div class="ml-auto text-right">
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Interest to settle</div>
              <div class="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">${formatCurrency(interestToSettle)}</div>
              <div class="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Net vs loan</div>
              <div class="mt-1 text-base font-semibold ${netClass}">${formatCurrency(netVsLoan)}</div>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Offer amount</label>
              <div class="mt-1 relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span class="text-slate-500 dark:text-slate-400 text-sm">${currencyToSymbol(state.currency)}</span>
                </div>
                <input type="number" inputmode="decimal" class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 pl-9 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.amount}" min="0" step="0.01" data-id="${o.id}" data-field="amount">
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Settlement (days)</label>
              <input type="number" inputmode="numeric" class="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.days}" min="0" step="1" data-id="${o.id}" data-field="days">
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Deposit (%)</label>
              <div class="mt-1 relative">
                <input type="number" inputmode="decimal" class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 pr-9 pl-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.deposit || 0}" min="0" max="100" step="0.1" data-id="${o.id}" data-field="deposit">
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span class="text-slate-500 dark:text-slate-400 text-xs font-medium">%</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-5 flex flex-wrap items-center gap-4">
            <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded" ${o.subjectToFinance ? 'checked' : ''} data-id="${o.id}" data-field="subjectToFinance">
              <span>Subject to finance</span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded" ${o.buildingPestInspection ? 'checked' : ''} data-id="${o.id}" data-field="buildingPestInspection">
              <span>Building &amp; Pest</span>
            </label>
          </div>
          ${hasNotes ? `
            <div class="mt-5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 px-4 py-3 dark:bg-slate-900/60">
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Offer notes</div>
              <textarea class="mt-2 w-full resize-none rounded-lg border border-slate-200/70 bg-white/90 px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100" rows="${Math.max(2, Math.ceil(o.notes.length / 80))}" data-id="${o.id}" data-field="notes">${o.notes}</textarea>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    desktopContainer.innerHTML = `<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">${cardMarkup}</div>`;
  }

  const mobileCards = sortedOffers.map((o, index) => {
    const interestToSettle = compoundInterest(state.loanAmount, state.annualRate, o.days, state.compounding);
    const totalToClearLoan = state.loanAmount + interestToSettle;
    const netVsLoan = o.amount - totalToClearLoan;
    const netClass = netVsLoan >= 0 ? 'text-green-700' : 'text-red-700';
    const buyerName = o.name && o.name.trim() ? o.name.trim() : '—';
    const isBestOffer = index === 0;
    const mobileClasses = isBestOffer
      ? 'border border-primary-200/80 bg-primary-50/60 dark:border-primary-800/70 dark:bg-primary-900/20'
      : 'border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800';
    const bestBadge = isBestOffer
      ? `<span class="mt-1 inline-flex items-center rounded-full bg-primary-100/80 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">Top offer</span>`
      : '';
    return `
      <div class="${mobileClasses} rounded-lg p-4">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="font-medium text-slate-900 dark:text-slate-100">${buyerName}</div>
            <div class="text-sm text-slate-500 dark:text-slate-400">Buyer</div>
            ${bestBadge}
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
        <div class="mt-3 grid grid-cols-1 gap-3 text-sm">
          <div>
            <label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Deposit (%)</label>
            <div class="relative">
              <input type="number" inputmode="decimal" class="block w-full rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 pr-6 pl-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500" value="${o.deposit || 0}" min="0" max="100" step="0.1" data-id="${o.id}" data-field="deposit">
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <span class="text-slate-500 dark:text-slate-400 text-xs">%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div class="flex items-center">
            <input type="checkbox" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded" ${o.subjectToFinance ? 'checked' : ''} data-id="${o.id}" data-field="subjectToFinance">
            <label class="ml-2 text-xs text-slate-700 dark:text-slate-300">Subject to finance</label>
          </div>
          <div class="flex items-center">
            <input type="checkbox" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded" ${o.buildingPestInspection ? 'checked' : ''} data-id="${o.id}" data-field="buildingPestInspection">
            <label class="ml-2 text-xs text-slate-700 dark:text-slate-300">Building & Pest</label>
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
        ${o.notes && o.notes.trim() ? `
        <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">Notes:</div>
          <textarea class="w-full text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:border-primary-500 focus:ring-primary-500 resize-none" rows="${Math.max(2, Math.ceil(o.notes.length / 50))}" data-id="${o.id}" data-field="notes">${o.notes}</textarea>
        </div>
        ` : ''}
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

  // Bind edit inputs and textareas (both desktop and mobile)
  document.querySelectorAll('input[data-field], textarea[data-field]').forEach((input) => {
    const eventType = input.type === 'checkbox' ? 'change' : 'blur';
    input.addEventListener(eventType, (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const field = e.currentTarget.getAttribute('data-field');
      
      const offer = state.offers.find(o => String(o.id) === String(id));
      if (offer) {
        if (input.type === 'checkbox') {
          offer[field] = e.currentTarget.checked;
        } else if (input.tagName.toLowerCase() === 'textarea') {
          // Handle textarea (notes)
          offer[field] = e.currentTarget.value;
        } else {
          const value = toNumber(e.currentTarget.value);
          if (field === 'deposit') {
            // Validate deposit percentage (0-100)
            if (value >= 0 && value <= 100) {
              offer[field] = value;
            }
          } else if (value >= 0) {
            offer[field] = value;
          }
        }
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

function validateDepositPercentage(value, fieldName) {
  const n = toNumber(value);
  if (n < 0 || n > 100 || !isFinite(n)) {
    alert(`${fieldName} must be a valid percentage between 0 and 100.`);
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
    
    // Validate deposit percentage (optional, but if provided must be valid)
    const depositValue = $("offerDeposit").value.trim();
    let deposit = 0; // Default to 0% if not provided
    if (depositValue !== '') {
      deposit = validateDepositPercentage(depositValue, 'Deposit percentage');
      if (deposit === null) return;
    }
    
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const name = $("offerName").value.trim();
    const notes = $("offerNotes").value.trim();
    const subjectToFinance = $("subjectToFinance").checked;
    const buildingPestInspection = $("buildingPestInspection").checked;
    state.offers.push({ id, name, amount, days, deposit, notes, subjectToFinance, buildingPestInspection });
    $("offerName").value = '';
    $("offerAmount").value = '';
    $("offerDays").value = '';
    $("offerDeposit").value = '';
    $("offerNotes").value = '';
    $("subjectToFinance").checked = false;
    $("buildingPestInspection").checked = false;
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
