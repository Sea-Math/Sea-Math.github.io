window.GameSaveManager = {
    saveData: function(gameId, base64Data) {
        localStorage.setItem('hub_save_' + gameId, base64Data);
    },
    
    loadData: function(gameId) {
        return localStorage.getItem('hub_save_' + gameId) || "";
    },
    
    exportAll: function() {
        try {
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('hub_save_')) {
                    allData[key] = localStorage.getItem(key);
                }
            }
            return btoa(JSON.stringify(allData));
        } catch(e) {
            return "";
        }
    },
    
    importAll: function(base64String) {
        try {
            const parsed = JSON.parse(atob(base64String));
            for (let key in parsed) {
                localStorage.setItem(key, parsed[key]);
            }
            return true;
        } catch(e) {
            return false;
        }
    },

    getInjectableScript: function(gameId) {
        const savedData = this.loadData(gameId);
        return `<script>
            window.onbeforeunload = function() { return "Staying in site!"; };
            window.open = function() { return null; };
            setInterval(function() {
                const ads = document.querySelectorAll('.ad, .ads, .adsbygoogle, .banner-ads, [id^="ad-"], iframe[src*="doubleclick"], iframe[src*="googleads"], #sidebarad1, #sidebarad2');
                ads.forEach(ad => ad.remove());
            }, 500); 

            (function() {
                const saveString = "${savedData}";
                if (saveString && saveString !== "e30=") {
                    try {
                        const data = JSON.parse(atob(saveString));
                        for (let key in data) { localStorage.setItem(key, data[key]); }
                    } catch(e) {}
                }
                
                window.lastSync = "";
                setInterval(() => {
                    try {
                        const allData = {};
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            allData[key] = localStorage.getItem(key);
                        }
                        const encoded = btoa(JSON.stringify(allData));
                        if (window.lastSync !== encoded && encoded !== "e30=") {
                            window.lastSync = encoded;
                            window.parent.postMessage({ type: 'gameSaveSync', data: encoded, id: "${gameId}" }, '*');
                        }
                    } catch(e) {}
                }, 1000);
            })();
        <\/script>`;
    }
};

window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'gameSaveSync') {
        window.GameSaveManager.saveData(e.data.id, e.data.data);
    }
});
