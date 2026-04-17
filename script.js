// =====================================================
// CONFIGURATION
// =====================================================
const DEFAULT_WISP = window.SITE_CONFIG?.defaultWisp ?? "wss://glseries.net/wisp/";
const WISP_SERVERS = [{ name: "GLSeries", url: "wss://glseries.net/wisp/" }];

if (!localStorage.getItem("proxServer")) {
    localStorage.setItem("proxServer", DEFAULT_WISP);
}

function getAllWispServers() {
    const customWisps = getStoredWisps();
    return [...WISP_SERVERS, ...customWisps];
}

// =====================================================
// SERVER HEALTH CHECKING
// =====================================================
async function pingWispServer(url, timeout = 2000) {
    return new Promise((resolve) => {
        const start = Date.now();
        try {
            const ws = new WebSocket(url);
            const timer = setTimeout(() => {
                try { ws.close(); } catch {}
                resolve({ url, success: false, latency: null });
            }, timeout);
            ws.onopen = () => { clearTimeout(timer); ws.close(); resolve({ url, success: true, latency: Date.now() - start }); };
            ws.onerror = () => { clearTimeout(timer); ws.close(); resolve({ url, success: false, latency: null }); };
        } catch { resolve({ url, success: false, latency: null }); }
    });
}

// =====================================================
// BROWSER STATE
// =====================================================
const BareMux = window.BareMux ?? { BareMuxConnection: class { setTransport() {} } };
let sharedScramjet = null;
let sharedConnection = null;
let sharedConnectionReady = false;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;

const getBasePath = () => {
    const basePath = location.pathname.replace(/[^/]*$/, '');
    return basePath.endsWith('/') ? basePath : basePath + '/';
};
const getStoredWisps = () => { try { return JSON.parse(localStorage.getItem('customWisps') ?? '[]'); } catch { return []; } };
const getActiveTab = () => tabs.find(t => t.id === activeTabId);
const notify = (type, title, message) => { if (typeof Notify !== 'undefined') Notify[type](title, message); };

// =====================================================
// PROXY INITIALIZATION
// =====================================================
async function getSharedScramjet() {
    if (sharedScramjet) return sharedScramjet;
    const { ScramjetController } = $scramjetLoadController();
    
    sharedScramjet = new ScramjetController({
        prefix: getBasePath() + "scramjet/",
        files: {
            wasm: "https://cdn.jsdelivr.net/gh/Destroyed12121/Staticsj@main/JS/scramjet.wasm.wasm",
            all: "https://cdn.jsdelivr.net/gh/Destroyed12121/Staticsj@main/JS/scramjet.all.js",
            sync: "https://cdn.jsdelivr.net/gh/Destroyed12121/Staticsj@main/JS/scramjet.sync.js"
        }
    });
    
    try {
        await sharedScramjet.init();
    } catch (err) {
        console.warn('Scramjet DB corrupted. Resetting...');
        try { ['scramjet-data', 'scrambase', 'ScramjetData'].forEach(db => indexedDB.deleteDatabase(db)); } catch (e) {}
        sharedScramjet = null;
        return getSharedScramjet(); 
    }
    return sharedScramjet;
}

async function getSharedConnection() {
    if (sharedConnectionReady) return sharedConnection;
    const wispUrl = localStorage.getItem("proxServer") ?? DEFAULT_WISP;
    sharedConnection = new BareMux.BareMuxConnection(getBasePath() + "bareworker.js");
    
    await sharedConnection.setTransport(
        "https://cdn.jsdelivr.net/npm/@mercuryworkshop/epoxy-transport@2.1.28/dist/index.mjs",
        [{ wisp: wispUrl }]
    );
    sharedConnectionReady = true;
    return sharedConnection;
}

// =====================================================
// UI BINDINGS
// =====================================================
async function initializeBrowser() {
    // UI elements are now in index.html, we just bind events to them
    document.getElementById('back-btn').onclick = () => getActiveTab()?.frame.back();
    document.getElementById('fwd-btn').onclick = () => getActiveTab()?.frame.forward();
    document.getElementById('reload-btn').onclick = () => getActiveTab()?.frame.reload();
    document.getElementById('home-btn-nav').onclick = () => window.location.href = '../index.html';
    document.getElementById('devtools-btn').onclick = toggleDevTools;
    document.getElementById('wisp-settings-btn').onclick = openSettings;
    
    document.getElementById('retry-error-btn').onclick = () => {
        document.getElementById("error").style.display = "none";
        getActiveTab()?.frame.reload();
    };

    const addrBar = document.getElementById('address-bar');
    addrBar.onkeyup = (e) => e.key === 'Enter' && handleSubmit();
    addrBar.onfocus = () => addrBar.select();

    window.addEventListener('message', (e) => { if (e.data?.type === 'navigate') handleSubmit(e.data.url); });

    createTab(true);
    if (window.location.hash) {
        handleSubmit(decodeURIComponent(window.location.hash.substring(1)));
        history.replaceState(null, null, location.pathname);
    }
}

