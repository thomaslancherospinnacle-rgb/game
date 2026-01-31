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

// Transfer System
let transferSystem;

/**
 * Initialize game - load data and setup
 */
async function init() {
    console.log('ðŸŽ® Initializing FIFA Manager...');
    
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
        
        // Initialize transfer system
        transferSystem = new TransferSystem(gameState);
        
        // Check if data was preloaded from index.html
        const preloadedTeams = localStorage.getItem('fifaAllTeams');
        const selectedTeamData = localStorage.getItem('fifaSelectedTeam');
        
        // Use preloaded teams if available (players.json is too large for localStorage)
        if (preloadedTeams && preloadedTeams !== 'undefined') {
            gameState.allTeams = JSON.parse(preloadedTeams);
            console.log(`âœ… Used preloaded teams: ${gameState.allTeams.length}`);
        }
        
        if (selectedTeamData && selectedTeamData !== 'undefined') {
            // Team was selected from index.html, load it directly
            const teamData = JSON.parse(selectedTeamData);
            const team = gameState.allTeams.find(t => t.team_name === teamData.team_name);
            
            if (team) {
                hideLoading();
                await selectTeam(team);
                console.log('âœ… Game initialized with pre-selected team:', team.team_name);
                return;
            }
        }
        
        // No team selected, show team selection
        hideLoading();
        showTeamSelection();
        
        console.log('âœ… Game initialized successfully');
        
    } catch (error) {
        console.error('âŒ Error initializing game:', error);
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
        console.log(`âœ… Loaded ${gameState.allTeams.length} teams`);
    } catch (error) {
        console.error('âŒ Error loading teams:', error);
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
        console.log(`âœ… Loaded ${gameState.allPlayers.length} players`);
    } catch (error) {
        console.error('âŒ Error loading players:', error);
        throw new Error('Could not load players.json. Make sure it exists in the root directory.');
    }
}

/**
 * Organize data into maps and calculate team ratings
 */
function organizeData() {
    console.log('ðŸ“Š Organizing data...');
    
    // Create teams map
    gameState.allTeams.forEach(team => {
        gameState.teamsMap[team.team_name] = team;
    });
    
    // Create players map by team - try multiple matching strategies
    gameState.allPlayers.forEach(player => {
        const clubName = player.club?.name;
        if (!clubName) return;
        
        // Add to exact match
        if (!gameState.playersMap[clubName]) {
            gameState.playersMap[clubName] = [];
        }
        gameState.playersMap[clubName].push(player);
    });
    
    console.log(`âœ… Teams mapped: ${Object.keys(gameState.teamsMap).length}`);
    console.log(`âœ… Teams with players: ${Object.keys(gameState.playersMap).length}`);
    
    // Log some examples for debugging
    const teamsWithPlayers = Object.keys(gameState.playersMap).slice(0, 5);
    console.log('ðŸ“ Sample teams with players:', teamsWithPlayers);
    
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
    
    console.log('âœ… Data organized successfully');
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
            <div class="error-title">âš ï¸ Error Loading Game</div>
            <div class="error-text">${message}</div>
            <div class="error-text" style="margin-top: 15px;">
                <strong>Required files:</strong><br>
                â€¢ teams.json<br>
                â€¢ players.json<br>
                â€¢ Make sure they are in the root directory of your GitHub Pages site.
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
                ? `<img src="${logoUrl}" alt="${team.team_name}" onerror="this.style.display='none'; this.parentElement.textContent='âš½';">`
                : 'âš½';
            
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
    console.log('âœ… Selected team:', team.team_name);
    
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
    
    // Initialize transfer system and populate filter dropdowns
    transferSystem.init();
    populateTransferFilters();
    updateOfferBadge();
}

/**
 * Load squad for team
 */
function loadSquad(team) {
    // Try multiple matching strategies to find players
    const teamName = team.team_name;
    
    // Strategy 1: Exact match on club.name
    let squad = gameState.allPlayers.filter(p => p.club?.name === teamName);
    
    // Strategy 2: If no matches, try case-insensitive
    if (squad.length === 0) {
        const teamNameLower = teamName.toLowerCase();
        squad = gameState.allPlayers.filter(p => 
            p.club?.name?.toLowerCase() === teamNameLower
        );
    }
    
    // Strategy 3: If still no matches, try partial match
    if (squad.length === 0) {
        const teamNameLower = teamName.toLowerCase();
        squad = gameState.allPlayers.filter(p => {
            const clubName = p.club?.name?.toLowerCase() || '';
            return clubName.includes(teamNameLower) || teamNameLower.includes(clubName);
        });
    }
    
    // Strategy 4: If still nothing, try team_id match
    if (squad.length === 0 && team.team_id) {
        squad = gameState.allPlayers.filter(p => p.club?.id === team.team_id);
    }
    
    // If we found players, assign them
    if (squad.length > 0) {
        gameState.squad = squad;
        // Sort by overall rating
        gameState.squad.sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));
        console.log(`âœ… Loaded squad: ${gameState.squad.length} players for ${teamName}`);
    } else {
        // No players found - generate placeholder squad
        console.warn(`âš ï¸ No players found for ${teamName}, generating placeholder squad`);
        gameState.squad = generatePlaceholderSquad(team);
    }
}

