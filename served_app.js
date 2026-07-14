console.log('Sri Balaji app.js loaded');

// PWA Cache Buster: Unregister stale service worker and force reload if updated elements are missing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyPwaVersion);
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    verifyPwaVersion();
    initializeApp();
}

window.addEventListener('load', () => {
    if (!window.appInitialized) {
        initializeApp();
    }
});

function initializeApp() {
    if (window.appInitialized) return;
    window.appInitialized = true;
    console.log('Sri Balaji app initialization started');
    setupAuthView();
    setupEventListeners();
    registerServiceWorker();
}

function verifyPwaVersion() {
    if (!document.getElementById('nav-traders')) {
        console.warn("Stale HTML detected. Clearing service worker cache and reloading...");
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let reg of registrations) reg.unregister();
                caches.keys().then((keys) => {
                    for (let key of keys) caches.delete(key);
                }).then(() => {
                    window.location.reload(true);
                });
            });
        }
    }
}

// API Base URL (Relative paths because frontend is served by the backend)
const API_BASE = '/api';
const ACTIVE_TAB_KEY = 'balaji_active_tab';
const SHOP_TYPE_KEY = 'balaji_shop_type';
const LANGUAGE_KEY = 'balaji_language';
const SESSION_TOKEN_KEY = 'balaji_token';
const IMPORT_SEASON = '2026-27';

// Global Application State
// Use sessionStorage so each browser session starts at login by default.
localStorage.removeItem(SESSION_TOKEN_KEY);
const navEntry = performance.getEntriesByType('navigation')[0];
const navType = navEntry ? navEntry.type : 'navigate';
if (navType !== 'reload') {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
}
let sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY) || null;
let currentShopType = localStorage.getItem(SHOP_TYPE_KEY) || 'TRADERS'; // default: Sri Balaji Traders
let selectedSeason = '';
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'en'; // 'en' or 'te'

// Navigation history for back button
let navigationHistory = [];

// Translation mappings for Telugu
const translations = {
    'te': {
        'Dashboard': 'డ్యాష్‌బోర్డ్',
        'Farmers Directory': 'రైతుల డిరెక్టరీ',
        'Farmer Ledger': 'రైతు ఖాతా',
        'Interest Calculator': 'వడ్డీ కాలిక్యులేటర్',
        'Traders Directory': 'వర్తకుల డిరెక్టరీ',
        'Trader Ledger': 'వర్తక ఖాతా',
        'Goods & Stock': 'సరుకులు & స్టాక్',
        'Active Business:': 'సక్రియ వ్యాపారం:',
        'Farmer Name': 'రైతు పేరు',
        'Phone Number': 'ఫోన్ నంబర్',
        'Village': 'గ్రామం',
        'Crop Details': 'పంట వివరాలు',
        'Season': 'సీజన్',
        'Add Farmer': 'రైతు జోడించండి',
        'Search': 'వెతకండి',
        'Actions': 'చర్యలు',
        'Edit': 'సవరించండి',
        'Delete': 'తొలగించండి',
        'Save': 'భద్రపరచండి',
        'Cancel': 'రద్దు చేయండి',
        'Close': 'మూసివేయండి',
        'Add New Farmer': 'కొత్త రైతు జోడించండి',
        'Upload Image': 'చిత్రం అప్‌లోడ్ చేయండి',
        'Add Manually': 'మాన్యువల్‌గా జోడించండి',
        'Enter full name': 'పూర్తి పేరు నమోదు చేయండి',
        'Enter 10-digit number': '10-అంకెల సంఖ్యను నమోదు చేయండి',
        'Enter village': 'గ్రామం నమోదు చేయండి',
        'Add Farmer Manually': 'రైతు మాన్యువల్‌గా జోడించండి',
        'Add Transaction': 'లెక్క జోడించండి',
        'Date': 'తేదీ',
        'Amount': 'రాశి',
        'Description': 'వివరణ',
        'Type': 'రకం',
        'BILL': 'బిల్లు',
        'PAYMENT': 'చెల్లింపు',
        'INTEREST': 'వడ్డీ',
        'ADVANCE': 'అగ్రిమం'
    }
};

// Function to apply translations to the UI
function applyTranslations() {
    if (currentLanguage === 'en') return; // No translation needed for English
    
    // Translate sidebar navigation
    const navItems = document.querySelectorAll('.sidebar-nav li');
    navItems.forEach(item => {
        const span = item.querySelector('span');
        if (span) {
            const text = span.textContent.trim();
            const translated = t(text);
            if (translated !== text) {
                span.textContent = translated;
            }
        }
    });
    
    // Translate labels with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const translated = t(key);
        if (translated !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translated;
            } else {
                el.textContent = translated;
            }
        }
    });
    
    // Translate form labels
    document.querySelectorAll('label').forEach(label => {
        const text = label.textContent.trim();
        if (text) {
            const translated = t(text);
            if (translated !== text) {
                label.textContent = translated;
            }
        }
    });
    
    // Translate button text
    document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent.trim();
        if (text && !text.includes('×') && !text.includes('×')) {
            const translated = t(text);
            if (translated !== text) {
                // Preserve icon if present
                const icon = btn.querySelector('i');
                if (icon) {
                    btn.innerHTML = `${icon.outerHTML} ${translated}`;
                } else {
                    btn.textContent = translated;
                }
            }
        }
    });
    
    // Translate headers and titles
    document.querySelectorAll('h3, h2, h1').forEach(heading => {
        const text = heading.textContent.trim();
        if (text && !heading.querySelector('i')) {
            const translated = t(text);
            if (translated !== text) {
                heading.textContent = translated;
            }
        }
    });
}

// Function to translate text
function t(key) {
    if (currentLanguage === 'en' || !translations['te'][key]) {
        return key;
    }
    return translations['te'][key];
}

// Convert text to Telugu script (English to Telugu transliteration)
function convertToTelugu(text) {
    if (!text) return text;
    if (currentLanguage !== 'te') return text;
    
    // Common Telugu transliterations
    const teluguMap = {
        'Sri Srinivasa': 'శ్రీ శ్రీనివాస',
        'Srinivasa': 'శ్రీనివాస',
        'Guntur': 'గుంటూరు',
        'Vijayawada': 'విజయవాడ',
        'Farmer': 'రైతు',
        'Chilli': 'మిర్చి',
        'Merchants': 'వర్తకులు',
        'Association': 'సంస్థ'
    };
    
    let result = text;
    for (let [eng, tel] of Object.entries(teluguMap)) {
        result = result.replace(new RegExp(eng, 'gi'), tel);
    }
    return result;
}
let activeFarmers = [];
let selectedFarmerId = null;
let selectedNotebookPages = [];
let selectedFarmerIdForPhoto = null;
let pendingFarmerUploadInProgress = false;

let imgZoomScale = 1.0;

// Financial summary cache: { farmerId -> { totalTaken, interestAccrued } }
let farmerFinancialCache = {};

// DOM Elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const shopTitleText = document.getElementById('shop-title-text');
const shopSubtitleText = document.getElementById('shop-subtitle-text');
const activeShopLabels = document.querySelectorAll('.active-shop-label');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeModals = document.querySelectorAll('.close-modal');

// Register Service Worker for PWA mobile installability
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker Registered Successfully'))
            .catch(err => console.error('Service Worker Registration Failed', err));
    }
}

// Auth View Setup
function setupAuthView() {
    if (sessionToken) {
        loginContainer.classList.remove('active');
        appContainer.classList.add('active');
        // Apply translations based on current language setting
        applyTranslations();
        // Restore last viewed tab, or default to dashboard if none stored
        const lastTab = localStorage.getItem(ACTIVE_TAB_KEY) || 'tab-dashboard';
        switchTab(lastTab);
        onAppLoad();
    } else {
        appContainer.classList.remove('active');
        loginContainer.classList.add('active');
    }
}

