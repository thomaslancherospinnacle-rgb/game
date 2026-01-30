/**
 * FIFA MANAGER GAME - Main Game Logic
 * Loads data from teams.json and players.json
 */

// Game State
const gameState = {
    selectedTeam: null,
    squad: [],
    allTeams: [],
    allPlayers: [],
    teamsMap: {},
    playersMap: {},
    currentDate: new Date(2025, 0, 30),
    season: '2024/25',
    nextMatch: null,
    seasonStats: {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScored: 0,
        goalsConceded: 0
    },
    fixtures: [],
    matchday: 1,
    currentLeagueFilter: 'All'
};

// Match Simulator
let matchSimulator;

/**
 * Initialize game - load data and setup
 */
async function init() {
    console.log('🎮 Initializing FIFA Manager...');
    
    try {
        // Show loading screen
        showLoading('Loading teams data...');
        
        // Load teams
        await loadTeamsData();
        
        showLoading('Loading players data...');
        
        // Load players
        await loadPlayersData();
        
        showLoading('Organizing data...');
        
        // Organize data
        organizeData();
        
        // Initialize match simulator
        matchSimulator = new MatchSimulation();
        
        // Hide loading, show team selection
        hideLoading();
        showTeamSelection();
        
        console.log('✅ Game initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing game:', error);
        showError('Failed to load game data. Please ensure teams.json and players.json are in the same directory.');
    }
}

/**
 * Load teams from teams.json
 */
async function loadTeamsData() {
    try {
        const response = await fetch('teams.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        gameState.allTeams = await response.json();
        console.log(`✅ Loaded ${gameState.allTeams.length} teams`);
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        throw new Error('Could not load teams.json. Make sure it exists in the root directory.');
    }
}

/**
 * Load players from players.json
 */
async function loadPlayersData() {
    try {
        const response = await fetch('players.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        gameState.allPlayers = await response.json();
        console.log(`✅ Loaded ${gameState.allPlayers.length} players`);
    } catch (error) {
        console.error('❌ Error loading players:', error);
        throw new Error('Could not load players.json. Make sure it exists in the root directory.');
    }
}

/**
 * Organize data into maps and calculate team ratings
 */
function organizeData() {
    // Create teams map
    gameState.allTeams.forEach(team => {
        gameState.teamsMap[team.team_name] = team;
    });
    
    // Create players map by team
    gameState.allPlayers.forEach(player => {
        const teamName = player.club?.name;
        if (teamName) {
            if (!gameState.playersMap[teamName]) {
                gameState.playersMap[teamName] = [];
            }
            gameState.playersMap[teamName].push(player);
        }
    });
    
    // Calculate team overall ratings from squad
    gameState.allTeams.forEach(team => {
        const squad = gameState.playersMap[team.team_name] || [];
        if (squad.length > 0) {
            const top11 = squad
                .sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0))
                .slice(0, 11);
            const avgRating = top11.reduce((sum, p) => sum + (p.ratings?.overall || 70), 0) / top11.length;
            team.overall_rating = Math.round(avgRating);
        } else {
            team.overall_rating = team.overall_rating || 75;
        }
        
        // Set default budget if not exists
        team.budget = team.budget || 50000000;
    });
    
    console.log('✅ Data organized successfully');
    console.log(`   Teams with players: ${Object.keys(gameState.playersMap).length}`);
}

/**
 * Show loading screen with message
 */
function showLoading(message) {
    document.getElementById('loadingScreen').classList.remove('hidden');
    document.getElementById('loadingProgress').textContent = message;
}

/**
 * Hide loading screen
 */
function hideLoading() {
    document.getElementById('loadingScreen').classList.add('hidden');
}

/**
 * Show error message
 */
function showError(message) {
    const loadingScreen = document.getElementById('loadingScreen');
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

/**
 * Show team selection modal
 */
function showTeamSelection() {
    const modal = document.getElementById('teamSelectModal');
    const filterContainer = document.getElementById('leagueFilter');
    const grid = document.getElementById('teamGrid');
    
    // Get unique leagues
    const leagues = ['All', ...new Set(gameState.allTeams.map(t => t.league_name).filter(Boolean))];
    
    // Create league filters
    filterContainer.innerHTML = '';
    leagues.forEach(league => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (league === 'All' ? ' active' : '');
        btn.textContent = league;
        btn.onclick = () => filterTeams(league);
        filterContainer.appendChild(btn);
    });
    
    // Display teams
    displayTeams();
    
    modal.classList.remove('hidden');
}