/**
 * Generate placeholder squad if no real players found
 */
function generatePlaceholderSquad(team) {
    const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'RW', 'ST'];
    const firstNames = ['John', 'James', 'Michael', 'David', 'Robert', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    const squad = [];
    const baseRating = team.overall_rating || 75;
    
    for (let i = 0; i < 25; i++) {
        const position = positions[i % positions.length];
        const overall = baseRating + Math.floor(Math.random() * 10) - 5;
        
        squad.push({
            player_id: `placeholder_${i}`,
            basic_info: {
                short_name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
                age: 18 + Math.floor(Math.random() * 15),
                nationality: team.country || 'Various'
            },
            player_positions: position,
            ratings: {
                overall: overall,
                potential: overall + Math.floor(Math.random() * 10)
            },
            core_attributes: {
                pace: 60 + Math.floor(Math.random() * 30),
                shooting: 60 + Math.floor(Math.random() * 30),
                passing: 60 + Math.floor(Math.random() * 30),
                dribbling: 60 + Math.floor(Math.random() * 30),
                defending: 60 + Math.floor(Math.random() * 30),
                physic: 60 + Math.floor(Math.random() * 30)
            },
            media: {
                face_url: null
            },
            club: {
                name: team.team_name
            }
        });
    }
    
    return squad;
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
    
    console.log(`âœ… Generated ${gameState.fixtures.length} fixtures`);
}

/**
 * Update header with team info
 */
function updateHeader() {
    document.getElementById('clubName').textContent = gameState.selectedTeam.team_name;
    
    const logoUrl = gameState.selectedTeam.club_logo_url;
    const badgeEl = document.getElementById('clubBadge');
    
    if (logoUrl) {
        badgeEl.innerHTML = `<img src="${logoUrl}" alt="${gameState.selectedTeam.team_name}" 
            style="width:45px;height:45px;object-fit:contain;display:block;" 
            onerror="this.style.display='none'; this.parentElement.innerHTML='âš½';">`;
    } else {
        badgeEl.innerHTML = 'âš½';
    }
    
    const budget = gameState.selectedTeam.budget / 1000000;
    document.getElementById('clubBudget').textContent = 'Â£' + budget.toFixed(0) + 'M';
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
        
        // Update badges with proper error handling
        const homeLogoUrl = gameState.nextMatch.home.club_logo_url;
        const awayLogoUrl = gameState.nextMatch.away.club_logo_url;
        
        const homeBadge = document.getElementById('homeTeamBadge');
        const awayBadge = document.getElementById('awayTeamBadge');
        
        if (homeLogoUrl) {
            homeBadge.innerHTML = `<img src="${homeLogoUrl}" alt="${gameState.nextMatch.home.team_name}" 
                onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='âš½';">`;
        } else {
            homeBadge.textContent = 'âš½';
        }
        
        if (awayLogoUrl) {
            awayBadge.innerHTML = `<img src="${awayLogoUrl}" alt="${gameState.nextMatch.away.team_name}" 
                onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='âš½';">`;
        } else {
            awayBadge.textContent = 'âš½';
        }
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
        
        // Get face URL (now local)
        const faceUrl = player.media?.face_url || player.media?.player_face_url || player.face_url || '';
        
        let faceHtml = 'ðŸ‘¤';
        if (faceUrl) {
            faceHtml = `<img src="${faceUrl}" alt="${player.basic_info?.short_name || 'Player'}" 
                style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;" 
                onerror="this.style.display='none'; this.parentElement.innerHTML='ðŸ‘¤';">`;
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
        
        // Get team badges
        const homeBadge = fixture.home.club_logo_url
            ? `<img src="${fixture.home.club_logo_url}" alt="${fixture.home.team_name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='âš½';">`
            : 'âš½';
        
        const awayBadge = fixture.away.club_logo_url
            ? `<img src="${fixture.away.club_logo_url}" alt="${fixture.away.team_name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='âš½';">`
            : 'âš½';
        
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
}

/**
 * Simulate next match
 */
function simulateMatch() {
    if (!gameState.nextMatch) return;
    
    console.log('âš½ Simulating match...');
    
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
    
    // Tick transfer system (may generate new incoming offers)
    if (transferSystem) {
        transferSystem.tickOffers();
        updateOfferBadge();
    }
    
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
    
    // Get team badges
    const homeTeam = gameState.allTeams.find(t => t.team_name === result.homeTeam);
    const awayTeam = gameState.allTeams.find(t => t.team_name === result.awayTeam);
    
    const homeBadgeHtml = homeTeam?.club_logo_url 
        ? `<img src="${homeTeam.club_logo_url}" alt="${result.homeTeam}" style="width:100%;height:100%;object-fit:contain;padding:10px;" onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='âš½';"/>`
        : '<div style="font-size:3rem;">âš½</div>';
    
    const awayBadgeHtml = awayTeam?.club_logo_url
        ? `<img src="${awayTeam.club_logo_url}" alt="${result.awayTeam}" style="width:100%;height:100%;object-fit:contain;padding:10px;" onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='âš½';"/>`
        : '<div style="font-size:3rem;">âš½</div>';
    
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
}

/**
 * Close match result modal
 */
function closeMatchResult() {
    document.getElementById('matchResultModal').classList.add('hidden');
}

/**
 * Show tab – unified version
 */
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const tabEl = document.getElementById('tab-' + tabName);
    if (tabEl) tabEl.classList.add('active');

    // Highlight the correct nav item by matching its onclick string
    document.querySelectorAll('.nav-item').forEach(item => {
        const onclick = item.getAttribute('onclick') || '';
        if (onclick.includes("'" + tabName + "'")) {
            item.classList.add('active');
        }
    });

    // On-demand render for tabs that need fresh data each visit
    if (tabName === 'office'    && typeof renderOffice === 'function')     renderOffice();
    if (tabName === 'transfers' && typeof updateOfferBadge === 'function') updateOfferBadge();
}