// =====================================================
// TAB MANAGEMENT
// =====================================================
function createTab(makeActive = true) {
    const frame = sharedScramjet.createFrame();
    const tab = {
        id: nextTabId++,
        title: "New Tab",
        url: "NT.html",
        frame,
        loading: false,
        favicon: null,
        timeoutTracker: null
    };

    frame.frame.src = "NT.html";

    frame.addEventListener("urlchange", (e) => {
        tab.url = e.url;
        tab.loading = true;
        document.getElementById("error").style.display = "none";

        if (tab.id === activeTabId) showIframeLoading(true, tab.url);

        try {
            const urlObj = new URL(e.url);
            tab.title = urlObj.hostname;
            tab.favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch {
            tab.title = "Browsing";
            tab.favicon = null;
        }
        
        updateTabsUI();
        updateAddressBar();
        updateLoadingBar(tab, 10);

        clearTimeout(tab.timeoutTracker);
        tab.timeoutTracker = setTimeout(() => {
            if (tab.loading && tab.id === activeTabId && tab.url && !tab.url.includes('NT.html')) {
                showIframeLoading(false);
                document.getElementById("error").style.display = "flex";
                document.getElementById("error-message").textContent = "Connection Timed Out (30s). The Wisp server might be offline.";
                tab.loading = false;
                updateLoadingBar(tab, 100);
            }
        }, 30000);
    });

    frame.frame.addEventListener('load', () => {
        tab.loading = false;
        clearTimeout(tab.timeoutTracker);

        if (tab.id === activeTabId) {
            showIframeLoading(false);
            document.getElementById("error").style.display = "none";
        }

        try { const title = frame.frame.contentWindow.document.title; if (title) tab.title = title; } catch {}

        if (frame.frame.contentWindow.location.href.includes('NT.html')) {
            tab.title = "New Tab"; tab.url = ""; tab.favicon = null;
        }

        updateTabsUI();
        updateAddressBar();
        updateLoadingBar(tab, 100);
    });

    tabs.push(tab);
    document.getElementById("iframe-container").appendChild(frame.frame);
    if (makeActive) switchTab(tab.id);
    return tab;
}

function showIframeLoading(show, url = '') {
    const loader = document.getElementById("loading");
    if (!loader) return;
    loader.style.display = show ? "flex" : "none";
    getActiveTab()?.frame.frame.classList.toggle('loading', show);
    if (show) {
        document.getElementById("loading-title").textContent = "Connecting";
        document.getElementById("loading-url").textContent = url || "Loading content...";
    }
}

function switchTab(tabId) {
    activeTabId = tabId;
    const tab = getActiveTab();
    tabs.forEach(t => t.frame.frame.classList.toggle("hidden", t.id !== tabId));
    
    document.getElementById("error").style.display = "none";

    if (tab) showIframeLoading(tab.loading, tab.url);
    updateTabsUI();
    updateAddressBar();
}

function closeTab(tabId) {
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;
    const tab = tabs[idx];
    clearTimeout(tab.timeoutTracker);
    if (tab.frame?.frame) { tab.frame.frame.src = 'about:blank'; tab.frame.frame.remove(); }
    tabs.splice(idx, 1);
    if (activeTabId === tabId) {
        if (tabs.length > 0) switchTab(tabs[Math.max(0, idx - 1)].id);
        else window.location.reload();
    } else { updateTabsUI(); }
}

function updateTabsUI() {
    const container = document.getElementById("tabs-container");
    container.innerHTML = "";
    tabs.forEach(tab => {
        const el = document.createElement("div");
        el.className = `tab ${tab.id === activeTabId ? "active" : ""}`;
        const iconHtml = tab.loading ? `<div class="tab-spinner"></div>` : tab.favicon ? `<img src="${tab.favicon}" class="tab-favicon" onerror="this.style.display='none'">` : '';
        el.innerHTML = `${iconHtml}<span class="tab-title">${tab.title}</span><span class="tab-close">&times;</span>`;
        el.onclick = () => switchTab(tab.id);
        el.querySelector(".tab-close").onclick = (e) => { e.stopPropagation(); closeTab(tab.id); };
        container.appendChild(el);
    });
    const newBtn = document.createElement("button");
    newBtn.className = "new-tab"; newBtn.innerHTML = "<i class='fa-solid fa-plus'></i>";
    newBtn.onclick = () => createTab(true);
    container.appendChild(newBtn);
}

function updateAddressBar() {
    const bar = document.getElementById("address-bar");
    const tab = getActiveTab();
    if (bar && tab) bar.value = (tab.url && !tab.url.includes("NT.html")) ? tab.url : "";
}

async function handleSubmit(url) {
    const tab = getActiveTab();
    let input = url ?? document.getElementById("address-bar").value.trim();
    if (!input) return;

    if (!input.startsWith('http')) {
        input = input.includes('.') && !input.includes(' ') 
            ? `https://${input}` : `https://search.brave.com/search?q=${encodeURIComponent(input)}`;
    }
    
    document.getElementById("error").style.display = "none";
    tab.loading = true;
    showIframeLoading(true, input);
    updateLoadingBar(tab, 10);
    tab.frame.go(input);
}

function updateLoadingBar(tab, percent) {
    if (tab.id !== activeTabId) return;
    const bar = document.getElementById("loading-bar");
    bar.style.width = percent + "%";
    bar.style.opacity = percent === 100 ? "0" : "1";
    if (percent === 100) setTimeout(() => { bar.style.width = "0%"; }, 200);
}

// =====================================================
// SETTINGS UI
// =====================================================
function openSettings() {
    const modal = document.getElementById('wisp-settings-modal');
    modal.classList.remove('hidden');
    document.getElementById('close-wisp-modal').onclick = () => modal.classList.add('hidden');
    document.getElementById('save-custom-wisp').onclick = saveCustomWisp;
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
    renderServerList();
}

function renderServerList() {
    const list = document.getElementById('server-list');
    list.innerHTML = '';
    const currentUrl = localStorage.getItem('proxServer') ?? DEFAULT_WISP;
    const allWisps = [...WISP_SERVERS, ...getStoredWisps()];

    allWisps.forEach((server, index) => {
        const isActive = server.url === currentUrl;
        const isCustom = index >= WISP_SERVERS.length;
        const item = document.createElement('div');
        item.className = `wisp-option ${isActive ? 'active' : ''}`;
        const deleteBtn = isCustom ? `<button class="delete-wisp-btn" onclick="event.stopPropagation(); deleteCustomWisp('${server.url}')"><i class="fa-solid fa-trash"></i></button>` : '';
        item.innerHTML = `
            <div class="wisp-option-header">
                <div class="wisp-option-name">${server.name} ${isActive ? '<i class="fa-solid fa-check" style="margin-left:8px; font-size: 0.7em; color: var(--accent);"></i>' : ''}</div>
                <div class="server-status"><span class="ping-text">...</span><div class="status-indicator"></div>${deleteBtn}</div>
            </div>
            <div class="wisp-option-url">${server.url}</div>
        `;
        item.onclick = () => setWisp(server.url);
        list.appendChild(item);
        checkServerHealth(server.url, item);
    });
}

function saveCustomWisp() {
    const input = document.getElementById('custom-wisp-input');
    const url = input.value.trim();
    if (!url) return;
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) return notify('error', 'Invalid URL', 'URL must start with wss:// or ws://');
    
    const customWisps = getStoredWisps();
    if (customWisps.some(w => w.url === url) || WISP_SERVERS.some(w => w.url === url)) return notify('warning', 'Already Exists', 'Server already exists.');
    
    customWisps.push({ name: `Custom ${customWisps.length + 1}`, url });
    localStorage.setItem('customWisps', JSON.stringify(customWisps));
    setWisp(url);
    input.value = '';
}