/**
 * Filter teams by league
 */
function filterTeams(league) {
    gameState.currentLeagueFilter = league;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === league);
    });
    
    // Display filtered teams
    displayTeams();
}

/**
 * Display teams in grid
 */
function displayTeams() {
    const grid = document.getElementById('teamGrid');
    grid.innerHTML = '';
    
    const filteredTeams = gameState.currentLeagueFilter === 'All' 
        ? gameState.allTeams 
        : gameState.allTeams.filter(t => t.league_name === gameState.currentLeagueFilter);
    
    filteredTeams
        .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
        .forEach(team => {
            const card = document.createElement('div');
            card.className = 'team-card';
            
            const logoUrl = team.club_logo_url || '';
            const logoHtml = logoUrl 
                ? `<img src="${logoUrl}" alt="${team.team_name}" onerror="this.style.display='none'; this.parentElement.textContent='⚽';">`
                : '⚽';
            
            card.innerHTML = `
                <div class="team-card-badge">${logoHtml}</div>
                <div class="team-card-name">${team.team_name}</div>
                <div class="team-card-league">${team.league_name || 'League'}</div>
                <div class="team-card-rating">${team.overall_rating || 75}</div>
            `;
            card.onclick = () => selectTeam(team);
            grid.appendChild(card);
        });
}

/**
 * Select a team and start career
 */
async function selectTeam(team) {
    console.log('✅ Selected team:', team.team_name);
    
    gameState.selectedTeam = team;
    
    // Load squad for selected team
    loadSquad(team);
    
    // Generate fixtures
    generateFixtures();
    
    // Hide modal
    document.getElementById('teamSelectModal').classList.add('hidden');
    
    // Update UI
    updateHeader();
    renderSquad();
    generateLeagueTable();
    generateNews();
    updateCentralTab();
    renderFixtures();
}

/**
 * Load squad for team
 */
function loadSquad(team) {
    gameState.squad = gameState.playersMap[team.team_name] || [];
    
    // Sort by overall rating
    gameState.squad.sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));
    
    console.log(`✅ Loaded squad: ${gameState.squad.length} players`);
}

/**
 * Generate fixtures for the season
 */
function generateFixtures() {
    const league = gameState.selectedTeam.league_name;
    const leagueTeams = gameState.allTeams.filter(t => t.league_name === league);
    
    gameState.fixtures = [];
    
    // Generate fixtures against each team (home and away)
    leagueTeams.forEach(opponent => {
        if (opponent.team_name !== gameState.selectedTeam.team_name) {
            // Home fixture
            const homeDate = new Date(gameState.currentDate);
            homeDate.setDate(homeDate.getDate() + (gameState.fixtures.length * 7));
            
            gameState.fixtures.push({
                date: homeDate,
                home: gameState.selectedTeam,
                away: opponent,
                played: false
            });
            
            // Away fixture
            const awayDate = new Date(gameState.currentDate);
            awayDate.setDate(awayDate.getDate() + ((gameState.fixtures.length + 1) * 7));
            
            gameState.fixtures.push({
                date: awayDate,
                home: opponent,
                away: gameState.selectedTeam,
                played: false
            });
        }
    });
    
    // Shuffle fixtures for variety
    for (let i = gameState.fixtures.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.fixtures[i], gameState.fixtures[j]] = [gameState.fixtures[j], gameState.fixtures[i]];
    }
    
    // Update dates after shuffle
    gameState.fixtures.forEach((fixture, index) => {
        const date = new Date(gameState.currentDate);
        date.setDate(date.getDate() + (index * 4)); // Match every 4 days
        fixture.date = date;
    });
    
    gameState.nextMatch = gameState.fixtures[0];
    
    console.log(`✅ Generated ${gameState.fixtures.length} fixtures`);
}

/**
 * Update header with team info
 */
function updateHeader() {
    document.getElementById('clubName').textContent = gameState.selectedTeam.team_name;
    
    const logoUrl = gameState.selectedTeam.club_logo_url;
    if (logoUrl) {
        document.getElementById('clubBadge').innerHTML = 
            `<img src="${logoUrl}" alt="${gameState.selectedTeam.team_name}" onerror="this.style.display='none'; this.parentElement.textContent='⚽';">`;
    } else {
        document.getElementById('clubBadge').textContent = '⚽';
    }
    
    const budget = gameState.selectedTeam.budget / 1000000;
    document.getElementById('clubBudget').textContent = '£' + budget.toFixed(0) + 'M';
    document.getElementById('currentSeason').textContent = gameState.season;
    document.getElementById('teamOverall').textContent = gameState.selectedTeam.overall_rating;
}