// Global Event Listeners
function setupEventListeners() {
    if (!loginForm) {
        console.error('Login form not found, event listener cannot be attached');
    } else {
        console.log('Attaching login form submit handler');
        // Login Submission - prevent default form submit, send JSON instead
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();
            
            if (!usernameInput || !passwordInput) {
                loginError.innerText = "Username and password are required.";
                loginError.classList.remove('hide');
                return;
            }
            
            loginError.classList.add('hide');

            try {
                console.log('Sending login request to /api/auth/login');
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                console.log('Login response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Login successful:', data);
                    sessionToken = data.token;
                    sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
                    setupAuthView();
                } else {
                    const errorData = await response.json().catch(() => null);
                    console.log('Login failed:', errorData);
                    loginError.innerText = errorData?.message || "Invalid username or password.";
                    loginError.classList.remove('hide');
                }
            } catch (err) {
                console.error('Login error:', err);
                loginError.innerText = "Error connecting to server. Make sure backend is running.";
                loginError.classList.remove('hide');
            }
        });
        }

        // Ensure logout/profile listeners are attached using current DOM
        const logoutEl = document.getElementById('logout-btn');
        logoutEl?.addEventListener('click', () => {
            sessionToken = null;
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
            localStorage.removeItem(SESSION_TOKEN_KEY);
            setupAuthView();
        });

        document.getElementById('profile-btn')?.addEventListener('click', () => {
            document.getElementById('profile-modal')?.classList.remove('hide');
        });

    // No shop dropdown in the new home UI. Business mode is selected via the dashboard buttons.
        clearFarmerSelection();
        clearTraderSelection();

        // Refresh the currently visible tab so the list reflects the selected shop type
        if (document.getElementById('tab-farmers')?.classList.contains('active')) {
            loadFarmersDirectory();
        } else if (document.getElementById('tab-traders')?.classList.contains('active')) {
            loadTradersDirectory();
        } else if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
            loadDashboardData();
        }
    });

    // Sidebar Tab Switching
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.addEventListener('click', (e) => {
            const clickedItem = e.currentTarget;
            const tabId = clickedItem.getAttribute('data-tab');
            
            // Toggle active sidebar link
            document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
            clickedItem.classList.add('active');
            
            // Toggle active tab panel
            switchTab(tabId);
        });
    });

    // Modal close triggers
    closeModals.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hide');
        });
    });

    // Profile Modal toggle
    profileBtn?.addEventListener('click', () => {
        profileModal?.classList.remove('hide');
    });

    // Modal clicks (close if clicked outside content)
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && !e.target.classList.contains('transcription-modal-content')) {
            e.target.classList.add('hide');
        }
    });

    // Stock Form Submit
        document.getElementById('stock-form')?.addEventListener('submit', logStockPurchase);

    // Farmer Form Submit
        document.getElementById('farmer-form')?.addEventListener('submit', saveFarmerProfile);

    // Ledger Farmer Selector change
    document.getElementById('ledger-farmer-selector')?.addEventListener('change', (e) => {
        const farmerId = e.target.value;
        if (farmerId) {
            loadFarmerLedger(farmerId);
        } else {
            document.getElementById('ledger-details-container').classList.add('hide');
        }
    });

    // Ledger Transaction Form Submit
        document.getElementById('transaction-form')?.addEventListener('submit', saveLedgerTransaction);

    // Bill file preview
    document.getElementById('tx-bill-file')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const preview = document.getElementById('tx-bill-preview');
        const billName = document.getElementById('tx-bill-name');
        
        if (file) {
            preview.style.display = 'block';
            billName.textContent = file.name + ` (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
            preview.style.display = 'none';
        }
    });

    // Search Farmers list dynamically
        document.getElementById('farmer-search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderFarmersList(query);
        renderFarmersPlaceholderGrid(query);
    });

    document.getElementById('season-filter')?.addEventListener('change', (e) => {
        selectedSeason = e.target.value;
        renderFarmersList(document.getElementById('farmer-search-input').value.toLowerCase());
        renderFarmersPlaceholderGrid(document.getElementById('farmer-search-input').value.toLowerCase());
    });

    // Standalone Calculator Farmer Selector change (Auto fills principal)
        document.getElementById('calc-farmer-select')?.addEventListener('change', async (e) => {
        const farmerId = e.target.value;
        if (farmerId) {
            try {
                const res = await fetch(`${API_BASE}/transactions/farmer/${farmerId}/summary?shopType=${currentShopType}`);
                if (res.ok) {
                    const summary = await res.json();
                    document.getElementById('calc-principal').value = summary.balanceDue > 0 ? summary.balanceDue : 0;
                }
            } catch (err) {
                console.error("Error auto-filling principal", err);
            }
        }
    });

    // Standalone Calculator Form Submit
        document.getElementById('calc-form')?.addEventListener('submit', calculateInterestAccrued);

    // Apply Standalone Interest to Ledger button
        document.getElementById('post-interest-btn')?.addEventListener('click', applyInterestToLedger);

    // Profile Picture selected file name change
        document.getElementById('profile-photo-input')?.addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : '';
        document.getElementById('profile-photo-selected-filename').innerText = fileName;
    });

    // Profile Photo Upload Form
        document.getElementById('profile-photo-upload-form')?.addEventListener('submit', uploadFarmerProfilePhoto);

    // Delete Profile Photo button
        document.getElementById('profile-delete-photo-btn')?.addEventListener('click', deleteFarmerProfilePhoto);

    // Notebook Page selected file name change
        document.getElementById('notebook-file-input')?.addEventListener('click', (e) => {
        e.target.value = '';
    });
        document.getElementById('notebook-file-input')?.addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : '';
        document.getElementById('notebook-selected-filename').innerText = fileName;
    });

    // Notebook upload form submit
        document.getElementById('notebook-upload-form')?.addEventListener('submit', uploadNotebookPagePhoto);

    // Farmer entry modal handlers
        document.getElementById('farmer-entry-upload-form')?.addEventListener('submit', submitFarmerEntryUpload);
        document.getElementById('farmer-entry-manual-form')?.addEventListener('submit', submitFarmerEntryManual);
        document.getElementById('farmer-entry-photo')?.addEventListener('click', (e) => {
            e.target.value = '';
        });
        document.getElementById('farmer-entry-photo')?.addEventListener('change', (e) => {
            const fileName = e.target.files[0] ? e.target.files[0].name : '';
            const label = document.querySelector('#farmer-entry-upload-form .file-name');
            if (label) label.innerText = fileName;
        });

    // Zoom listener for transcription page image
    const transImg = document.getElementById('transcription-image');
    transImg.addEventListener('click', () => {
        imgZoomScale = imgZoomScale === 1.0 ? 1.7 : (imgZoomScale === 1.7 ? 2.5 : 1.0);
        transImg.style.transform = `scale(${imgZoomScale})`;
    });
}

// Language and Navigation Functions
function initializeLanguage() {
    // Set initial language from localStorage
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.value = currentLanguage;
    }
}

function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem(LANGUAGE_KEY, lang);
    
    // Update language selector
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.value = lang;
    }
    
    // Apply translations immediately to UI
    applyTranslations();
    
    // Reload current view to apply language changes to dynamic content
    const activeTab = document.querySelector('.tab-panel.active')?.id || 'tab-dashboard';
    switchTab(activeTab);
}

// English to Telugu Translator
function translateText() {
    const input = document.getElementById('translator-input').value.trim();
    if (!input) {
        showAppNotice('Please enter English text to translate', 'error');
        return;
    }
    
    // Use the existing translation dictionary
    let output = input;
    
    // Simple word-by-word translation using our dictionary
    Object.entries(translations['te']).forEach(([eng, tel]) => {
        // Case-insensitive replacement
        const regex = new RegExp('\\b' + eng + '\\b', 'gi');
        output = output.replace(regex, tel);
    });
    
    // Also apply Telugu transliterations for names/places
    output = convertToTelugu(output);
    
    document.getElementById('translator-output').value = output;
}

function copyToClipboard() {
    const output = document.getElementById('translator-output');
    if (!output.value) {
        showAppNotice('Nothing to copy. Please translate first.', 'error');
        return;
    }
    
    output.select();
    document.execCommand('copy');
    showAppNotice('Text copied to clipboard!', 'success');
}

function swapTranslation() {
    const input = document.getElementById('translator-input');
    const output = document.getElementById('translator-output');
    
    const temp = input.value;
    input.value = output.value;
    output.value = temp;
}

function clearTranslator() {
    document.getElementById('translator-input').value = '';
    document.getElementById('translator-output').value = '';
}

// Track navigation for back button
function trackNavigation(tabId) {
    if (navigationHistory.length === 0 || navigationHistory[navigationHistory.length - 1] !== tabId) {
        navigationHistory.push(tabId);
    }
    updateBackButtonVisibility();
}

function updateBackButtonVisibility() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = navigationHistory.length > 1 ? 'flex' : 'none';
    }
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop(); // Remove current tab
        const previousTab = navigationHistory[navigationHistory.length - 1];
        switchTab(previousTab);
        updateBackButtonVisibility();
    }
}

// Switch tabs dynamically
function switchTab(tabId) {
    localStorage.setItem(ACTIVE_TAB_KEY, tabId);
    trackNavigation(tabId);
    
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Highlight correct sidebar nav item
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        if (li.getAttribute('data-tab') === tabId) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });

    // Refresh contents based on active tab
    if (tabId === 'tab-dashboard') loadDashboardData();
    if (tabId === 'tab-stock') loadStockInventory();
    if (tabId === 'tab-farmers') loadFarmersDirectory();
    if (tabId === 'tab-ledger') loadLedgerSelector();
    if (tabId === 'tab-calculator') loadCalculatorSelector();
    if (tabId === 'tab-traders') loadTradersDirectory();
    if (tabId === 'tab-traders-ledger') loadTradersLedgerSelector();
}

function selectBusinessMode(shopType) {
    currentShopType = shopType;
    localStorage.setItem(SHOP_TYPE_KEY, currentShopType);
    updateShopLabels();
    selectedFarmerId = null;
    selectedTraderId = null;
    document.getElementById('farmer-search-input')?.value = '';
    document.getElementById('trader-search-input')?.value = '';
    document.getElementById('farmers-list')?.replaceChildren();
    document.getElementById('traders-list')?.replaceChildren();
    switchTab('tab-farmers');
}

// Update UI headers depending on selected shop
function updateShopLabels() {
    const isTraders = currentShopType === 'TRADERS';
    
    // 1. Header Titles
    if (isTraders) {
        shopTitleText.innerText = "శ్రీ బాలాజీ ట్రేడర్స్";
        shopSubtitleText.innerText = "Sri Balaji Traders";
    } else {
        shopTitleText.innerText = "శ్రీ బాలాజీ ఎంటర్ప్రైజెస్";
        shopSubtitleText.innerText = "Sri Balaji Enterprises";
    }
    
    activeShopLabels.forEach(lbl => {
        lbl.innerText = isTraders ? 'Sri Balaji Traders' : 'Sri Balaji Enterprises';
    });

    // Add an enterprise-only styling flag for header and tab layout
    document.body.classList.toggle('enterprise-mode', !isTraders);
    document.body.classList.toggle('traders-mode', isTraders);

    // 2. Sidebar Navigation Items (Always visible for multi-directory access)
    const navStock = document.getElementById('nav-stock');
    const navDashboardText = document.querySelector('#nav-dashboard span');
    const navDashboardIcon = document.querySelector('#nav-dashboard i');
    const navFarmers = document.getElementById('nav-farmers');
    const navFarmersText = document.querySelector('#nav-farmers span');
    const navFarmersIcon = document.querySelector('#nav-farmers i');
    const navLedger = document.getElementById('nav-ledger');
    const navLedgerText = document.querySelector('#nav-ledger span');
    const navLedgerIcon = document.querySelector('#nav-ledger i');
    const navCalculator = document.getElementById('nav-calculator');
    const navCalculatorText = document.querySelector('#nav-calculator span');
    const navCalculatorIcon = document.querySelector('#nav-calculator i');
    const navTraders = document.getElementById('nav-traders');
    const navTradersLedger = document.getElementById('nav-traders-ledger');
    const navTradersText = document.querySelector('#nav-traders span');
    const navTradersLedgerText = document.querySelector('#nav-traders-ledger span');
    const navTradersIcon = document.querySelector('#nav-traders i');
    const navTradersLedgerIcon = document.querySelector('#nav-traders-ledger i');
    const navStockText = document.querySelector('#nav-stock span');
    const navStockIcon = document.querySelector('#nav-stock i');

    if (navStock) navStock.style.display = 'block';
    if (navDashboardText) navDashboardText.innerText = isTraders ? 'Dispatch Dashboard' : 'Credit Dashboard';
    if (navDashboardIcon) navDashboardIcon.className = isTraders ? 'fa-solid fa-truck-ramp-box' : 'fa-solid fa-chart-line';
    if (navFarmers) navFarmers.style.display = 'block';
    if (navFarmersText) navFarmersText.innerText = isTraders ? 'Traders Directory' : 'Farmers Directory';
    if (navFarmersIcon) navFarmersIcon.className = isTraders ? 'fa-solid fa-building' : 'fa-solid fa-users';
    if (navLedger) navLedger.style.display = 'none';
    if (navLedgerText) navLedgerText.innerText = isTraders ? 'Trader Ledger' : 'Farmer Ledger';
    if (navLedgerIcon) navLedgerIcon.className = isTraders ? 'fa-solid fa-file-invoice-dollar' : 'fa-solid fa-book-open';
    if (navCalculator) navCalculator.style.display = 'block';
    if (navCalculatorText) navCalculatorText.innerText = isTraders ? 'Collection Calculator' : 'Interest Calculator';
    if (navCalculatorIcon) navCalculatorIcon.className = isTraders ? 'fa-solid fa-calculator' : 'fa-solid fa-percent';
    if (navTraders) navTraders.style.display = 'block';
    if (navTradersLedger) navTradersLedger.style.display = 'block';
    if (navTradersText) navTradersText.innerText = isTraders ? 'Suppliers Directory' : 'Dealers Directory';
    if (navTradersLedgerText) navTradersLedgerText.innerText = isTraders ? 'Supplier Ledger' : 'Dealer Payables';
    if (navTradersIcon) navTradersIcon.className = isTraders ? 'fa-solid fa-handshake' : 'fa-solid fa-building-wheat';
    if (navTradersLedgerIcon) navTradersLedgerIcon.className = isTraders ? 'fa-solid fa-truck-ramp-box' : 'fa-solid fa-file-invoice-dollar';
    if (navStockText) navStockText.innerText = isTraders ? 'Dispatch Stock' : 'Input Stock';
    if (navStockIcon) navStockIcon.className = isTraders ? 'fa-solid fa-boxes-stacked' : 'fa-solid fa-seedling';

    // 3. Panel Titles & Form Headers
    // Tab Directory Title (panel-title removed from HTML, skip gracefully)
    const tabFarmersPanel = document.getElementById('tab-farmers');
    if (tabFarmersPanel) {
        tabFarmersPanel.classList.toggle('enterprise-mode', !isTraders);
    }

    // Search input placeholder
    const farmerSearchInput = document.getElementById('farmer-search-input');
    if (farmerSearchInput) {
        farmerSearchInput.placeholder = isTraders ? "\ud83d\udd0d Search trader by name/location..." : "\ud83d\udd0d Search farmer by name/village...";
    }

    const directoryListTitle = document.querySelector('#tab-farmers .panel-section-header h3');
    if (directoryListTitle) {
        directoryListTitle.innerHTML = isTraders
            ? '<i class="fa-solid fa-users"></i> Registered Traders List'
            : '<i class="fa-solid fa-users"></i> Registered Farmers List';
    }

    const directoryListDesc = document.querySelector('#tab-farmers .panel-section-header p');
    if (directoryListDesc) {
        directoryListDesc.innerText = isTraders
            ? 'Select a trader from the list to view details, upload invoice pages, or manage dispatch/payment ledger entries.'
            : 'Select a farmer from the list to view details, upload notebook pages, or manage ledger entries.';
    }

    const directoryBadgeLabel = document.querySelector('#tab-farmers .directory-badge-text span');
    if (directoryBadgeLabel) {
        directoryBadgeLabel.innerText = isTraders ? 'Total Traders' : 'Total Farmers';
    }

    const tableHeaders = document.querySelectorAll('#farmers-table thead th');
    if (tableHeaders.length >= 9) {
        tableHeaders[1].innerText = isTraders ? 'Trader' : 'Farmer';
        tableHeaders[4].innerText = isTraders ? 'Items / Notes' : 'Crop / Notes';
        tableHeaders[5].innerText = isTraders ? 'Dispatch Value' : 'Amt Taken';
        tableHeaders[6].innerText = isTraders ? 'Receivable' : 'Interest';
    }

    // Season filter label
    const seasonFilterEl = document.getElementById('season-filter');
    if (seasonFilterEl && seasonFilterEl.options[0]) {
        seasonFilterEl.options[0].innerText = isTraders ? 'All Years' : 'All Years';
    }
    // Add New button text
    const addNewBtn = document.querySelector('#tab-farmers .add-farmer-btn');
    if (addNewBtn) {
        addNewBtn.innerHTML = isTraders ? `<i class="fa-solid fa-user-plus"></i> Add New Trader` : `<i class="fa-solid fa-user-plus"></i> Add New Farmer`;
    }
    // Modal Titles
    const farmerModalTitle = document.getElementById('farmer-modal-title');
    if (farmerModalTitle) {
        farmerModalTitle.innerHTML = isTraders ? `<i class="fa-solid fa-user-plus"></i> Add Trader Profile` : `<i class="fa-solid fa-user-plus"></i> Add Farmer Profile`;
    }
    // Form Input Labels
    const farmerNameLabel = document.querySelector('label[for="farmer-name"]');
    if (farmerNameLabel) {
        farmerNameLabel.innerText = isTraders ? "Trader/Supplier Name" : "Farmer Name";
    }
    const farmerPhoneLabel = document.querySelector('label[for="farmer-phone"]');
    if (farmerPhoneLabel) {
        farmerPhoneLabel.innerText = "Phone Number";
    }
    const farmerVillageLabel = document.querySelector('label[for="farmer-village"]');
    if (farmerVillageLabel) {
        farmerVillageLabel.innerText = isTraders ? "City / Location" : "Village Name";
    }
    const farmerCropLabel = document.querySelector('label[for="farmer-crop"]');
    if (farmerCropLabel) {
        farmerCropLabel.innerText = isTraders ? "Items Supplied / Company Name" : "Crop Details";
    }

    // Right details panel placeholders
    const detailPlaceholderP = document.querySelector('#detail-placeholder .detail-placeholder-message p');
    if (detailPlaceholderP) {
        detailPlaceholderP.innerText = isTraders 
            ? "Select a trader from the left directory to view profile details, manage profile photos, and digitize purchase invoices."
            : "Select a farmer from the left directory to view profile details, manage profile photos, and digitize handwritten notebooks.";
    }

    // Digitizer sections
    const digitizerTitle = document.querySelector('.notebook-section h3');
    if (digitizerTitle) {
        digitizerTitle.innerHTML = isTraders ? `<i class="fa-solid fa-book-open"></i> Supporting Notes Archive` : `<i class="fa-solid fa-book-open"></i> Paper Notebook Digitizer`;
    }
    const digitizerSubtitle = document.querySelector('.notebook-section .section-subtitle');
    if (digitizerSubtitle) {
        digitizerSubtitle.innerText = isTraders
            ? "Upload handwritten notes or related supporting pages for this trader. For lorry number, tons, rate, and charges, use Trader Ledger > Add Entry."
            : "Upload pages of handwritten accounts notebooks. Click on any page to transcribe the data manually into the ledger.";
    }
    const digitizerUploadBtn = document.querySelector('.notebook-section .section-title-flex button');
    if (digitizerUploadBtn) {
        digitizerUploadBtn.innerHTML = isTraders ? `<i class="fa-solid fa-upload"></i> Upload Related Notes` : `<i class="fa-solid fa-upload"></i> Upload Notebook Page`;
    }

    const dashboardTitle = document.getElementById('dashboard-title');
    const dashboardSubtitle = document.getElementById('dashboard-subtitle');
    const kpiPrimaryLabel = document.getElementById('kpi-primary-label');
    const kpiStockLabel = document.getElementById('kpi-stock-label');
    const kpiBalanceLabel = document.getElementById('kpi-balance-label');
    const welcomeTitle = document.getElementById('welcome-title');
    const welcomeDescription = document.getElementById('welcome-description');
    const modeCallout = document.getElementById('mode-callout');
    const dashboardActionPrimary = document.getElementById('dashboard-action-primary');
    const dashboardActionPrimarySub = document.getElementById('dashboard-action-primary-sub');
    const dashboardActionSecondary = document.getElementById('dashboard-action-secondary');
    const dashboardActionSecondarySub = document.getElementById('dashboard-action-secondary-sub');
    if (dashboardTitle) {
        dashboardTitle.innerText = isTraders ? 'Trader Procurement & Dispatch Dashboard' : 'Farmer Credit & Input Sales Dashboard';
    }
    if (dashboardSubtitle) {
        dashboardSubtitle.innerText = isTraders
            ? 'Use this mode for trader profiles, lorry-wise dispatch billing, supplier notes, and payment collections.'
            : 'Use this mode for farmer profiles, advances, notebook pages, interest, and dues from seed or fertilizer sales.';
    }
    if (kpiPrimaryLabel) kpiPrimaryLabel.innerText = isTraders ? 'Total Traders' : 'Total Farmers';
    if (kpiStockLabel) kpiStockLabel.innerText = isTraders ? 'Dispatchable Stock Lots' : 'Available Agri Inputs';
    if (kpiBalanceLabel) kpiBalanceLabel.innerText = isTraders ? 'Outstanding Trader Collections' : 'Outstanding Farmer Dues';
    if (welcomeTitle) {
        welcomeTitle.innerText = isTraders
            ? "శ్రీ బాలాజీ ట్రేడర్స్ నిర్వహణ ప్యానెల్ కు స్వాగతం"
            : "శ్రీ బాలాజీ ఎంటర్‌ప్రైజెస్ నిర్వహణ ప్యానెల్ కు స్వాగతం";
    }
    if (welcomeDescription) {
        welcomeDescription.innerText = isTraders
            ? "రైతుల వద్ద నుండి పత్తి, మిర్చి మొదలగు అన్ని రకాల పంట దిగుబడులు కొనుగోలు చేయబడును."
            : "మా వద్ద అన్ని రకాల నాణ్యమైన విత్తనాలు (Seeds) మరియు ఎరువులు (Fertilizers) లభించును.";
    }
    if (modeCallout) {
        modeCallout.innerText = isTraders
            ? 'Trader mode difference: you will enter dispatch bills with lorry details and upload related trader notes separately.'
            : 'Enterprise mode difference: you will upload farmer notebook pages and manage advances, interest, and dues.';
    }
    if (dashboardActionPrimary) dashboardActionPrimary.innerText = isTraders ? 'TRADERS DIRECTORY' : 'FARMERS DIRECTORY';
    if (dashboardActionPrimarySub) {
        dashboardActionPrimarySub.innerText = isTraders
            ? 'Create and manage trader profiles with city, supplied items, and contact details.'
            : 'Create and manage farmer profiles with village, crop details, and season records.';
    }
    if (dashboardActionSecondary) dashboardActionSecondary.innerText = isTraders ? 'DISPATCHS & LORRY BILLS' : 'DEALERS & PAYABLES';
    if (dashboardActionSecondarySub) {
        dashboardActionSecondarySub.innerText = isTraders
            ? 'Open trader ledger to record lorry number, tons, rate, other charges, and payments received.'
            : 'Open dealers/payables to upload supplier invoices and track what you owe for stock received.';
    }

    const stockPanelTitle = document.getElementById('stock-panel-title');
    const stockPanelAction = document.getElementById('stock-panel-action');
    if (stockPanelTitle) {
        stockPanelTitle.innerText = isTraders ? 'Dispatch Stock & Purchase Lots' : 'Agri Inputs & Stock Inventory';
    }
    if (stockPanelAction) {
        stockPanelAction.innerHTML = isTraders
            ? '<i class="fa-solid fa-plus"></i> Log Purchase Lot'
            : '<i class="fa-solid fa-plus"></i> Log Input Purchase Bill';
    }

    const calculatorPanelTitle = document.getElementById('calculator-panel-title');
    const calculatorPanelDesc = document.getElementById('calculator-panel-desc');
    if (calculatorPanelTitle) {
        calculatorPanelTitle.innerText = isTraders ? 'Collection Planning Calculator' : 'Interest Calculation Engine';
    }
    if (calculatorPanelDesc) {
        calculatorPanelDesc.innerText = isTraders
            ? 'Estimate settlement amounts and compare trader bill value against payments received.'
            : 'Calculate simple or compound interest on farmer advances and optionally post directly to the ledger.';
    }

    // Update Detail View static labels dynamically
    const detailCropLabel = document.getElementById('detail-crop-label');
    if (detailCropLabel) {
        detailCropLabel.innerText = isTraders ? "Items Supplied:" : "Crop details:";
    }

    // 4. Ledger Titles & Labels
    const tabLedgerTitle = document.querySelector('#tab-ledger .panel-title');
    if (tabLedgerTitle) {
        tabLedgerTitle.innerText = isTraders ? "Trader Ledger & Purchase Accounts" : "Farmer Ledger & Transactions";
    }
    const ledgerSelectLabel = document.querySelector('label[for="ledger-farmer-selector"]');
    if (ledgerSelectLabel) {
        ledgerSelectLabel.innerText = isTraders ? "Select Trader Account" : "Select Farmer Account";
    }
    const selectEl = document.getElementById('ledger-farmer-selector');
    if (selectEl && selectEl.options[0]) {
        selectEl.options[0].innerText = isTraders ? "-- Select Trader Account --" : "-- Select Farmer --";
    }

    // Ledger Summary Box renaming & hiding
    const summaryBoxAdvances = document.getElementById('summary-box-advances');
    const summaryBoxInterest = document.getElementById('summary-box-interest');
    if (isTraders) {
        if (summaryBoxAdvances) summaryBoxAdvances.style.display = 'none';
        if (summaryBoxInterest) summaryBoxInterest.style.display = 'none';
        document.getElementById('summary-title-bills').innerText = "Total Purchases Owed";
        document.getElementById('summary-title-payments').innerText = "Total Payments Made";
        document.getElementById('summary-title-balance').innerText = "Total Outstanding Amount Owed";
    } else {
        if (summaryBoxAdvances) summaryBoxAdvances.style.display = 'block';
        if (summaryBoxInterest) summaryBoxInterest.style.display = 'block';
        document.getElementById('summary-title-bills').innerText = "Total Bills";
        document.getElementById('summary-title-payments').innerText = "Total Payments Received";
        document.getElementById('summary-title-balance').innerText = "Total Outstanding Balance Due";
    }

    // Ledger Table Column Headers
    const thDebit = document.getElementById('th-debit-label');
    const thCredit = document.getElementById('th-credit-label');
    if (thDebit) {
        thDebit.innerText = isTraders ? "Debit (Payments Made)" : "Debit (Bills / Loans / Interest)";
    }
    if (thCredit) {
        thCredit.innerText = isTraders ? "Credit (Purchases Owed)" : "Credit (Payments Recv)";
    }

    // Ledger Transaction Dropdown options
    const txTypeSelect = document.getElementById('tx-type');
    if (txTypeSelect) {
        if (isTraders) {
            txTypeSelect.innerHTML = `
                <option value="BILL">BILL (Purchase of goods/stock from trader)</option>
                <option value="PAYMENT">PAYMENT (Payment made to trader)</option>
            `;
        } else {
            txTypeSelect.innerHTML = `
                <option value="BILL">BILL (Sale of seeds/fertilizer to farmer)</option>
                <option value="ADVANCE">ADVANCE (Cash loan given to farmer)</option>
                <option value="PAYMENT">PAYMENT (Received cash/grain from farmer)</option>
            `;
        }
    }

    configureTraderModuleUi();
}

// Core app loads
function onAppLoad() {
    updateShopLabels();
    initializeLanguage();
    loadDashboardData();
}

// 1. DASHBOARD CONTROLLER
async function loadDashboardData() {
    try {
        const resFarmers = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        const resStock = await fetch(`${API_BASE}/stock?shopType=${currentShopType}`);
        const resTx = await fetch(`${API_BASE}/transactions?shopType=${currentShopType}`);

        if (resFarmers.ok && resStock.ok && resTx.ok) {
            const farmers = await resFarmers.json();
            const stock = await resStock.json();
            const transactions = await resTx.json();

            // Count farmers
            document.getElementById('kpi-farmers-count').innerText = farmers.length;

            // Count active stock items (not returned)
            const activeStock = stock.filter(s => !s.isReturned);
            document.getElementById('kpi-stock-count').innerText = activeStock.length;

            // Calculate outstanding dues (sum of all ledger dues)
            let totalDues = 0.0;
            const uniqueFarmerIds = [...new Set(transactions.map(t => t.farmerId))];
            
            for (let fid of uniqueFarmerIds) {
                const farmerTxs = transactions.filter(t => t.farmerId === fid);
                let debit = 0;
                let credit = 0;
                farmerTxs.forEach(t => {
                    const type = t.type.toUpperCase();
                    if (type === 'BILL' || type === 'ADVANCE' || type === 'INTEREST') {
                        debit += t.amount;
                    } else if (type === 'PAYMENT') {
                        credit += t.amount;
                    }
                });
                const balance = debit - credit;
                if (balance > 0) totalDues += balance;
            }

            document.getElementById('kpi-outstanding-dues').innerText = `₹${totalDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    } catch (err) {
        console.error("Error updating dashboard KPIs", err);
    }
}

