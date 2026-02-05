/**
 * FIFA MANAGER - UI Module
 * UI utilities, modals, tabs, and rendering helpers
 */

(function(window) {
    'use strict';

    // ============================================================
    // LOADING & ERROR SCREENS
    // ============================================================

    /**
     * Show loading screen with message
     */
    window.showLoading = function(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
        const loadingProgress = document.getElementById('loadingProgress');
        if (loadingProgress) {
            loadingProgress.textContent = message;
        }
    };

    /**
     * Hide loading screen
     */
    window.hideLoading = function() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    };

    /**
     * Show error message
     */
    window.showError = function(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="error-message">
                    <div class="error-title">⚠️ Error Loading Game</div>
                    <div class="error-text">${message}</div>
                    <div class="error-text" style="margin-top: 15px;">
                        <strong>Required files:</strong><br>
                        • teams.json<br>
                        • players.json<br>
                        • Make sure they are in the root directory of your GitHub Pages site.
                    </div>
                </div>
            `;
        }
    };

    // ============================================================
    // HEADER & NAVIGATION
    // ============================================================

    /**
     * Update header with team info
     */
    window.updateHeader = function() {
        const clubNameEl = document.getElementById('clubName');
        if (clubNameEl && window.gameState.selectedTeam) {
            clubNameEl.textContent = window.gameState.selectedTeam.team_name;
        }
        
        const logoUrl = window.gameState.selectedTeam?.club_logo_url;
        const badgeEl = document.getElementById('clubBadge');
        
        if (badgeEl) {
            if (logoUrl) {
                badgeEl.innerHTML = `<img src="${logoUrl}" alt="${window.gameState.selectedTeam.team_name}" 
                    style="width:45px;height:45px;object-fit:contain;display:block;" 
                    onerror="this.style.display='none'; this.parentElement.innerHTML='⚽';">`;
            } else {
                badgeEl.innerHTML = '⚽';
            }
        }
        
        const budget = (window.gameState.selectedTeam?.budget || 50000000) / 1000000;
        const budgetEl = document.getElementById('clubBudget');
        if (budgetEl) {
            budgetEl.textContent = '£' + budget.toFixed(0) + 'M';
        }
        
        const seasonEl = document.getElementById('currentSeason');
        if (seasonEl) {
            seasonEl.textContent = window.gameState.season;
        }
        
        const overallEl = document.getElementById('teamOverall');
        if (overallEl && window.gameState.selectedTeam) {
            overallEl.textContent = window.gameState.selectedTeam.overall_rating;
        }
    };

    /**
     * Show tab – unified version
     */
    window.showTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const tabEl = document.getElementById('tab-' + tabName);
        if (tabEl) tabEl.classList.add('active');

        // Highlight the correct nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            const onclick = item.getAttribute('onclick') || '';
            if (onclick.includes("'" + tabName + "'")) {
                item.classList.add('active');
            }
        });

        // Populate Career Hub stats when showing central tab
        if (tabName === 'central') {
            window.updateCareerHub();
        }

        // Render formation when showing squad tab
        if (tabName === 'squad') {
            window.renderFormation();
        }

        // On-demand render for tabs that need fresh data
        if (tabName === 'office' && typeof window.renderOffice === 'function') {
            window.renderOffice();
        }
        if (tabName === 'transfers' && typeof window.renderTransferHub === 'function') {
            window.renderTransferHub();
        }
    };

    // ============================================================
    // CENTRAL TAB / CAREER HUB
    // ============================================================

    /**
     * Update central tab
     */
    window.updateCentralTab = function() {
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl && window.gameState.currentDate) {
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            currentDateEl.textContent = window.gameState.currentDate.toLocaleDateString('en-US', dateOptions);
        }
        
        if (window.gameState.nextMatch) {
            const opponent = window.gameState.nextMatch.home.team_name === window.gameState.selectedTeam.team_name 
                ? window.gameState.nextMatch.away 
                : window.gameState.nextMatch.home;
            
            const nextOpponentEl = document.getElementById('nextOpponent');
            if (nextOpponentEl) {
                nextOpponentEl.textContent = opponent.team_name;
            }
            
            const daysUntilMatchEl = document.getElementById('daysUntilMatch');
            if (daysUntilMatchEl && window.gameState.currentDate) {
                const daysUntil = Math.ceil((window.gameState.nextMatch.date - window.gameState.currentDate) / (1000 * 60 * 60 * 24));
                daysUntilMatchEl.textContent = Math.max(0, daysUntil);
            }
            
            const nextMatchDateEl = document.getElementById('nextMatchDate');
            if (nextMatchDateEl) {
                const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                nextMatchDateEl.textContent = window.gameState.nextMatch.date.toLocaleDateString('en-US', dateOptions);
            }
            
            const homeTeamNameEl = document.getElementById('homeTeamName');
            if (homeTeamNameEl) {
                homeTeamNameEl.textContent = window.gameState.nextMatch.home.team_name;
            }
            
            const awayTeamNameEl = document.getElementById('awayTeamName');
            if (awayTeamNameEl) {
                awayTeamNameEl.textContent = window.gameState.nextMatch.away.team_name;
            }
            
            // Update badges
            const homeLogoUrl = window.gameState.nextMatch.home.club_logo_url;
            const awayLogoUrl = window.gameState.nextMatch.away.club_logo_url;
            
            const homeBadge = document.getElementById('homeTeamBadge');
            const awayBadge = document.getElementById('awayTeamBadge');
            
            if (homeBadge) {
                if (homeLogoUrl) {
                    homeBadge.innerHTML = `<img src="${homeLogoUrl}" alt="${window.gameState.nextMatch.home.team_name}" 
                        onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='⚽';">`;
                } else {
                    homeBadge.textContent = '⚽';
                }
            }
            
            if (awayBadge) {
                if (awayLogoUrl) {
                    awayBadge.innerHTML = `<img src="${awayLogoUrl}" alt="${window.gameState.nextMatch.away.team_name}" 
                        onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='⚽';">`;
                } else {
                    awayBadge.textContent = '⚽';
                }
            }
        }
        
        // FIXED: Added null checks to prevent "Cannot set properties of null" error
        const availPlayersEl = document.getElementById('availablePlayers');
        if (availPlayersEl && window.gameState.squad) {
            availPlayersEl.textContent = window.gameState.squad.length;
        }
        
        const injuredPlayersEl = document.getElementById('injuredPlayers');
        if (injuredPlayersEl) {
            injuredPlayersEl.textContent = '0';
        }
        
        window.generateNews();
    };

    window.updateCareerHub = function() {
        // Header club info
        const headerClubNameEl = document.getElementById('headerClubName');
        const headerClubBadgeEl = document.getElementById('headerClubBadge');
        
        if (headerClubNameEl && window.gameState.selectedTeam) {
            headerClubNameEl.textContent = window.gameState.selectedTeam.team_name;
        }
        
        if (headerClubBadgeEl && window.gameState.selectedTeam?.club_logo_url) {
            headerClubBadgeEl.innerHTML = `<img src="${window.gameState.selectedTeam.club_logo_url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.parentElement.innerHTML='⚽';">`;
        }

        // Advance date
        const advanceDateEl = document.getElementById('advanceDate');
        if (advanceDateEl && window.gameState.currentDate) {
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            advanceDateEl.textContent = monthNames[window.gameState.currentDate.getMonth()] + ' ' + window.gameState.currentDate.getFullYear();
        }

        // Featured news
        const featuredHeadlineEl = document.getElementById('featuredHeadline');
        const featuredDateEl = document.getElementById('featuredDate');
        if (featuredHeadlineEl) {
            featuredHeadlineEl.textContent = 'SEASON UNDERWAY - FIXTURES SCHEDULED';
        }
        if (featuredDateEl && window.gameState.currentDate) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            featuredDateEl.textContent = dayNames[window.gameState.currentDate.getDay()] + ', ' + monthNames[window.gameState.currentDate.getMonth()] + ' ' + window.gameState.currentDate.getDate() + ', ' + window.gameState.currentDate.getFullYear();
        }

        // Transfer network
        if (typeof window.updateTransferNetwork === 'function') {
            window.updateTransferNetwork();
        }
    };

    window.advanceToNextMatch = function() {
        if (window.gameState.nextMatch) {
            window.simulateMatch();
        } else {
            alert('No upcoming matches scheduled!');
        }
    };

    // ============================================================
    // NEWS GENERATION
    // ============================================================

    /**
     * Generate news articles
     */
    window.generateNews = function() {
        const teamName = window.gameState.selectedTeam?.team_name || 'Your club';
        
        const newsArticles = [
            {
                category: 'TRANSFER',
                title: `${teamName} scouts monitoring top talents across Europe`,
                excerpt: 'The club is actively tracking several promising players as they prepare for the upcoming transfer window...',
                date: '2 hours ago'
            },
            {
                category: 'MATCH',
                title: 'Team preparing for crucial upcoming fixture',
                excerpt: 'The squad has been working hard in training ahead of the next important league match...',
                date: '5 hours ago'
            },
            {
                category: 'SQUAD',
                title: 'Players showing great form in training',
                excerpt: 'Several key players have impressed coaching staff with their recent performances in practice sessions...',
                date: '1 day ago'
            },
            {
                category: 'CLUB',
                title: `${teamName} announces community initiative`,
                excerpt: 'The club continues its commitment to local community with new youth development program...',
                date: '2 days ago'
            }
        ];

        const mainGrid = document.getElementById('newsGrid');
        const centralGrid = document.getElementById('centralNewsGrid');
        
        [mainGrid, centralGrid].forEach(grid => {
            if (!grid) return;
            
            grid.innerHTML = '';
            const articles = grid.id === 'centralNewsGrid' ? newsArticles.slice(0, 2) : newsArticles;
            
            articles.forEach(article => {
                const card = document.createElement('div');
                card.className = 'news-article';
                card.innerHTML = `
                    <div class="news-header">
                        <div class="news-category">${article.category}</div>
                        <div class="news-date">${article.date}</div>
                    </div>
                    <div class="news-title">${article.title}</div>
                    <div class="news-excerpt">${article.excerpt}</div>
                `;
                grid.appendChild(card);
            });
        });
    };

    // ============================================================
    // LEAGUE TABLE
    // ============================================================

    /**
     * Generate league table
     */
    window.generateLeagueTable = function() {
        if (!window.gameState.selectedTeam) return;

        const league = window.gameState.selectedTeam.league_name;
        const leagueTeams = window.gameState.allTeams.filter(t => t.league_name === league);

        const table = leagueTeams.map(team => {
            const isYourTeam = team.team_name === window.gameState.selectedTeam.team_name;
            const played = isYourTeam ? window.gameState.seasonStats.matches : Math.floor(Math.random() * 20) + 10;
            const wins = isYourTeam ? window.gameState.seasonStats.wins : Math.floor(Math.random() * (played * 0.6));
            const losses = isYourTeam ? window.gameState.seasonStats.losses : Math.floor(Math.random() * (played * 0.3));
            const draws = isYourTeam ? window.gameState.seasonStats.draws : Math.max(0, played - wins - losses);
            const points = wins * 3 + draws;

            return {
                name: team.team_name,
                played,
                wins,
                draws,
                losses,
                points,
                isYourTeam
            };
        });

        table.sort((a, b) => b.points - a.points);

        const tableEl = document.getElementById('leagueTable');
        if (!tableEl) return;
        
        tableEl.innerHTML = `
            <div class="table-header">
                <div>POS</div>
                <div>TEAM</div>
                <div>P</div>
                <div>W</div>
                <div>D</div>
                <div>L</div>
                <div>PTS</div>
            </div>
        `;

        table.forEach((team, index) => {
            const row = document.createElement('div');
            row.className = 'table-row' + (team.isYourTeam ? ' your-team' : '');
            row.innerHTML = `
                <div><div class="position-number">${index + 1}</div></div>
                <div style="font-weight: 600;">${team.name}</div>
                <div>${team.played}</div>
                <div>${team.wins}</div>
                <div>${team.draws}</div>
                <div>${team.losses}</div>
                <div style="font-weight: 700; color: #ffd900;">${team.points}</div>
            `;
            tableEl.appendChild(row);
        });

        const leagueNameEl = document.getElementById('leagueName');
        if (leagueNameEl) {
            leagueNameEl.textContent = league + ' Table';
        }
        
        window.updateSeasonStats();
    };

    /**
     * Update season stats display
     */
    window.updateSeasonStats = function() {
        const matchesPlayedEl = document.getElementById('matchesPlayed');
        if (matchesPlayedEl) {
            matchesPlayedEl.textContent = window.gameState.seasonStats.matches;
        }
        
        const winsEl = document.getElementById('wins');
        if (winsEl) {
            winsEl.textContent = window.gameState.seasonStats.wins;
        }
        
        const drawsEl = document.getElementById('draws');
        if (drawsEl) {
            drawsEl.textContent = window.gameState.seasonStats.draws;
        }
        
        const lossesEl = document.getElementById('losses');
        if (lossesEl) {
            lossesEl.textContent = window.gameState.seasonStats.losses;
        }
        
        const goalsScoredEl = document.getElementById('goalsScored');
        if (goalsScoredEl) {
            goalsScoredEl.textContent = window.gameState.seasonStats.goalsScored;
        }
        
        const goalsConcededEl = document.getElementById('goalsConceded');
        if (goalsConcededEl) {
            goalsConcededEl.textContent = window.gameState.seasonStats.goalsConceded;
        }
    };

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    window.getOrdinalSuffix = function(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    console.log('✅ UI module loaded');

})(window);
