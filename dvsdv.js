// This script overwrites the entire HTML document with the Sea Bean UI
const seaBeanUI = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sea Bean UI</title>
    <script src="https://unpkg.com/lucide@latest"><\/script>
    <style>
        :root {
            /* Core Theme - Dark Gray Blue (Slate) */
            --bg-page: #000000;
            --bg-nav: #0f172a; 
            --border-nav: #1e293b; 
            
            /* Modal / Dropdowns */
            --bg-modal: #0f172a; 
            --bg-modal-item: #1e293b; 
            --bg-card: rgba(30, 41, 59, 0.4);
            --border-modal: #334155; 
            
            /* Text & Icons */
            --icon-color: #94a3b8; 
            --icon-hover: #f8fafc;
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            
            /* Accents */
            --color-gold: #fbbf24;
            --color-accent: #0ea5e9; 
            --transition-speed: 0.2s;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--bg-page);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: var(--text-main);
            overflow: hidden; 
        }

        /* ------------------------------------- */
        /* IFRAME WRAPPER & LOADER               */
        /* ------------------------------------- */
        #iframe-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
        }

        #iframe-loader {
            position: absolute;
            inset: 0;
            background: rgba(2, 6, 23, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 1; 
            visibility: visible;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        }

        #iframe-loader.hidden {
            opacity: 0;
            visibility: hidden;
        }

        .pulse-loader {
            width: 50px;
            height: 50px;
            position: relative;
        }

        .pulse-loader::before, .pulse-loader::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid var(--color-accent);
            animation: pulse-ring 2s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
        }
        
        .pulse-loader::after { animation-delay: -1s; }

        @keyframes pulse-ring {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
        }

        #main-frame {
            width: 100%;
            height: 100%;
            border: none;
            background: var(--bg-page);
        }

        /* ------------------------------------- */
        /* BOTTOM NAVIGATION BAR & AUTO-HIDE     */
        /* ------------------------------------- */
        .dock-trigger-zone {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 35px;
            z-index: 499; 
            display: none; 
        }

        body.autohide-dock .dock-trigger-zone {
            display: block; 
        }

        .bottom-nav-container {
            position: fixed;
            bottom: 30px;
            width: 100%;
            display: flex;
            justify-content: center;
            z-index: 500;
            padding: 0 20px;
            opacity: 0;
            transform: translateY(100px);
            transition: opacity 0.6s ease, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        body.app-ready .bottom-nav-container {
            opacity: 1;
            transform: translateY(0);
        }

        body.app-ready.autohide-dock .bottom-nav-container {
            transform: translateY(150px);
            opacity: 0.8;
            transition: opacity 0.4s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        body.app-ready.autohide-dock .dock-trigger-zone:hover ~ .bottom-nav-container,
        body.app-ready.autohide-dock .bottom-nav-container:hover {
            transform: translateY(0);
            opacity: 1;
        }

        .bottom-nav {
            display: flex;
            align-items: center;
            background-color: rgba(15, 23, 42, 0.85); 
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 10px 16px;
            border-radius: 20px; 
            gap: 4px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            max-width: 100%;
            overflow-x: auto;
            scrollbar-width: none;
            border: 1px solid var(--border-nav);
        }
        
        .bottom-nav::-webkit-scrollbar { display: none; }

        .nav-item {
            background: transparent;
            border: none;
            color: var(--icon-color);
            cursor: pointer;
            transition: all var(--transition-speed) ease;
            display: flex;
            width: 44px;
            height: 44px;
            border-radius: 12px; 
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            padding: 0;
        }

        .nav-item svg { width: 20px; height: 20px; stroke-width: 2px; }
        .nav-item:hover { color: var(--icon-hover); background: rgba(255, 255, 255, 0.08); }
        .nav-item.active { color: var(--icon-hover); background: rgba(255, 255, 255, 0.12); }
        .nav-item.gold-crown { color: var(--color-gold); }
        .nav-item.gold-crown:hover { background: rgba(251, 191, 36, 0.15); }
        .nav-item.discord svg { fill: currentColor; stroke: none; }

        .nav-divider {
            width: 1px;
            height: 20px;
            background: var(--border-nav);
            flex-shrink: 0;
            margin: 0 8px;
        }

        /* View Count Style */
        .view-count {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--text-muted);
            font-size: 0.8rem;
            font-weight: 600;
            padding: 0 8px 0 4px;
            user-select: none;
        }

        .view-count i {
            color: var(--color-accent);
        }

        /* ------------------------------------- */
        /* MODALS                                */
        /* ------------------------------------- */
        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6); 
            backdrop-filter: blur(10px); 
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 1;
            visibility: visible;
            transition: opacity 0.4s ease, visibility 0.4s ease;
        }

        .overlay.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .modal {
            background-color: var(--bg-modal);
            border-radius: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 85vh;
            overflow-y: auto;
            padding: 28px;
            border: 1px solid var(--border-modal);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
            color: #fff;
            transform: scale(1) translateY(0);
            opacity: 1;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
        }

        .modal::-webkit-scrollbar { width: 6px; }
        .modal::-webkit-scrollbar-thumb { background-color: var(--border-modal); border-radius: 4px; }

        .overlay.hidden .modal {
            transform: scale(0.96) translateY(20px);
            opacity: 0;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .modal-title-group { display: flex; align-items: center; gap: 12px; }
        .modal-title-group h3 { margin: 0; font-size: 1.3rem; font-weight: 600; }
        
        .version-badge {
            background-color: var(--bg-modal-item);
            color: #fff;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid var(--border-modal);
        }

        .close-btn {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: var(--icon-color);
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all var(--transition-speed);
        }

        .close-btn:hover { color: #fff; background: rgba(239, 68, 68, 0.2); }

        /* Settings UI */
        .settings-section { margin-bottom: 24px; }
        .settings-category { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .settings-card { background-color: var(--bg-card); border: 1px solid var(--border-modal); border-radius: 12px; padding: 0 16px; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; gap: 16px; border-bottom: 1px solid var(--border-modal); }
        .setting-row:last-child { border-bottom: none; }
        .setting-info { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
        .setting-title { font-size: 0.95rem; font-weight: 500; color: #fff; }
        .setting-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;}

        .custom-select { background-color: var(--bg-modal-item); color: #f1f5f9; border: 1px solid var(--border-modal); padding: 8px 12px; border-radius: 8px; font-family: inherit; font-size: 0.85rem; outline: none; cursor: pointer; transition: border-color var(--transition-speed); width: 150px; }
        .custom-select:focus { border-color: var(--color-accent); }

        .toggle-switch { position: relative; display: inline-block; width: 46px; height: 24px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-modal-item); transition: .4s; border-radius: 24px; border: 1px solid var(--border-modal); }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: var(--icon-color); transition: .4s; border-radius: 50%; }
        .toggle-switch input:checked + .slider { background-color: var(--color-accent); border-color: var(--color-accent); }
        .toggle-switch input:checked + .slider:before { transform: translateX(22px); background-color: #fff; }

        .btn-action { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all var(--transition-speed); flex-shrink: 0; }
        .btn-action:hover { background: rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.5); color: #fff;}

        .changelog-list { display: flex; flex-direction: column; gap: 12px; margin-top: 10px;}
        .changelog-item { background-color: var(--bg-card); padding: 16px; border-radius: 12px; font-size: 0.85rem; color: #d4d4d8; line-height: 1.5; border: 1px solid var(--border-modal); border-left: 3px solid var(--color-accent); }
        .modal-date { margin-top: 16px; text-align: right; font-size: 0.75rem; color: var(--text-muted); }
        .form-container { width: 100%; border-radius: 12px; overflow: hidden; background: var(--bg-page); border: 1px solid var(--border-modal); }
    </style>
</head>
<body>

    <div id="iframe-wrapper">
        <div id="iframe-loader">
            <div class="pulse-loader"></div>
        </div>
        <iframe id="main-frame" title="Main Content Area" src="https://en.wikipedia.org/wiki/Main_Page"></iframe>
    </div>

    <div id="news-overlay" class="overlay hidden" role="dialog">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title-group">
                    <i data-lucide="megaphone"></i>
                    <h3>What's New</h3>
                    <span class="version-badge">v2.0.0</span>
                </div>
                <button class="close-btn close-modal-btn" aria-label="Close modal">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="changelog-list">
                <div class="changelog-item"><strong>Suggestions Added!</strong> You can now suggest features or report bugs directly from the new Suggestions menu.</div>
                <div class="changelog-item"><strong>Live Disguise Updating:</strong> Selecting a cloak in settings now updates the tab title and icon instantly!</div>
                <div class="changelog-item"><strong>Settings Save States:</strong> Your settings (autohide, esc key bind, and cloak preset) now save automatically using LocalStorage.</div>
            </div>
            <div class="modal-date">Apr 24, 2026</div>
        </div>
    </div>

    <div id="settings-overlay" class="overlay hidden" role="dialog">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title-group">
                    <i data-lucide="settings"></i>
                    <h3>Settings</h3>
                </div>
                <button class="close-btn close-modal-btn" aria-label="Close modal">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="settings-section">
                <div class="settings-category"><i data-lucide="monitor" style="width:16px; height:16px;"></i> Appearance</div>
                <div class="settings-card">
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-title">Auto-hide Dock</div>
                            <div class="setting-desc">Hover bottom of screen to reveal dock.</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="autohide-toggle">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-category"><i data-lucide="shield" style="width:16px; height:16px;"></i> Privacy & Stealth</div>
                <div class="settings-card">
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-title">Cloak Disguise</div>
                            <div class="setting-desc">Changes the tab's icon and title instantly.</div>
                        </div>
                        <select id="cloak-preset" class="custom-select"></select>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-title">Escape Key Panic</div>
                            <div class="setting-desc">Press "Esc" to jump to an about:blank iframe.</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="cloak-toggle">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-title">Emergency Cloak</div>
                            <div class="setting-desc">Trigger the stealth mode instantly right now.</div>
                        </div>
                        <button class="btn-action" id="manual-cloak-btn">Cloak</button>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div id="suggestions-overlay" class="overlay hidden" role="dialog">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title-group">
                    <i data-lucide="lightbulb"></i>
                    <h3>Suggestions & Feedback</h3>
                </div>
                <button class="close-btn close-modal-btn" aria-label="Close modal">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="form-container">
                <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSeonpqJaWZRAXjjUCdyIqkfsFxQrSK5wsjHzY0XRAgY4bHISQ/viewform?embedded=true" width="100%" height="450" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
            </div>
        </div>
    </div>

    <div class="dock-trigger-zone"></div>

    <div class="bottom-nav-container">
        <nav class="bottom-nav" aria-label="Primary Navigation">
            <button class="nav-item active" data-url="https://en.wikipedia.org/wiki/Main_Page" title="Home"><i data-lucide="home"></i></button>
            <button class="nav-item" data-url="" title="Apps/Grid"><i data-lucide="layout-grid"></i></button>
            <button class="nav-item" data-url="https://en.wikipedia.org/wiki/Earth" title="Browser"><i data-lucide="globe"></i></button>
            <button class="nav-item" data-url="/Muisc.html" title="Media/Play"><i data-lucide="play-circle"></i></button>
            <button class="nav-item" data-url="https://en.wikipedia.org/wiki/User_profile" title="Profile"><i data-lucide="user"></i></button>
            <button class="nav-item" data-url="https://en.wikipedia.org/wiki/Instant_messaging" title="Chat"><i data-lucide="message-circle"></i></button>
            
            <div class="nav-divider"></div>
            
            <button class="nav-item" id="open-settings-trigger" title="Settings"><i data-lucide="sliders-horizontal"></i></button>
            <button class="nav-item gold-crown external-link" data-url="https://your-premium-link.com" title="Premium"><i data-lucide="crown"></i></button>
            <button class="nav-item" id="open-news-trigger" title="News"><i data-lucide="newspaper"></i></button>
            <button class="nav-item" id="open-suggestions-trigger" title="Suggestions"><i data-lucide="lightbulb"></i></button>
            <button class="nav-item discord external-link" data-url="https://discord.com" title="Discord">
                <svg viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
            </button>

            <div class="nav-divider"></div>
            <div class="view-count" title="Total Views">
                <i data-lucide="eye" style="width:16px; height:16px;"></i>
                <span id="view-count-text">1,204</span>
            </div>
            
        </nav>
    </div>

    <script>
        lucide.createIcons();

        // --- CLOAKING PRESETS ---
        const cloakPresets = {
            "Google": { title: "Google", icon: "https://www.google.com/favicon.ico" },
            "Canvas": { title: "Dashboard", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
            "IXL": { title: "IXL | Dashboard", icon: "https://www.ixl.com/ixl-favicon.png" },
            "Google Drive": { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
            "Google Classroom": { title: "Home", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
            "Gmail": { title: "Gmail", icon: "https://mail.google.com/favicon.ico" },
            "Desmos": { title: "Desmos | Graphing Calculator", icon: "https://www.desmos.com/favicon.ico" },
            "Quizlet": { title: "Flashcards, learning tools and textbook solutions | Quizlet", icon: "https://assets.quizlet.com/a/j/favicon.ico" }
        };

        const presetSelect = document.getElementById('cloak-preset');
        for (const preset in cloakPresets) {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = preset;
            presetSelect.appendChild(option);
        }

        // --- APPLY LIVE CLOAK LOGIC ---
        function applyLiveCloak(presetName) {
            let disguise = cloakPresets[presetName];
            if (!disguise) return;
            
            document.title = disguise.title;
            let currentIcon = document.querySelector("link[rel~='icon']");
            if (!currentIcon) {
                currentIcon = document.createElement('link');
                currentIcon.rel = 'icon';
                document.head.appendChild(currentIcon);
            }
            currentIcon.href = disguise.icon;
        }

        presetSelect.addEventListener('change', (e) => {
            const selected = e.target.value;
            applyLiveCloak(selected);
            localStorage.setItem('seabean_cloak_preset', selected);
        });

        // --- SETTINGS STATE & LOCALSTORAGE ---
        const autohideToggle = document.getElementById('autohide-toggle');
        const cloakToggle = document.getElementById('cloak-toggle');

        function loadSettings() {
            const savedPreset = localStorage.getItem('seabean_cloak_preset') || 'Google';
            presetSelect.value = savedPreset;
            applyLiveCloak(savedPreset);

            const savedAutohide = localStorage.getItem('seabean_autohide') === 'true';
            autohideToggle.checked = savedAutohide;
            if (savedAutohide) document.body.classList.add('autohide-dock');

            const savedEscBind = localStorage.getItem('seabean_esc_bind');
            cloakToggle.checked = savedEscBind !== 'false'; 
        }

        autohideToggle.addEventListener('change', (e) => {
            localStorage.setItem('seabean_autohide', e.target.checked);
            if (e.target.checked) document.body.classList.add('autohide-dock');
            else document.body.classList.remove('autohide-dock');
        });

        cloakToggle.addEventListener('change', (e) => {
            localStorage.setItem('seabean_esc_bind', e.target.checked);
        });

        // --- STARTUP LOGIC ---
        window.addEventListener('DOMContentLoaded', () => {
            loadSettings();
            setTimeout(() => { document.body.classList.add('app-ready'); }, 50); 
            
            const seenVersion = localStorage.getItem('seabean_version');
            if (seenVersion !== 'v2.0.0') {
                setTimeout(() => { document.getElementById('news-overlay').classList.remove('hidden'); }, 300); 
                localStorage.setItem('seabean_version', 'v2.0.0');
            }
        });

        // --- MODAL LOGIC ---
        const overlays = document.querySelectorAll('.overlay');
        const closeBtns = document.querySelectorAll('.close-modal-btn');
        const openNewsBtn = document.getElementById('open-news-trigger');
        const openSettingsBtn = document.getElementById('open-settings-trigger');
        const openSuggestionsBtn = document.getElementById('open-suggestions-trigger');
        
        const newsModal = document.getElementById('news-overlay');
        const settingsModal = document.getElementById('settings-overlay');
        const suggestionsModal = document.getElementById('suggestions-overlay');

        const closeAllModals = () => overlays.forEach(o => o.classList.add('hidden'));

        closeBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
        openNewsBtn.addEventListener('click', () => { closeAllModals(); newsModal.classList.remove('hidden'); });
        openSettingsBtn.addEventListener('click', () => { closeAllModals(); settingsModal.classList.remove('hidden'); });
        openSuggestionsBtn.addEventListener('click', () => { closeAllModals(); suggestionsModal.classList.remove('hidden'); });

        overlays.forEach(overlay => {
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAllModals(); });
        });

        // --- TRIGGER ABOUT:BLANK CLOAK (PANIC) ---
        function triggerAboutBlankCloak() {
            let selectedPresetName = presetSelect.value;
            let disguise = cloakPresets[selectedPresetName];
            
            document.body.innerHTML = ''; 
            document.body.style.backgroundColor = '#ffffff';

            let win = window.open('about:blank', '_blank');
            if(!win) {
                alert('Popup blocked! The tab was disguised, but allow popups for the full stealth tab.');
                window.location.replace('https://classroom.google.com');
                return;
            }
            
            let doc = win.document;
            doc.title = disguise.title;
            let link = doc.createElement('link');
            link.rel = 'icon';
            link.href = disguise.icon;
            doc.head.appendChild(link);

            let iframe = doc.createElement('iframe');
            iframe.style.width = '100vw';
            iframe.style.height = '100vh';
            iframe.style.border = 'none';
            iframe.style.margin = '0';
            iframe.src = window.location.href; 
            
            doc.body.style.margin = '0';
            doc.body.style.overflow = 'hidden';
            doc.body.appendChild(iframe);

            window.location.replace('https://classroom.google.com');
        }

        document.getElementById('manual-cloak-btn').addEventListener('click', triggerAboutBlankCloak);

        // --- ESCAPE KEY LOGIC ---
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                let modalOpen = false;
                overlays.forEach(o => { if (!o.classList.contains('hidden')) modalOpen = true; });
                
                if (modalOpen) {
                    closeAllModals();
                } else if (cloakToggle.checked) {
                    triggerAboutBlankCloak();
                }
            }
        });

        // --- NAVIGATION & IFRAME LOADER LOGIC ---
        const navItems = document.querySelectorAll('.nav-item');
        const mainFrame = document.getElementById('main-frame');
        const iframeLoader = document.getElementById('iframe-loader');

        mainFrame.addEventListener('load', () => {
            setTimeout(() => { iframeLoader.classList.add('hidden'); }, 400); 
        });

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if(item.id === 'open-news-trigger' || item.id === 'open-settings-trigger' || item.id === 'open-suggestions-trigger') return;

                if(item.classList.contains('external-link')) {
                    const externalUrl = item.getAttribute('data-url');
                    window.open(externalUrl, '_blank'); 
                    return; 
                }

                const targetUrl = item.getAttribute('data-url');
                if(!targetUrl || mainFrame.src === targetUrl) return;

                navItems.forEach(i => {
                    if (!i.classList.contains('external-link') && i.id !== 'open-news-trigger' && i.id !== 'open-settings-trigger' && i.id !== 'open-suggestions-trigger') {
                        i.classList.remove('active');
                    }
                });
                item.classList.add('active');
                
                iframeLoader.classList.remove('hidden');
                mainFrame.src = targetUrl;
            });
        });
    <\/script>
</body>
</html>`;

// Overwrite the current page DOM
document.open();
document.write(seaBeanUI);
document.close();