// 2. GOODS & STOCK CONTROLLER
async function loadStockInventory() {
    try {
        const res = await fetch(`${API_BASE}/stock?shopType=${currentShopType}`);
        if (res.ok) {
            const stockItems = await res.json();
            const tbody = document.querySelector('#stock-table tbody');
            tbody.innerHTML = '';

            stockItems.forEach(item => {
                const date = new Date(item.date).toLocaleDateString('en-IN');
                const totalVal = (item.quantity * item.pricePerUnit).toFixed(2);
                
                const statusBadge = item.isReturned 
                    ? `<span class="badge danger">Returned</span>`
                    : `<span class="badge success">In Stock</span>`;

                const actionButton = item.isReturned 
                    ? `<button disabled class="gold-btn-outline" style="opacity: 0.5; cursor: not-allowed;">Returned</button>`
                    : `<button class="gold-btn-danger" onclick="returnStockItem(${item.id})">Return Stock</button>`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${date}</td>
                    <td><strong>${item.itemName}</strong></td>
                    <td>${item.supplierName}</td>
                    <td>${item.billNumber}</td>
                    <td>${item.quantity} Units</td>
                    <td>₹${item.pricePerUnit.toFixed(2)}</td>
                    <td>₹${parseFloat(totalVal).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td>${statusBadge}</td>
                    <td>${actionButton}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error("Error loading stock", err);
    }
}

async function logStockPurchase(e) {
    e.preventDefault();
    const stockData = {
        itemName: document.getElementById('stock-item-name').value,
        quantity: parseInt(document.getElementById('stock-quantity').value),
        pricePerUnit: parseFloat(document.getElementById('stock-unit-price').value),
        supplierName: document.getElementById('stock-supplier').value,
        billNumber: document.getElementById('stock-bill-number').value,
        date: document.getElementById('stock-date').value,
        isReturned: false,
        shopType: currentShopType
    };

    try {
        const res = await fetch(`${API_BASE}/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockData)
        });

        if (res.ok) {
            toggleModal('stock-modal', false);
            document.getElementById('stock-form').reset();
            loadStockInventory();
        }
    } catch (err) {
        console.error("Error adding stock purchase", err);
    }
}

async function returnStockItem(id) {
    if (!await openConfirmModal("Are you sure you want to mark this stock as returned to the supplier? This will update inventory status.")) return;
    try {
        const res = await fetch(`${API_BASE}/stock/${id}/return`, {
            method: 'PUT'
        });
        if (res.ok) {
            loadStockInventory();
        }
    } catch (err) {
        console.error("Error returning stock", err);
    }
}

// ==========================================
// 3. FARMERS DIRECTORY CONTROLLER (SPLIT VIEW)
// ==========================================
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let appNoticeTimer = null;

function showMessageModal(message, type = 'info') {
    const modal = document.getElementById('message-modal');
    const titleEl = document.getElementById('message-modal-title');
    const bodyEl = document.getElementById('message-modal-body');
    const okBtn = document.getElementById('message-modal-ok');
    if (!modal || !titleEl || !bodyEl || !okBtn) {
        // Fallback to console if modal not available
        console.warn('Message modal unavailable:', message);
        return;
    }

    titleEl.innerText = type === 'error' ? 'Error' : (type === 'success' ? 'Success' : 'Notice');
    bodyEl.textContent = message || '';

    const cleanup = () => {
        okBtn.onclick = null;
        toggleModal('message-modal', false);
    };

    okBtn.onclick = cleanup;
    toggleModal('message-modal', true);
}

function showAppNotice(message, type = 'success') {
    // Replace toast-style notices with modal dialog to avoid native alerts.
    try {
        showMessageModal(message, type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info'));
    } catch (e) {
        console.warn('showAppNotice fallback:', e);
    }

    // Keep legacy toast element for compatibility in case it's needed elsewhere.
    const notice = document.getElementById('app-notice');
    if (!notice) return;
    notice.textContent = message || '';
    notice.classList.remove('hide', 'success', 'error');
    notice.classList.add(type === 'error' ? 'error' : 'success', 'show');
    if (appNoticeTimer) clearTimeout(appNoticeTimer);
    appNoticeTimer = setTimeout(() => {
        notice.classList.remove('show');
        notice.classList.add('hide');
    }, 4500);
}

function getExistingFarmerBySerial(serialNumber) {
    const normalizedSerial = (serialNumber || '').trim();
    if (!normalizedSerial) return null;
    return activeFarmers.find((farmer) => (farmer.serialNumber || '').trim() === normalizedSerial && (farmer.season || IMPORT_SEASON) === IMPORT_SEASON) || null;
}

function getBatchSerialCounts(items) {
    return items.reduce((acc, item) => {
        const serial = (item.serialNumber || item.serial_number || '').trim();
        if (serial) {
            acc[serial] = (acc[serial] || 0) + 1;
        }
        return acc;
    }, {});
}

function resetFarmerEntryUploadState(fileInput) {
    if (fileInput) fileInput.value = '';
    document.getElementById('farmer-entry-pages-preview').style.display = 'none';
    document.getElementById('farmer-entry-thumbnails').innerHTML = '';
    document.getElementById('farmer-entry-review-cards').innerHTML = '';
    document.getElementById('farmer-entry-review-form').style.display = 'none';
    document.getElementById('farmer-entry-upload-btn-wrap').style.display = 'block';
    document.getElementById('farmer-entry-upload-form').reset();
    setFarmerReviewScanStatus('');
    multiImageFarmers = [];
    pendingFarmerUploadInProgress = false;
}

async function uploadFarmerEntryImages(fileInput, options = {}) {
    if (pendingFarmerUploadInProgress) {
        return { savedCount: 0, totalFarmers: multiImageFarmers.length };
    }

    const { autoClose = true, showAlerts = true } = options;
    pendingFarmerUploadInProgress = true;

    try {
        let savedCount = 0;
        const totalFarmers = multiImageFarmers.length;

        for (let i = 0; i < totalFarmers; i++) {
            const farmerData = multiImageFarmers[i];
            const serialNumber = document.getElementById(`upload-farmer-serial-${i}`)?.value.trim() || '';
            const name = document.getElementById(`upload-farmer-name-${i}`)?.value.trim() || '';
            const phone = document.getElementById(`upload-farmer-phone-${i}`)?.value.trim() || '';
            const village = document.getElementById(`upload-farmer-village-${i}`)?.value.trim() || 'Yellandu';
            const cropDetails = document.getElementById(`upload-farmer-crop-${i}`)?.value.trim() || '';
            const season = IMPORT_SEASON;
            const safeName = isLikelyValidDetectedName(name) ? name : `Farmer ${i + 1}`;
            const safeVillage = isLikelyValidVillageName(village) ? village : 'Yellandu';

            setFarmerReviewScanStatus(`Uploading farmer ${i + 1} of ${totalFarmers} directly...`);

            const formData = new FormData();
            formData.append('serialNumber', serialNumber);
            formData.append('name', safeName);
            formData.append('phone', phone || '');
            formData.append('village', safeVillage);
            formData.append('cropDetails', cropDetails || 'Pending OCR review');
            formData.append('season', season);
            formData.append('shopType', currentShopType);
            formData.append('pages', farmerData.file);

            const res = await fetch(`${API_BASE}/farmers/upload-pages`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                savedCount++;
                console.log(`Farmer ${i + 1} created successfully`);
            } else {
                console.error(`Failed to create farmer ${i + 1}:`, res.status);
            }
        }

        if (savedCount > 0) {
            if (autoClose) {
                toggleModal('farmer-entry-modal', false);
            }
            if (showAlerts) {
                showAppNotice(`Uploaded ${savedCount} farmer page(s) directly into ${currentShopType === 'ENTERPRISES' ? 'Sri Balaji Enterprises' : 'Sri Balaji Traders'}.`, 'success');
            }
            resetFarmerEntryUploadState(fileInput);
            await loadFarmersDirectory();
        } else if (showAlerts) {
            showAppNotice('Failed to upload pages. Please try again.', 'error');
        }

        return { savedCount, totalFarmers };
    } catch (err) {
        console.error('Error uploading farmers:', err);
        if (showAlerts) {
            showAppNotice('Upload failed. Please try again.', 'error');
        }
        return { savedCount: 0, totalFarmers: multiImageFarmers.length };
    } finally {
        pendingFarmerUploadInProgress = false;
    }
}

async function loadFarmersDirectory() {
    try {
        document.getElementById('traders-list')?.replaceChildren();
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            activeFarmers = await res.json();

            // Pre-load financial summaries for all farmers
            await preloadFarmerFinancials(activeFarmers);

            const hasSelectedFarmer = selectedFarmerId && activeFarmers.some(f => f.id === selectedFarmerId);
            renderFarmersList('');
            if (hasSelectedFarmer) {
                selectFarmerInView(selectedFarmerId);
            } else {
                selectedFarmerId = null;
                document.getElementById('detail-placeholder').classList.remove('hide');
                document.getElementById('detail-main-content').classList.add('hide');
                document.getElementById('detail-form-content').classList.add('hide');
                renderFarmersPlaceholderGrid('');
            }

        }
    } catch (err) {
        console.error("Error loading farmers directory", err);
    }
}

async function preloadFarmerFinancials(farmers) {
    try {
        const allTxRes = await fetch(`${API_BASE}/transactions?shopType=${currentShopType}`);
        if (!allTxRes.ok) return;
        const allTx = await allTxRes.json();

        farmerFinancialCache = {};
        farmers.forEach(f => {
            const txs = allTx.filter(t => t.farmerId === f.id);
            let taken = 0, interest = 0;
            txs.forEach(t => {
                const type = t.type.toUpperCase();
                if (type === 'BILL' || type === 'ADVANCE') taken += t.amount;
                if (type === 'INTEREST') interest += t.amount;
            });
            farmerFinancialCache[f.id] = { totalTaken: taken, interestAccrued: interest };
        });
    } catch (err) {
        console.error('Error preloading financials', err);
    }
}

// Seed sample farmers or traders depending on current business mode
async function seedSampleFarmersData() {
    const isTraders = currentShopType === 'TRADERS';
    const samples = isTraders ? [
        { name: "Sri Srinivasa Agri Traders", phone: "9848011223", village: "Vijayawada", cropDetails: "Seeds & Fertilizer Wholesale", shopType: "TRADERS" },
        { name: "Guntur Chilli Merchants Association", phone: "9440188990", village: "Guntur", cropDetails: "Chilli Trading & Brokerage", shopType: "TRADERS" }
    ] : [
        { name: "A. Bhadrayya", phone: "9908913521", village: "Repalle", cropDetails: "Paddy - 5 Acres", shopType: "ENTERPRISES" },
        { name: "Kali Somayya", phone: "9866091953", village: "Veyaluru", cropDetails: "Chilli - 3 Acres", shopType: "ENTERPRISES" }
    ];

    try {
        for (let s of samples) {
            const res = await fetch(`${API_BASE}/farmers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s)
            });

            if (res.ok) {
                const savedFarmer = await res.json();
                
                // Link corresponding notebook page images (reused as mock invoice for Traders)
                const fileName = (savedFarmer.name.includes("Bhadrayya") || savedFarmer.name.includes("Srinivasa"))
                    ? "bhadrayya_notebook.jpg" 
                    : "somayya_notebook.jpg";
                const imgPath = `/assets/samples/${fileName}`;
                
                // Fetch image as blob and upload it to notebooks API
                const imgBlob = await fetch(imgPath).then(r => r.blob());
                const formData = new FormData();
                formData.append("photo", imgBlob, fileName);
                formData.append("notes", isTraders ? savedFarmer.name + " Purchase Invoice Page 1" : savedFarmer.name + " Notebook Page 1");
                formData.append("season", "2025-26");

                await fetch(`${API_BASE}/farmers/${savedFarmer.id}/notebooks`, {
                    method: 'POST',
                    body: formData
                });
            }
        }
        
        // Reload list
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            activeFarmers = await res.json();
            renderFarmersList('');
        }
    } catch (err) {
        console.error("Error seeding sample data", err);
    }
}

function renderFarmersList(filterQuery = '') {
    const listEl = document.getElementById('farmers-list');
    const badgeEl = document.getElementById('farmers-count-badge');
    if (!listEl) return;
    listEl.innerHTML = '';
    const isTraders = currentShopType === 'TRADERS';
    const entityLabel = isTraders ? 'Trader' : 'Farmer';
    const notesLabel = isTraders ? 'Items / Notes' : 'Crop / Notes';
    const amountLabel = isTraders ? 'Dispatch Value' : 'Amt Taken';
    const interestLabel = isTraders ? 'Receivable' : 'Interest';

    const filtered = activeFarmers.filter(f => {
        // Ensure we only show farmers for the currently selected shop type
        const typeMatch = (f.shopType || '').toUpperCase() === (currentShopType || '').toUpperCase();
        const matchesText = f.name.toLowerCase().includes(filterQuery) || f.village.toLowerCase().includes(filterQuery);
        const matchesSeason = !selectedSeason || (f.season && f.season === selectedSeason);
        return typeMatch && matchesText && matchesSeason;
    });

    if (badgeEl) {
        badgeEl.innerText = filtered.length;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">No ${isTraders ? 'traders' : 'farmers'} match query.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach((farmer, index) => {
        const rowIndex = index + 1;
        const isSelected = farmer.id === selectedFarmerId;
        const avatarSrc = farmer.photoPath
            ? `${API_BASE}/farmers/${farmer.id}/photo?t=${new Date().getTime()}`
            : '';

        const avatarHTML = avatarSrc
            ? `<img src="${avatarSrc}" alt="${farmer.name}">`
            : `<i class="fa-solid fa-user-circle"></i>`;

        const fin = farmerFinancialCache[farmer.id] || { totalTaken: 0, interestAccrued: 0 };
        const amtTakenStr = fin.totalTaken > 0 ? `<span style="color:var(--danger); font-weight:700;">₹${fin.totalTaken.toLocaleString('en-IN',{minimumFractionDigits:0})}</span>` : `<span style="color:var(--text-muted);">₹0</span>`;
        const interestStr = fin.interestAccrued > 0 ? `<span style="color:var(--gold-light); font-weight:700;">₹${fin.interestAccrued.toLocaleString('en-IN',{minimumFractionDigits:0})}</span>` : `<span style="color:var(--text-muted);">₹0</span>`;

        const row = document.createElement('tr');
        row.className = isSelected ? 'selected' : '';
        row.dataset.id = farmer.id;
        const displayName = convertToTelugu(farmer.name);
        const displayVillage = convertToTelugu(farmer.village);
        row.innerHTML = `
            <td class="number-col" data-label="#">${rowIndex}</td>
            <td data-label="${entityLabel}">
                <div class="farmer-cell">
                    <div class="farmer-list-item-avatar">${avatarHTML}</div>
                    <div class="farmer-list-item-info">
                        <h4>${displayName}</h4>
                        <p>${displayVillage || 'Unknown village'}</p>
                    </div>
                </div>
            </td>
            <td data-label="Phone">${farmer.phone || '-'}</td>
            <td data-label="Season">${farmer.season || 'N/A'}</td>
            <td data-label="${notesLabel}">${convertToTelugu(farmer.cropDetails) || 'No crop details'}</td>
            <td data-label="${amountLabel}">${amtTakenStr}</td>
            <td data-label="${interestLabel}">${interestStr}</td>
            <td data-label="Status"><span class="status-pill">${farmer.status || 'Active'}</span></td>
            <td class="actions-col" data-label="Actions">
                <div class="action-button-group">
                    <button class="gold-btn btn-sm" type="button">View</button>
                    <button class="gold-btn-danger btn-sm" type="button">Delete</button>
                </div>
            </td>
        `;

        const viewButton = row.querySelector('.gold-btn.btn-sm');
        const deleteButton = row.querySelector('.gold-btn-danger');

        viewButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            openFarmerLedgerTab(farmer.id);
        });

        deleteButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            openDeleteFarmerModal(farmer.id, farmer.name);
        });

        row.addEventListener('click', () => {
            selectFarmerInView(farmer.id);
            document.querySelectorAll('.farmers-list-table tbody tr').forEach(item => item.classList.remove('selected'));
            row.classList.add('selected');
        });

        listEl.appendChild(row);
    });
}