window.deleteCustomWisp = function (urlToDelete) {
    if (!confirm("Remove this server?")) return;
    localStorage.setItem('customWisps', JSON.stringify(getStoredWisps().filter(w => w.url !== urlToDelete)));
    if (localStorage.getItem('proxServer') === urlToDelete) setWisp(DEFAULT_WISP); else renderServerList();
};

async function checkServerHealth(url, element) {
    const dot = element.querySelector('.status-indicator');
    const text = element.querySelector('.ping-text');
    const res = await pingWispServer(url, 2000);
    if (res.success) {
        dot.classList.add('status-success');
        text.textContent = `${res.latency}ms`;
    } else {
        dot.classList.add('status-error');
        text.textContent = "Offline";
    }
}

function setWisp(url) {
    localStorage.setItem('proxServer', url);
    navigator.serviceWorker.controller?.postMessage({ type: 'config', wispurl: url });
    setTimeout(() => location.reload(), 600);
}

function toggleDevTools() {
    const win = getActiveTab()?.frame.frame.contentWindow;
    if (!win) return;
    if (win.eruda) { win.eruda.show(); return; }
    const script = win.document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/eruda";
    script.onload = () => { win.eruda.init(); win.eruda.show(); };
    win.document.body.appendChild(script);
}

// =====================================================
// MASTER BOOT SEQUENCE
// =====================================================
document.addEventListener('DOMContentLoaded', async function () {
    try {
        await getSharedScramjet();
        await getSharedConnection();

        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.register(getBasePath() + 'sw.js', { scope: getBasePath() });
            await navigator.serviceWorker.ready;
            
            const swConfig = {
                type: "config",
                wispurl: localStorage.getItem("proxServer") ?? DEFAULT_WISP,
                servers: getAllWispServers(),
                autoswitch: false
            };

            const sendConfig = () => {
                const sw = reg.active || navigator.serviceWorker.controller;
                if (sw) sw.postMessage(swConfig);
            };
            sendConfig();
            setTimeout(sendConfig, 1000); 
        }
        await initializeBrowser();
    } catch (err) {
        console.error("Initialization error:", err);
    }
});
