/**
 * FIFA MANAGER - Transfers Module
 * Player search, scouting system, and transfer operations
 */

(function(window) {
    'use strict';

    // ============================================================
    // SEARCH STATE
    // ============================================================
    
    let currentSearchResults = [];
    let selectedResultIdx = 0;
    
    // Scouting system
    window.scoutQueue = {};
    
    // Search options state
    const soPositions = ['Any', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    const soIdx = { pos: 0, league: 0, country: 0 };

    // ============================================================
    // POPULATE FILTER DROPDOWNS
    // ============================================================
    
    /**
     * Populate transfer filter dropdowns with available options
     * This is called when a team is selected
     */
    window.populateTransferFilters = function() {
        console.log('📋 Populating transfer filters...');
        
        if (!window.gameState || !window.gameState.allPlayers) {
            console.warn('⚠️ Cannot populate filters - game data not loaded');
            return;
        }
        
        // This function can be expanded later to populate league/country dropdowns
        // For now, it just ensures the function exists to prevent errors
        
        console.log('✅ Transfer filters ready');
    };

    // ============================================================
    // SCOUTING SYSTEM
    // ============================================================
    
    window.isPlayerScoutDone = function(playerId) {
        return window.scoutQueue[playerId]?.status === 'complete';
    };
    
    window.isPlayerScouting = function(playerId) {
        return window.scoutQueue[playerId]?.status === 'queued';
    };
    
    window.getScoutDaysNeeded = function(report) {
        // Intel tier determines scouting time
        const tierDays = {
            'full': 0,           // Same league - instant
            'partial': 1,        // Same country - 1 match
            'continental': 2,    // Same continent - 2 matches
            'distant': 3,        // Different continent - 3 matches
            'unknown': 4         // Unknown - 4 matches
        };
        return tierDays[report.tier] || 2;
    };
    
    window.tickScouting = function() {
        if (!window.scoutQueue) return;
        
        const currentDay = window.gameState.fixtures.filter(f => f.played).length;
        
        Object.keys(window.scoutQueue).forEach(playerId => {
            const scout = window.scoutQueue[playerId];
            if (scout.status === 'queued') {
                const daysElapsed = currentDay - scout.startDay;
                if (daysElapsed >= scout.daysNeeded) {
                    scout.status = 'complete';
                    console.log(`✅ Scout report complete for player ${playerId}`);
                }
            }
        });
    };

    // ============================================================
    // TRANSFER HUB RENDERING
    // ============================================================
    
    window.renderTransferHub = function() {
        if (!window.transferSystem) {
            console.warn('⚠️ Transfer system not initialized');
            return;
        }

        const budgetEl = document.getElementById('thubBudget');
        if (budgetEl) {
            budgetEl.textContent = '€' + window.transferSystem.formatMoney(window.transferSystem.transferBudget);
        }

        window.updateOfferBadge();
        
        if (typeof window.renderNetworkOffers === 'function') {
            window.renderNetworkOffers();
        }
        
        if (typeof window.renderHistoryPanel === 'function') {
            window.renderHistoryPanel();
        }

        // Load default search results
        const defaults = window.transferSystem.searchPlayers({ 
            position: '', 
            league: '', 
            country: '', 
            query: '', 
            minOvr: 60, 
            maxOvr: 99, 
            maxPrice: 0, 
            freeAgents: false 
        });
        
        defaults.sort((a, b) => {
            const potA = typeof a.potential === 'object' ? (a.potential.min + a.potential.max) / 2 : (a.potential || 0);
            const potB = typeof b.potential === 'object' ? (b.potential.min + b.potential.max) / 2 : (b.potential || 0);
            return potB - potA;
        });
        
        currentSearchResults = defaults.slice(0, 50);
        selectedResultIdx = 0;
        
        if (typeof window.renderPlayerList === 'function') {
            window.renderPlayerList(currentSearchResults);
        }
    };

    // ============================================================
    // OFFER BADGE UPDATE
    // ============================================================
    
    window.updateOfferBadge = function() {
        if (!window.transferSystem) return;
        
        const count = window.transferSystem.getPendingOffers().length;
        const badge = document.getElementById('offerBadge');
        
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
        
        const countEl = document.getElementById('offerCount');
        if (countEl) {
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'inline' : 'none';
        }
    };

    // ============================================================
    // TRANSFER NETWORK UPDATE
    // ============================================================
    
    window.updateTransferNetwork = function() {
        const listEl = document.getElementById('transferPlayerList');
        if (!listEl) return;

        const completedScouts = Object.keys(window.scoutQueue).filter(pid => window.scoutQueue[pid].status === 'complete');
        const scoutCountEl = document.getElementById('newScoutCount');
        
        if (scoutCountEl) {
            scoutCountEl.textContent = completedScouts.length;
        }

        if (completedScouts.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">No scouting reports<br><span style="font-size:0.8rem;">Scout players from Transfers tab</span></div>';
            return;
        }

        const html = completedScouts.slice(0, 5).map(playerId => {
            const player = window.gameState.allPlayers.find(p => p.player_id === playerId);
            if (!player) return '';
            
            const faceUrl = player.media?.face_url || '';
            const name = player.basic_info?.short_name || 'Unknown';
            const pos = (player.player_positions || '').split(',')[0]?.trim() || 'SUB';
            const nat = player.basic_info?.nationality || '';
            
            return `<div class="transfer-player-card" onclick="openPlayerFromScout('${playerId}')">
                <div class="transfer-player-face">
                    ${faceUrl ? `<img src="${faceUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">` : ''}
                </div>
                <div class="transfer-player-info">
                    <div class="transfer-player-name">${name}</div>
                    <div class="transfer-player-pos">${pos} ${nat}</div>
                </div>
            </div>`;
        }).join('');

        listEl.innerHTML = html;
    };

    // ============================================================
    // RENDER NETWORK OFFERS
    // ============================================================
    
    window.renderNetworkOffers = function() {
        const container = document.getElementById('tnetOffers');
        if (!container || !window.transferSystem) return;
        
        const pending = window.transferSystem.getPendingOffers();
        
        if (pending.length === 0) {
            container.innerHTML = '<div class="tnet-empty">No incoming offers at this time.<br><span style="font-size:0.65rem;opacity:0.6;">Offers arrive as the season progresses.</span></div>';
            return;
        }
        
        container.innerHTML = pending.map(offer => `
            <div class="tnet-offer-row">
                <div class="tnet-offer-info">
                    <div class="tnet-offer-player">${offer.playerName}</div>
                    <div class="tnet-offer-detail">OVR ${offer.playerOvr} · Your squad</div>
                </div>
                <div class="tnet-offer-right">
                    <div class="tnet-offer-amount">€${window.transferSystem.formatMoney(offer.amount)}</div>
                    <div class="tnet-offer-from">from ${offer.club}</div>
                </div>
                <div class="tnet-offer-btns">
                    <button class="tnet-btn accept" onclick="acceptIncomingOffer(${offer.id})">Accept</button>
                    <button class="tnet-btn reject" onclick="rejectIncomingOffer(${offer.id})">Reject</button>
                </div>
            </div>
        `).join('');
    };

    // ============================================================
    // RENDER HISTORY PANEL
    // ============================================================
    
    window.renderHistoryPanel = function() {
        const container = document.getElementById('thistContent');
        if (!container || !window.transferSystem) return;
        
        const history = window.transferSystem.transferHistory;
        
        if (history.length === 0) {
            container.innerHTML = '<div class="thist-empty">No transfers completed yet this window.</div>';
            return;
        }
        
        container.innerHTML = history.map(deal => `
            <div class="thist-row">
                <div class="thist-type ${deal.type.toLowerCase()}">${deal.type}</div>
                <div class="thist-info">
                    <div class="thist-name">${deal.player}</div>
                    <div class="thist-detail">${deal.type === 'IN' ? 'from ' + deal.from : 'to ' + deal.to} · ${deal.date?.toLocaleDateString('en-US', {month:'short', day:'numeric'}) || ''}</div>
                </div>
                <div class="thist-fee">€${window.transferSystem.formatMoney(deal.fee)}</div>
            </div>
        `).join('');
    };

    // ============================================================
    // INCOMING OFFER ACTIONS
    // ============================================================
    
    window.acceptIncomingOffer = function(offerId) {
        if (!window.transferSystem) return;
        
        const result = window.transferSystem.acceptOffer(offerId);
        
        if (result.success) {
            if (typeof window.renderSquad === 'function') {
                window.renderSquad();
            }
            window.renderTransferHub();
        }
    };

    window.rejectIncomingOffer = function(offerId) {
        if (!window.transferSystem) return;
        
        window.transferSystem.rejectOffer(offerId);
        window.renderTransferHub();
    };

    // ============================================================
    // RENDER PLAYER LIST (PLACEHOLDER)
    // ============================================================
    
    window.renderPlayerList = function(reports) {
        const container = document.getElementById('tpPlayerList');
        if (!container) {
            console.warn('⚠️ Player list container not found');
            return;
        }
        
        if (reports.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">No players found<br><span style="font-size:0.8rem;">Try adjusting your search filters</span></div>';
            return;
        }
        
        // Simple list rendering (can be enhanced later)
        const html = reports.slice(0, 20).map((r, i) => {
            const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : r.overall;
            const faceUrl = r.face_url || '';
            
            return `<div class="tp-player-row" onclick="selectPlayerResult(${i})">
                <div class="tp-player-face">
                    ${faceUrl ? `<img src="${faceUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';">` : '👤'}
                </div>
                <div class="tp-player-info">
                    <div class="tp-player-name">${r.short_name}</div>
                    <div class="tp-player-club">${r.club} · ${r.position}</div>
                </div>
                <div class="tp-player-right">
                    <div class="tp-player-ovr">${ovrDisplay}</div>
                    <div class="tp-player-age">${r.age || '?'}</div>
                </div>
            </div>`;
        }).join('');
        
        container.innerHTML = html;
    };

    window.selectPlayerResult = function(idx) {
        selectedResultIdx = idx;
        const report = currentSearchResults[idx];
        if (report && typeof window.openPlayerDetail === 'function') {
            window.openPlayerDetail(report);
        }
    };

    // ============================================================
    // PLAYER DETAIL MODAL (PLACEHOLDER)
    // ============================================================
    
    window.openPlayerDetail = function(report) {
        console.log('Opening player detail for:', report.short_name);
        alert(`Player Detail:\n\n${report.short_name}\nOVR: ${typeof report.overall === 'object' ? report.overall.min + '-' + report.overall.max : report.overall}\nClub: ${report.club}\nPosition: ${report.position}\n\n(Full modal coming soon!)`);
    };

    window.openPlayerFromScout = function(playerId) {
        if (!window.transferSystem) return;
        
        const player = window.gameState.allPlayers.find(p => p.player_id === playerId);
        if (player) {
            const report = window.transferSystem.buildScoutReport(player);
            window.openPlayerDetail(report);
        }
    };

    console.log('✅ Transfers module loaded');

})(window);