function openAddFarmerModal() {
    document.getElementById('farmer-id').value = '';
    document.getElementById('farmer-form').reset();
    document.getElementById('farmer-modal-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Farmer Profile`;
    toggleModal('farmer-modal', true);
}

async function openFarmerDetailModal(id) {
    const farmer = activeFarmers.find(f => f.id === id);
    if (!farmer) return;

    // Set selected farmer so inline panel operations work after modal actions
    selectedFarmerId = id;

    // Populate name, location
    document.getElementById('modal-detail-name').innerText = farmer.name;
    document.getElementById('modal-detail-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${farmer.village}`;
    document.getElementById('modal-detail-phone').innerText = farmer.phone || '-';
    document.getElementById('modal-detail-crop').innerText = farmer.cropDetails || '-';
    document.getElementById('modal-detail-season').innerText = farmer.season || 'N/A';
    document.getElementById('modal-detail-status').innerText = farmer.status || 'Active';
    document.getElementById('modal-detail-crop-label').innerText = currentShopType === 'TRADERS' ? 'Items Supplied:' : 'Crop Details:';

    // Profile photo
    const avatarBox = document.getElementById('modal-detail-avatar');
    const avatarSrc = farmer.photoPath
        ? `${API_BASE}/farmers/${farmer.id}/photo?t=${new Date().getTime()}`
        : '';
    avatarBox.innerHTML = avatarSrc
        ? `<img src="${avatarSrc}" alt="${farmer.name}">`
        : `<i class="fa-solid fa-user-circle"></i>`;

    // Financial summary
    const fin = farmerFinancialCache[id] || { totalTaken: 0, interestAccrued: 0 };
    document.getElementById('modal-detail-amount').innerText = `₹ ${fin.totalTaken.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('modal-detail-interest').innerText = `₹ ${fin.interestAccrued.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Also fetch live summary for accuracy
    try {
        const res = await fetch(`${API_BASE}/transactions/farmer/${id}/summary?shopType=${currentShopType}`);
        if (res.ok) {
            const summary = await res.json();
            document.getElementById('modal-detail-amount').innerText = `₹ ${(summary.totalTaken || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            document.getElementById('modal-detail-interest').innerText = `₹ ${(summary.interestAccrued || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }
    } catch (err) { /* use cached value */ }

    // Action buttons
    document.getElementById('modal-edit-btn').onclick = () => {
        toggleModal('farmer-detail-modal', false);
        selectFarmerInView(id);
        setTimeout(() => openEditFarmerFormInline(), 100);
    };
    document.getElementById('modal-ledger-btn').onclick = () => {
        toggleModal('farmer-detail-modal', false);
        openFarmerLedgerTab(id);
    };
    document.getElementById('modal-delete-btn').onclick = () => {
        toggleModal('farmer-detail-modal', false);
        openDeleteFarmerModal(id, farmer.name, farmer.village);
    };

    toggleModal('farmer-detail-modal', true);
}

async function selectFarmerInView(id) {
    selectedFarmerId = id;
    const farmer = activeFarmers.find(f => f.id === id);
    if (!farmer) return;

    // Populate dynamic texts
    document.getElementById('detail-farmer-name').innerText = farmer.name;
    document.getElementById('detail-farmer-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${farmer.village}`;
    document.getElementById('detail-farmer-phone').innerText = farmer.phone;
    document.getElementById('detail-farmer-crop').innerText = farmer.cropDetails;
    document.getElementById('detail-farmer-season').innerText = farmer.season || 'N/A';

    // Profile photo handling
    const avatarBox = document.getElementById('detail-profile-avatar');
    const avatarSrc = farmer.photoPath 
        ? `${API_BASE}/farmers/${farmer.id}/photo?t=${new Date().getTime()}` 
        : '';
    avatarBox.innerHTML = avatarSrc 
        ? `<img src="${avatarSrc}" alt="${farmer.name}">` 
        : `<i class="fa-solid fa-user-circle"></i>`;

    // Action button listeners
    document.getElementById('detail-edit-btn').onclick = () => {
        openEditFarmerFormInline();
    };

    document.getElementById('detail-ledger-btn').onclick = () => {
        openFarmerLedgerTab(farmer.id);
    };

    document.getElementById('detail-delete-btn').onclick = () => {
        openDeleteFarmerModal(farmer.id, farmer.name, farmer.village);
    };

    // Load associated stock/purchases
    loadFarmerPurchasedItems(farmer.id);

    // Load multiple notebook pages gallery
    loadNotebookGallery(farmer.id);

    // Fetch financial summary (amount taken, interest)
    (async () => {
        try {
            const res = await fetch(`${API_BASE}/transactions/farmer/${farmer.id}/summary?shopType=${currentShopType}`);
            if (res.ok) {
                const summary = await res.json();
                const totalTaken = (summary.totalBills || 0) + (summary.totalAdvances || 0);
                const amountEl = document.getElementById('detail-amount-taken');
                const interestEl = document.getElementById('detail-interest-accrued');
                if (amountEl) amountEl.innerText = `₹ ${ totalTaken.toLocaleString('en-IN', {minimumFractionDigits:2}) }`;
                if (interestEl) interestEl.innerText = `₹ ${ (summary.totalInterest || 0).toLocaleString('en-IN', {minimumFractionDigits:2}) }`;
            }
        } catch (err) {
            console.error('Error fetching farmer financial summary', err);
        }
    })();

    // Reveal main detail block
    document.getElementById('detail-placeholder').classList.add('hide');
    document.getElementById('detail-form-content').classList.add('hide');
    document.getElementById('detail-main-content').classList.remove('hide');
}

async function saveFarmerProfile(e) {
    e.preventDefault();
    const id = document.getElementById('farmer-id').value;
    const farmerData = {
        name: document.getElementById('farmer-name').value,
        phone: document.getElementById('farmer-phone').value,
        village: document.getElementById('farmer-village').value,
        cropDetails: document.getElementById('farmer-crop').value,
        season: document.getElementById('farmer-season') ? document.getElementById('farmer-season').value : '',
        shopType: currentShopType
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/farmers/${id}` : `${API_BASE}/farmers`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(farmerData)
        });

        if (res.ok) {
            toggleModal('farmer-modal', false);
            document.getElementById('farmer-form').reset();
            const saved = await res.json();
            selectedFarmerId = saved.id;
            loadFarmersDirectory();
        }
    } catch (err) {
        console.error("Error saving farmer profile", err);
    }
}

// Profile Photo managers
function triggerProfilePhotoEdit() {
    if (!selectedFarmerId) return;
    const farmer = activeFarmers.find(f => f.id === selectedFarmerId);
    
    document.getElementById('profile-photo-selected-filename').innerText = '';
    document.getElementById('profile-photo-input').value = '';

    const imgEl = document.getElementById('profile-photo-viewer-img');
    const placeholderEl = document.getElementById('profile-photo-placeholder');
    const deleteBtn = document.getElementById('profile-delete-photo-btn');

    if (farmer.photoPath) {
        imgEl.src = `${API_BASE}/farmers/${farmer.id}/photo?t=${new Date().getTime()}`;
        imgEl.classList.remove('hide');
        placeholderEl.classList.add('hide');
        deleteBtn.classList.remove('hide');
    } else {
        imgEl.src = '';
        imgEl.classList.add('hide');
        placeholderEl.classList.remove('hide');
        deleteBtn.classList.add('hide');
    }

    toggleModal('profile-photo-modal', true);
}

async function uploadFarmerProfilePhoto(e) {
    e.preventDefault();
    const fileInput = document.getElementById('profile-photo-input');
    const file = fileInput.files[0];
    if (!file) {
        showAppNotice('Please select a profile photo first.', 'error');
        return;
    }

    // Auto-compress profile photo
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const maxVal = 250; // Smaller profile size
            let w = img.width;
            let h = img.height;
            if (w > h) {
                if (w > maxVal) { h *= maxVal / w; w = maxVal; }
            } else {
                if (h > maxVal) { w *= maxVal / h; h = maxVal; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('photo', blob, 'profile.jpg');
                try {
                    const res = await fetch(`${API_BASE}/farmers/${selectedFarmerId}/photo`, {
                        method: 'POST',
                        body: formData
                    });
                    if (res.ok) {
                        toggleModal('profile-photo-modal', false);
                        loadFarmersDirectory();
                    }
                } catch (err) {
                    console.error("Error uploading profile picture", err);
                }
            }, 'image/jpeg', 0.8);
        };
    };
}

async function deleteFarmerProfilePhoto() {
    if (!await openConfirmModal("Delete profile photo?")) return;
    try {
        const res = await fetch(`${API_BASE}/farmers/${selectedFarmerId}/photo`, { method: 'DELETE' });
        if (res.ok) {
            toggleModal('profile-photo-modal', false);
            loadFarmersDirectory();
        }
    } catch (err) {
        console.error("Error deleting photo", err);
    }
}

// ==========================================
// 4. NOTEBOOK digitizing GALLERY CONTROLLER
// ==========================================
async function loadNotebookGallery(farmerId) {
    try {
        const res = await fetch(`${API_BASE}/farmers/${farmerId}/notebooks`);
        if (res.ok) {
            selectedNotebookPages = await res.json();
            const grid = document.getElementById('notebook-gallery-grid');
            grid.innerHTML = '';

            if (selectedNotebookPages.length === 0) {
                grid.innerHTML = `<div class="p-3 text-center" style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.88rem;">
                    <i class="fa-solid fa-image" style="font-size: 1.8rem; margin-bottom: 6px; display: block; color: var(--border-color)"></i>
                    No ledger notebook pages uploaded.
                </div>`;
                return;
            }

            selectedNotebookPages.forEach(page => {
                const imgUrl = `${API_BASE}/farmers/notebooks/${page.id}/image?t=${new Date().getTime()}`;
                
                const card = document.createElement('div');
            card.className = 'notebook-thumbnail';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'notebook-thumbnail-delete-btn';
            deleteButton.type = 'button';
            deleteButton.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            deleteButton.addEventListener('click', (event) => deleteNotebookPage(page.id, event));

            const imageBox = document.createElement('div');
            imageBox.className = 'notebook-thumbnail-img-box';
            imageBox.addEventListener('click', () => openTranscriptionWorkspace(page.id, imgUrl, page.notes));
            const imgEl = document.createElement('img');
            imgEl.src = imgUrl;
            imgEl.alt = 'Notebook page';
            imageBox.appendChild(imgEl);

            const noteLine = document.createElement('div');
            noteLine.className = 'notebook-thumbnail-notes';
            noteLine.title = page.notes || 'Ledger Sheet';
            noteLine.innerText = page.notes || 'Ledger Sheet';

            const yearBadge = document.createElement('span');
            yearBadge.className = 'notebook-year-badge';
            yearBadge.innerText = page.year ? `Year: ${page.year}` : 'Year: N/A';

            const footer = document.createElement('div');
            footer.className = 'notebook-thumbnail-footer';
            footer.appendChild(noteLine);
            footer.appendChild(yearBadge);

            card.appendChild(deleteButton);
            card.appendChild(imageBox);
            card.appendChild(footer);
            grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Error loading notebook gallery", err);
    }
}

async function uploadNotebookPagePhoto(e) {
    e.preventDefault();
    if (!selectedFarmerId) {
        showAppNotice('Please select a farmer from the directory before uploading a notebook page.', 'error');
        return;
    }

    const fileInput = document.getElementById('notebook-file-input');
    const file = fileInput.files[0];
    const notesValue = document.getElementById('notebook-notes').value;
    const yearValue = document.getElementById('notebook-year').value;

    if (!yearValue) {
        showAppNotice('Please select the notebook year first.', 'error');
        return;
    }

    if (!file) {
        showAppNotice('Please select or snap a photo of the notebook page.', 'error');
        return;
    }

    // Canvas image compression for notebook pages (allows larger resolution than profile avatar e.g. max 1200px width/height for readability of handwriting)
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const maxDimension = 1200; // Keep high enough to easily read handwriting
            let w = img.width;
            let h = img.height;

            if (w > h) {
                if (w > maxDimension) { h *= maxDimension / w; w = maxDimension; }
            } else {
                if (h > maxDimension) { w *= maxDimension / h; h = maxDimension; }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('photo', blob, 'notebook_sheet.jpg');
                formData.append('notes', notesValue);
                formData.append('year', yearValue);

                try {
                    const res = await fetch(`${API_BASE}/farmers/${selectedFarmerId}/notebooks`, {
                        method: 'POST',
                        body: formData
                    });

                    if (res.ok) {
                        toggleModal('notebook-upload-modal', false);
                        document.getElementById('notebook-upload-form').reset();
                        document.getElementById('notebook-selected-filename').innerText = '';
                        loadNotebookGallery(selectedFarmerId);
                    } else {
                        showAppNotice('Server upload error.', 'error');
                    }
                } catch (err) {
                    console.error("Error uploading notebook page", err);
                }
            }, 'image/jpeg', 0.85); // 85% compression quality
        };
    };
}

async function deleteNotebookPage(pageId, e) {
    e.stopPropagation(); // prevent modal trigger
    if (!await openConfirmModal("Are you sure you want to delete this notebook page?")) return;
    try {
        const res = await fetch(`${API_BASE}/farmers/notebooks/${pageId}`, { method: 'DELETE' });
        if (res.ok) {
            loadNotebookGallery(selectedFarmerId);
        }
    } catch (err) {
        console.error("Error deleting notebook page", err);
    }
}

// ==========================================
// 5. SIDE-BY-SIDE TRANSCRIPTION WORKSPACE
// ==========================================
let currentTranscriptionRows = [];

function openTranscriptionWorkspace(pageId, imageSrc, notes) {
    imgZoomScale = 1.0;
    const transImg = document.getElementById('transcription-image');
    transImg.src = imageSrc;
    transImg.style.transform = `scale(1)`;
    document.getElementById('transcription-page-desc').innerText = notes || 'Ledger Sheet';

    // Clear and build initial transcription rows
    const tbody = document.querySelector('#transcription-table tbody');
    tbody.innerHTML = '';
    
    // Clear calculator results
    document.getElementById('inner-calc-results-box').classList.add('hide');
    document.getElementById('inner-calc-row-select').innerHTML = '<option value="">-- Select Row --</option>';

    // Add first row
    addTranscriptionRow();

    toggleModal('transcription-modal', true);
}

function resetNotebookImageZoom() {
    imgZoomScale = 1.0;
    document.getElementById('transcription-image').style.transform = `scale(1)`;
}

function addTranscriptionRow() {
    const tbody = document.querySelector('#transcription-table tbody');
    const rowIndex = tbody.children.length;
    const today = new Date().toISOString().split('T')[0];

    const tr = document.createElement('tr');
    tr.dataset.index = rowIndex;
    tr.innerHTML = `
        <td><input type="date" class="trans-date" value="${today}" required></td>
        <td>
            <select class="trans-type gold-select" style="width: 100%; border-color: rgba(212,175,55,0.35);" onchange="refreshInnerCalcDropdown()">
                <option value="BILL">BILL (Sale of seed/fert)</option>
                <option value="ADVANCE">ADVANCE (Cash loan)</option>
                <option value="PAYMENT">PAYMENT (Received cash)</option>
            </select>
        </td>
        <td><input type="number" class="trans-amount" min="0.01" step="0.01" placeholder="Amount" required oninput="refreshInnerCalcDropdown()"></td>
        <td><input type="text" class="trans-desc" placeholder="Remarks e.g. Paddy seeds, cash loan" required></td>
        <td>
            <button class="gold-btn-danger" style="width:28px; height:28px;" onclick="removeTranscriptionRow(this)"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
    refreshInnerCalcDropdown();
}

function removeTranscriptionRow(btn) {
    const row = btn.closest('tr');
    row.remove();
    
    // Re-index rows
    const rows = document.querySelectorAll('#transcription-table tbody tr');
    rows.forEach((r, idx) => r.dataset.index = idx);

    refreshInnerCalcDropdown();
}

// Inner calculator dropdown binder
function refreshInnerCalcDropdown() {
    const select = document.getElementById('inner-calc-row-select');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select Row --</option>';

    const rows = document.querySelectorAll('#transcription-table tbody tr');
    rows.forEach(r => {
        const date = r.querySelector('.trans-date').value;
        const type = r.querySelector('.trans-type').value;
        const amount = r.querySelector('.trans-amount').value;
        const desc = r.querySelector('.trans-desc').value;
        const index = r.dataset.index;

        if (type === 'ADVANCE' && amount > 0) {
            const opt = document.createElement('option');
            opt.value = index;
            opt.innerText = `Row ${parseInt(index)+1}: Date ${date} - ₹${amount} (${desc || 'Advance'})`;
            select.appendChild(opt);
        }
    });

    if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
    }
}

async function saveTranscribedLedgerEntries() {
    const rows = document.querySelectorAll('#transcription-table tbody tr');
    if (rows.length === 0) {
        showAppNotice('Please add at least one entry row.', 'error');
        return;
    }

    // Validate inputs
    let valid = true;
    const entries = [];
    rows.forEach(r => {
        const date = r.querySelector('.trans-date').value;
        const type = r.querySelector('.trans-type').value;
        const amount = parseFloat(r.querySelector('.trans-amount').value);
        const desc = r.querySelector('.trans-desc').value;

        if (!date || isNaN(amount) || amount <= 0 || !desc) {
            valid = false;
        }

        entries.push({
            farmerId: selectedFarmerId,
            date: date,
            type: type,
            amount: amount,
            description: desc,
            interestApplied: false,
            shopType: currentShopType
        });
    });

    if (!valid) {
        showAppNotice('Please fill all fields (Date, Amount, Description) with valid values.', 'error');
        return;
    }

    // Sequential post to server
    try {
        for (let entry of entries) {
            await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
        }
        showAppNotice('All entries transcribed and saved to farmer ledger!', 'success');
        toggleModal('transcription-modal', false);
    } catch (err) {
        console.error("Error transcribing ledger", err);
    }
}

// Dynamic Inner Interest calculation based on age of the advance row
let innerComputedInterestResult = null;

async function calculateInnerRowInterest() {
    const selectedRowIndex = document.getElementById('inner-calc-row-select').value;
    if (!selectedRowIndex) {
        showAppNotice('Please select a transcribed advance row first.', 'error');
        return;
    }

    const row = document.querySelector(`#transcription-table tbody tr[data-index="${selectedRowIndex}"]`);
    if (!row) return;

    const startDate = row.querySelector('.trans-date').value;
    const principal = parseFloat(row.querySelector('.trans-amount').value);
    const rate = parseFloat(document.getElementById('inner-calc-rate').value);
    const compounding = document.getElementById('inner-calc-compounding').value;
    const endDate = document.getElementById('inner-calc-settle-date').value || new Date().toISOString().split('T')[0];

    if (!startDate || isNaN(principal) || principal <= 0 || isNaN(rate)) {
        showAppNotice('Selected row is missing dates or amounts.', 'error');
        return;
    }

    const calcParams = {
        principal: principal,
        rate: rate,
        rateType: "MONTHLY", // standard monthly agricultural rate
        compounding: compounding,
        startDate: startDate,
        endDate: endDate
    };

    try {
        const res = await fetch(`${API_BASE}/calculator/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calcParams)
        });

        if (res.ok) {
            innerComputedInterestResult = await res.json();
            
            // Populate results
            document.getElementById('inner-res-interest').innerText = `₹${innerComputedInterestResult.interest.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('inner-res-total').innerText = `₹${innerComputedInterestResult.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('inner-res-duration').innerText = `${innerComputedInterestResult.months} Months (${innerComputedInterestResult.days} Days)`;

            document.getElementById('inner-calc-results-box').classList.remove('hide');

            // Set up inner apply btn listener
            document.getElementById('inner-post-btn').onclick = async () => {
                const compText = compounding === 'SIMPLE' ? 'Simple' : 'Compound';
                const postData = {
                    farmerId: selectedFarmerId,
                    type: 'INTEREST',
                    amount: innerComputedInterestResult.interest,
                    date: endDate,
                    description: `Transcribed interest (${compText}) on ₹${principal} advance (${startDate} to ${endDate}) @ ${rate}% monthly`,
                    interestApplied: true,
                    interestRate: rate,
                    shopType: currentShopType
                };

                const resPost = await fetch(`${API_BASE}/transactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });

                if (resPost.ok) {
                    showAppNotice('Interest transaction successfully applied to the ledger!', 'success');
                    toggleModal('transcription-modal', false);
                    openFarmerLedgerTab(selectedFarmerId);
                }
            };
        }
    } catch (err) {
        console.error("Inner calculation failure", err);
    }
}

// ==========================================
// 6. FARMER LEDGER CONTROLLER
// ==========================================
async function loadLedgerSelector(targetFarmerId = null) {
    try {
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            const farmers = await res.json();
            const selectEl = document.getElementById('ledger-farmer-selector');
            
            const currentSelVal = targetFarmerId || selectEl.value;

            selectEl.innerHTML = '<option value="">-- Select Farmer Account --</option>';
            farmers.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.innerText = `${f.name} (Village: ${f.village}, Ph: ${f.phone})`;
                selectEl.appendChild(opt);
            });

            if (currentSelVal) {
                selectEl.value = currentSelVal;
                loadFarmerLedger(currentSelVal);
            }
        }
    } catch (err) {
        console.error("Error loading ledger selection list", err);
    }
}

function openFarmerLedgerTab(farmerId) {
    document.querySelectorAll('.sidebar-nav li').forEach(li => {
        if (li.getAttribute('data-tab') === 'tab-ledger') li.classList.add('active');
        else li.classList.remove('active');
    });

    switchTab('tab-ledger');
    loadLedgerSelector(farmerId);
}

async function loadFarmerLedger(farmerId) {
    try {
        const resSummary = await fetch(`${API_BASE}/transactions/farmer/${farmerId}/summary?shopType=${currentShopType}`);
        const resTxs = await fetch(`${API_BASE}/transactions/farmer/${farmerId}?shopType=${currentShopType}`);

        if (resSummary.ok && resTxs.ok) {
            const summary = await resSummary.json();
            const transactions = await resTxs.json();

            document.getElementById('ledger-summary-bills').innerText = `₹${summary.totalBills.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('ledger-summary-advances').innerText = `₹${summary.totalAdvances.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('ledger-summary-interest').innerText = `₹${summary.totalInterest.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('ledger-summary-payments').innerText = `₹${summary.totalPayments.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            
            const balDueEl = document.getElementById('ledger-summary-balance');
            balDueEl.innerText = `₹${summary.balanceDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            
            if (summary.balanceDue > 0) {
                balDueEl.style.color = 'var(--danger)';
            } else {
                balDueEl.style.color = 'var(--success)';
            }

            const tbody = document.querySelector('#transactions-table tbody');
            tbody.innerHTML = '';

            transactions.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(tx => {
                const date = new Date(tx.date).toLocaleDateString('en-IN');
                let debitText = '-';
                let creditText = '-';
                let badgeClass = 'warning';

                const type = tx.type.toUpperCase();
                if (type === 'BILL' || type === 'ADVANCE' || type === 'INTEREST') {
                    debitText = `₹${tx.amount.toFixed(2)}`;
                    badgeClass = type === 'BILL' ? 'warning' : (type === 'ADVANCE' ? 'danger' : 'success');
                } else if (type === 'PAYMENT') {
                    creditText = `₹${tx.amount.toFixed(2)}`;
                    badgeClass = 'success';
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${date}</td>
                    <td><strong>${tx.description}</strong></td>
                    <td><span class="badge ${badgeClass}">${tx.type}</span></td>
                    <td class="danger-text">${debitText}</td>
                    <td class="success-text">${creditText}</td>
                    <td style="display: flex; gap: 6px;">
                        <button class="gold-btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editLedgerTransaction(${tx.id}, ${farmerId})" title="Edit">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="gold-btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteLedgerTransaction(${tx.id}, ${farmerId})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.getElementById('ledger-details-container').classList.remove('hide');
        }
    } catch (err) {
        console.error("Error loading farmer ledger", err);
    }
}

async function saveLedgerTransaction(e) {
    e.preventDefault();
    const farmerId = document.getElementById('ledger-farmer-selector').value;
    const editId = document.getElementById('tx-edit-id').value;
    const txType = document.getElementById('tx-type').value;
    
    // Get crop item type if BILL is selected
    let cropItemType = null;
    let description = document.getElementById('tx-desc').value;
    
    if (txType === 'BILL') {
        cropItemType = document.querySelector('input[name="tx-crop-item"]:checked')?.value;
        if (!cropItemType) {
            showAppNotice('Please select a crop item type (Seeds/Fertilizer/Pesticides) for BILL transactions.', 'error');
            return;
        }
        
        // Append crop-specific details to description
        if (cropItemType === 'FERTILIZER') {
            const bags = document.getElementById('tx-fertilizer-bags').value;
            if (bags) {
                description += ` | Bags: ${bags}`;
            }
        } else if (cropItemType === 'PESTICIDES') {
            const acres = document.getElementById('tx-pesticide-acres').value;
            const crop = document.getElementById('tx-pesticide-crop').value;
            if (acres || crop) {
                description += ` | ${crop || 'Unknown Crop'} (${acres || '?'} acres)`;
            }
        }
    }

    const txData = {
        farmerId: parseInt(farmerId),
        type: txType,
        amount: parseFloat(document.getElementById('tx-amount').value),
        date: document.getElementById('tx-date').value,
        description: description,
        cropItemType: cropItemType,
        interestApplied: false,
        shopType: currentShopType
    };

    // Get optional bill file
    const billFile = document.getElementById('tx-bill-file').files[0];

    try {
        // Create or Update transaction
        const method = editId ? 'PUT' : 'POST';
        const url = editId ? `${API_BASE}/transactions/${editId}` : `${API_BASE}/transactions`;
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txData)
        });

        if (res.ok) {
            const savedTx = await res.json();
            const transactionId = savedTx.id;

            // If there's a bill file, upload it separately
            if (billFile && transactionId) {
                const formData = new FormData();
                formData.append('file', billFile);
                
                try {
                    await fetch(`${API_BASE}/transactions/${transactionId}/bill`, {
                        method: 'POST',
                        body: formData
                    });
                } catch (uploadErr) {
                    console.warn("Bill upload failed but transaction was saved", uploadErr);
                }
            }

            showAppNotice(editId ? 'Transaction updated successfully.' : 'Transaction saved successfully.', 'success');
            toggleModal('transaction-modal', false);
            document.getElementById('transaction-form').reset();
            document.getElementById('tx-edit-id').value = '';
            document.getElementById('tx-modal-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Log Ledger Transaction';
            document.getElementById('tx-submit-btn').textContent = 'Submit Transaction';
            document.getElementById('crop-item-group').style.display = 'none';
            document.getElementById('tx-bill-preview').style.display = 'none';
            loadFarmerLedger(farmerId);
        } else {
            showAppNotice('Failed to save transaction.', 'error');
        }
    } catch (err) {
        console.error("Error saving ledger transaction", err);
        showAppNotice('Error saving transaction. Please try again.', 'error');
    }
}

// Update crop item visibility based on transaction type
function updateCropItemVisibility() {
    const txType = document.getElementById('tx-type').value;
    const cropItemGroup = document.getElementById('crop-item-group');
    
    if (txType === 'BILL') {
        cropItemGroup.style.display = 'block';
    } else {
        cropItemGroup.style.display = 'none';
        // Clear selection if hidden
        document.querySelectorAll('input[name="tx-crop-item"]').forEach(radio => {
            radio.checked = false;
        });
        updateCropItemFields();
    }
}

function updateCropItemFields() {
    const cropItem = document.querySelector('input[name="tx-crop-item"]:checked')?.value;
    const fertilizerBagsGroup = document.getElementById('fertilizer-bags-group');
    const pesticideAcresGroup = document.getElementById('pesticide-acres-group');
    const pesticideCropGroup = document.getElementById('pesticide-crop-group');
    
    // Hide all by default
    fertilizerBagsGroup.style.display = 'none';
    pesticideAcresGroup.style.display = 'none';
    pesticideCropGroup.style.display = 'none';
    
    // Clear values
    document.getElementById('tx-fertilizer-bags').value = '';
    document.getElementById('tx-pesticide-acres').value = '';
    document.getElementById('tx-pesticide-crop').value = '';
    
    // Show appropriate fields based on crop item
    if (cropItem === 'FERTILIZER') {
        fertilizerBagsGroup.style.display = 'block';
    } else if (cropItem === 'PESTICIDES') {
        pesticideAcresGroup.style.display = 'block';
        pesticideCropGroup.style.display = 'block';
    }
}

async function editLedgerTransaction(id, farmerId) {
    // Fetch the transaction details
    try {
        const res = await fetch(`${API_BASE}/transactions/${id}`);
        if (!res.ok) {
            showAppNotice('Failed to load transaction details', 'error');
            return;
        }
        const tx = await res.json();
        
        // Populate the form with existing data
        document.getElementById('tx-edit-id').value = id;
        document.getElementById('tx-type').value = tx.type;
        document.getElementById('tx-amount').value = tx.amount;
        document.getElementById('tx-date').value = tx.date.split('T')[0]; // Extract date part only
        document.getElementById('tx-desc').value = tx.description;
        
        // Set crop item type if available
        if (tx.cropItemType) {
            document.querySelector(`input[name="tx-crop-item"][value="${tx.cropItemType}"]`).checked = true;
            
            // Extract and populate crop-specific fields from description
            if (tx.cropItemType === 'FERTILIZER') {
                const bagMatch = tx.description.match(/Bags:\s*(\d+)/);
                if (bagMatch) {
                    document.getElementById('tx-fertilizer-bags').value = bagMatch[1];
                }
            } else if (tx.cropItemType === 'PESTICIDES') {
                const pestMatch = tx.description.match(/\|\s*(.+?)\s*\(\s*([\d.]+)\s*acres\)/);
                if (pestMatch) {
                    document.getElementById('tx-pesticide-crop').value = pestMatch[1];
                    document.getElementById('tx-pesticide-acres').value = pestMatch[2];
                }
            }
        }
        
        // Update modal title and button
        document.getElementById('tx-modal-title').innerHTML = '<i class="fa-solid fa-edit"></i> Edit Transaction';
        document.getElementById('tx-submit-btn').textContent = 'Update Transaction';
        
        // Show crop item selector if BILL
        updateCropItemVisibility();
        updateCropItemFields();
        
        // Open modal
        toggleModal('transaction-modal', true);
    } catch (err) {
        console.error('Error loading transaction for edit', err);
        showAppNotice('Failed to load transaction', 'error');
    }
}

async function deleteLedgerTransaction(id, farmerId) {
    if (!await openConfirmModal("Are you sure you want to delete this transaction from the ledger? This cannot be undone.")) return;
    try {
        const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadFarmerLedger(farmerId);
        }
    } catch (err) {
        console.error("Error deleting transaction", err);
    }
}

// ==========================================
// 7. INTEREST CALCULATOR (STANDALONE / OUTSIDE)
// ==========================================
let computedInterestResult = null; // store to post later

async function loadCalculatorSelector() {
    try {
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            const farmers = await res.json();
            const selectEl = document.getElementById('calc-farmer-select');
            selectEl.innerHTML = '<option value="">-- Run Standalone Calculator --</option>';
            farmers.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.innerText = `${f.name} (Village: ${f.village})`;
                selectEl.appendChild(opt);
            });

            // Clean previous calculation reports
            document.getElementById('calc-results-details').classList.add('hide');
            document.getElementById('calc-placeholder-text').classList.remove('hide');
            document.getElementById('post-ledger-actions').classList.add('hide');
        }
    } catch (err) {
        console.error("Error loading calculator selector", err);
    }
}

async function calculateInterestAccrued(e) {
    e.preventDefault();
    const calcParams = {
        principal: parseFloat(document.getElementById('calc-principal').value),
        rate: parseFloat(document.getElementById('calc-rate').value),
        rateType: document.getElementById('calc-rate-type').value,
        compounding: document.getElementById('calc-compounding').value,
        startDate: document.getElementById('calc-start-date').value,
        endDate: document.getElementById('calc-end-date').value
    };

    try {
        const res = await fetch(`${API_BASE}/calculator/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calcParams)
        });

        if (res.ok) {
            computedInterestResult = await res.json();
            
            // Populate calculations box
            document.getElementById('res-interest').innerText = `₹${computedInterestResult.interest.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('res-total').innerText = `₹${computedInterestResult.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('res-days').innerText = `${computedInterestResult.days} Days`;
            document.getElementById('res-months').innerText = `${computedInterestResult.months} Months`;
            document.getElementById('res-years').innerText = `${computedInterestResult.years} Years`;

            // Display results container
            document.getElementById('calc-placeholder-text').classList.add('hide');
            document.getElementById('calc-results-details').classList.remove('hide');

            // Show Apply-to-ledger action if a farmer is selected
            const selectedFarmerId = document.getElementById('calc-farmer-select').value;
            if (selectedFarmerId) {
                const compText = document.getElementById('calc-compounding').value;
                const rType = document.getElementById('calc-rate-type').value === 'MONTHLY' ? 'monthly' : 'annual';
                document.getElementById('post-desc').value = `Interest (${compText}) on advance from ${calcParams.startDate} to ${calcParams.endDate} @ ${calcParams.rate}% ${rType}`;
                document.getElementById('post-ledger-actions').classList.remove('hide');
            } else {
                document.getElementById('post-ledger-actions').classList.add('hide');
            }
        } else {
            const err = await res.json();
            showAppNotice(`Calculation failed: ${err.error}`, 'error');
        }
    } catch (err) {
        console.error("Error performing calculation", err);
    }
}

async function applyInterestToLedger() {
    const farmerId = document.getElementById('calc-farmer-select').value;
    if (!farmerId || !computedInterestResult) return;

    const txData = {
        farmerId: parseInt(farmerId),
        type: 'INTEREST',
        amount: computedInterestResult.interest,
        date: document.getElementById('calc-end-date').value,
        description: document.getElementById('post-desc').value,
        interestApplied: true,
        interestRate: parseFloat(document.getElementById('calc-rate').value),
        shopType: currentShopType
    };

    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txData)
        });

        if (res.ok) {
            showAppNotice('Interest transaction successfully applied to the ledger!', 'success');
            openFarmerLedgerTab(farmerId);
        }
    } catch (err) {
        console.error("Error applying interest to ledger", err);
    }
}

