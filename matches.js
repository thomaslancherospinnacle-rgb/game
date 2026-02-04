/**
 * FIFA MANAGER - Matches Module
 * Match simulation, fixtures, and results
 */

(function(window) {
    'use strict';

    // ============================================================
    // FIXTURES
    // ============================================================

    /**
     * Render fixtures list
     */
    window.renderFixtures = function() {
        const container = document.getElementById('fixturesContent');
        container.innerHTML = '';
        
        const upcomingFixtures = window.gameState.fixtures.filter(f => !f.played).slice(0, 10);
        
        upcomingFixtures.forEach(fixture => {
            const isHome = fixture.home.team_name === window.gameState.selectedTeam.team_name;
            const opponent = isHome ? fixture.away : fixture.home;
            const venue = isHome ? 'Home' : 'Away';
            
            // Get team badges
            const homeBadge = fixture.home.club_logo_url
                ? `<img src="${fixture.home.club_logo_url}" alt="${fixture.home.team_name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='⚽';">`
                : '⚽';
            
            const awayBadge = fixture.away.club_logo_url
                ? `<img src="${fixture.away.club_logo_url}" alt="${fixture.away.team_name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='⚽';">`
                : '⚽';
            
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '15px';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                        <div style="width:50px;height:50px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:2rem;">
                            ${homeBadge}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 5px;">
                                ${fixture.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div style="font-weight: 700; font-size: 1.1rem;">
                                ${fixture.home.team_name}
                            </div>
                        </div>
                    </div>
                    
                    <div style="font-size: 1.2rem; font-weight: 700; color: rgba(255,255,255,0.5);">VS</div>
                    
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1; justify-content: flex-end;">
                        <div style="text-align: right; flex: 1;">
                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 5px;">
                                ${venue}
                            </div>
                            <div style="font-weight: 700; font-size: 1.1rem;">
                                ${fixture.away.team_name}
                            </div>
                        </div>
                        <div style="width:50px;height:50px;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:2rem;">
                            ${awayBadge}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    };

    // ============================================================
    // MATCH SIMULATION
    // ============================================================

    /**
     * Simulate next match
     */
    window.simulateMatch = function() {
        if (!window.gameState.nextMatch) return;
        
        console.log('⚽ Simulating match...');
        
        // Prepare teams with squads
        const homeTeam = {
            ...window.gameState.nextMatch.home,
            squad: window.gameState.playersMap[window.gameState.nextMatch.home.team_name] || []
        };
        
        const awayTeam = {
            ...window.gameState.nextMatch.away,
            squad: window.gameState.playersMap[window.gameState.nextMatch.away.team_name] || []
        };
        
        // Simulate
        const result = window.matchSimulator.simulateMatch(homeTeam, awayTeam, {
            competition: window.gameState.selectedTeam.league_name,
            matchday: window.gameState.matchday
        });
        
        // Update stats
        window.gameState.seasonStats.matches++;
        
        const isHome = homeTeam.team_name === window.gameState.selectedTeam.team_name;
        const yourScore = isHome ? result.homeScore : result.awayScore;
        const oppScore = isHome ? result.awayScore : result.homeScore;
        
        window.gameState.seasonStats.goalsScored += yourScore;
        window.gameState.seasonStats.goalsConceded += oppScore;
        
        if (result.winner === (isHome ? 'home' : 'away')) {
            window.gameState.seasonStats.wins++;
        } else if (result.winner === 'draw') {
            window.gameState.seasonStats.draws++;
        } else {
            window.gameState.seasonStats.losses++;
        }
        
        // Mark as played
        window.gameState.nextMatch.played = true;
        window.gameState.nextMatch.result = result;
        
        // Next match
        const unplayed = window.gameState.fixtures.filter(f => !f.played);
        window.gameState.nextMatch = unplayed.length > 0 ? unplayed[0] : null;
        window.gameState.matchday++;
        
        // Advance date
        window.gameState.currentDate.setDate(window.gameState.currentDate.getDate() + 4);
        
        // Show result
        window.showMatchResult(result);
        
        // Tick transfer system and scouting
        if (window.transferSystem) {
            window.transferSystem.tickOffers();
            window.tickScouting();
            window.updateOfferBadge();
        }
        
        // Update UI
        window.updateCentralTab();
        window.generateLeagueTable();
        window.renderFixtures();
    };

    /**
     * Show match result modal
     */
    window.showMatchResult = function(result) {
        const modal = document.getElementById('matchResultModal');
        const content = document.getElementById('matchResultContent');
        
        const winnerText = result.winner === 'home' ? `${result.homeTeam} WINS!` :
                          result.winner === 'away' ? `${result.awayTeam} WINS!` :
                          'DRAW!';
        
        // Get team badges
        const homeTeam = window.gameState.allTeams.find(t => t.team_name === result.homeTeam);
        const awayTeam = window.gameState.allTeams.find(t => t.team_name === result.awayTeam);
        
        const homeBadgeHtml = homeTeam?.club_logo_url 
            ? `<img src="${homeTeam.club_logo_url}" alt="${result.homeTeam}" style="width:100%;height:100%;object-fit:contain;padding:10px;" onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='⚽';"/>`
            : '<div style="font-size:3rem;">⚽</div>';
        
        const awayBadgeHtml = awayTeam?.club_logo_url
            ? `<img src="${awayTeam.club_logo_url}" alt="${result.awayTeam}" style="width:100%;height:100%;object-fit:contain;padding:10px;" onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='⚽';"/>`
            : '<div style="font-size:3rem;">⚽</div>';
        
        content.innerHTML = `
            <h2 class="modal-title">Match Result</h2>
            <div class="result-winner">${winnerText}</div>
            
            <div class="result-scoreline">
                <div class="result-team">
                    <div style="width:80px;height:80px;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;">
                        ${homeBadgeHtml}
                    </div>
                    <div class="result-team-name">${result.homeTeam}</div>
                    <div class="result-score">${result.homeScore}</div>
                </div>
                <div class="result-vs">-</div>
                <div class="result-team">
                    <div style="width:80px;height:80px;margin:0 auto 15px;display:flex;align-items:center;justify-content:center;">
                        ${awayBadgeHtml}
                    </div>
                    <div class="result-team-name">${result.awayTeam}</div>
                    <div class="result-score">${result.awayScore}</div>
                </div>
            </div>
            
            <div class="result-stats">
                <div style="text-align: right;">
                    <div class="result-stat-value">${result.statistics.possession.home}%</div>
                    <div class="result-stat-label">Possession</div>
                </div>
                <div></div>
                <div style="text-align: left;">
                    <div class="result-stat-value">${result.statistics.possession.away}%</div>
                    <div class="result-stat-label">Possession</div>
                </div>
                
                <div style="text-align: right;">
                    <div class="result-stat-value">${result.statistics.shots.home}</div>
                    <div class="result-stat-label">Shots</div>
                </div>
                <div></div>
                <div style="text-align: left;">
                    <div class="result-stat-value">${result.statistics.shots.away}</div>
                    <div class="result-stat-label">Shots</div>
                </div>
                
                <div style="text-align: right;">
                    <div class="result-stat-value">${result.statistics.shotsOnTarget.home}</div>
                    <div class="result-stat-label">On Target</div>
                </div>
                <div></div>
                <div style="text-align: left;">
                    <div class="result-stat-value">${result.statistics.shotsOnTarget.away}</div>
                    <div class="result-stat-label">On Target</div>
                </div>
            </div>
            
            <button class="continue-btn" onclick="closeMatchResult()">Continue Career</button>
        `;
        
        modal.classList.remove('hidden');
    };

    /**
     * Close match result modal
     */
    window.closeMatchResult = function() {
        document.getElementById('matchResultModal').classList.add('hidden');
    };

    console.log('✅ Matches module loaded');

})(window);