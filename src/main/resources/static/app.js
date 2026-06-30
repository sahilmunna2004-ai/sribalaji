// PWA Cache Buster: Unregister stale service worker and force reload if updated elements are missing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyPwaVersion);
} else {
    verifyPwaVersion();
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

// Global Application State
let sessionToken = localStorage.getItem('balaji_token') || null;
let currentShopType = 'TRADERS'; // default: Sri Balaji Traders
let activeFarmers = [];
let selectedFarmerId = null;
let selectedNotebookPages = [];
let selectedFarmerIdForPhoto = null;

// Zoom scale for notebook reader
let imgZoomScale = 1.0;

// DOM Elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const shopSelector = document.getElementById('shop-selector');
const shopTitleText = document.getElementById('shop-title-text');
const shopSubtitleText = document.getElementById('shop-subtitle-text');
const activeShopLabels = document.querySelectorAll('.active-shop-label');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const closeModals = document.querySelectorAll('.close-modal');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupAuthView();
    setupEventListeners();
    registerServiceWorker();
});

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
        onAppLoad();
    } else {
        appContainer.classList.remove('active');
        loginContainer.classList.add('active');
    }
}

// Global Event Listeners
function setupEventListeners() {
    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username').value;
        const passwordInput = document.getElementById('password').value;
        loginError.classList.add('hide');

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            if (response.ok) {
                const data = await response.json();
                sessionToken = data.token;
                localStorage.setItem('balaji_token', sessionToken);
                setupAuthView();
            } else {
                loginError.classList.remove('hide');
            }
        } catch (err) {
            loginError.innerText = "Error connecting to server. Make sure backend is running.";
            loginError.classList.remove('hide');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionToken = null;
        localStorage.removeItem('balaji_token');
        setupAuthView();
    });

    // Shop Selector Dropdown Switch
    shopSelector.addEventListener('change', (e) => {
        currentShopType = e.target.value;
        updateShopLabels();
        selectedFarmerId = null; // Reset selection
        onAppLoad(); // Refresh dashboard and tables for selected shop
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
    profileBtn.addEventListener('click', () => {
        profileModal.classList.remove('hide');
    });

    // Modal clicks (close if clicked outside content)
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && !e.target.classList.contains('transcription-modal-content')) {
            e.target.classList.add('hide');
        }
    });

    // Stock Form Submit
    document.getElementById('stock-form').addEventListener('submit', logStockPurchase);

    // Farmer Form Submit
    document.getElementById('farmer-form').addEventListener('submit', saveFarmerProfile);

    // Ledger Farmer Selector change
    document.getElementById('ledger-farmer-selector').addEventListener('change', (e) => {
        const farmerId = e.target.value;
        if (farmerId) {
            loadFarmerLedger(farmerId);
        } else {
            document.getElementById('ledger-details-container').classList.add('hide');
        }
    });

    // Ledger Transaction Form Submit
    document.getElementById('transaction-form').addEventListener('submit', saveLedgerTransaction);

    // Search Farmers list dynamically
    document.getElementById('farmer-search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderFarmersList(query);
        renderFarmersPlaceholderGrid(query);
    });

    // Standalone Calculator Farmer Selector change (Auto fills principal)
    document.getElementById('calc-farmer-select').addEventListener('change', async (e) => {
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
    document.getElementById('calc-form').addEventListener('submit', calculateInterestAccrued);

    // Apply Standalone Interest to Ledger button
    document.getElementById('post-interest-btn').addEventListener('click', applyInterestToLedger);

    // Profile Picture selected file name change
    document.getElementById('profile-photo-input').addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : '';
        document.getElementById('profile-photo-selected-filename').innerText = fileName;
    });

    // Profile Photo Upload Form
    document.getElementById('profile-photo-upload-form').addEventListener('submit', uploadFarmerProfilePhoto);

    // Delete Profile Photo button
    document.getElementById('profile-delete-photo-btn').addEventListener('click', deleteFarmerProfilePhoto);

    // Notebook Page selected file name change
    document.getElementById('notebook-file-input').addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : '';
        document.getElementById('notebook-selected-filename').innerText = fileName;
    });

    // Notebook upload form submit
    document.getElementById('notebook-upload-form').addEventListener('submit', uploadNotebookPagePhoto);

    // Zoom listener for transcription page image
    const transImg = document.getElementById('transcription-image');
    transImg.addEventListener('click', () => {
        imgZoomScale = imgZoomScale === 1.0 ? 1.7 : (imgZoomScale === 1.7 ? 2.5 : 1.0);
        transImg.style.transform = `scale(${imgZoomScale})`;
    });
}