/* ============================================================
   TRANSFER & OFFICE UI FUNCTIONS
   ============================================================ */

/** Populate league & country dropdowns in search filters */
function populateTransferFilters() {
    const leagues  = [...new Set(gameState.allTeams.map(t => t.league_name).filter(Boolean))].sort();
    const countries = [...new Set(gameState.allTeams.map(t => t.country).filter(Boolean))].sort();

    const leagueSel  = document.getElementById('filterLeague');
    const countrySel = document.getElementById('filterCountry');
    if (!leagueSel || !countrySel) return;

    leagueSel.innerHTML  = '<option value="">All Leagues</option>' + leagues.map(l => `<option value="${l}">${l}</option>`).join('');
    countrySel.innerHTML = '<option value="">All Countries</option>' + countries.map(c => `<option value="${c}">${c}</option>`).join('');
}

/** Debounced search trigger */
let searchTimeout = null;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(runSearch, 320);
}

/** Read filters and run search */
function runSearch() {
    if (!transferSystem) return;
    const filters = {
        query:       document.getElementById('searchQuery')?.value || '',
        position:    document.getElementById('filterPosition')?.value || '',
        league:      document.getElementById('filterLeague')?.value || '',
        country:     document.getElementById('filterCountry')?.value || '',
        minOvr:      parseInt(document.getElementById('filterMinOvr')?.value) || 0,
        maxOvr:      parseInt(document.getElementById('filterMaxOvr')?.value) || 0,
        maxPrice:    parseInt(document.getElementById('filterMaxPrice')?.value) || 0,
        freeAgents:  document.getElementById('filterFreeAgents')?.checked || false
    };

    // Need at least something to search
    if (!filters.query && !filters.position && !filters.league && !filters.country && !filters.freeAgents && !filters.minOvr) {
        document.getElementById('resultsCount').textContent = 'Use filters or search above to find players';
        document.getElementById('searchResults').innerHTML = '';
        return;
    }

    const results = transferSystem.searchPlayers(filters);
    document.getElementById('resultsCount').textContent = `${results.length} player${results.length !== 1 ? 's' : ''} found`;
    renderSearchResults(results);
}

