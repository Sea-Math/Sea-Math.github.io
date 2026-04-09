// FILE 2: loalstorage.js
// INSTRUCTIONS: Upload this file to your GitHub so it updates your existing jsDelivr CDN link.

(function() {
    // This connects to the central hub you uploaded in File 1
    const HUB_URL = 'https://sea-math.github.io/storage-hub.html';
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = HUB_URL;
    
    let hubReady = false;
    let cachedData = {};
    let messageQueue = [];
    let readyCallbacks = [];

    window.addEventListener('message', function(e) {
        if (e.origin === new URL(HUB_URL).origin) {
            if (e.data.action === 'SYNC_ALL') {
                cachedData = e.data.data;
                hubReady = true;
                console.log("[Save Sync] Cross-browser cloud data loaded successfully.");
                readyCallbacks.forEach(cb => cb());
                readyCallbacks = [];
            }
        }
    });

    iframe.onload = function() {
        // As soon as iframe loads, request all cloud saves
        iframe.contentWindow.postMessage({ action: 'GET_ALL' }, '*');
        
        // Process any saves that happened before load
        messageQueue.forEach(msg => iframe.contentWindow.postMessage(msg, '*'));
        messageQueue = [];
    };

    document.head.appendChild(iframe);

    // Expose global API for the main HTML file to use
    window.CrossDomainStorage = {
        isReady: function() { 
            return hubReady; 
        },
        onReady: function(cb) {
            if (hubReady) cb(); else readyCallbacks.push(cb);
        },
        getGameSave: function(gameId) {
            return cachedData['hub_save_' + gameId] || localStorage.getItem('hub_save_' + gameId) || "";
        },
        saveGame: function(gameId, saveData) {
            // Save to memory
            cachedData['hub_save_' + gameId] = saveData;
            // Save to local fallback
            localStorage.setItem('hub_save_' + gameId, saveData);
            
            // Save to Cross-Domain Cloud Hub
            const msg = { action: 'SET', key: 'hub_save_' + gameId, value: saveData };
            if (hubReady) {
                iframe.contentWindow.postMessage(msg, '*');
            } else {
                messageQueue.push(msg);
            }
        }
    };
})();