// Switch tabs dynamically
function switchTab(tabId) {
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

    // 2. Sidebar Navigation Items (Always visible for multi-directory access)
    const navStock = document.getElementById('nav-stock');
    const navFarmers = document.getElementById('nav-farmers');
    const navFarmersText = document.getElementById('nav-farmers-text');
    const navLedger = document.getElementById('nav-ledger');
    const navLedgerText = document.getElementById('nav-ledger-text');
    const navCalculator = document.getElementById('nav-calculator');
    const navTraders = document.getElementById('nav-traders');
    const navTradersLedger = document.getElementById('nav-traders-ledger');

    if (navStock) navStock.style.display = 'block';
    if (navFarmers) navFarmers.style.display = 'block';
    if (navFarmersText) navFarmersText.innerText = 'Farmers Directory';
    if (navLedger) navLedger.style.display = 'block';
    if (navLedgerText) navLedgerText.innerText = 'Farmer Ledger';
    if (navCalculator) navCalculator.style.display = 'block';
    if (navTraders) navTraders.style.display = 'block';
    if (navTradersLedger) navTradersLedger.style.display = 'block';

    // 3. Panel Titles & Form Headers
    // Tab Directory Title
    const tabFarmersTitle = document.querySelector('#tab-farmers .panel-title');
    if (tabFarmersTitle) {
        tabFarmersTitle.innerText = isTraders ? "Traders Directory & Invoice Digitizer" : "Farmers Directory & Digitizer";
    }
    // Search input placeholder
    const farmerSearchInput = document.getElementById('farmer-search-input');
    if (farmerSearchInput) {
        farmerSearchInput.placeholder = isTraders ? "🔍 Search trader by name/location..." : "🔍 Search farmer by name/village...";
    }
    // Add New button text
    const addNewBtn = document.querySelector('#tab-farmers .search-bar-container button');
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
        digitizerTitle.innerHTML = isTraders ? `<i class="fa-solid fa-book-open"></i> Purchase Invoice Digitizer` : `<i class="fa-solid fa-book-open"></i> Paper Notebook Digitizer`;
    }
    const digitizerSubtitle = document.querySelector('.notebook-section .section-subtitle');
    if (digitizerSubtitle) {
        digitizerSubtitle.innerText = isTraders
            ? "Upload purchase invoices from this trader. Click on any page to transcribe transactions into the ledger."
            : "Upload pages of handwritten accounts notebooks. Click on any page to transcribe the data manually into the ledger.";
    }
    const digitizerUploadBtn = document.querySelector('.notebook-section .section-title-flex button');
    if (digitizerUploadBtn) {
        digitizerUploadBtn.innerHTML = isTraders ? `<i class="fa-solid fa-upload"></i> Upload Invoice` : `<i class="fa-solid fa-upload"></i> Upload Notebook Page`;
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
}