// HELPER UTILITIES
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) {
        modal.classList.remove('hide');
        const dateInputs = modal.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            if (!input.value) input.value = today;
        });
    } else {
        modal.classList.add('hide');
    }
}

function openConfirmModal(message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-modal-btn');
        const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
        if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
            return resolve(false);
        }

        messageEl.innerText = message;
        confirmBtn.innerText = confirmText;
        cancelBtn.innerText = cancelText;

        const cleanup = () => {
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            toggleModal('confirm-modal', false);
        };

        confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };

        toggleModal('confirm-modal', true);
    });
}

// AI Handwritten OCR Scanner
async function triggerAIScan() {
    const scanner = document.getElementById('scanner-line');
    if (scanner) {
        scanner.classList.remove('hide');
    }

    const tbody = document.querySelector('#transcription-table tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4"><i class="fa-solid fa-spinner fa-spin fa-2x gold-text"></i><p class="mt-2" style="color:var(--gold-light); font-weight:600;">AI scanning handwritten notebook page...</p></td></tr>';

    setTimeout(() => {
        if (scanner) {
            scanner.classList.add('hide');
        }
        tbody.innerHTML = ''; // clear loading row

        const farmerName = document.getElementById('detail-farmer-name').innerText.toLowerCase();
        const pageDesc = document.getElementById('transcription-page-desc').innerText.toLowerCase();

        let entries = [];

        // Check if the current farmer or notebook notes indicate Kali Somayya
        if (farmerName.includes("somayya") || pageDesc.includes("somayya")) {
            entries = [
                { date: "2025-06-23", type: "ADVANCE", amount: 7250, desc: "Opening balance (83)" },
                { date: "2025-06-29", type: "BILL", amount: 2700, desc: "Seeds purchase (126)" },
                { date: "2025-07-02", type: "BILL", amount: 4200, desc: "20-20 fertilizer (3 bags)" },
                { date: "2025-07-11", type: "ADVANCE", amount: 3000, desc: "Cash advance loan" },
                { date: "2025-07-15", type: "BILL", amount: 1400, desc: "Paddy seeds (1 bag)" },
                { date: "2025-07-19", type: "BILL", amount: 7000, desc: "20-20 fertilizer (5 bags)" },
                { date: "2025-07-27", type: "BILL", amount: 1400, desc: "Urea (5 bags)" }
            ];
        } else {
            // Default to A. Bhadrayya entries as seen in the uploaded sheet
            entries = [
                { date: "2025-06-11", type: "ADVANCE", amount: 4500, desc: "Opening balance (16)" },
                { date: "2025-06-27", type: "BILL", amount: 1800, desc: "Anuc (2 bags)" },
                { date: "2025-07-01", type: "BILL", amount: 7000, desc: "20-20 fertilizer (5 bags)" },
                { date: "2025-07-04", type: "BILL", amount: 900, desc: "5-10-10 seeds (1 bag)" },
                { date: "2025-07-07", type: "ADVANCE", amount: 10000, desc: "Cash loan" },
                { date: "2025-08-01", type: "BILL", amount: 1400, desc: "Urea fertilizer (3 bags)" },
                { date: "2025-08-11", type: "BILL", amount: 2800, desc: "20-20 fertilizer (2 bags)" }
            ];
        }

        // Render rows
        entries.forEach((ent, idx) => {
            const tr = document.createElement('tr');
            tr.dataset.index = idx;
            tr.innerHTML = `
                <td><input type="date" class="trans-date" value="${ent.date}" required></td>
                <td>
                    <select class="trans-type gold-select" style="width: 100%; border-color: rgba(212,175,55,0.35);" onchange="refreshInnerCalcDropdown()">
                        <option value="BILL" ${ent.type === 'BILL' ? 'selected' : ''}>BILL (Sale of seed/fert)</option>
                        <option value="ADVANCE" ${ent.type === 'ADVANCE' ? 'selected' : ''}>ADVANCE (Cash loan)</option>
                        <option value="PAYMENT" ${ent.type === 'PAYMENT' ? 'selected' : ''}>PAYMENT (Received cash)</option>
                    </select>
                </td>
                <td><input type="number" class="trans-amount" min="0.01" step="0.01" value="${ent.amount}" required oninput="refreshInnerCalcDropdown()"></td>
                <td><input type="text" class="trans-desc" value="${ent.desc}" required></td>
                <td>
                    <button class="gold-btn-danger" style="width:28px; height:28px;" onclick="removeTranscriptionRow(this)"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        refreshInnerCalcDropdown();
    }, 2000);
}

// Check and seed sample transactions for A. Bhadrayya & Kali Somayya (Enterprises) or Traders (Traders) if they are empty
async function checkAndSeedSampleTransactions(farmers) {
    try {
        const isTraders = currentShopType === 'TRADERS';
        for (let farmer of farmers) {
            const resTxs = await fetch(`${API_BASE}/transactions/farmer/${farmer.id}?shopType=${currentShopType}`);
            if (resTxs.ok) {
                const txs = await resTxs.json();
                if (txs.length === 0) {
                    let entries = [];
                    if (isTraders) {
                        if (farmer.name.includes("Srinivasa")) {
                            entries = [
                                { date: "2025-06-10", type: "BILL", amount: 120000.0, description: "Wholesale Paddy Seeds Purchase (100 bags)", shopType: "TRADERS" },
                                { date: "2025-06-15", type: "PAYMENT", amount: 100000.0, description: "Part payment via Bank Transfer", shopType: "TRADERS" },
                                { date: "2025-07-05", type: "BILL", amount: 80000.0, description: "Cotton Seeds Purchase (50 bags)", shopType: "TRADERS" }
                            ];
                        } else if (farmer.name.includes("Chilli")) {
                            entries = [
                                { date: "2025-06-18", type: "BILL", amount: 150000.0, description: "Urea Fertilizer Purchase (200 bags)", shopType: "TRADERS" },
                                { date: "2025-06-25", type: "PAYMENT", amount: 150000.0, description: "Full settlement payment", shopType: "TRADERS" },
                                { date: "2025-07-12", type: "BILL", amount: 210000.0, description: "20-20 Fertilizer Purchase (150 bags)", shopType: "TRADERS" },
                                { date: "2025-07-20", type: "PAYMENT", amount: 100000.0, description: "Cash advance payment", shopType: "TRADERS" }
                            ];
                        }
                    } else {
                        if (farmer.name.includes("Bhadrayya")) {
                            entries = [
                                { date: "2025-06-11", type: "ADVANCE", amount: 4500.0, description: "Opening balance (16)", shopType: "ENTERPRISES" },
                                { date: "2025-06-27", type: "BILL", amount: 1800.0, description: "Anuc (2 bags)", shopType: "ENTERPRISES" },
                                { date: "2025-07-01", type: "BILL", amount: 7000.0, description: "20-20 fertilizer (5 bags)", shopType: "ENTERPRISES" },
                                { date: "2025-07-04", type: "BILL", amount: 900.0, description: "5-10-10 seeds (1 bag)", shopType: "ENTERPRISES" },
                                { date: "2025-07-07", type: "ADVANCE", amount: 10000.0, description: "Cash loan", shopType: "ENTERPRISES" },
                                { date: "2025-08-01", type: "BILL", amount: 1400.0, description: "Urea fertilizer (3 bags)", shopType: "ENTERPRISES" },
                                { date: "2025-08-11", type: "BILL", amount: 2800.0, description: "20-20 fertilizer (2 bags)", shopType: "ENTERPRISES" }
                            ];
                        } else if (farmer.name.includes("Somayya")) {
                            entries = [
                                { date: "2025-06-23", type: "ADVANCE", amount: 7250.0, description: "Opening balance (83)", shopType: "ENTERPRISES" },
                                { date: "2025-06-29", type: "BILL", amount: 2700.0, description: "Seeds purchase (126)", shopType: "ENTERPRISES" },
                                { date: "2025-07-02", type: "BILL", amount: 4200.0, description: "20-20 fertilizer (3 bags)", shopType: "ENTERPRISES" },
                                { date: "2025-07-11", type: "ADVANCE", amount: 3000.0, description: "Cash advance loan", shopType: "ENTERPRISES" },
                                { date: "2025-07-15", type: "BILL", amount: 1400.0, description: "Paddy seeds (1 bag)", shopType: "ENTERPRISES" },
                                { date: "2025-07-19", type: "BILL", amount: 7000.0, description: "20-20 fertilizer (5 bags)", shopType: "ENTERPRISES" },
                                { date: "2025-07-27", type: "BILL", amount: 1400.0, description: "Urea (5 bags)", shopType: "ENTERPRISES" }
                            ];
                        }
                    }
                    
                    for (let entry of entries) {
                        entry.farmerId = farmer.id;
                        entry.interestApplied = false;
                        await fetch(`${API_BASE}/transactions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(entry)
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error auto-seeding transactions", err);
    }
}

// Render a grid/list of all farmers inside the main directory view when no farmer details are active
function renderFarmersPlaceholderGrid(filterQuery = '') {
    const placeholder = document.getElementById('detail-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = `
        <div class="detail-placeholder-message">
            <i class="fa-solid fa-users-viewfinder"></i>
            <p>Select a farmer from the table above to view profile details, manage photos, or digitize notebooks.</p>
        </div>
    `;
}

// Clear selected farmer/trader and restore list/grid layout
function clearFarmerSelection() {
    selectedFarmerId = null;
    document.getElementById('detail-placeholder').classList.remove('hide');
    document.getElementById('detail-main-content').classList.add('hide');
    document.getElementById('detail-form-content').classList.add('hide');
    document.querySelectorAll('#farmers-list tr.selected').forEach(item => item.classList.remove('selected'));
    renderFarmersPlaceholderGrid(document.getElementById('farmer-search-input').value);
}

function openDeleteFarmerModal(farmerId, farmerName) {
    const modal = document.getElementById('delete-farmer-modal');
    const message = document.getElementById('delete-farmer-message');
    const confirmBtn = document.getElementById('confirm-delete-farmer-btn');

    if (!modal || !message || !confirmBtn) return;
    message.innerText = `Delete ${farmerName}? This will remove the farmer, all photos and notebook records permanently.`;
    confirmBtn.onclick = async () => {
        try {
            const res = await fetch(`${API_BASE}/farmers/${farmerId}`, { method: 'DELETE' });
            if (res.ok) {
                selectedFarmerId = selectedFarmerId === farmerId ? null : selectedFarmerId;
                loadFarmersDirectory();
            }
        } catch (err) {
            console.error('Error deleting farmer', err);
        } finally {
            toggleModal('delete-farmer-modal', false);
        }
    };
    toggleModal('delete-farmer-modal', true);
}

// Global view mode for Farmers List
let farmerViewMode = 'list';

function setFarmerViewMode(mode) {
    farmerViewMode = mode;
    // Update active class on buttons
    document.getElementById('btn-view-grid').classList.toggle('active', mode === 'grid');
    document.getElementById('btn-view-tile').classList.toggle('active', mode === 'tile');
    document.getElementById('btn-view-list').classList.toggle('active', mode === 'list');
    
    // Re-render
    renderFarmersPlaceholderGrid(document.getElementById('farmer-search-input').value);
}

// Main list OCR Upload
async function triggerMainOCRUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading spinner
    const placeholder = document.getElementById('detail-placeholder');
    placeholder.innerHTML = `
        <div class="detail-placeholder-message">
            <i class="fa-solid fa-spinner fa-spin fa-3x gold-text"></i>
            <p style="color:var(--gold-light); font-weight:600; margin-top: 15px;">OCR System transcribing paper record...</p>
            <span style="font-size:0.8rem; color:var(--text-muted);">Extracting name, contact details, village, and crops...</span>
        </div>
    `;

    setTimeout(async () => {
        // Randomly register a farmer
        const names = ["M. Venkateswarlu", "T. Narayana Rao", "P. Krishna Murthy", "G. Sita Ramaiah"];
        const villages = ["Bapatla", "Tenali", "Mangalagiri", "Chebrolu"];
        const crops = ["Cotton - 4 Acres", "Paddy - 6 Acres", "Chilli - 2 Acres", "Turmeric - 3 Acres"];
        
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomVillage = villages[Math.floor(Math.random() * villages.length)];
        const randomCrop = crops[Math.floor(Math.random() * crops.length)];
        const randomPhone = "9" + Math.floor(100000000 + Math.random() * 900000000);

        const newProfile = {
            name: randomName,
            phone: randomPhone,
            village: randomVillage,
            cropDetails: randomCrop,
            shopType: currentShopType
        };

        try {
            const res = await fetch(`${API_BASE}/farmers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProfile)
            });

            if (res.ok) {
                const saved = await res.json();
                showAppNotice(`Successfully scanned and registered Profile: ${saved.name} (${saved.village})`, 'success');
                
                // Refresh list
                const resList = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
                if (resList.ok) {
                    activeFarmers = await resList.json();
                    renderFarmersList('');
                    renderFarmersPlaceholderGrid('');
                }
            }
        } catch (err) {
            console.error("OCR scan failure", err);
            showAppNotice('Failed to parse OCR image.', 'error');
        }
    }, 2500);
}