/** Render the scout cards in the search grid */
function renderSearchResults(reports) {
    const grid = document.getElementById('searchResults');
    grid.innerHTML = '';

    reports.forEach(r => {
        const card = document.createElement('div');
        card.className = 'scout-card';
        card.onclick = () => openPlayerDetail(r);

        // Overall display
        const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : r.overall;

        // ── Face image – always rendered. SVG silhouette sits behind; img covers it on load ──
        let faceHtml;
        if (r.face_url) {
            faceHtml = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3a6a,#0d2240);display:flex;align-items:center;justify-content:center;position:relative;">
                <svg width="24" height="28" viewBox="0 0 32 36" fill="none" style="position:relative;z-index:0;"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
                <img src="${r.face_url}" alt="${r.short_name}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:1;" onerror="this.style.display='none';">
            </div>`;
        } else {
            faceHtml = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3a6a,#0d2240);display:flex;align-items:center;justify-content:center;">
                <svg width="24" height="28" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
            </div>`;
        }

        // Stats row
        const statsHtml = r.stats_known
            ? ['pace','shooting','passing','dribbling','defending','physic'].map(key => {
                const labels = { pace:'PAC', shooting:'SHO', passing:'PAS', dribbling:'DRI', defending:'DEF', physic:'PHY' };
                const val = r[key];
                if (val === null) return `<div class="scout-stat"><div class="scout-stat-label">${labels[key]}</div><div class="scout-stat-value hidden">?</div></div>`;
                if (typeof val === 'object') return `<div class="scout-stat"><div class="scout-stat-label">${labels[key]}</div><div class="scout-stat-value range">${val.min}-${val.max}</div></div>`;
                return `<div class="scout-stat"><div class="scout-stat-label">${labels[key]}</div><div class="scout-stat-value">${val}</div></div>`;
            }).join('')
            : '<div style="grid-column:1/-1;text-align:center;font-size:0.72rem;color:rgba(255,255,255,0.28);font-style:italic;padding:4px 0;">Scouts have limited information</div>';

        // Price
        let priceHtml;
        if (r.value_known && r.market_value !== null) {
            const mv = typeof r.market_value === 'object' ? `${transferSystem.formatMoney(r.market_value.min)}-${transferSystem.formatMoney(r.market_value.max)}` : transferSystem.formatMoney(r.market_value);
            priceHtml = `<div class="scout-price">€${mv}</div>`;
        } else {
            priceHtml = `<div class="scout-price unknown-price">Value unknown</div>`;
        }

        // Age display
        const ageStr = r.age ? `Age ${r.age}` : '—';

        card.innerHTML = `
            <span class="intel-tier ${r.tier}">${r.tier}</span>
            <div class="scout-card-top">
                <div class="scout-card-face">${faceHtml}</div>
                <div class="scout-card-right">
                    <div class="scout-card-ovr">
                        <div class="ovr-num">${ovrDisplay}</div>
                        <div class="ovr-label">OVR</div>
                    </div>
                    <div class="scout-card-info">
                        <div class="scout-card-name">${r.short_name}</div>
                        <div class="scout-card-club">${r.club} · ${r.league}</div>
                        <div class="scout-card-pos">${r.position} · ${ageStr}</div>
                    </div>
                </div>
            </div>
            <div class="scout-card-stats">${statsHtml}</div>
            <div class="scout-card-footer">
                ${priceHtml}
                <div class="scout-wage">${r.value_known && r.wage !== null ? 'Wage: €' + transferSystem.formatMoney(typeof r.wage === 'object' ? r.wage.min : r.wage) + '/wk' : 'Wage unknown'}</div>
            </div>`;

        grid.appendChild(card);
    });
}