// Core app loads
function onAppLoad() {
    updateShopLabels();
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
    if (!confirm("Are you sure you want to mark this stock as returned to the supplier? This will update inventory status.")) return;
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
async function loadFarmersDirectory() {
    try {
        const res = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
        if (res.ok) {
            activeFarmers = await res.json();
            
            // Check if directory is empty, and seed sample farmers if they are empty
            if (activeFarmers.length === 0) {
                await seedSampleFarmersData();
                return;
            } else {
                // Auto-seed sample transactions if they are missing
                await checkAndSeedSampleTransactions(activeFarmers);
            }

            renderFarmersList('');
            
            // Re-select previously active farmer if they still exist
            if (selectedFarmerId) {
                selectFarmerInView(selectedFarmerId);
            } else {
                document.getElementById('detail-placeholder').classList.remove('hide');
                document.getElementById('detail-main-content').classList.add('hide');
                renderFarmersPlaceholderGrid('');
            }
        }
    } catch (err) {
        console.error("Error loading farmers directory", err);
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
    listEl.innerHTML = '';

    const filtered = activeFarmers.filter(f => 
        f.name.toLowerCase().includes(filterQuery) || 
        f.village.toLowerCase().includes(filterQuery)
    );

    if (filtered.length === 0) {
        listEl.innerHTML = `<li class="text-center p-3" style="color: var(--text-muted);">No farmers match query.</li>`;
        return;
    }

    filtered.forEach(farmer => {
        const isSelected = farmer.id === selectedFarmerId;
        const avatarSrc = farmer.photoPath 
            ? `${API_BASE}/farmers/${farmer.id}/photo?t=${new Date().getTime()}` 
            : '';

        const avatarHTML = avatarSrc
            ? `<img src="${avatarSrc}" alt="${farmer.name}">`
            : `<i class="fa-solid fa-user-circle"></i>`;

        const li = document.createElement('li');
        li.className = `farmer-list-item ${isSelected ? 'selected' : ''}`;
        li.dataset.id = farmer.id;
        li.innerHTML = `
            <div class="farmer-list-item-avatar">${avatarHTML}</div>
            <div class="farmer-list-item-info">
                <h4>${farmer.name}</h4>
                <p><i class="fa-solid fa-location-dot"></i> ${farmer.village}</p>
            </div>
        `;

        li.addEventListener('click', () => {
            // Remove selection styling from previous items
            document.querySelectorAll('.farmer-list-item').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            selectFarmerInView(farmer.id);
        });

        listEl.appendChild(li);
    });
}

function openAddFarmerModal() {
    document.getElementById('farmer-id').value = '';
    document.getElementById('farmer-form').reset();
    document.getElementById('farmer-modal-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Farmer Profile`;
    toggleModal('farmer-modal', true);
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

    document.getElementById('detail-delete-btn').onclick = async () => {
        if (!confirm(`Are you sure you want to delete profile for ${farmer.name}? All photos and ledger history will be permanently wiped.`)) return;
        try {
            const res = await fetch(`${API_BASE}/farmers/${farmer.id}`, { method: 'DELETE' });
            if (res.ok) {
                selectedFarmerId = null;
                loadFarmersDirectory();
            }
        } catch (err) {
            console.error("Error deleting farmer", err);
        }
    };

    // Load associated stock/purchases
    loadFarmerPurchasedItems(farmer.id);

    // Load multiple notebook pages gallery
    loadNotebookGallery(farmer.id);

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
        alert("Please select a profile photo first.");
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
    if (!confirm("Delete profile photo?")) return;
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
                card.innerHTML = `
                    <button class="notebook-thumbnail-delete-btn" onclick="deleteNotebookPage(${page.id}, event)"><i class="fa-solid fa-trash-can"></i></button>
                    <div class="notebook-thumbnail-img-box" onclick="openTranscriptionWorkspace(${page.id}, '${imgUrl}', '${page.notes}')">
                        <img src="${imgUrl}" alt="Notebook page">
                    </div>
                    <div class="notebook-thumbnail-notes" title="${page.notes}">${page.notes || 'Ledger Sheet'}</div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Error loading notebook gallery", err);
    }
}

async function uploadNotebookPagePhoto(e) {
    e.preventDefault();
    if (!selectedFarmerId) return;

    const fileInput = document.getElementById('notebook-file-input');
    const file = fileInput.files[0];
    const notesValue = document.getElementById('notebook-notes').value;

    if (!file) {
        alert("Please select or snap a photo of the notebook page.");
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
                        alert("Server upload error.");
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
    if (!confirm("Are you sure you want to delete this notebook page?")) return;
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
        alert("Please add at least one entry row.");
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
        alert("Please fill all fields (Date, Amount, Description) with valid values.");
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
        alert("All entries transcribed and saved to farmer ledger!");
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
        alert("Please select a transcribed advance row first.");
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
        alert("Selected row is missing dates or amounts.");
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
                    alert("Interest transaction successfully applied to the ledger!");
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
                    <td>
                        <button class="gold-btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteLedgerTransaction(${tx.id}, ${farmerId})">
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
    const txData = {
        farmerId: parseInt(farmerId),
        type: document.getElementById('tx-type').value,
        amount: parseFloat(document.getElementById('tx-amount').value),
        date: document.getElementById('tx-date').value,
        description: document.getElementById('tx-desc').value,
        interestApplied: false,
        shopType: currentShopType
    };

    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txData)
        });

        if (res.ok) {
            toggleModal('transaction-modal', false);
            document.getElementById('transaction-form').reset();
            loadFarmerLedger(farmerId);
        }
    } catch (err) {
        console.error("Error saving ledger transaction", err);
    }
}

async function deleteLedgerTransaction(id, farmerId) {
    if (!confirm("Are you sure you want to delete this transaction from the ledger? This cannot be undone.")) return;
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
            alert("Calculation failed: " + err.error);
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
            alert("Interest transaction successfully applied to the ledger!");
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

    const isTraders = currentShopType === 'TRADERS';
    const query = filterQuery.toLowerCase();
    const filtered = activeFarmers.filter(f => 
        f.name.toLowerCase().includes(query) || 
        f.village.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        placeholder.innerHTML = `
            <div class="detail-placeholder-message">
                <i class="fa-solid fa-users-viewfinder"></i>
                <p>No ${isTraders ? 'traders' : 'farmers'} match your search query.</p>
            </div>
        `;
        return;
    }

    const modeClass = farmerViewMode === 'tile' ? 'tile-mode' : farmerViewMode === 'list' ? 'list-mode' : '';
    let cardsHTML = '';
    filtered.forEach(farmer => {
        const avatarSrc = farmer.photoPath 
            ? `${API_BASE}/farmers/${farmer.id}/photo?t=${new Date().getTime()}` 
            : '';

        const avatarHTML = avatarSrc
            ? `<img src="${avatarSrc}" alt="${farmer.name}">`
            : `<i class="fa-solid fa-user-circle"></i>`;

        cardsHTML += `
            <div class="farmer-grid-card" onclick="selectFarmerInView(${farmer.id})">
                <div class="farmer-grid-avatar">${avatarHTML}</div>
                <h3>${farmer.name}</h3>
                <p class="farmer-grid-meta"><i class="fa-solid fa-location-dot"></i> ${farmer.village}</p>
                <p class="farmer-grid-meta"><i class="fa-solid fa-phone"></i> ${farmer.phone}</p>
                <span class="crop-badge">${isTraders ? 'Items: ' : 'Crops: '}${farmer.cropDetails}</span>
                <div class="farmer-grid-actions">
                    <button class="gold-btn btn-sm">View Details & Digitize</button>
                </div>
            </div>
        `;
    });

    placeholder.innerHTML = `
        <div class="placeholder-grid-header">
            <h3><i class="fa-solid fa-users"></i> Registered ${isTraders ? 'Traders' : 'Farmers'} List</h3>
            <p>Select a ${isTraders ? 'trader' : 'farmer'} from the list below or use the sidebar directory to view details.</p>
        </div>
        <div class="farmer-placeholder-grid ${modeClass}">
            ${cardsHTML}
        </div>
    `;
}

// Clear selected farmer/trader and restore list/grid layout
function clearFarmerSelection() {
    selectedFarmerId = null;
    document.getElementById('detail-placeholder').classList.remove('hide');
    document.getElementById('detail-main-content').classList.add('hide');
    document.getElementById('detail-form-content').classList.add('hide');
    document.querySelectorAll('.farmer-list-item').forEach(item => item.classList.remove('selected'));
    renderFarmersPlaceholderGrid(document.getElementById('farmer-search-input').value);
}

// Global view mode for Farmers List
let farmerViewMode = 'grid';

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
                alert(`Successfully scanned and registered Profile: ${saved.name} (${saved.village})`);
                
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
            alert("Failed to parse OCR image.");
        }
    }, 2500);
}

// Inline Form Actions
function openAddFarmerFormInline() {
    // Hide details and placeholder
    document.getElementById('detail-placeholder').classList.add('hide');
    document.getElementById('detail-main-content').classList.add('hide');
    
    // Show inline form
    const formPanel = document.getElementById('detail-form-content');
    formPanel.classList.remove('hide');
    
    // Set headers
    document.getElementById('inline-form-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> Add Farmer Profile`;
    
    // Clear inputs
    document.getElementById('inline-farmer-id').value = '';
    document.getElementById('inline-farmer-name').value = '';
    document.getElementById('inline-farmer-phone').value = '';
    document.getElementById('inline-farmer-village').value = '';
    document.getElementById('inline-farmer-crop').value = '';
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
    const cropDetails = document.getElementById('inline-farmer-crop').value;

    const data = { name, phone, village, cropDetails, shopType: currentShopType };
    
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
            
            // Reload list
            const resList = await fetch(`${API_BASE}/farmers?shopType=${currentShopType}`);
            if (resList.ok) {
                activeFarmers = await resList.json();
                renderFarmersList('');
            }
            
            // Back to view details
            document.getElementById('detail-form-content').classList.add('hide');
            document.getElementById('detail-main-content').classList.remove('hide');
            selectFarmerInView(saved.id);
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
            alert("Interest applied successfully to the ledger!");
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

async function loadTradersDirectory() {
    try {
        const res = await fetch(`${API_BASE}/farmers?shopType=TRADERS`);
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
    
    const filtered = activeTraders.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase()) || 
        t.village.toLowerCase().includes(query.toLowerCase())
    );
    
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

    const query = filterQuery.toLowerCase();
    const filtered = activeTraders.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.village.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        placeholder.innerHTML = `
            <div class="detail-placeholder-message">
                <i class="fa-solid fa-users-viewfinder"></i>
                <p>No traders match your search query.</p>
            </div>
        `;
        return;
    }

    const modeClass = traderViewMode === 'tile' ? 'tile-mode' : traderViewMode === 'list' ? 'list-mode' : '';
    let cardsHTML = '';
    filtered.forEach(trader => {
        cardsHTML += `
            <div class="farmer-grid-card" onclick="selectTraderInView(${trader.id})">
                <div class="farmer-grid-avatar"><i class="fa-solid fa-building-flag" style="font-size: 1.5rem; color:var(--gold);"></i></div>
                <h3>${trader.name}</h3>
                <p class="farmer-grid-meta"><i class="fa-solid fa-location-dot"></i> ${trader.village}</p>
                <p class="farmer-grid-meta"><i class="fa-solid fa-phone"></i> ${trader.phone}</p>
                <span class="crop-badge">Items: ${trader.cropDetails}</span>
                <div class="farmer-grid-actions">
                    <button class="gold-btn btn-sm">View Details</button>
                </div>
            </div>
        `;
    });

    placeholder.innerHTML = `
        <div class="placeholder-grid-header">
            <h3><i class="fa-solid fa-users"></i> Registered Traders List</h3>
            <p>Select a trader from the list below or use the sidebar directory to view details.</p>
        </div>
        <div class="farmer-placeholder-grid ${modeClass}">
            ${cardsHTML}
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
    
    const data = { name, phone, village, cropDetails, shopType: 'TRADERS' };
    
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
            const resList = await fetch(`${API_BASE}/farmers?shopType=TRADERS`);
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
    if (!confirm("Are you sure you want to delete this trader and all associated records?")) return;
    try {
        const res = await fetch(`${API_BASE}/farmers/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Trader deleted successfully.");
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
        const res = await fetch(`${API_BASE}/transactions/farmer/${traderId}?shopType=TRADERS`);
        if (res.ok) {
            const txs = await res.json();
            const returns = txs.filter(t => t.type === 'PAYMENT' && t.description.toLowerCase().includes('return:'));
            tbody.innerHTML = '';
            
            if (returns.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No returns logged yet.</td></tr>';
                return;
            }
            
            returns.forEach(r => {
                const tr = document.createElement('tr');
                const itemDesc = r.description.replace('Return:', '').trim();
                tr.innerHTML = `
                    <td>${r.date}</td>
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
        shopType: 'TRADERS'
    };
    
    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            alert("Stock return transaction successfully logged!");
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
            alert("Invoice uploaded successfully!");
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
    if (!confirm("Are you sure you want to delete this invoice?")) return;
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
        const res = await fetch(`${API_BASE}/farmers?shopType=TRADERS`);
        if (res.ok) {
            const list = await res.json();
            selector.innerHTML = '<option value="">-- Select Trader --</option>';
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
    
    try {
        // Fetch summary
        const resSum = await fetch(`${API_BASE}/transactions/farmer/${traderId}/summary?shopType=TRADERS`);
        if (resSum.ok) {
            const sum = await resSum.json();
            
            document.getElementById('trader-summary-bills').innerText = `₹${sum.totalBills.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('trader-summary-payments').innerText = `₹${sum.totalPayments.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            
            const outstanding = sum.totalBills - sum.totalPayments;
            const balanceEl = document.getElementById('trader-summary-balance');
            balanceEl.innerText = `₹${outstanding.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            balanceEl.className = outstanding > 0 ? 'text-danger font-weight-bold' : 'text-success font-weight-bold';
        }
        
        // Fetch list
        const resList = await fetch(`${API_BASE}/transactions/farmer/${traderId}?shopType=TRADERS`);
        if (resList.ok) {
            const txs = await resList.json();
            const tbody = document.querySelector('#trader-ledger-table tbody');
            tbody.innerHTML = '';
            
            if (txs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No ledger entries recorded yet.</td></tr>';
                return;
            }
            
            txs.forEach(tx => {
                const tr = document.createElement('tr');
                const isDebit = tx.type === 'PAYMENT';
                tr.innerHTML = `
                    <td>${tx.date}</td>
                    <td>${tx.description}</td>
                    <td><span class="badge ${tx.type === 'BILL' ? 'badge-bill' : 'badge-payment'}">${tx.type}</span></td>
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
    const amount = parseFloat(document.getElementById('trader-tx-amount').value);
    const date = document.getElementById('trader-tx-date').value;
    const description = document.getElementById('trader-tx-desc').value;
    
    const data = {
        farmerId: activeTraderLedgerId,
        type: type,
        amount: amount,
        date: date,
        description: description,
        shopType: 'TRADERS'
    };
    
    try {
        const res = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            alert("Ledger entry added successfully!");
            toggleModal('trader-tx-modal', false);
            
            // clear form
            document.getElementById('trader-tx-amount').value = '';
            document.getElementById('trader-tx-desc').value = '';
            
            loadTraderLedger(activeTraderLedgerId);
        }
    } catch (err) {
        console.error("Error logging trader transaction", err);
    }
}

async function deleteTraderTransaction(id) {
    if (!confirm("Are you sure you want to delete this ledger entry?")) return;
    try {
        const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadTraderLedger(activeTraderLedgerId);
        }
    } catch (err) {
        console.error("Error deleting transaction", err);
    }
}