// Inline Form Actions
function openAddFarmerFormInline() {
    // Show the modal for inline add
    switchFarmerEntryTab('manual');
    toggleModal('farmer-entry-modal', true);
    
    // Set headers
    document.getElementById('inline-form-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Farmer Profile`;
    
    // Clear inputs
    document.getElementById('inline-farmer-id').value = '';
    document.getElementById('inline-farmer-name').value = '';
    document.getElementById('inline-farmer-phone').value = '';
    document.getElementById('inline-farmer-village').value = '';
}

function cleanHeaderEntity(value) {
    return (value || '')
        .replace(/(?:రైతు పేరు|పేరు|నాము|ఫారమర్?|name|farmer|rythu|village|గ్రామం|mandal|place|location|తలుక్)/gi, ' ')
        .replace(/[0-9()#:_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isLikelyValidDetectedName(name) {
    const value = (name || '').replace(/\s+/g, ' ').trim();
    if (!value || value.length < 3 || value.length > 60) {
        return false;
    }
    if (/whatsapp|image|pm|am|jpeg|jpg|page|farmer|pending|unknown/i.test(value)) {
        return false;
    }
    if (/\d{2,}/.test(value)) {
        return false;
    }

    if (/[|~`!@#$%^&*_+=\[\]{}<>\\/]/.test(value)) {
        return false;
    }

    const words = value.split(' ').filter(Boolean);
    if (words.length < 2) {
        return false;
    }

    const singleCharWords = words.filter((w) => w.length === 1).length;
    if (singleCharWords > Math.floor(words.length / 2)) {
        return false;
    }

    const letters = value.match(/[A-Za-z\u0C00-\u0C7F]/g) || [];
    if (letters.length < 3) {
        return false;
    }
    const ratio = letters.length / Math.max(value.length, 1);
    return ratio >= 0.45;
}

function isLikelyValidVillageName(village) {
    const value = (village || '').replace(/\s+/g, ' ').trim();
    if (!value || value.length < 2 || value.length > 40) {
        return false;
    }
    if (/whatsapp|image|pm|am|jpeg|jpg|unknown/i.test(value)) {
        return false;
    }
    if (/\d{2,}/.test(value)) {
        return false;
    }

    if (/[|~`!@#$%^&*_+=\[\]{}<>\\/]/.test(value)) {
        return false;
    }

    const letters = value.match(/[A-Za-z\u0C00-\u0C7F]/g) || [];
    if (letters.length < 1) {
        return false;
    }

    const ratio = letters.length / Math.max(value.length, 1);
    if (ratio < 0.45) {
        return false;
    }
    return true;
}

function splitNameAndVillageFromHeader(headerSegment) {
    const cleanedHeader = cleanHeaderEntity(headerSegment);
    if (!cleanedHeader) {
        return { name: '', village: '' };
    }

    const explicitVillageMatch = cleanedHeader.match(/(.+?)\s+([A-Za-z\u0C00-\u0C7F]+(?:\s+[A-Za-z\u0C00-\u0C7F]+)?)\s+village$/i)
        || cleanedHeader.match(/(.+?)\s+([A-Za-z\u0C00-\u0C7F]+(?:\s+[A-Za-z\u0C00-\u0C7F]+)?)\s+గ్రామం$/i);
    if (explicitVillageMatch) {
        return {
            name: cleanHeaderEntity(explicitVillageMatch[1]),
            village: cleanHeaderEntity(explicitVillageMatch[2])
        };
    }

    const parts = cleanedHeader.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
        return { name: cleanedHeader, village: '' };
    }

    const villageSuffixPattern = /(wada|vada|pally|palle|palle|palem|gudem|guda|pet|peta|pur|puram|nagar|abad|thanda|konda|cherla|giri|lanka|varam|gunta|ooru|uru|valasa|వాడ|వాడా|పల్లి|పాలెం|గూడెం|గూడా|పేట|పురం|నగర్|తండా|కొండ|చెర్ల|గిరి|లంక|వరం|గుంట|వలస)$/i;
    const likelyVillageTokenIndex = parts.findIndex((part, index) => index > 0 && villageSuffixPattern.test(part));

    if (likelyVillageTokenIndex > 0) {
        return {
            name: parts.slice(0, likelyVillageTokenIndex).join(' ').trim(),
            village: parts.slice(likelyVillageTokenIndex).join(' ').trim()
        };
    }

    if (parts.length >= 3) {
        return {
            name: parts.slice(0, parts.length - 1).join(' ').trim(),
            village: parts[parts.length - 1]
        };
    }

    return { name: cleanedHeader, village: '' };
}

function parseFarmerDetailsFromText(text) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return { serialNumber: '', name: '', phone: '', village: 'Yellandu', cropDetails: '', season: IMPORT_SEASON };
    }

    const lines = (text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const firstLine = lines.find(Boolean) || normalized;
    const topLines = lines.slice(0, 4).join(' ');
    const headerText = lines.slice(0, 2).join(' ');
    const teluguWordPattern = '[\\u0C00-\\u0C7F]';
    const namePatterns = [
        new RegExp(`(?:రైతు పేరు|పేరు|నాము|ఫారమర్?|name|farmer|rythu)\\s*[:\\-\\s]*((?:${teluguWordPattern}|[A-Za-z]|\\.|\\s){3,60})`, 'i'),
        new RegExp(`^((?:${teluguWordPattern}|[A-Za-z]|\\.|\\s){3,60}?)(?:\\(|[0-9])`)
    ];
    const villagePatterns = [
        new RegExp(`(?:గ్రామం|village|mandal|place|location|తలుక్)\\s*[:\\-\\s]*((?:${teluguWordPattern}|[A-Za-z]|\\s){2,40})`, 'i')
    ];
    const phoneMatch = normalized.match(/(?:phone|mobile|contact|ph|ఫోన్)?[\s:\-]*([0-9][0-9\s-]{8,15}[0-9])/i);
    const serialMatch = topLines.match(/(?:serial|sl\.?\s*no|s\.?no|సీరియల్|క్రమసం|క్రమ సంఖ్య|నం\.?|no\.?)[\s:\-#]*([0-9]{1,4})/i)
        || topLines.match(/(?:^|\s)\(?([0-9]{1,4})\)?(?=\s|$)/);
    const headerSegment = (() => {
        const phoneIndex = headerText.search(/[6-9][0-9\s-]{8,14}[0-9]/);
        return phoneIndex > 0 ? headerText.slice(0, phoneIndex) : headerText;
    })();
    const headerSplit = splitNameAndVillageFromHeader(headerSegment);

    let extractedName = headerSplit.name || '';
    for (const pattern of namePatterns) {
        const match = (pattern.source.startsWith('^') ? firstLine : normalized).match(pattern);
        if (match && match[1]) {
            const candidateName = match[1].replace(/[():-]+$/g, '').trim();
            if (candidateName.length > extractedName.length || !extractedName) {
                extractedName = candidateName;
            }
            break;
        }
    }

    extractedName = cleanHeaderEntity(extractedName);
    if (!isLikelyValidDetectedName(extractedName)) {
        extractedName = '';
    }

    let extractedVillage = headerSplit.village || '';
    for (const pattern of villagePatterns) {
        const match = normalized.match(pattern);
        if (match && match[1]) {
            extractedVillage = match[1].trim();
            break;
        }
    }

    extractedVillage = cleanHeaderEntity(extractedVillage);
    if (!isLikelyValidVillageName(extractedVillage)) {
        extractedVillage = '';
    }

    let cropDetails = '';
    const cropKeywords = [
        ['paddy', 'Paddy'], ['cotton', 'Cotton'], ['chilli', 'Chilli'], ['maize', 'Maize'], ['turmeric', 'Turmeric'],
        ['fertilizer', 'Fertilizer'], ['seeds', 'Seeds'], ['వరి', 'వరి'], ['పత్తి', 'పత్తి'], ['మిర్చి', 'మిర్చి'], ['మొక్కజొన్న', 'మొక్కజొన్న']
    ];
    const cropKeyword = cropKeywords.find(([keyword]) => normalized.toLowerCase().includes(keyword.toLowerCase()));
    if (cropKeyword) {
        cropDetails = cropKeyword[1];
    }

    return {
        name: extractedName,
        serialNumber: serialMatch && serialMatch[1] ? serialMatch[1].trim() : '',
        phone: phoneMatch && phoneMatch[1] ? phoneMatch[1].replace(/[^0-9]/g, '').slice(0, 10) : '',
        village: extractedVillage || 'Yellandu',
        cropDetails,
        season: IMPORT_SEASON
    };
}

function parseFarmerDetailsFromFileName(fileName) {
    const baseName = (fileName || '').replace(/\.[^.]+$/, '').trim();
    if (!baseName) {
        return { serialNumber: '', name: '', phone: '', village: 'Yellandu', cropDetails: '', season: IMPORT_SEASON, ocrText: '' };
    }

    if (/whatsapp\s*image|unknown/i.test(baseName)) {
        return { serialNumber: '', name: '', phone: '', village: 'Yellandu', cropDetails: '', season: IMPORT_SEASON, ocrText: '' };
    }

    const digitGroups = baseName.match(/\d+/g) || [];
    const longestDigits = digitGroups.sort((left, right) => right.length - left.length)[0] || '';
    const cleanedName = baseName
        .replace(/[_-]+/g, ' ')
        .replace(/\b(notebook|page|farmer|img|image|photo|scan)\b/gi, ' ')
        .replace(/\d+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const genericFileName = /^(farmer|page|img|image|photo|scan)$/i.test(cleanedName.replace(/\s+/g, ''));
    const serialFromFileName = /(farmer|page|img|image|photo|scan|notebook)/i.test(baseName)
        ? ''
        : (longestDigits.length >= 1 && longestDigits.length <= 6 ? longestDigits : '');

    return {
        serialNumber: serialFromFileName,
        name: cleanedName && cleanedName.length >= 3 && !genericFileName && isLikelyValidDetectedName(cleanedName) ? cleanedName : '',
        phone: longestDigits.length === 10 ? longestDigits : '',
        village: 'Yellandu',
        cropDetails: '',
        season: IMPORT_SEASON,
        ocrText: ''
    };
}

async function createHeaderImageData(file, headerRatio = 0.22) {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = objectUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = Math.max(120, Math.floor(image.height * headerRatio));

        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, image.width, canvas.height, 0, 0, image.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.95);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function mergeDetectedFarmerData(primary, fallback) {
    return {
        serialNumber: primary.serialNumber || fallback.serialNumber || '',
        name: primary.name || fallback.name || '',
        phone: primary.phone || fallback.phone || '',
        village: primary.village || fallback.village || 'Yellandu',
        cropDetails: primary.cropDetails || fallback.cropDetails || '',
        season: IMPORT_SEASON,
        ocrText: primary.ocrText || fallback.ocrText || ''
    };
}

async function waitForTesseractReady(maxWaitMs = 12000) {
    if (window.Tesseract) {
        return true;
    }

    const startedAt = Date.now();
    while (!window.Tesseract && Date.now() - startedAt < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return Boolean(window.Tesseract);
}

// Singleton Tesseract worker (improves multilingual OCR reliability)
let _tesseractWorker = null;
async function getTesseractWorker() {
    if (_tesseractWorker) return _tesseractWorker;
    if (!window.Tesseract || !window.Tesseract.createWorker) {
        console.warn('Tesseract or createWorker not available');
        return null;
    }

    const worker = window.Tesseract.createWorker({
        logger: (m) => {
            // minimal logging to console for debugging
            if (m && m.status) console.debug('TESS:', m);
        }
    });

    try {
        await worker.load();
        // load both telugu and english
        await worker.loadLanguage('tel+eng');
        await worker.initialize('tel+eng');
        // Prefer a conservative page segmentation mode for short lines
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        _tesseractWorker = worker;
        return _tesseractWorker;
    } catch (err) {
        console.error('Error initializing Tesseract worker', err);
        return null;
    }
}

async function preprocessDataUrl(dataUrl, maxWidth = 1400) {
    // increase contrast / grayscale and resize to aid OCR
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const w = Math.max(300, Math.floor(img.width * scale));
            const h = Math.floor(img.height * (w / img.width));
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            // draw at resized resolution
            ctx.drawImage(img, 0, 0, w, h);
            // simple contrast/brightness adjustment via pixel manipulation
            try {
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                // auto-contrast: simple histogram stretch
                let min = 255, max = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]);
                    if (lum < min) min = lum;
                    if (lum > max) max = lum;
                }
                const range = Math.max(1, max - min);
                for (let i = 0; i < data.length; i += 4) {
                    // convert to grayscale then stretch
                    const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]);
                    const v = Math.min(255, Math.max(0, Math.round((lum - min) * 255 / range)));
                    data[i] = data[i+1] = data[i+2] = v;
                }
                ctx.putImageData(imgData, 0, 0);
            } catch (err) {
                // If getImageData fails on cross-origin images, skip processing
                console.warn('preprocessDataUrl pixel op failed', err);
            }
            resolve(c.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function setFarmerReviewScanStatus(message, isError = false) {
    const statusEl = document.getElementById('farmer-entry-ocr-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('error', Boolean(isError));
    statusEl.style.display = message ? 'block' : 'none';
}

async function extractFarmerDetailsFromImage(file) {
    const filenameFallback = parseFarmerDetailsFromFileName(file && file.name ? file.name : '');
    const isTesseractReady = await waitForTesseractReady();
    if (!isTesseractReady) {
        console.warn('Tesseract did not load in time, using filename fallback only');
        return filenameFallback;
    }

    const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const headerImageData = await createHeaderImageData(file);

        try {
            // Prefer worker-based OCR when available
            const worker = await getTesseractWorker();
            const preImage = await preprocessDataUrl(imageData).catch(() => imageData);
            const preHeader = await preprocessDataUrl(headerImageData, 800).catch(() => headerImageData);

            if (worker) {
                try {
                    const [fullPageRes, headerRes] = await Promise.all([
                        worker.recognize(preImage),
                        worker.recognize(preHeader)
                    ]);
                    const fullPageText = fullPageRes && fullPageRes.data && fullPageRes.data.text ? fullPageRes.data.text : '';
                    const headerText = headerRes && headerRes.data && headerRes.data.text ? headerRes.data.text : '';
                    const combined = mergeDetectedFarmerData(
                        parseFarmerDetailsFromText(headerText || fullPageText),
                        parseFarmerDetailsFromText(fullPageText)
                    );
                    return mergeDetectedFarmerData({ ...combined, ocrText: [headerText, fullPageText].filter(Boolean).join('\n---\n') }, filenameFallback);
                } catch (workerErr) {
                    console.warn('Worker OCR failed, falling back to Tesseract.recognize', workerErr);
                }
            }

            // Fallback to direct Tesseract.recognize if worker is not available or failed
            try {
                const [{ data: fullPageData }, { data: headerData }] = await Promise.all([
                    Tesseract.recognize(preImage, 'eng+tel'),
                    Tesseract.recognize(preHeader, 'eng+tel')
                ]);
                const fullPageText = fullPageData && fullPageData.text ? fullPageData.text : '';
                const headerText = headerData && headerData.text ? headerData.text : '';
                const combined = mergeDetectedFarmerData(
                    parseFarmerDetailsFromText(headerText || fullPageText),
                    parseFarmerDetailsFromText(fullPageText)
                );
                return mergeDetectedFarmerData({ ...combined, ocrText: [headerText, fullPageText].filter(Boolean).join('\n---\n') }, filenameFallback);
            } catch (multiLangError) {
                console.warn('Falling back to English OCR only', multiLangError);
                const [{ data: fullPageData }, { data: headerData }] = await Promise.all([
                    Tesseract.recognize(preImage, 'eng'),
                    Tesseract.recognize(preHeader, 'eng')
                ]);
                const fullPageText = fullPageData && fullPageData.text ? fullPageData.text : '';
                const headerText = headerData && headerData.text ? headerData.text : '';
                const combined = mergeDetectedFarmerData(
                    parseFarmerDetailsFromText(headerText || fullPageText),
                    parseFarmerDetailsFromText(fullPageText)
                );
                return mergeDetectedFarmerData({ ...combined, ocrText: [headerText, fullPageText].filter(Boolean).join('\n---\n') }, filenameFallback);
            }
        } catch (error) {
            console.error('Error processing OCR image', error);
            return filenameFallback;
        }
}

function sortMultiImageFarmers() {
    multiImageFarmers.sort((left, right) => {
        const leftSerial = parseInt(left.serialNumber || '999999', 10);
        const rightSerial = parseInt(right.serialNumber || '999999', 10);
        if (leftSerial !== rightSerial) {
            return leftSerial - rightSerial;
        }
        return left.index - right.index;
    });
}

function renderFarmerReviewCards() {
    const container = document.getElementById('farmer-entry-review-cards');
    if (!container) return;

    const serialCounts = getBatchSerialCounts(multiImageFarmers);

    container.innerHTML = multiImageFarmers.map((farmerData, index) => `
        <div class="glass-card" style="padding:14px; border:1px solid rgba(212,175,55,0.22);">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
                <strong style="color:var(--gold-light);">Farmer ${index + 1}${farmerData.serialNumber ? ` · Serial ${farmerData.serialNumber}` : ''}</strong>
                <span style="font-size:0.8rem; color:var(--text-muted);">${farmerData.file.name}</span>
            </div>
            ${farmerData.serialNumber && serialCounts[farmerData.serialNumber] > 1 ? `<div class="pending-import-warning" style="margin-bottom:10px;">Serial ${escapeHtml(farmerData.serialNumber)} is repeated in this batch.</div>` : ''}
            ${farmerData.serialNumber && getExistingFarmerBySerial(farmerData.serialNumber) ? `<div class="pending-import-warning" style="margin-bottom:10px;">Serial ${escapeHtml(farmerData.serialNumber)} already exists for ${escapeHtml(getExistingFarmerBySerial(farmerData.serialNumber).name)}. This upload will merge when approved.</div>` : ''}
            <div class="form-group">
                <label for="upload-farmer-serial-${index}">Serial Number *</label>
                <input type="text" id="upload-farmer-serial-${index}" class="gold-input" value="${farmerData.serialNumber || ''}" placeholder="Auto-filled from page header">
            </div>
            <div class="form-group">
                <label for="upload-farmer-name-${index}">Farmer Name *</label>
                <input type="text" id="upload-farmer-name-${index}" class="gold-input" value="${farmerData.name || ''}" placeholder="Auto-filled from OCR">
            </div>
            <div class="form-group">
                <label for="upload-farmer-phone-${index}">Phone Number</label>
                <input type="tel" id="upload-farmer-phone-${index}" class="gold-input" value="${farmerData.phone || ''}" placeholder="Auto-filled if detected">
            </div>
            <div class="form-group">
                <label for="upload-farmer-village-${index}">Village *</label>
                <input type="text" id="upload-farmer-village-${index}" class="gold-input" value="${farmerData.village || 'Yellandu'}">
            </div>
            <div class="form-group">
                <label for="upload-farmer-crop-${index}">Crop Details *</label>
                <input type="text" id="upload-farmer-crop-${index}" class="gold-input" value="${farmerData.cropDetails || ''}" placeholder="e.g. Paddy - 5 Acres">
            </div>
            <div class="form-group">
                <label for="upload-farmer-season-${index}">Season</label>
                <input type="text" id="upload-farmer-season-${index}" class="gold-input" value="${IMPORT_SEASON}" readonly>
            </div>
            <details class="pending-import-ocr">
                <summary>View OCR Text</summary>
                <pre>${escapeHtml(farmerData.ocrText || 'No OCR text available')}</pre>
            </details>
        </div>
    `).join('');
}

// Store farmer data for multi-image upload (each image = one farmer)
let multiImageFarmers = [];

async function previewFarmerEntryImages(event) {
    // Handle multiple file previews - each image becomes ONE separate farmer
    const files = event.target.files;
    if (!files || files.length === 0) {
        document.getElementById('farmer-entry-pages-preview').style.display = 'none';
        multiImageFarmers = [];
        return;
    }

    const thumbnailsContainer = document.getElementById('farmer-entry-thumbnails');
    const previewBox = document.getElementById('farmer-entry-pages-preview');
    const reviewForm = document.getElementById('farmer-entry-review-form');
    const uploadBtnWrap = document.getElementById('farmer-entry-upload-btn-wrap');

    if (!thumbnailsContainer) return;

    // Clear previous state
    thumbnailsContainer.innerHTML = '';
    multiImageFarmers = [];

    // Store farmers array for each file (each will be a separate farmer)
    for (let i = 0; i < files.length; i++) {
        multiImageFarmers.push({
            index: i + 1,
            file: files[i],
            serialNumber: '',
            name: '',
            phone: '',
            village: 'Yellandu',
            cropDetails: '',
            season: IMPORT_SEASON,
            ocrText: ''
        });
    }

    // Show thumbnails for all selected files
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumb = document.createElement('div');
            thumb.style.cssText = 'position: relative; border-radius: 6px; overflow: hidden; border: 2px solid var(--gold); cursor: pointer;';
            thumb.innerHTML = `
                <img src="${e.target.result}" alt="Farmer ${i + 1}" style="width: 100%; height: 100px; object-fit: cover; display: block;">
                <div style="position: absolute; top: 0; right: 0; background: var(--gold-light); color: var(--bg-dark); padding: 2px 6px; font-size: 0.75rem; font-weight: 600;">Farmer ${i + 1}</div>
            `;
            thumbnailsContainer.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    }

    // Show preview box and form
    previewBox.style.display = 'block';
    if (reviewForm) reviewForm.style.display = 'block';
    if (uploadBtnWrap) uploadBtnWrap.style.display = 'none';
    setFarmerReviewScanStatus(`Scanning ${files.length} image(s) for OCR...`);

    renderFarmerReviewCards();

    for (let i = 0; i < multiImageFarmers.length; i++) {
        setFarmerReviewScanStatus(`Scanning image ${i + 1} of ${multiImageFarmers.length}...`);
        const extracted = await extractFarmerDetailsFromImage(multiImageFarmers[i].file);
        multiImageFarmers[i] = { ...multiImageFarmers[i], ...extracted };
        sortMultiImageFarmers();
        renderFarmerReviewCards();
    }

    const filledCount = multiImageFarmers.filter((item) => item.serialNumber || item.name || item.phone || item.cropDetails).length;
    if (filledCount > 0) {
        setFarmerReviewScanStatus(`OCR finished. Auto-filled details found for ${filledCount} of ${multiImageFarmers.length} image(s). Uploading them now...`);
    } else {
        setFarmerReviewScanStatus('OCR finished, but no strong text could be detected. Uploading them now with safe placeholders so you can edit them later.', true);
    }

    await uploadFarmerEntryImages(event.target, { autoClose: true, showAlerts: true });

    console.log('Ready to create', files.length, 'separate farmers');
}

function openFarmerEntryModal() {
    // Open the centered modal for adding a farmer (preferred UX)
    switchFarmerEntryTab('upload');
    toggleModal('farmer-entry-modal', true);
}

// Toggle a right-side drawer element by id
function toggleDrawer(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    if (show) {
        el.classList.remove('hide');
        document.body.classList.add('drawer-open');
        setTimeout(() => el.classList.add('open'), 10);
    } else {
        el.classList.remove('open');
        document.body.classList.remove('drawer-open');
        setTimeout(() => el.classList.add('hide'), 300);
    }
}

function switchFarmerEntryTab(tab) {
    const activeUpload = tab === 'upload';
    // Toggle buttons in both modal and drawer (if present)
    document.querySelectorAll('#farmer-entry-modal .tab-button, #farmer-entry-drawer .tab-button').forEach(btn => {
        const isUploadButton = btn.textContent.trim().startsWith('Upload');
        btn.classList.toggle('active', isUploadButton === activeUpload);
    });
    // Panels for modal
    const uploadPanel = document.getElementById('farmer-entry-upload-panel');
    const manualPanel = document.getElementById('farmer-entry-manual-panel');
    if (uploadPanel && manualPanel) {
        uploadPanel.classList.toggle('hide', !activeUpload);
        manualPanel.classList.toggle('hide', activeUpload);
    }
    // Panels for drawer
    const uploadPanelD = document.getElementById('farmer-entry-upload-panel-drawer');
    const manualPanelD = document.getElementById('farmer-entry-manual-panel-drawer');
    if (uploadPanelD && manualPanelD) {
        uploadPanelD.classList.toggle('hide', !activeUpload);
        manualPanelD.classList.toggle('hide', activeUpload);
    }
}

async function submitFarmerEntryUpload(event) {
    event.preventDefault();
    const modalFileInput = document.getElementById('farmer-entry-photo');
    const drawerFileInput = document.getElementById('farmer-entry-photo-drawer');
    const fileInput = (modalFileInput && modalFileInput.files && modalFileInput.files.length > 0)
        ? modalFileInput
        : drawerFileInput;
    const files = fileInput ? fileInput.files : null;
    
    if (!files || files.length === 0) {
        showAppNotice('Please select at least one image to upload.', 'error');
        return;
    }

    // Check if the review form is already showing (second submit = save farmers)
    const reviewForm = document.getElementById('farmer-entry-review-form');
    const isReviewMode = reviewForm && reviewForm.style.display !== 'none';

    if (isReviewMode) {
        await uploadFarmerEntryImages(fileInput, { autoClose: true, showAlerts: true });
        return;
    }

    // First submit: preview is already shown
    const uploadBtnWrap = document.getElementById('farmer-entry-upload-btn-wrap');
    if (uploadBtnWrap) uploadBtnWrap.style.display = 'none';
}

async function submitFarmerEntryManual(event, closeAfterSave = false) {
    event.preventDefault();

    const getFieldValue = (modalId, drawerId) => {
        const modalEl = document.getElementById(modalId);
        const drawerEl = document.getElementById(drawerId);
        return modalEl?.value?.trim() || drawerEl?.value?.trim() || '';
    };

    const name = getFieldValue('manual-farmer-name', 'manual-farmer-name-drawer');
    const phone = getFieldValue('manual-farmer-phone', 'manual-farmer-phone-drawer');
    const village = getFieldValue('manual-farmer-village', 'manual-farmer-village-drawer');
    const season = getFieldValue('manual-farmer-season', 'manual-farmer-season-drawer');

    if (!name || !phone || !village) {
        showAppNotice('Please fill in all required fields.', 'error');
        return;
    }

    const data = { name, phone, village, cropDetails: '', season, shopType: currentShopType };
    try {
        const res = await fetch(`${API_BASE}/farmers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            const saved = await res.json();
            const drawer = document.getElementById('farmer-entry-drawer');
            const usingDrawer = drawer && !drawer.classList.contains('hide');

            if (closeAfterSave) {
                if (usingDrawer) {
                    toggleDrawer('farmer-entry-drawer', false);
                } else {
                    toggleModal('farmer-entry-modal', false);
                }
            }

            showAppNotice(`Farmer ${name} added successfully.${closeAfterSave ? '' : ' You can add another farmer now.'}`, 'success');

            const manualForm = document.getElementById('farmer-entry-manual-form') || document.getElementById('farmer-entry-manual-form-drawer');
            if (manualForm) manualForm.reset();
            loadFarmersDirectory();
        } else {
            showAppNotice('Failed to add farmer manually.', 'error');
        }
    } catch (err) {
        console.error('Error adding farmer manually', err);
        showAppNotice('Save failed. Please try again.', 'error');
    }
}

function openEditFarmerFormInline() {
    if (!selectedFarmerId) return;
    
    const farmer = activeFarmers.find(f => f.id === selectedFarmerId);
    if (!farmer) return;
    
    // Hide details
    document.getElementById('detail-placeholder').classList.add('hide');
    document.getElementById('detail-main-content').classList.add('hide');
    
    // Show inline form
    const formPanel = document.getElementById('detail-form-content');
    formPanel.classList.remove('hide');
    
    // Set headers
    document.getElementById('inline-form-title').innerHTML = `<i class="fa-solid fa-edit"></i> Edit Farmer Profile`;
    
    // Populate inputs
    document.getElementById('inline-farmer-id').value = farmer.id;
    document.getElementById('inline-farmer-name').value = farmer.name;
    document.getElementById('inline-farmer-phone').value = farmer.phone;
    document.getElementById('inline-farmer-village').value = farmer.village;
    document.getElementById('inline-farmer-crop').value = farmer.cropDetails;
    document.getElementById('inline-farmer-season').value = farmer.season || '2025-26';
}

function cancelInlineForm() {
    document.getElementById('detail-form-content').classList.add('hide');
    if (selectedFarmerId) {
        document.getElementById('detail-main-content').classList.remove('hide');
    } else {
        document.getElementById('detail-placeholder').classList.remove('hide');
        renderFarmersPlaceholderGrid('');
    }
}

async function saveInlineFarmer(event) {
    event.preventDefault();
    const id = document.getElementById('inline-farmer-id').value;
    const name = document.getElementById('inline-farmer-name').value;
    const phone = document.getElementById('inline-farmer-phone').value;
    const village = document.getElementById('inline-farmer-village').value;

    const data = { name, phone, village, cropDetails: '', season: document.getElementById('inline-farmer-season').value, shopType: currentShopType };
    
    try {
        let res;
        if (id) {
            // Update
            res = await fetch(`${API_BASE}/farmers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create
            res = await fetch(`${API_BASE}/farmers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (res.ok) {
            const saved = await res.json();
            showAppNotice(`Farmer ${name} added successfully.`, 'success');
            
            // Close modal and reload list
            toggleModal('farmer-entry-modal', false);
            const resList = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
            if (resList.ok) {
                activeFarmers = await resList.json();
                renderFarmersList('');
            }
            
            // Reset form
            document.getElementById('inline-farmer-form').reset();
            document.getElementById('inline-farmer-id').value = '';
        }
    } catch (err) {
        console.error("Error saving farmer inline", err);
    }
}

// Load Farmer Purchased Items (associated stock list)
async function loadFarmerPurchasedItems(farmerId) {
    const tbody = document.querySelector('#farmer-items-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading stock history...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/transactions/farmer/${farmerId}?shopType=${currentShopType}`);
        if (res.ok) {
            const txs = await res.json();
            const bills = txs.filter(t => t.type === 'BILL');
            tbody.innerHTML = '';
            
            if (bills.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No stock items purchased yet.</td></tr>';
                return;
            }
            
            bills.forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${b.date}</td>
                    <td class="gold-text">${b.description.split('(')[0].trim()}</td>
                    <td>₹${b.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td>${b.description}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Error fetching items table", err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading purchases.</td></tr>';
    }
}

// Profile Interest Calculator modal logic
let computedProfileInterest = null;

async function openProfileInterestModal() {
    if (!selectedFarmerId) return;
    
    // Fetch summary to get outstanding balance
    try {
        const res = await fetch(`${API_BASE}/transactions/farmer/${selectedFarmerId}/summary?shopType=${currentShopType}`);
        if (res.ok) {
            const summary = await res.json();
            
            // Principal
            document.getElementById('prof-calc-principal').value = summary.balanceDue > 0 ? summary.balanceDue : 0;
            
            // Default dates
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('prof-calc-end').value = today;
            
            // Find first advance or default to 1 month ago
            const resTxs = await fetch(`${API_BASE}/transactions/farmer/${selectedFarmerId}?shopType=${currentShopType}`);
            if (resTxs.ok) {
                const txs = await resTxs.json();
                const advances = txs.filter(t => t.type === 'ADVANCE');
                if (advances.length > 0) {
                    document.getElementById('prof-calc-start').value = advances[0].date;
                } else {
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    document.getElementById('prof-calc-start').value = oneMonthAgo.toISOString().split('T')[0];
                }
            }
            
            toggleModal('profile-interest-modal', true);
            document.getElementById('profile-interest-results').classList.add('hide');
        }
    } catch (err) {
        console.error("Error opening profile interest modal", err);
    }
}

function runProfileInterestCalc(event) {
    event.preventDefault();
    const principal = parseFloat(document.getElementById('prof-calc-principal').value);
    const rate = parseFloat(document.getElementById('prof-calc-rate').value);
    const startStr = document.getElementById('prof-calc-start').value;
    const endStr = document.getElementById('prof-calc-end').value;
    
    const isCompound = document.querySelector('input[name="prof-interest-type"]:checked').value === 'COMPOUND';
    
    if (isNaN(principal) || isNaN(rate) || !startStr || !endStr) return;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    // Diff in months
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = diffDays / 30.0;
    
    let interest = 0.0;
    if (isCompound) {
        interest = principal * (Math.pow((1 + (rate / 100)), months)) - principal;
    } else {
        interest = principal * (rate / 100) * months;
    }
    
    computedProfileInterest = {
        interest: Math.round(interest * 100) / 100,
        total: Math.round((principal + interest) * 100) / 100,
        months: Math.round(months * 10) / 10,
        rate: rate,
        endDate: endStr
    };
    
    document.getElementById('prof-res-interest').innerText = `₹${computedProfileInterest.interest.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('prof-res-total').innerText = `₹${computedProfileInterest.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('prof-res-duration').innerText = `${computedProfileInterest.months} Months (${diffDays} Days)`;
    
    document.getElementById('profile-interest-results').classList.remove('hide');
}

async function postProfileInterestToLedger() {
    if (!selectedFarmerId || !computedProfileInterest) return;
    
    const data = {
        farmerId: selectedFarmerId,
        type: 'INTEREST',
        amount: computedProfileInterest.interest,
        date: computedProfileInterest.endDate,
        description: `Interest charged at ${computedProfileInterest.rate}% monthly rate`,
        interestApplied: true,
        interestRate: computedProfileInterest.rate,
        shopType: currentShopType
    };
    
    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            showAppNotice('Interest applied successfully to the ledger!', 'success');
            toggleModal('profile-interest-modal', false);
            // Refresh ledger
            openFarmerLedgerTab(selectedFarmerId);
        }
    } catch (err) {
        console.error("Error posting interest", err);
    }
}

// ============================================================================
// 4. DEDICATED TRADERS DIRECTORY & LEDGER SECTION
// ============================================================================
let activeTraders = [];
let selectedTraderId = null;
let traderViewMode = 'grid';

function isTradersBusiness() {
    return currentShopType === 'TRADERS';
}

function configureTraderModuleUi() {
    const tradersMode = isTradersBusiness();

    const directoryTitle = document.getElementById('trader-directory-title');
    if (directoryTitle) {
        directoryTitle.innerText = tradersMode
            ? 'Traders Directory & Dispatch Ledger'
            : 'Dealers/Suppliers Directory & Receipt Digitizer';
    }

    const ledgerTitle = document.getElementById('trader-ledger-title');
    if (ledgerTitle) {
        ledgerTitle.innerText = tradersMode
            ? 'Trader Dispatch Ledger'
            : 'Dealer Payables Ledger';
    }

    const selectorLabel = document.getElementById('trader-ledger-selector-label');
    if (selectorLabel) {
        selectorLabel.innerText = tradersMode ? 'Select Trader Account' : 'Select Dealer Account';
    }

    const billsLabel = document.getElementById('trader-summary-bills-label');
    const paymentsLabel = document.getElementById('trader-summary-payments-label');
    const balanceLabel = document.getElementById('trader-summary-balance-label');
    if (billsLabel) billsLabel.innerText = tradersMode ? 'Total Dispatch Value' : 'Total Stock Received Value';
    if (paymentsLabel) paymentsLabel.innerText = tradersMode ? 'Total Payments Received' : 'Total Paid (Advance + Payment + Returns)';
    if (balanceLabel) balanceLabel.innerText = tradersMode ? 'Outstanding Receivable' : 'Outstanding Payable';

    const debitHeader = document.getElementById('trader-ledger-debit-header');
    const creditHeader = document.getElementById('trader-ledger-credit-header');
    if (debitHeader) debitHeader.innerText = tradersMode ? 'Debit (Payments Received)' : 'Debit (Advance/Payment/Return)';
    if (creditHeader) creditHeader.innerText = tradersMode ? 'Credit (Dispatch Value)' : 'Credit (Stock Received Value)';

    const txModalTitle = document.getElementById('trader-tx-modal-title');
    if (txModalTitle) {
        txModalTitle.innerHTML = tradersMode
            ? '<i class="fa-solid fa-plus-circle"></i> Log Trader Dispatch/Payment'
            : '<i class="fa-solid fa-plus-circle"></i> Log Dealer Bill/Payment';
    }

    const txType = document.getElementById('trader-tx-type');
    if (txType) {
        txType.innerHTML = tradersMode
            ? `
                <option value="BILL">BILL (Dispatch to trader)</option>
                <option value="PAYMENT">PAYMENT (Received from trader)</option>
              `
            : `
                <option value="BILL">BILL (Stock received from dealer)</option>
                <option value="ADVANCE">ADVANCE (Advance paid to dealer)</option>
                <option value="PAYMENT">PAYMENT (Payment made to dealer)</option>
              `;
    }

    const amountLabel = document.getElementById('trader-tx-amount-label');
    if (amountLabel) {
        amountLabel.innerText = tradersMode ? 'Amount (₹) / Auto from shipment' : 'Amount (₹)';
    }

    onTraderTxTypeChange();
}

function calculateTraderAutoAmount() {
    const tons = parseFloat(document.getElementById('trader-tx-tons')?.value || 0);
    const rate = parseFloat(document.getElementById('trader-tx-rate')?.value || 0);
    const charges = parseFloat(document.getElementById('trader-tx-charges')?.value || 0);
    const total = (tons * rate) + charges;

    const autoAmountInput = document.getElementById('trader-tx-auto-amount');
    if (autoAmountInput) {
        autoAmountInput.value = total > 0 ? total.toFixed(2) : '';
    }

    const txType = document.getElementById('trader-tx-type')?.value;
    const manualAmount = document.getElementById('trader-tx-amount');
    if (manualAmount && txType === 'BILL' && total > 0) {
        manualAmount.value = total.toFixed(2);
    }
}

function onTraderTxTypeChange() {
    const txType = document.getElementById('trader-tx-type')?.value;
    const shipmentFields = document.getElementById('trader-shipment-fields');
    const amountInput = document.getElementById('trader-tx-amount');

    if (!shipmentFields || !amountInput) return;

    if (txType === 'BILL') {
        shipmentFields.style.display = 'block';
        calculateTraderAutoAmount();
    } else {
        shipmentFields.style.display = 'none';
    }
}

async function loadTradersDirectory() {
    try {
        configureTraderModuleUi();
        document.getElementById('farmers-list')?.replaceChildren();
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            activeTraders = await res.json();
            renderTradersList('');
            clearTraderSelection();
            renderTradersPlaceholderGrid(document.getElementById('trader-search-input')?.value || '');
        }
    } catch (err) {
        console.error("Error loading traders", err);
    }
}

function renderTradersList(query = '') {
    const list = document.getElementById('traders-list');
    if (!list) return;
    list.innerHTML = '';
    
    const filtered = activeTraders.filter(t => {
        const typeMatch = (t.shopType || '').toUpperCase() === (currentShopType || '').toUpperCase();
        const q = query.toLowerCase();
        return typeMatch && (t.name.toLowerCase().includes(q) || t.village.toLowerCase().includes(q));
    });
    
    if (filtered.length === 0) {
        list.innerHTML = '<li class="text-center p-3" style="color:var(--text-muted);">No traders found.</li>';
        return;
    }
    
    filtered.forEach(t => {
        const li = document.createElement('li');
        li.className = 'farmer-list-item';
        if (t.id === selectedTraderId) li.className += ' selected';
        li.dataset.id = t.id;
        li.onclick = () => selectTraderInView(t.id);
        
        li.innerHTML = `
            <div class="farmer-list-item-avatar"><i class="fa-solid fa-building-flag" style="font-size: 1.2rem; color:var(--gold);"></i></div>
            <div class="farmer-list-item-info">
                <h4>${t.name}</h4>
                <p><i class="fa-solid fa-location-dot"></i> ${t.village}</p>
            </div>
        `;
        list.appendChild(li);
    });
}

function filterTradersList() {
    const query = document.getElementById('trader-search-input').value;
    renderTradersList(query);
    renderTradersPlaceholderGrid(query);
}

async function selectTraderInView(id) {
    selectedTraderId = id;
    
    // highlight selected
    document.querySelectorAll('#traders-list .farmer-list-item').forEach(item => {
        item.classList.toggle('selected', parseInt(item.dataset.id) === id);
    });
    
    const trader = activeTraders.find(t => t.id === id);
    if (!trader) return;
    
    document.getElementById('trader-detail-placeholder').classList.add('hide');
    document.getElementById('trader-detail-form-content').classList.add('hide');
    document.getElementById('trader-detail-main-content').classList.remove('hide');
    
    document.getElementById('detail-trader-name').innerText = trader.name;
    document.getElementById('detail-trader-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${trader.village}`;
    document.getElementById('detail-trader-phone').innerText = trader.phone;
    document.getElementById('detail-trader-items').innerText = trader.cropDetails;
    
    loadTraderReturns(id);
    loadTraderInvoices(id);
}

function clearTraderSelection() {
    selectedTraderId = null;
    document.getElementById('trader-detail-placeholder').classList.remove('hide');
    document.getElementById('trader-detail-main-content').classList.add('hide');
    document.getElementById('trader-detail-form-content').classList.add('hide');
    document.querySelectorAll('#traders-list .farmer-list-item').forEach(item => item.classList.remove('selected'));
    renderTradersPlaceholderGrid(document.getElementById('trader-search-input')?.value || '');
}

// Inline Trader Form handlers
function openAddTraderFormInline() {
    document.getElementById('trader-detail-placeholder').classList.add('hide');
    document.getElementById('trader-detail-main-content').classList.add('hide');
    document.getElementById('trader-detail-form-content').classList.remove('hide');
    
    document.getElementById('trader-inline-form-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Trader Profile`;
    
    document.getElementById('inline-trader-id').value = '';
    document.getElementById('inline-trader-name').value = '';
    document.getElementById('inline-trader-phone').value = '';
    document.getElementById('inline-trader-village').value = '';
    document.getElementById('inline-trader-crop').value = '';
}

function setTraderViewMode(mode) {
    traderViewMode = mode;
    document.getElementById('btn-trader-view-grid').classList.toggle('active', mode === 'grid');
    document.getElementById('btn-trader-view-tile').classList.toggle('active', mode === 'tile');
    document.getElementById('btn-trader-view-list').classList.toggle('active', mode === 'list');
    renderTradersPlaceholderGrid(document.getElementById('trader-search-input')?.value || '');
}

function renderTradersPlaceholderGrid(filterQuery = '') {
    const placeholder = document.getElementById('trader-detail-placeholder');
    if (!placeholder) return;

    const isTraders = isTradersBusiness();
    const query = filterQuery.toLowerCase();
    const filtered = activeTraders.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.village.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        placeholder.innerHTML = `
            <div class="detail-placeholder-message">
                <i class="fa-solid fa-users-viewfinder"></i>
                <p>No ${isTraders ? 'traders' : 'dealers/suppliers'} match your search query.</p>
            </div>
        `;
        return;
    }

    placeholder.innerHTML = `
        <div class="detail-placeholder-message">
            <i class="fa-solid fa-handshake"></i>
            <p>${isTraders
                ? 'Select a trader from the left directory to view details, manage invoices, and record dispatch/payments.'
                : 'Select a supplier from the left directory to view details, upload receipts, and track payables.'}
            </p>
        </div>
    `;
}

function openEditTraderFormInline() {
    if (!selectedTraderId) return;
    const trader = activeTraders.find(t => t.id === selectedTraderId);
    if (!trader) return;
    
    document.getElementById('trader-detail-placeholder').classList.add('hide');
    document.getElementById('trader-detail-main-content').classList.add('hide');
    document.getElementById('trader-detail-form-content').classList.remove('hide');
    
    document.getElementById('trader-inline-form-title').innerHTML = `<i class="fa-solid fa-edit"></i> Edit Trader Profile`;
    
    document.getElementById('inline-trader-id').value = trader.id;
    document.getElementById('inline-trader-name').value = trader.name;
    document.getElementById('inline-trader-phone').value = trader.phone;
    document.getElementById('inline-trader-village').value = trader.village;
    document.getElementById('inline-trader-crop').value = trader.cropDetails;
}

function cancelTraderInlineForm() {
    document.getElementById('trader-detail-form-content').classList.add('hide');
    if (selectedTraderId) {
        document.getElementById('trader-detail-main-content').classList.remove('hide');
    } else {
        document.getElementById('trader-detail-placeholder').classList.remove('hide');
        renderTradersPlaceholderGrid(document.getElementById('trader-search-input')?.value || '');
    }
}

async function saveInlineTrader(event) {
    event.preventDefault();
    const id = document.getElementById('inline-trader-id').value;
    const name = document.getElementById('inline-trader-name').value;
    const phone = document.getElementById('inline-trader-phone').value;
    const village = document.getElementById('inline-trader-village').value;
    const cropDetails = document.getElementById('inline-trader-crop').value;
    
    const data = { name, phone, village, cropDetails, shopType: currentShopType };
    
    try {
        let res;
        if (id) {
            res = await fetch(`${API_BASE}/farmers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            res = await fetch(`${API_BASE}/farmers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        if (res.ok) {
            const saved = await res.json();
            // Refresh
            const resList = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
            if (resList.ok) {
                activeTraders = await resList.json();
                renderTradersList('');
            }
            
            document.getElementById('trader-detail-form-content').classList.add('hide');
            document.getElementById('trader-detail-main-content').classList.remove('hide');
            selectTraderInView(saved.id);
        }
    } catch (err) {
        console.error("Error saving trader", err);
    }
}

async function deleteTrader(id) {
    if (!await openConfirmModal("Are you sure you want to delete this trader and all associated records?")) return;
    try {
        const res = await fetch(`${API_BASE}/farmers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showAppNotice('Trader deleted successfully.', 'success');
            loadTradersDirectory();
        }
    } catch (err) {
        console.error("Error deleting trader", err);
    }
}

// Trader Returns Log
async function loadTraderReturns(traderId) {
    const tbody = document.querySelector('#trader-returns-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading returns history...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/transactions/farmer/${traderId}?shopType=${currentShopType}`);
        if (res.ok) {
            const txs = await res.json();
            const returns = txs.filter(t => t.type === 'PAYMENT' && (t.description || '').toLowerCase().includes('return:'));
            tbody.innerHTML = '';
            
            if (returns.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No returns logged yet.</td></tr>';
                return;
            }
            
            returns.forEach(r => {
                const tr = document.createElement('tr');
                const itemDesc = r.description.replace('Return:', '').trim();
                tr.innerHTML = `
                    <td>${new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td class="gold-text">${itemDesc}</td>
                    <td>-</td>
                    <td>₹${r.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Error loading returns table", err);
    }
}

async function saveReturnTransaction(event) {
    event.preventDefault();
    if (!selectedTraderId) return;
    
    const itemName = document.getElementById('return-item').value;
    const qty = document.getElementById('return-qty').value;
    const amount = parseFloat(document.getElementById('return-amount').value);
    const date = document.getElementById('return-date').value;
    
    const data = {
        farmerId: selectedTraderId,
        type: 'PAYMENT', // logged as debit
        amount: amount,
        date: date,
        description: `Return: ${itemName} (${qty} bags/units)`,
        shopType: currentShopType
    };
    
    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            showAppNotice('Stock return transaction successfully logged!', 'success');
            toggleModal('return-modal', false);
            // clear form
            document.getElementById('return-item').value = '';
            document.getElementById('return-qty').value = '';
            document.getElementById('return-amount').value = '';
            
            selectTraderInView(selectedTraderId);
        }
    } catch (err) {
        console.error("Error logging return", err);
    }
}

// Invoices (Notebook scans) for Trader
async function loadTraderInvoices(traderId) {
    const container = document.getElementById('trader-invoice-gallery');
    if (!container) return;
    container.innerHTML = '';
    
    try {
        const res = await fetch(`${API_BASE}/farmers/${traderId}/notebooks`);
        if (res.ok) {
            const pages = await res.json();
            if (pages.length === 0) {
                container.innerHTML = '<p class="text-muted text-center" style="grid-column: 1/-1;">No invoices uploaded yet.</p>';
                return;
            }
            
            pages.forEach(page => {
                const imgUrl = `${API_BASE}/farmers/notebooks/${page.id}/image`;
                const div = document.createElement('div');
                div.className = 'notebook-thumb';
                div.onclick = () => openTraderTranscriptionWorkspace(page);
                div.innerHTML = `
                    <img src="${imgUrl}" alt="Invoice Page">
                    <div class="thumb-info" style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem;">${page.notes || 'Invoice page'}</span>
                        <button class="gold-btn-danger" style="padding:2px 6px; font-size:0.7rem; width:auto;" onclick="event.stopPropagation(); deleteTraderInvoicePage(${page.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    } catch (err) {
        console.error("Error loading trader invoices", err);
    }
}

async function uploadTraderInvoice(event) {
    event.preventDefault();
    if (!selectedTraderId) return;
    
    const notes = document.getElementById('trader-invoice-notes').value;
    const file = document.getElementById('trader-invoice-file').files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("notes", notes);
    
    try {
        const res = await fetch(`${API_BASE}/farmers/${selectedTraderId}/notebooks`, {
            method: 'POST',
            body: formData
        });
        
        if (res.ok) {
            showAppNotice('Invoice uploaded successfully!', 'success');
            toggleModal('trader-invoice-modal', false);
            document.getElementById('trader-invoice-notes').value = '';
            document.getElementById('trader-invoice-file').value = '';
            document.getElementById('trader-invoice-filename').innerText = '';
            loadTraderInvoices(selectedTraderId);
        }
    } catch (err) {
        console.error("Error uploading invoice", err);
    }
}

async function deleteTraderInvoicePage(pageId) {
    if (!await openConfirmModal("Are you sure you want to delete this invoice?")) return;
    try {
        const res = await fetch(`${API_BASE}/farmers/notebooks/${pageId}`, { method: 'DELETE' });
        if (res.ok) {
            loadTraderInvoices(selectedTraderId);
        }
    } catch (err) {
        console.error("Error deleting invoice", err);
    }
}

// Side-by-Side Transcription Workspace specifically for Trader invoices
function openTraderTranscriptionWorkspace(page) {
    toggleModal('transcription-modal', true);
    document.getElementById('transcription-image').src = `${API_BASE}/farmers/notebooks/${page.id}/image`;
    document.getElementById('transcription-page-desc').innerText = page.notes || '';
}

// ==========================================
// TRADER LEDGER FUNCTIONALITY
// ==========================================
let activeTraderLedgerId = null;

async function loadTradersLedgerSelector() {
    const selector = document.getElementById('trader-ledger-selector');
    if (!selector) return;
    
    try {
        configureTraderModuleUi();
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            const list = await res.json();
            selector.innerHTML = `<option value="">${isTradersBusiness() ? '-- Select Trader --' : '-- Select Dealer --'}</option>`;
            list.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.innerText = `${t.name} (Location: ${t.village})`;
                selector.appendChild(opt);
            });
            
            // clear details
            document.getElementById('trader-ledger-details-container').classList.add('hide');
        }
    } catch (err) {
        console.error("Error populating trader selector", err);
    }
}

async function openTraderLedgerTab(traderId) {
    switchTab('tab-traders-ledger');
    document.getElementById('trader-ledger-selector').value = traderId;
    loadTraderLedger(traderId);
}

async function loadTraderLedger(traderId) {
    if (!traderId) {
        document.getElementById('trader-ledger-details-container').classList.add('hide');
        return;
    }
    
    activeTraderLedgerId = parseInt(traderId);
    document.getElementById('trader-ledger-details-container').classList.remove('hide');
    configureTraderModuleUi();
    const tradersMode = isTradersBusiness();
    
    try {
        // Fetch summary
        const resSum = await fetch(`${API_BASE}/transactions/farmer/${traderId}/summary?shopType=${currentShopType}`);
        if (resSum.ok) {
            const sum = await resSum.json();
            
            document.getElementById('trader-summary-bills').innerText = `₹${sum.totalBills.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            const totalPaid = tradersMode ? sum.totalPayments : (sum.totalPayments + sum.totalAdvances);
            document.getElementById('trader-summary-payments').innerText = `₹${totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            
            const outstanding = sum.totalBills - totalPaid;
            const balanceLabel = document.getElementById('trader-summary-balance-label');
            const balanceEl = document.getElementById('trader-summary-balance');
            if (!tradersMode && outstanding < 0) {
                if (balanceLabel) balanceLabel.innerText = 'Advance Balance (Overpaid)';
                balanceEl.innerText = `₹${Math.abs(outstanding).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
                balanceEl.className = 'text-success font-weight-bold';
            } else {
                if (balanceLabel) balanceLabel.innerText = tradersMode ? 'Outstanding Receivable' : 'Outstanding Payable';
                balanceEl.innerText = `₹${outstanding.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
                balanceEl.className = outstanding > 0 ? 'text-danger font-weight-bold' : 'text-success font-weight-bold';
            }
        }
        
        // Fetch list
        const resList = await fetch(`${API_BASE}/transactions/farmer/${traderId}?shopType=${currentShopType}`);
        if (resList.ok) {
            const txs = await resList.json();
            const tbody = document.querySelector('#trader-ledger-table tbody');
            tbody.innerHTML = '';
            
            if (txs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center">No ledger entries recorded yet.</td></tr>';
                return;
            }
            
            txs.forEach(tx => {
                const tr = document.createElement('tr');
                const txType = (tx.type || '').toUpperCase();
                const isDebit = tradersMode ? (txType === 'PAYMENT') : (txType === 'PAYMENT' || txType === 'ADVANCE');
                const lorry = tx.lorryNo || '-';
                const tons = tx.tons ? Number(tx.tons).toFixed(2) : '-';
                const rate = tx.ratePerTon ? `₹${Number(tx.ratePerTon).toLocaleString('en-IN', {minimumFractionDigits: 2})}` : '-';
                const charges = tx.otherCharges ? `₹${Number(tx.otherCharges).toLocaleString('en-IN', {minimumFractionDigits: 2})}` : '-';
                tr.innerHTML = `
                    <td>${new Date(tx.date).toLocaleDateString('en-IN')}</td>
                    <td>${tx.description}</td>
                    <td><span class="badge ${txType === 'BILL' ? 'badge-bill' : 'badge-payment'}">${txType}</span></td>
                    <td>${lorry}</td>
                    <td>${tons}</td>
                    <td>${rate}</td>
                    <td>${charges}</td>
                    <td class="debit-text">${isDebit ? '₹' + tx.amount.toLocaleString('en-IN', {minimumFractionDigits:2}) : '-'}</td>
                    <td class="credit-text">${!isDebit ? '₹' + tx.amount.toLocaleString('en-IN', {minimumFractionDigits:2}) : '-'}</td>
                    <td>
                        <button class="gold-btn-danger" style="padding:4px 8px; font-size:0.8rem; width:auto;" onclick="deleteTraderTransaction(${tx.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Error loading trader ledger", err);
    }
}

async function saveTraderTransaction(event) {
    event.preventDefault();
    if (!activeTraderLedgerId) return;

    const type = document.getElementById('trader-tx-type').value;
    let amount = parseFloat(document.getElementById('trader-tx-amount').value);
    const date = document.getElementById('trader-tx-date').value;
    const userDescription = document.getElementById('trader-tx-desc').value;

    const lorryNo = document.getElementById('trader-tx-lorry').value.trim();
    const tons = parseFloat(document.getElementById('trader-tx-tons').value || 0);
    const ratePerTon = parseFloat(document.getElementById('trader-tx-rate').value || 0);
    const otherCharges = parseFloat(document.getElementById('trader-tx-charges').value || 0);

    if (type === 'BILL' && tons > 0 && ratePerTon > 0) {
        amount = (tons * ratePerTon) + otherCharges;
    }

    let description = userDescription;
    if (type === 'BILL' && isTradersBusiness()) {
        const parts = [];
        if (lorryNo) parts.push(`Lorry ${lorryNo}`);
        if (tons > 0) parts.push(`${tons} tons`);
        if (ratePerTon > 0) parts.push(`₹${ratePerTon}/ton`);
        if (otherCharges > 0) parts.push(`Other charges ₹${otherCharges}`);
        if (parts.length > 0) {
            description = `${userDescription} | ${parts.join(', ')}`;
        }
    }

    if (!amount || amount <= 0) {
        showAppNotice('Please enter a valid amount.', 'error');
        return;
    }
    
    const data = {
        farmerId: activeTraderLedgerId,
        type: type,
        amount: amount,
        date: date,
        description: description,
        lorryNo: lorryNo || null,
        tons: tons > 0 ? tons : null,
        ratePerTon: ratePerTon > 0 ? ratePerTon : null,
        otherCharges: otherCharges > 0 ? otherCharges : 0,
        shopType: currentShopType
    };
    
    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            showAppNotice('Ledger entry added successfully!', 'success');
            toggleModal('trader-tx-modal', false);
            
            // clear form
            document.getElementById('trader-tx-lorry').value = '';
            document.getElementById('trader-tx-tons').value = '';
            document.getElementById('trader-tx-rate').value = '';
            document.getElementById('trader-tx-charges').value = '0';
            document.getElementById('trader-tx-auto-amount').value = '';
            document.getElementById('trader-tx-amount').value = '';
            document.getElementById('trader-tx-desc').value = '';
            
            loadTraderLedger(activeTraderLedgerId);
        }
    } catch (err) {
        console.error("Error logging trader transaction", err);
    }
}

async function deleteTraderTransaction(id) {
    if (!await openConfirmModal("Are you sure you want to delete this ledger entry?")) return;
    try {
        const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadTraderLedger(activeTraderLedgerId);
        }
    } catch (err) {
        console.error("Error deleting transaction", err);
    }
}