/** Open the player detail modal with full scout report + bid form */
function openPlayerDetail(report) {
    const modal  = document.getElementById('playerDetailModal');
    const content = document.getElementById('playerDetailContent');

    // Overall & potential display helpers
    const fmtOvr = v => typeof v === 'object' ? `${v.min}-${v.max}` : v;
    const fmtVal = (v, prefix='€') => {
        if (v === null || v === undefined) return '?';
        if (typeof v === 'object') return `${prefix}${transferSystem.formatMoney(v.min)}-${transferSystem.formatMoney(v.max)}`;
        return `${prefix}${transferSystem.formatMoney(v)}`;
    };

    // Attribute bars
    const attrKeys = ['pace','shooting','passing','dribbling','defending','physic'];
    const attrLabels = { pace:'Pace', shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', physic:'Physical' };
    let attrsHtml = '';
    attrKeys.forEach(key => {
        const val = report[key];
        if (val === null) {
            attrsHtml += `<div class="detail-attr"><div class="detail-attr-label">${attrLabels[key]}</div><div class="detail-attr-bar-wrap"><div class="detail-attr-bar"><div class="detail-attr-bar-fill" style="width:20%;opacity:0.2;"></div></div><div class="detail-attr-val hidden-val">?</div></div></div>`;
        } else if (typeof val === 'object') {
            const pct = ((val.min + val.max) / 2) / 100 * 100;
            attrsHtml += `<div class="detail-attr"><div class="detail-attr-label">${attrLabels[key]}</div><div class="detail-attr-bar-wrap"><div class="detail-attr-bar"><div class="detail-attr-bar-fill" style="width:${pct}%;"></div></div><div class="detail-attr-val range">${val.min}-${val.max}</div></div></div>`;
        } else {
            const pct = val / 100 * 100;
            attrsHtml += `<div class="detail-attr"><div class="detail-attr-label">${attrLabels[key]}</div><div class="detail-attr-bar-wrap"><div class="detail-attr-bar"><div class="detail-attr-bar-fill" style="width:${pct}%;"></div></div><div class="detail-attr-val">${val}</div></div></div>`;
        }
    });

    // Contract status
    const currentYear = gameState.currentDate.getFullYear();
    const contractEnd = report.contract_until || 2025;
    const isFreeAgent = contractEnd <= currentYear;
    const isExpiring  = contractEnd <= currentYear + 1;

    // Release clause
    const releaseHtml = report.release_clause ? `<div class="detail-fin-item"><div class="detail-fin-label">Release Clause</div><div class="detail-fin-value">€${transferSystem.formatMoney(report.release_clause)}</div></div>` : '';

    // Face image for modal header – SVG silhouette behind, img layered on top
    let modalFaceHtml;
    if (report.face_url) {
        modalFaceHtml = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3a6a,#0d2240);display:flex;align-items:center;justify-content:center;position:relative;">
            <svg width="36" height="42" viewBox="0 0 32 36" fill="none" style="position:relative;z-index:0;"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
            <img src="${report.face_url}" alt="${report.short_name}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:1;" onerror="this.style.display='none';">
        </div>`;
    } else {
        modalFaceHtml = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3a6a,#0d2240);display:flex;align-items:center;justify-content:center;">
            <svg width="36" height="42" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
        </div>`;
    }

    content.innerHTML = `
        <button class="modal-close-btn" onclick="closePlayerDetail()">×</button>
        <div class="detail-header">
            <div class="detail-face-wrap">${modalFaceHtml}</div>
            <div class="detail-ovr-block">
                <div class="d-ovr">${fmtOvr(report.overall)}</div>
                <div class="d-pot">POT ${fmtOvr(report.potential)}</div>
            </div>
            <div class="detail-info-block">
                <div class="detail-name">${report.long_name || report.short_name}</div>
                <div class="detail-meta">
                    <span>🏴 ${report.nationality || '—'}</span>
                    <span>📍 ${report.club}</span>
                    <span>👟 ${report.preferred_foot || '—'}</span>
                    <span>⚡ ${report.work_rate || '—'}</span>
                </div>
                <div class="detail-meta" style="margin-top:3px;">
                    <span>📋 ${report.position}</span>
                    ${report.age ? `<span>🎂 Age ${report.age}</span>` : ''}
                    <span class="intel-tier ${report.tier}" style="display:inline-block;margin-left:4px;">${report.tier}</span>
                </div>
            </div>
        </div>

        <div class="detail-attrs">${attrsHtml}</div>

        <div class="detail-finances">
            <div class="detail-fin-item"><div class="detail-fin-label">Market Value</div><div class="detail-fin-value ${report.value_known ? '' : 'unknown'}">${fmtVal(report.market_value)}</div></div>
            <div class="detail-fin-item"><div class="detail-fin-label">Weekly Wage</div><div class="detail-fin-value ${report.value_known ? '' : 'unknown'}">${fmtVal(report.wage)}/wk</div></div>
            ${releaseHtml}
        </div>

        <div class="detail-contract-info">
            <span>📄 Contract until: <strong style="color:${isExpiring ? '#ff3366' : '#fff'}">${isFreeAgent ? 'FREE AGENT' : contractEnd}</strong></span>
            ${report.traits ? `<span>🏷️ ${report.traits}</span>` : ''}
        </div>

        <!-- Bid / Transfer Form -->
        <div class="bid-form" id="bidForm">
            <div class="bid-form-title">${isFreeAgent ? '✍️ Sign Free Agent' : '💰 Place a Bid'}</div>
            ${isFreeAgent ? `
                <div style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin-bottom:10px;">No transfer fee required. Negotiate contract directly.</div>
                <button class="bid-btn success" onclick="startContractNegotiation('${report.player_id}', 0)">Negotiate Contract</button>
            ` : `
                <div class="bid-form-row">
                    <span style="font-size:0.82rem;color:rgba(255,255,255,0.5);">€</span>
                    <input type="number" class="bid-input" id="bidAmount" placeholder="${report.value_known ? 'e.g. ' + transferSystem.formatMoney(typeof report.market_value === 'object' ? report.market_value.min : report.market_value) : 'Enter amount'}">
                    <button class="bid-btn" onclick="submitBid('${report.player_id}')">Place Bid</button>
                </div>
                <div class="bid-result" id="bidResult"></div>
            `}
        </div>

        <!-- Contract Negotiation Form (hidden until bid accepted) -->
        <div class="contract-form" id="contractForm">
            <div class="bid-form-title">✍️ Contract Negotiation</div>
            <div class="contract-form-row">
                <div class="contract-field">
                    <label>Contract Length</label>
                    <select id="contractLength">
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="3" selected>3 Years</option>
                        <option value="4">4 Years</option>
                        <option value="5">5 Years</option>
                    </select>
                </div>
                <div class="contract-field">
                    <label>Weekly Wage (€)</label>
                    <input type="number" id="contractWage" placeholder="e.g. 50000">
                </div>
                <div class="contract-field">
                    <label>Signing Bonus (€)</label>
                    <input type="number" id="contractBonus" placeholder="e.g. 500000">
                </div>
            </div>
            <div class="contract-form-row">
                <button class="bid-btn success" onclick="submitContract('${report.player_id}')">Sign Contract</button>
                <button class="bid-btn danger" onclick="closePlayerDetail()">Cancel</button>
            </div>
            <div class="bid-result" id="contractResult"></div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closePlayerDetail() {
    const modal = document.getElementById('playerDetailModal');
    modal.classList.add('hidden');
    modal.classList.remove('active');
}

/* ── BID LOGIC ── */
// Store pending transfer fee for contract step
let pendingTransferFee = 0;

function submitBid(playerId) {
    const amount = parseInt(document.getElementById('bidAmount')?.value) || 0;
    if (amount <= 0) { showBidResult('Enter a valid bid amount.', 'rejected'); return; }

    const result = transferSystem.placeBid(playerId, amount);

    if (result.status === 'accepted' || result.status === 'release_clause') {
        pendingTransferFee = result.fee || amount;
        showBidResult(result.message, 'success');
        // Show contract form
        setTimeout(() => {
            const cf = document.getElementById('contractForm');
            if (cf) cf.classList.add('show');
            // Pre-fill wage suggestion
            const player = gameState.allPlayers.find(p => p.player_id === playerId);
            if (player) {
                const suggestedWage = Math.floor((player.value?.wage_eur || transferSystem.estimateWage(player)) * 1.05 / 1000) * 1000;
                document.getElementById('contractWage').value = suggestedWage;
                document.getElementById('contractBonus').value = Math.floor(suggestedWage * 8);
            }
        }, 800);
    } else if (result.status === 'counter') {
        showBidResult(result.message, 'counter');
        // Update bid input with counter value
        document.getElementById('bidAmount').value = result.counter;
    } else if (result.status === 'rejected_open') {
        showBidResult(result.message, 'rejected');
    } else {
        showBidResult(result.message, 'rejected');
    }
}

function showBidResult(msg, type) {
    const el = document.getElementById('bidResult');
    if (!el) return;
    el.textContent = msg;
    el.className = 'bid-result show ' + type;
}

/* ── CONTRACT NEGOTIATION ── */
function startContractNegotiation(playerId, fee) {
    pendingTransferFee = fee;
    const cf = document.getElementById('contractForm');
    if (cf) cf.classList.add('show');
    // Pre-fill
    const player = gameState.allPlayers.find(p => p.player_id === playerId);
    if (player) {
        const suggestedWage = Math.floor((player.value?.wage_eur || transferSystem.estimateWage(player)) * 1.1 / 1000) * 1000;
        document.getElementById('contractWage').value = suggestedWage;
        document.getElementById('contractBonus').value = Math.floor(suggestedWage * 5);
    }
}

function submitContract(playerId) {
    const length = parseInt(document.getElementById('contractLength')?.value) || 3;
    const wage   = parseInt(document.getElementById('contractWage')?.value) || 0;
    const bonus  = parseInt(document.getElementById('contractBonus')?.value) || 0;

    if (wage <= 0) { showContractResult('Enter a weekly wage.', 'rejected'); return; }

    const player = gameState.allPlayers.find(p => p.player_id === playerId);
    if (!player) { showContractResult('Player not found.', 'rejected'); return; }

    const contractOffer = { length, weeklyWage: wage, signingBonus: bonus };
    const result = transferSystem.negotiateContract(player, contractOffer, pendingTransferFee);

    if (result.success) {
        // Finalise!
        transferSystem.finaliseTransfer(player, pendingTransferFee, contractOffer);
        showContractResult(`✅ ${result.message} Transfer complete!`, 'success');
        // Refresh squad view
        renderSquad();
        updateOfferBadge();
        // Close modal after a moment
        setTimeout(() => { closePlayerDetail(); runSearch(); }, 1200);
    } else if (result.reason === 'counter') {
        showContractResult(result.message, 'counter');
        // Auto-fill the counter values
        document.getElementById('contractLength').value = result.counter.length;
        document.getElementById('contractWage').value   = result.counter.weeklyWage;
    } else {
        showContractResult(result.message, 'rejected');
    }
}

function showContractResult(msg, type) {
    const el = document.getElementById('contractResult');
    if (!el) return;
    el.textContent = msg;
    el.className = 'bid-result show ' + type;
}

/* ── TRANSFER SUB-VIEW SWITCHER ── */
function switchTransferView(view) {
    // Hide all views
    ['search','offers','history'].forEach(v => {
        const el = document.getElementById('transferView-' + v);
        if (el) el.style.display = 'none';
    });
    // Show selected
    const target = document.getElementById('transferView-' + view);
    if (target) target.style.display = 'block';

    // Update subnav active state
    document.querySelectorAll('.transfer-subnav-btn').forEach((btn, i) => {
        btn.classList.toggle('active', ['search','offers','history'][i] === view);
    });

    // Render content for the view
    if (view === 'offers') renderOffers();
    if (view === 'history') renderHistory();
}

/* ── RENDER INCOMING OFFERS ── */
function renderOffers() {
    const container = document.getElementById('offersContent');
    if (!container || !transferSystem) return;

    const pending = transferSystem.getPendingOffers();
    updateOfferBadge();

    if (pending.length === 0) {
        container.innerHTML = '<div class="offers-empty">📬 No pending offers at this time.<br><span style="font-size:0.78rem;opacity:0.6;">Offers arrive as the season progresses.</span></div>';
        return;
    }

    container.innerHTML = pending.map(offer => `
        <div class="offer-card">
            <div class="offer-card-left">
                <div class="offer-card-player">
                    <div class="offer-card-player-name">${offer.playerName}</div>
                    <div class="offer-card-player-detail">OVR ${offer.playerOvr} · Your squad</div>
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div class="offer-card-amount">€${transferSystem.formatMoney(offer.amount)}</div>
                <div class="offer-card-from">from ${offer.club}</div>
            </div>
            <div class="offer-card-actions">
                <button class="offer-btn accept" onclick="acceptIncomingOffer(${offer.id})">Accept</button>
                <button class="offer-btn counter" onclick="promptCounter(${offer.id}, ${offer.amount})">Counter</button>
                <button class="offer-btn reject" onclick="rejectIncomingOffer(${offer.id})">Reject</button>
            </div>
        </div>
    `).join('');
}

function acceptIncomingOffer(offerId) {
    const result = transferSystem.acceptOffer(offerId);
    if (result.success) {
        renderSquad();
        renderOffers();
    }
}

function rejectIncomingOffer(offerId) {
    transferSystem.rejectOffer(offerId);
    renderOffers();
}

function promptCounter(offerId, currentAmount) {
    const newVal = prompt('Enter your counter-offer (€):', currentAmount);
    if (newVal === null) return;
    const amount = parseInt(newVal);
    if (isNaN(amount) || amount <= 0) return;
    const result = transferSystem.counterOffer(offerId, amount);
    renderOffers();
}

/* ── RENDER DEAL HISTORY ── */
function renderHistory() {
    const container = document.getElementById('historyContent');
    if (!container || !transferSystem) return;

    const history = transferSystem.transferHistory;
    if (history.length === 0) {
        container.innerHTML = '<div class="offers-empty">📋 No transfers completed yet this window.</div>';
        return;
    }

    container.innerHTML = history.map(deal => `
        <div class="history-card">
            <div class="history-type ${deal.type.toLowerCase()}">${deal.type}</div>
            <div class="history-card-info">
                <div class="history-card-name">${deal.player}</div>
                <div class="history-card-detail">${deal.type === 'IN' ? 'from ' + deal.from : 'to ' + deal.to} · ${deal.date?.toLocaleDateString('en-US', {month:'short', day:'numeric'}) || ''}</div>
            </div>
            <div class="history-card-fee">€${transferSystem.formatMoney(deal.fee)}</div>
        </div>
    `).join('');
}

/* ── RENDER OFFICE TAB ── */
function renderOffice() {
    if (!transferSystem) return;
    renderBudgetCards();
    renderContractsTable();
}

function renderBudgetCards() {
    const container = document.getElementById('officeBudgetCard');
    if (!container) return;

    const tb = transferSystem.transferBudget;
    const wb = transferSystem.wageBudget;
    const tw = transferSystem.totalWages;
    const teamOvr = gameState.selectedTeam?.overall_rating || 75;
    const maxWages = Math.floor(teamOvr * 18000);

    const tbClass = tb > 10000000 ? 'green' : (tb > 2000000 ? 'yellow' : 'red');
    const wbClass = wb > 20000  ? 'green' : (wb > 5000 ? 'yellow' : 'red');
    const tbItemClass = tb < 5000000 ? 'warning' : '';
    const wbItemClass = wb < 10000  ? 'danger' : '';

    container.innerHTML = `
        <div class="budget-item ${tbItemClass}">
            <div class="budget-label">Transfer Budget</div>
            <div class="budget-value ${tbClass}">€${transferSystem.formatMoney(tb)}</div>
            <div class="budget-sub">Available for signings</div>
        </div>
        <div class="budget-item ${wbItemClass}">
            <div class="budget-label">Wage Budget</div>
            <div class="budget-value ${wbClass}">€${transferSystem.formatMoney(wb)}/wk</div>
            <div class="budget-sub">Remaining wage capacity</div>
        </div>
        <div class="budget-item">
            <div class="budget-label">Total Wages</div>
            <div class="budget-value" style="color:#ffd900;">€${transferSystem.formatMoney(tw)}/wk</div>
            <div class="budget-sub">of €${transferSystem.formatMoney(maxWages)} max</div>
        </div>
        <div class="budget-item">
            <div class="budget-label">Squad Size</div>
            <div class="budget-value">${gameState.squad.length}</div>
            <div class="budget-sub">Players registered</div>
        </div>
    `;
}

function renderContractsTable() {
    const container = document.getElementById('contractsTable');
    if (!container) return;

    const currentYear = gameState.currentDate.getFullYear();

    container.innerHTML = `
        <div class="contracts-header">
            <div>Player</div>
            <div>Position</div>
            <div>OVR</div>
            <div>Weekly Wage</div>
            <div>Contract Ends</div>
            <div></div>
        </div>
    `;

    // Sort squad by wage descending
    const sorted = [...gameState.squad].sort((a, b) => {
        const wA = a.contract?.wage || transferSystem.estimateWage(a);
        const wB = b.contract?.wage || transferSystem.estimateWage(b);
        return wB - wA;
    });

    sorted.forEach(player => {
        const info = player.basic_info || {};
        const ovr  = player.ratings?.overall || 70;
        const wage = player.contract?.wage || transferSystem.estimateWage(player);
        const ends = player.contract?.endYear || player.club?.contract_until || 2025;
        const isExpiring = ends <= currentYear + 1;

        const row = document.createElement('div');
        row.className = 'contract-row';
        row.innerHTML = `
            <div>
                <div class="cr-name">${info.short_name || 'Unknown'}</div>
            </div>
            <div class="cr-pos">${(player.player_positions || '—').split(',')[0].trim()}</div>
            <div class="cr-val">${ovr}</div>
            <div class="cr-wage">€${transferSystem.formatMoney(wage)}/wk</div>
            <div class="cr-ends ${isExpiring ? 'expiring' : ''}">${isExpiring ? '⚠️ ' : ''}${ends}</div>
            <div><button class="cr-sell-btn" onclick="quickSell('${player.player_id}', '${(info.short_name||'').replace(/'/g,"\\'")}')">Sell</button></div>
        `;
        container.appendChild(row);
    });
}

function quickSell(playerId, playerName) {
    const player = gameState.squad.find(p => p.player_id === playerId);
    if (!player) return;
    const mv = player.value?.market_value_eur || transferSystem.estimateMarketValue(player);
    // Sell at 70-85% of market value (quick sale)
    const fee = Math.floor(mv * (0.70 + Math.random() * 0.15) / 1000) * 1000;
    if (confirm(`Sell ${playerName} for €${transferSystem.formatMoney(fee)}?`)) {
        transferSystem.sellPlayer(playerId, fee);
        transferSystem.transferHistory.push({
            type: 'OUT', player: playerName, fee: fee,
            date: new Date(gameState.currentDate), to: 'Transfer Market'
        });
        renderSquad();
        renderOffice();
    }
}

/** Update the offer badge count in the nav */
function updateOfferBadge() {
    if (!transferSystem) return;
    const count = transferSystem.getPendingOffers().length;
    const badge = document.getElementById('offerBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
    const countEl = document.getElementById('offerCount');
    if (countEl) countEl.textContent = count;
}

// Start game when page loads
window.onload = init;
