/**
 * FIFA MANAGER - Office Module
 * Budget management, contracts, and financial operations
 */

(function(window) {
    'use strict';

    // ============================================================
    // OFFICE RENDERING
    // ============================================================

    window.renderOffice = function() {
        if (!window.transferSystem) return;
        window.renderBudgetCards();
        window.renderContractsTable();
    };

    // ============================================================
    // BUDGET OVERVIEW
    // ============================================================

    window.renderBudgetCards = function() {
        const container = document.getElementById('officeBudgetCard');
        if (!container) return;

        const tb = window.transferSystem.transferBudget;
        const wb = window.transferSystem.wageBudget;
        const tw = window.transferSystem.totalWages;
        const teamOvr = window.gameState.selectedTeam?.overall_rating || 75;
        const maxWages = Math.floor(teamOvr * 18000);

        const tbClass = tb > 10000000 ? 'green' : (tb > 2000000 ? 'yellow' : 'red');
        const wbClass = wb > 20000 ? 'green' : (wb > 5000 ? 'yellow' : 'red');

        container.innerHTML = `
            <div class="budget-item ${tb < 5000000?'warning':''}">
                <div class="budget-label">Transfer Budget</div>
                <div class="budget-value ${tbClass}">€${window.transferSystem.formatMoney(tb)}</div>
                <div class="budget-sub">Available for signings</div>
            </div>
            <div class="budget-item ${wb < 10000?'danger':''}">
                <div class="budget-label">Wage Budget</div>
                <div class="budget-value ${wbClass}">€${window.transferSystem.formatMoney(wb)}/wk</div>
                <div class="budget-sub">Remaining wage capacity</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Total Wages</div>
                <div class="budget-value" style="color:#ffd900;">€${window.transferSystem.formatMoney(tw)}/wk</div>
                <div class="budget-sub">of €${window.transferSystem.formatMoney(maxWages)} max</div>
            </div>
            <div class="budget-item">
                <div class="budget-label">Squad Size</div>
                <div class="budget-value">${window.gameState.squad.length}</div>
                <div class="budget-sub">Players registered</div>
            </div>`;
    };

    // ============================================================
    // CONTRACTS TABLE
    // ============================================================

    window.renderContractsTable = function() {
        const container = document.getElementById('contractsTable');
        if (!container) return;

        const currentYear = window.gameState.currentDate.getFullYear();

        container.innerHTML = `
            <div class="contracts-header">
                <div>Player</div>
                <div>Position</div>
                <div>OVR</div>
                <div>Weekly Wage</div>
                <div>Contract Ends</div>
                <div></div>
            </div>`;

        [...window.gameState.squad]
            .sort((a, b) => {
                const wA = a.contract?.wage || window.transferSystem.estimateWage(a);
                const wB = b.contract?.wage || window.transferSystem.estimateWage(b);
                return wB - wA;
            })
            .forEach(player => {
                const info = player.basic_info || {};
                const ovr = player.ratings?.overall || 70;
                const wage = player.contract?.wage || window.transferSystem.estimateWage(player);
                const ends = player.contract?.endYear || player.club?.contract_until || 2025;
                const isExpiring = ends <= currentYear + 1;

                const row = document.createElement('div');
                row.className = 'contract-row';
                row.innerHTML = `
                    <div><div class="cr-name">${info.short_name || 'Unknown'}</div></div>
                    <div class="cr-pos">${(player.player_positions||'—').split(',')[0].trim()}</div>
                    <div class="cr-val">${ovr}</div>
                    <div class="cr-wage">€${window.transferSystem.formatMoney(wage)}/wk</div>
                    <div class="cr-ends ${isExpiring?'expiring':''}">${isExpiring?'⚠️ ':''}${ends}</div>
                    <div><button class="cr-sell-btn" onclick="quickSell('${player.player_id}','${(info.short_name||'').replace(/'/g,"\\'")}')">Sell</button></div>`;
                container.appendChild(row);
            });
    };

    // ============================================================
    // QUICK SELL
    // ============================================================

    window.quickSell = function(playerId, playerName) {
        const player = window.gameState.squad.find(p => p.player_id === playerId);
        if (!player) return;

        const mv = player.value?.market_value_eur || window.transferSystem.estimateMarketValue(player);
        const fee = Math.floor(mv * (0.70 + Math.random() * 0.15) / 1000) * 1000;

        if (confirm(`Sell ${playerName} for €${window.transferSystem.formatMoney(fee)}?`)) {
            window.transferSystem.sellPlayer(playerId, fee);
            window.transferSystem.transferHistory.push({
                type: 'OUT',
                player: playerName,
                fee,
                date: new Date(window.gameState.currentDate),
                to: 'Transfer Market'
            });

            window.renderSquad();
            window.renderOffice();
            window.renderTransferHub();
        }
    };

    console.log('✅ Office module loaded');

})(window);