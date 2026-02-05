/**
 * FIFA MANAGER - Squad Module
 * Squad management, player rendering, and formation view (FIFA 24 Style)
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
        if (!grid) return;
        
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
        
        const subtitleEl = document.getElementById('squadSubtitle');
        if (subtitleEl) {
            subtitleEl.textContent = `${window.gameState.squad.length} players in your squad`;
        }
    };

    // ============================================================
    // FORMATION VIEW (FIFA 24 STYLE)
    // ============================================================

    let selectedPlayerIndex = null;
    let benchExpanded = false;

    /**
     * Render formation view with FIFA 24 styling
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

        const currentFormation = formations['4-5-1'];
        if (formationSystemEl) formationSystemEl.textContent = '4-5-1';

        // Get starting 11, bench (7), and reserves
        const starting11 = window.gameState.squad.slice(0, 11);
        const bench = window.gameState.squad.slice(11, 18);
        const reserves = window.gameState.squad.slice(18);

        // Render on pitch
        renderPitchPlayers(currentFormation, starting11);
        renderBenchAndReserves(bench, reserves);
        
        // Clear selected player on initial render
        selectedPlayerIndex = null;
        updatePlayerDetailPanel(null);
    };

    /**
     * Render players on the pitch with kits
     */
    function renderPitchPlayers(formation, players) {
        const pitchEl = document.getElementById('pitch3d');
        if (!pitchEl) return;

        pitchEl.innerHTML = '';

        formation.forEach((pos, idx) => {
            const player = players[idx];
            if (!player) return;

            const playerDiv = document.createElement('div');
            playerDiv.className = 'pitch-player';
            playerDiv.style.left = pos.x + '%';
            playerDiv.style.top = pos.y + '%';

            const name = player.short_name || player.basic_info?.short_name || 'Unknown';
            const rating = player.overall || player.ratings?.overall || '?';
            const number = idx + 1;
            
            // Get team ID for kit
            const teamId = window.gameState.selectedTeam?.team_id || '0001';
            const kitType = pos.pos === 'GK' ? 'keeper' : 'first';
            const kitPath = `kits/team_${String(teamId).padStart(4, '0')}_${kitType}.png`;

            playerDiv.innerHTML = `
                <div class="player-jersey-container">
                    <img src="${kitPath}" class="player-jersey-img" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2250%22><rect fill=%22%2300d4ff%22 width=%2240%22 height=%2250%22/></svg>'">
                    <div class="player-jersey-number">${number}</div>
                </div>
                <div class="player-name-pitch">${name}</div>
                <div class="player-rating-pitch">${rating}</div>
            `;

            playerDiv.onmouseenter = () => selectPlayer(player, idx);
            playerDiv.onclick = () => selectPlayer(player, idx);
            
            pitchEl.appendChild(playerDiv);
        });
    }

    /**
     * Render bench and reserves sections
     */
    function renderBenchAndReserves(bench, reserves) {
        const subsContainer = document.getElementById('substitutesContainer');
        if (!subsContainer) return;

        // Render SUBSTITUTES (Bench - 7 players)
        let benchHtml = '<div class="subs-header" onclick="toggleBench()">SUBSTITUTES <span class="bench-arrow">↑</span></div>';
        benchHtml += '<div class="subs-grid' + (benchExpanded ? ' expanded' : '') + '" id="benchGrid">';
        
        bench.forEach((player, idx) => {
            const pos = (player.player_positions || '').split(',')[0]?.trim() || 'SUB';
            const ovr = player.ratings?.overall || 65;
            const name = player.basic_info?.short_name || 'Unknown';
            const faceUrl = player.media?.face_url || '';
            
            benchHtml += `<div class="sub-player" onmouseenter="selectPlayer(${JSON.stringify(player).replace(/"/g, '&quot;')}, ${11 + idx})" onclick="selectPlayer(${JSON.stringify(player).replace(/"/g, '&quot;')}, ${11 + idx})">
                <div class="sub-player-face">${faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : ''}</div>
                <div class="sub-player-info">
                    <div class="sub-pos-badge">${pos}</div>
                    <div class="sub-player-name">${name}</div>
                </div>
                <div class="sub-player-ovr">${ovr}</div>
            </div>`;
        });
        
        benchHtml += '</div>';

        // Render RESERVES (Infinite capacity)
        benchHtml += '<div class="reserves-header">RESERVES</div>';
        benchHtml += '<div class="reserves-grid" id="reservesGrid">';
        
        reserves.forEach((player, idx) => {
            const pos = (player.player_positions || '').split(',')[0]?.trim() || 'SUB';
            const ovr = player.ratings?.overall || 65;
            const name = player.basic_info?.short_name || 'Unknown';
            const faceUrl = player.media?.face_url || '';
            
            benchHtml += `<div class="reserve-player" onmouseenter="selectPlayer(${JSON.stringify(player).replace(/"/g, '&quot;')}, ${18 + idx})" onclick="selectPlayer(${JSON.stringify(player).replace(/"/g, '&quot;')}, ${18 + idx})">
                <div class="reserve-player-face">${faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : ''}</div>
                <div class="reserve-pos-badge">${pos}</div>
                <div class="reserve-player-name">${name}</div>
                <div class="reserve-player-ovr">${ovr}</div>
            </div>`;
        });
        
        benchHtml += '</div>';

        subsContainer.innerHTML = benchHtml;
    }

    /**
     * Toggle bench expanded/collapsed
     */
    window.toggleBench = function() {
        benchExpanded = !benchExpanded;
        const benchGrid = document.getElementById('benchGrid');
        const arrow = document.querySelector('.bench-arrow');
        
        if (benchGrid) {
            benchGrid.classList.toggle('expanded', benchExpanded);
        }
        if (arrow) {
            arrow.textContent = benchExpanded ? '↓' : '↑';
        }
    };

    /**
     * Select a player and update detail panel
     */
    window.selectPlayer = function(player, index) {
        if (typeof player === 'string') {
            player = JSON.parse(player.replace(/&quot;/g, '"'));
        }
        
        selectedPlayerIndex = index;
        
        // Highlight selected player
        document.querySelectorAll('.pitch-player, .sub-player, .reserve-player').forEach((el, i) => {
            el.classList.toggle('selected', i === index);
        });
        
        updatePlayerDetailPanel(player);
    };

    /**
     * Update the player detail panel (top-left and right side)
     */
    function updatePlayerDetailPanel(player) {
        const leftPanel = document.getElementById('playerDetailLeft');
        const rightPanel = document.getElementById('playerDetailRight');
        
        if (!leftPanel || !rightPanel) return;

        if (!player) {
            leftPanel.innerHTML = '<div class="no-player-selected">Select a player</div>';
            rightPanel.innerHTML = '<div class="no-stats-selected">Player stats will appear here</div>';
            return;
        }

        // LEFT PANEL - Player face and basic info
        const faceUrl = player.media?.face_url || player.media?.player_face_url || '';
        const name = player.basic_info?.short_name || 'Unknown';
        const pos = (player.player_positions || '').split(',')[0]?.trim() || 'SUB';
        const ovr = player.ratings?.overall || 65;
        
        leftPanel.innerHTML = `
            <div class="detail-player-face">
                ${faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : ''}
            </div>
            <div class="detail-player-pos-badge">${pos}</div>
            <div class="detail-player-name">${name}</div>
            <div class="detail-player-ovr">${ovr}</div>
        `;

        // RIGHT PANEL - Detailed stats (FIFA 24 style)
        const attrs = player.core_attributes || {};
        const info = player.basic_info || {};
        
        // Physical/Mental attributes
        const physical = player.physical_attributes || {};
        const mental = player.mental_attributes || {};
        
        rightPanel.innerHTML = `
            <div class="stats-panel">
                <div class="stats-section">
                    <div class="stats-title">CORE ATTRIBUTES</div>
                    <div class="stat-row"><span>Pace</span><span class="stat-value">${attrs.pace || 50}</span></div>
                    <div class="stat-row"><span>Shooting</span><span class="stat-value">${attrs.shooting || 50}</span></div>
                    <div class="stat-row"><span>Passing</span><span class="stat-value">${attrs.passing || 50}</span></div>
                    <div class="stat-row"><span>Dribbling</span><span class="stat-value">${attrs.dribbling || 50}</span></div>
                    <div class="stat-row"><span>Defending</span><span class="stat-value">${attrs.defending || 50}</span></div>
                    <div class="stat-row"><span>Physical</span><span class="stat-value">${attrs.physic || attrs.physical || 50}</span></div>
                </div>
                <div class="stats-section">
                    <div class="stats-title">MENTAL/PHYSICAL</div>
                    <div class="stat-row"><span>Aggression</span><span class="stat-value">${mental.aggression || physical.aggression || 50}</span></div>
                    <div class="stat-row"><span>Interceptions</span><span class="stat-value">${mental.interceptions || 50}</span></div>
                    <div class="stat-row"><span>Att. Position</span><span class="stat-value">${mental.attacking_position || 50}</span></div>
                    <div class="stat-row"><span>Vision</span><span class="stat-value">${mental.vision || 50}</span></div>
                    <div class="stat-row"><span>Acceleration</span><span class="stat-value">${physical.acceleration || 50}</span></div>
                    <div class="stat-row"><span>Agility</span><span class="stat-value">${physical.agility || 50}</span></div>
                    <div class="stat-row"><span>Balance</span><span class="stat-value">${physical.balance || 50}</span></div>
                    <div class="stat-row"><span>Jumping</span><span class="stat-value">${physical.jumping || 50}</span></div>
                    <div class="stat-row"><span>Reactions</span><span class="stat-value">${mental.reactions || 50}</span></div>
                    <div class="stat-row"><span>Sprint Speed</span><span class="stat-value">${physical.sprint_speed || 50}</span></div>
                    <div class="stat-row"><span>Stamina</span><span class="stat-value">${physical.stamina || 50}</span></div>
                    <div class="stat-row"><span>Strength</span><span class="stat-value">${physical.strength || 50}</span></div>
                </div>
                <div class="stats-section">
                    <div class="stats-title">PLAYER INFO</div>
                    <div class="stat-row"><span>Age</span><span class="stat-value">${info.age || '—'}</span></div>
                    <div class="stat-row"><span>Nationality</span><span class="stat-value">${info.nationality || '—'}</span></div>
                    <div class="stat-row"><span>Height</span><span class="stat-value">${info.height || '—'}</span></div>
                    <div class="stat-row"><span>Weight</span><span class="stat-value">${info.weight || '—'}</span></div>
                    <div class="stat-row"><span>Foot</span><span class="stat-value">${info.preferred_foot || '—'}</span></div>
                    <div class="stat-row"><span>Work Rate</span><span class="stat-value">${info.work_rate || '—'}</span></div>
                </div>
            </div>
        `;
    }

    console.log('✅ Squad module loaded');

})(window);
