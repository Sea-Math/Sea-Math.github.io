// sync.js - Upload this to GitHub and get the jsDelivr CDN link
// Replace "YOUR_CDN_LINK_HERE" in the HTML with your actual jsDelivr link

window.HubSync = {
    init: function(allZones, openZoneCallback) {
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'gameSaveSync') {
                const gId = e.data.id;
                const gData = e.data.data;
                localStorage.setItem('hub_save_' + gId, gData);
                
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('gameId', gId);
                currentUrl.searchParams.set('gameSave', gData);
                window.history.replaceState({}, '', currentUrl);
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const autoGameId = urlParams.get('gameId');
        const autoSave = urlParams.get('gameSave');
        
        if (autoGameId) {
            if (autoSave) {
                localStorage.setItem('hub_save_' + autoGameId, autoSave);
            }
            const gameToLaunch = allZones.find(z => z.name === autoGameId);
            if (gameToLaunch) {
                setTimeout(() => openZoneCallback(gameToLaunch), 500);
            }
        }
    },

    copyLink: function() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert("Global Save Link Copied!\n\nPaste this exact URL on any other site hosting this hub to restore your complete game progress.");
        }).catch(() => {
            alert("Failed to copy link. Please copy the URL from your browser's address bar manually.");
        });
    }
};
