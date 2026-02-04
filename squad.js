/**
 * FIFA MANAGER - Squad Module
 * Squad management, player rendering, and formation view
 */

(function(window) {
    'use strict';

    // ============================================================
    // SQUAD RENDERING
    // ============================================================

    /**
     * Show squad list view
     */
    window.showSquadList = function() {
        const listTab = document.getElementById('tab-squad-list');
        if (listTab) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            listTab.classList.add('active');
            window.renderSquad();
        }
    };

    /**
     * Show squad report
     */
    window.showSquadReport = function() {
        alert('Squad Report - Coming Soon!\n\nThis will show detailed statistics about your squad including:\n- Average age\n- Squad depth by position\n- Top performers\n- Injury status');
    };

    /**
     * Render squad grid
     */
    window.renderSquad = function() {
        const grid = document.getElementById('squadGrid');
        grid.innerHTML = '';
        
        window.gameState.squad.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            
            // Get face URL
            const faceUrl = player.media?.face_url || player.media?.player_face_url || player.face_url || '';
            
            let faceHtml = '👤';
            if (faceUrl) {
                faceHtml = `<img src="${faceUrl}" alt="${player.basic_info?.short_name || 'Player'}" 
                    style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;" 
                    onerror="this.style.display='none'; this.parentElement.innerHTML='👤';">`;
            }
            
            const positions = player.player_positions || player.position || 'SUB';
            const overall = player.ratings?.overall || player.overall || 65;
            const pace = player.core_attributes?.pace || 50;
            const shooting = player.core_attributes?.shooting || 50;
            const passing = player.core_attributes?.passing || 50;
            const dribbling = player.core_attributes?.dribbling || 50;
            const defending = player.core_attributes?.defending || 50;
            const physic = player.core_attributes?.physic || player.core_attributes?.physical || 50;
            
            card.innerHTML = `
                <div class="player-card-header">
                    <div class="player-overall">${overall}</div>
                    <div class="player-position">${positions.split(',')[0].trim()}</div>
                </div>
                <div class="player-face">${faceHtml}</div>
                <div class="player-name">${player.basic_info?.short_name || player.name || 'Unknown'}</div>
                <div class="player-stats">
                    <div class="player-stat">
                        <div class="player-stat-label">PAC</div>
                        <div class="player-stat-value">${pace}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">SHO</div>
                        <div class="player-stat-value">${shooting}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">PAS</div>
                        <div class="player-stat-value">${passing}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">DRI</div>
                        <div class="player-stat-value">${dribbling}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">DEF</div>
                        <div class="player-stat-value">${defending}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">PHY</div>
                        <div class="player-stat-value">${physic}</div>
                    </div>
                </div>
            `;
            
            grid.appendChild(card);
        });
        
        document.getElementById('squadSubtitle').textContent = `${window.gameState.squad.length} players in your squad`;
    };

    // ============================================================
    // FORMATION VIEW
    // ============================================================

    /**
     * Render formation view
     */
    window.renderFormation = function() {
        if (!window.gameState.squad || window.gameState.squad.length === 0) return;

        // Update header
        const teamNameEl = document.getElementById('formationTeamName');
        const formationSystemEl = document.getElementById('formationSystem');
        if (teamNameEl && window.gameState.selectedTeam) {
            teamNameEl.textContent = (window.gameState.selectedTeam.team_name || 'TEAM').toUpperCase() + ' DEFAULT';
        }

        // Common formations and positions
        const formations = {
            '4-3-3': [
                { pos: 'GK', x: 50, y: 95 },
                { pos: 'LB', x: 15, y: 75 },
                { pos: 'CB', x: 35, y: 80 },
                { pos: 'CB', x: 65, y: 80 },
                { pos: 'RB', x: 85, y: 75 },
                { pos: 'CDM', x: 50, y: 60 },
                { pos: 'CM', x: 30, y: 50 },
                { pos: 'CM', x: 70, y: 50 },
                { pos: 'LW', x: 15, y: 25 },
                { pos: 'ST', x: 50, y: 20 },
                { pos: 'RW', x: 85, y: 25 }
            ],
            '4-5-1': [
                { pos: 'GK', x: 50, y: 95 },
                { pos: 'LB', x: 15, y: 75 },
                { pos: 'CB', x: 35, y: 80 },
                { pos: 'CB', x: 65, y: 80 },
                { pos: 'RB', x: 85, y: 75 },
                { pos: 'LM', x: 15, y: 50 },
                { pos: 'CDM', x: 35, y: 55 },
                { pos: 'CDM', x: 65, y: 55 },
                { pos: 'RM', x: 85, y: 50 },
                { pos: 'CAM', x: 50, y: 35 },
                { pos: 'ST', x: 50, y: 15 }
            ],
            '4-4-2': [
                { pos: 'GK', x: 50, y: 95 },
                { pos: 'LB', x: 15, y: 75 },
                { pos: 'CB', x: 35, y: 80 },
                { pos: 'CB', x: 65, y: 80 },
                { pos: 'RB', x: 85, y: 75 },
                { pos: 'LM', x: 15, y: 50 },
                { pos: 'CM', x: 35, y: 55 },
                { pos: 'CM', x: 65, y: 55 },
                { pos: 'RM', x: 85, y: 50 },
                { pos: 'ST', x: 40, y: 20 },
                { pos: 'ST', x: 60, y: 20 }
            ]
        };

        const currentFormation = formations['4-3-3']; // Default formation
        if (formationSystemEl) formationSystemEl.textContent = '4-3-3';

        // Get starting 11
        const starting11 = window.gameState.squad
            .sort((a, b) => (b.overall || 0) - (a.overall || 0))
            .slice(0, 11);

        // Render on pitch
        const pitchEl = document.getElementById('pitch3d');
        if (!pitchEl) return;

        pitchEl.innerHTML = '';

        currentFormation.forEach((pos, idx) => {
            const player = starting11[idx];
            if (!player) return;

            const playerDiv = document.createElement('div');
            playerDiv.className = 'pitch-player';
            playerDiv.style.left = pos.x + '%';
            playerDiv.style.top = pos.y + '%';

            const name = player.short_name || player.basic_info?.short_name || 'Unknown';
            const rating = player.overall || player.ratings?.overall || '?';
            const number = idx + 1;

            playerDiv.innerHTML = `
                <div class="player-jersey">${number}</div>
                <div class="player-name-pitch">${name}</div>
                <div class="player-rating-pitch">${rating}</div>
            `;

            playerDiv.onclick = () => window.openPlayerDetail(player);
            pitchEl.appendChild(playerDiv);
        });
    };

    console.log('✅ Squad module loaded');

})(window);