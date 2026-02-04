/**
 * FIFA MANAGER GAME - Module Loader
 * Dynamically loads all game modules in the correct order
 */

(function() {
    'use strict';

    const modules = [
        'core.js',      // Game state, data loading, initialization
        'ui.js',        // UI utilities, modals, tabs, rendering helpers
        'squad.js',     // Squad management, formation view
        'matches.js',   // Match simulation, fixtures, results
        'transfers.js', // Transfer system, search, scouting, bidding
        'office.js'     // Budget management, contracts, financial operations
    ];

    let loadedCount = 0;
    const startTime = performance.now();

    // Show loading progress
    function updateLoadingProgress(message) {
        const loadingEl = document.getElementById('loadingProgress');
        if (loadingEl) {
            loadingEl.textContent = message;
        }
    }

    // Load a single module
    function loadModule(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Maintain order
            script.onload = () => {
                loadedCount++;
                const progress = `Loading modules... (${loadedCount}/${modules.length})`;
                updateLoadingProgress(progress);
                console.log(`✓ Loaded ${src} (${loadedCount}/${modules.length})`);
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load ${src}`));
            };
            document.head.appendChild(script);
        });
    }

    // Load all modules sequentially
    async function loadAllModules() {
        try {
            updateLoadingProgress('Loading game modules...');
            
            for (const module of modules) {
                await loadModule(module);
            }
            
            const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ All modules loaded successfully in ${loadTime}s`);
            
            // Start game initialization
            if (typeof init === 'function') {
                init();
            } else {
                throw new Error('Game initialization function not found');
            }
        } catch (error) {
            console.error('❌ Error loading modules:', error);
            
            // Show error to user
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.innerHTML = `
                    <div class="error-message">
                        <div class="error-title">⚠️ Error Loading Game</div>
                        <div class="error-text">${error.message}</div>
                        <div class="error-text" style="margin-top: 15px;">
                            <strong>Please ensure all game files are present:</strong><br>
                            • game.js (loader)<br>
                            • core.js<br>
                            • ui.js<br>
                            • squad.js<br>
                            • matches.js<br>
                            • transfers.js<br>
                            • office.js<br>
                            • teams.json<br>
                            • players.json
                        </div>
                        <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#00d4ff;border:none;border-radius:5px;color:#000;font-weight:bold;cursor:pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        }
    }

    // Start loading
    loadAllModules();
})();