/**
 * Update central tab
 */
function updateCentralTab() {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = gameState.currentDate.toLocaleDateString('en-US', dateOptions);
    
    if (gameState.nextMatch) {
        const opponent = gameState.nextMatch.home.team_name === gameState.selectedTeam.team_name 
            ? gameState.nextMatch.away 
            : gameState.nextMatch.home;
        
        document.getElementById('nextOpponent').textContent = opponent.team_name;
        const daysUntil = Math.ceil((gameState.nextMatch.date - gameState.currentDate) / (1000 * 60 * 60 * 24));
        document.getElementById('daysUntilMatch').textContent = Math.max(0, daysUntil);
        document.getElementById('nextMatchDate').textContent = gameState.nextMatch.date.toLocaleDateString('en-US', dateOptions);
        document.getElementById('homeTeamName').textContent = gameState.nextMatch.home.team_name;
        document.getElementById('awayTeamName').textContent = gameState.nextMatch.away.team_name;
        
        // Update badges
        const homeLogoUrl = gameState.nextMatch.home.club_logo_url;
        const awayLogoUrl = gameState.nextMatch.away.club_logo_url;
        
        document.getElementById('homeTeamBadge').innerHTML = homeLogoUrl 
            ? `<img src="${homeLogoUrl}" alt="${gameState.nextMatch.home.team_name}" onerror="this.style.display='none'; this.parentElement.textContent='⚽';">`
            : '⚽';
        
        document.getElementById('awayTeamBadge').innerHTML = awayLogoUrl 
            ? `<img src="${awayLogoUrl}" alt="${gameState.nextMatch.away.team_name}" onerror="this.style.display='none'; this.parentElement.textContent='⚽';">`
            : '⚽';
    }
    
    document.getElementById('availablePlayers').textContent = gameState.squad.length;
    document.getElementById('injuredPlayers').textContent = '0';
    
    generateNews();
}

/**
 * Render squad
 */
