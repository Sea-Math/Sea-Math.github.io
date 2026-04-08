// sync.js
// 1. Upload this file to a GitHub repository.
// 2. Get your jsDelivr link: https://cdn.jsdelivr.net/gh/YOUR_GITHUB_NAME/YOUR_REPO_NAME@main/sync.js
// 3. Put that link in the script tag in the HTML below.

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

window.copySaveLink = function() {
    navigator.clipboard.writeText(window.location.href);
    alert("Save link copied! You can paste this URL on any device or site using this system to restore your progress.");
};

window.checkInitialLoad = function(allZones, openZoneFn) {
    const urlParams = new URLSearchParams(window.location.search);
    const autoGameId = urlParams.get('gameId');
    const autoSave = urlParams.get('gameSave');
    
    if (autoGameId) {
        if (autoSave) localStorage.setItem('hub_save_' + autoGameId, autoSave);
        const gameToLaunch = allZones.find(z => z.name === autoGameId);
        if (gameToLaunch) setTimeout(() => openZoneFn(gameToLaunch), 500);
    }
};