function renderSquad() {
    const grid = document.getElementById('squadGrid');
    grid.innerHTML = '';
    
    gameState.squad.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        const faceUrl = player.media?.face_url || '';
        const faceHtml = faceUrl 
            ? `<img src="${faceUrl}" alt="${player.basic_info?.short_name}" onerror="this.style.display='none'; this.parentElement.textContent='👤';">` 
            : '👤';
        
        const positions = player.player_positions || 'SUB';
        const overall = player.ratings?.overall || 65;
        const pace = player.core_attributes?.pace || 50;
        const shooting = player.core_attributes?.shooting || 50;
        const passing = player.core_attributes?.passing || 50;
        const dribbling = player.core_attributes?.dribbling || 50;
        const defending = player.core_attributes?.defending || 50;
        const physic = player.core_attributes?.physic || 50;
        
        card.innerHTML = `
            <div class="player-card-header">
                <div class="player-overall">${overall}</div>
                <div class="player-position">${positions.split(',')[0].trim()}</div>
            </div>
            <div class="player-face">${faceHtml}</div>
            <div class="player-name">${player.basic_info?.short_name || 'Unknown'}</div>
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
    
    document.getElementById('squadSubtitle').textContent = `${gameState.squad.length} players in your squad`;
}

/**
 * Generate league table
 */
function generateLeagueTable() {
    if (!gameState.selectedTeam) return;

    const league = gameState.selectedTeam.league_name;
    const leagueTeams = gameState.allTeams.filter(t => t.league_name === league);

    const table = leagueTeams.map(team => {
        const isYourTeam = team.team_name === gameState.selectedTeam.team_name;
        const played = isYourTeam ? gameState.seasonStats.matches : Math.floor(Math.random() * 20) + 10;
        const wins = isYourTeam ? gameState.seasonStats.wins : Math.floor(Math.random() * (played * 0.6));
        const losses = isYourTeam ? gameState.seasonStats.losses : Math.floor(Math.random() * (played * 0.3));
        const draws = isYourTeam ? gameState.seasonStats.draws : Math.max(0, played - wins - losses);
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

    document.getElementById('leagueName').textContent = league + ' Table';
    updateSeasonStats();
}

/**
 * Update season stats display
 */
function updateSeasonStats() {
    document.getElementById('matchesPlayed').textContent = gameState.seasonStats.matches;
    document.getElementById('wins').textContent = gameState.seasonStats.wins;
    document.getElementById('draws').textContent = gameState.seasonStats.draws;
    document.getElementById('losses').textContent = gameState.seasonStats.losses;
    document.getElementById('goalsScored').textContent = gameState.seasonStats.goalsScored;
    document.getElementById('goalsConceded').textContent = gameState.seasonStats.goalsConceded;
}

/**
 * Generate news articles
 */
function generateNews() {
    const teamName = gameState.selectedTeam?.team_name || 'Your club';
    
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
}

/**
 * Render fixtures list
 */
function renderFixtures() {
    const container = document.getElementById('fixturesContent');
    container.innerHTML = '';
    
    const upcomingFixtures = gameState.fixtures.filter(f => !f.played).slice(0, 10);
    
    upcomingFixtures.forEach(fixture => {
        const isHome = fixture.home.team_name === gameState.selectedTeam.team_name;
        const opponent = isHome ? fixture.away : fixture.home;
        const venue = isHome ? 'Home' : 'Away';
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '15px';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 5px;">
                        ${fixture.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div style="font-weight: 700; font-size: 1.1rem;">
                        ${isHome ? gameState.selectedTeam.team_name : opponent.team_name} vs ${isHome ? opponent.team_name : gameState.selectedTeam.team_name}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; color: #00d4ff; font-weight: 700;">${venue}</div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">${fixture.home.league_name}</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Simulate next match
 */
function simulateMatch() {
    if (!gameState.nextMatch) return;
    
    console.log('⚽ Simulating match...');
    
    // Prepare teams with squads
    const homeTeam = {
        ...gameState.nextMatch.home,
        squad: gameState.playersMap[gameState.nextMatch.home.team_name] || []
    };
    
    const awayTeam = {
        ...gameState.nextMatch.away,
        squad: gameState.playersMap[gameState.nextMatch.away.team_name] || []
    };
    
    // Simulate
    const result = matchSimulator.simulateMatch(homeTeam, awayTeam, {
        competition: gameState.selectedTeam.league_name,
        matchday: gameState.matchday
    });
    
    // Update stats
    gameState.seasonStats.matches++;
    
    const isHome = homeTeam.team_name === gameState.selectedTeam.team_name;
    const yourScore = isHome ? result.homeScore : result.awayScore;
    const oppScore = isHome ? result.awayScore : result.homeScore;
    
    gameState.seasonStats.goalsScored += yourScore;
    gameState.seasonStats.goalsConceded += oppScore;
    
    if (result.winner === (isHome ? 'home' : 'away')) {
        gameState.seasonStats.wins++;
    } else if (result.winner === 'draw') {
        gameState.seasonStats.draws++;
    } else {
        gameState.seasonStats.losses++;
    }
    
    // Mark as played
    gameState.nextMatch.played = true;
    gameState.nextMatch.result = result;
    
    // Next match
    const unplayed = gameState.fixtures.filter(f => !f.played);
    gameState.nextMatch = unplayed.length > 0 ? unplayed[0] : null;
    gameState.matchday++;
    
    // Advance date
    gameState.currentDate.setDate(gameState.currentDate.getDate() + 4);
    
    // Show result
    showMatchResult(result);
    
    // Update UI
    updateCentralTab();
    generateLeagueTable();
    renderFixtures();
}

/**
 * Show match result modal
 */
function showMatchResult(result) {
    const modal = document.getElementById('matchResultModal');
    const content = document.getElementById('matchResultContent');
    
    const winnerText = result.winner === 'home' ? `${result.homeTeam} WINS!` :
                      result.winner === 'away' ? `${result.awayTeam} WINS!` :
                      'DRAW!';
    
    content.innerHTML = `
        <h2 class="modal-title">Match Result</h2>
        <div class="result-winner">${winnerText}</div>
        
        <div class="result-scoreline">
            <div class="result-team">
                <div class="result-team-name">${result.homeTeam}</div>
                <div class="result-score">${result.homeScore}</div>
            </div>
            <div class="result-vs">-</div>
            <div class="result-team">
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
}

/**
 * Close match result modal
 */
function closeMatchResult() {
    document.getElementById('matchResultModal').classList.add('hidden');
}

/**
 * Show tab
 */
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    document.getElementById('tab-' + tabName).classList.add('active');
    event.target.classList.add('active');
}

// Start game when page loads
window.onload = init;
