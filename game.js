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
function showSquadList() {
    const listTab = document.getElementById('tab-squad-list');
    if (listTab) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        listTab.classList.add('active');
        renderSquad();
    }
}

function showSquadReport() {
    alert('Squad Report - Coming Soon!\n\nThis will show detailed statistics about your squad including:\n- Average age\n- Squad depth by position\n- Top performers\n- Injury status');
}

function renderFormation() {
    if (!gameState.squad || gameState.squad.length === 0) return;

    // Update header
    const teamNameEl = document.getElementById('formationTeamName');
    const formationSystemEl = document.getElementById('formationSystem');
    if (teamNameEl && gameState.selectedTeam) {
        teamNameEl.textContent = (gameState.selectedTeam.team_name || 'TEAM').toUpperCase() + ' DEFAULT';
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
    const starting11 = gameState.squad
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

        const name = player.short_name || 'Unknown';
        const rating = player.overall || '?';
        const number = idx + 1;

        playerDiv.innerHTML = `
            <div class="player-jersey">${number}</div>
            <div class="player-name-pitch">${name}</div>
            <div class="player-rating-pitch">${rating}</div>
        `;

        playerDiv.onclick = () => openPlayerDetail(player);
        pitchEl.appendChild(playerDiv);
    });
}

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
        tickScouting();
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

    // Populate Career Hub stats when showing central tab
    if (tabName === 'central') {
        updateCareerHub();
    }

    // Render formation when showing squad tab
    if (tabName === 'squad') {
        renderFormation();
    }

    // On-demand render for tabs that need fresh data each visit
    if (tabName === 'office'    && typeof renderOffice === 'function')     renderOffice();
    if (tabName === 'transfers' && typeof renderTransferHub === 'function') renderTransferHub();
}

function updateCareerHub() {
    // Header club info
    const headerClubNameEl = document.getElementById('headerClubName');
    const headerClubBadgeEl = document.getElementById('headerClubBadge');
    
    if (headerClubNameEl && gameState.selectedTeam) {
        headerClubNameEl.textContent = gameState.selectedTeam.team_name;
    }
    
    if (headerClubBadgeEl && gameState.selectedTeam?.club_logo_url) {
        headerClubBadgeEl.innerHTML = `<img src="${gameState.selectedTeam.club_logo_url}" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.parentElement.innerHTML='⚽';">`;
    }

    // Advance date
    const advanceDateEl = document.getElementById('advanceDate');
    if (advanceDateEl && gameState.currentDate) {
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        advanceDateEl.textContent = monthNames[gameState.currentDate.getMonth()] + ' ' + gameState.currentDate.getFullYear();
    }

    // Featured news
    const featuredHeadlineEl = document.getElementById('featuredHeadline');
    const featuredDateEl = document.getElementById('featuredDate');
    if (featuredHeadlineEl) {
        featuredHeadlineEl.textContent = 'SEASON UNDERWAY - FIXTURES SCHEDULED';
    }
    if (featuredDateEl && gameState.currentDate) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        featuredDateEl.textContent = dayNames[gameState.currentDate.getDay()] + ', ' + monthNames[gameState.currentDate.getMonth()] + ' ' + gameState.currentDate.getDate() + ', ' + gameState.currentDate.getFullYear();
    }

    // Transfer network - show scouted players
    updateTransferNetwork();
}

function updateTransferNetwork() {
    const listEl = document.getElementById('transferPlayerList');
    if (!listEl) return;

    // Get completed scout reports
    const completedScouts = Object.keys(scoutQueue).filter(pid => scoutQueue[pid].status === 'complete');
    const scoutCountEl = document.getElementById('newScoutCount');
    if (scoutCountEl) scoutCountEl.textContent = completedScouts.length;

    if (completedScouts.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">No scouting reports<br><span style="font-size:0.8rem;">Scout players from Transfers tab</span></div>';
        return;
    }

    // Show completed scouts as player cards
    const html = completedScouts.slice(0, 5).map(playerId => {
        const player = gameState.allPlayers.find(p => p.player_id === playerId);
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
}

function openPlayerFromScout(playerId) {
    if (!transferSystem) return;
    const filters = { query: '__id__' + playerId, position:'', league:'', country:'', minOvr:0, maxOvr:0, maxPrice:0, freeAgents:false };
    const results = transferSystem.searchPlayers(filters);
    if (results.length > 0) {
        openPlayerDetail(results[0]);
    }
}

function advanceToNextMatch() {
    if (gameState.nextMatch) {
        simulateMatch();
    } else {
        alert('No upcoming matches scheduled!');
    }
}

function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

/* ============================================================
/* ============================================================
   TRANSFER & OFFICE UI FUNCTIONS — HUB + SEARCH OVERLAY + SCOUTING
   ============================================================ */

/* ── SCOUTING STATE (persists across the session) ── */
// scoutQueue: { playerId: { status:'queued'|'scouting'|'done', startDay: number, daysNeeded: number } }
const scoutQueue = {};

function getScoutDaysNeeded(report) {
    // Full intel = already known, partial = 2 days, continental = 4, distant = 6, unknown = 8
    const map = { full:0, partial:2, continental:4, distant:6, unknown:8 };
    return map[report?.tier] || 6;
}

function isPlayerScouting(playerId) { return scoutQueue[playerId] && scoutQueue[playerId].status !== 'done'; }
function isPlayerScoutDone(playerId) { return scoutQueue[playerId] && scoutQueue[playerId].status === 'done'; }

/** Call this after every match sim to tick scouting progress */
function tickScouting() {
    const currentDay = gameState.fixtures.filter(f=>f.played).length; // simple day counter
    Object.keys(scoutQueue).forEach(id => {
        const entry = scoutQueue[id];
        if (entry.status === 'done') return;
        if (entry.status === 'queued') { entry.status = 'scouting'; entry.startDay = currentDay; }
        if (entry.status === 'scouting' && (currentDay - entry.startDay) >= entry.daysNeeded) {
            entry.status = 'done';
        }
    });
}

/* ── SEARCH OVERLAY STATE ── */
const soPositions  = ['Any','GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST','CF'];
const soStatuses   = ['Any','Available','Free Agents'];
let soIdx = { pos:0, nat:0, status:0, country:0, league:0, team:0 };
let soNats=[], soCountries=[], soLeagues=[], soTeams=[];
let soSelectedPlayer = null;

// Current search results + selected index for the 50/50 preview
let currentSearchResults = [];
let selectedResultIdx = 0;

/** Called after team selected – seed dropdown arrays + render hub */
function populateTransferFilters() {
    soLeagues   = ['Any', ...new Set(gameState.allTeams.map(t=>t.league_name).filter(Boolean)).values()].sort((a,b)=> a==='Any'?-1: b==='Any'?1: a.localeCompare(b));
    soCountries = ['Any', ...new Set(gameState.allTeams.map(t=>t.country).filter(Boolean)).values()].sort((a,b)=> a==='Any'?-1: b==='Any'?1: a.localeCompare(b));
    soNats      = ['Any', ...new Set(gameState.allPlayers.map(p=>p.basic_info?.nationality).filter(Boolean)).values()].sort((a,b)=> a==='Any'?-1: b==='Any'?1: a.localeCompare(b));
    soTeams     = ['Any', ...new Set(gameState.allPlayers.map(p=>p.club?.name).filter(Boolean)).values()].sort((a,b)=> a==='Any'?-1: b==='Any'?1: a.localeCompare(b));
    renderTransferHub();
}

/* ── OPEN / CLOSE SEARCH OVERLAY ── */
function openSearchOverlay() {
    document.getElementById('searchOverlay').classList.remove('hidden');
    soResetFilters();
    soPopulateList();
}
function closeSearchOverlay() {
    document.getElementById('searchOverlay').classList.add('hidden');
}

/* ── CYCLE HELPERS ── */
function cycleArr(arr, idxKey, dir) {
    soIdx[idxKey] = (soIdx[idxKey] + dir + arr.length) % arr.length;
}
function cyclePosition(d)   { cycleArr(soPositions,  'pos',     d); document.getElementById('soPosVal').textContent     = soPositions[soIdx.pos]; updatePosRole(); soPopulateList(); }
function cycleNationality(d){ cycleArr(soNats,       'nat',     d); document.getElementById('soNatVal').textContent     = soNats[soIdx.nat]; soPopulateList(); }
function cycleStatus(d)     { cycleArr(soStatuses,   'status',  d); document.getElementById('soStatusVal').textContent  = soStatuses[soIdx.status]; soPopulateList(); }
function cycleCountry(d)    { cycleArr(soCountries,  'country', d); document.getElementById('soCountryVal').textContent = soCountries[soIdx.country]; soPopulateList(); }
function cycleLeague(d)     { cycleArr(soLeagues,    'league',  d); document.getElementById('soLeagueVal').textContent  = soLeagues[soIdx.league]; soPopulateList(); }
function cycleTeam(d)       { cycleArr(soTeams,      'team',    d); document.getElementById('soTeamVal').textContent    = soTeams[soIdx.team]; soPopulateList(); }

function updatePosRole() {
    const roleMap = { GK:'Goalkeeper', CB:'Centre-Back', LB:'Left-Back', RB:'Right-Back', CDM:'Defensive Mid', CM:'Central Mid', CAM:'Attacking Mid', LW:'Left Winger', RW:'Right Winger', ST:'Striker', CF:'Centre Forward' };
    document.getElementById('soPosRole').textContent = roleMap[soPositions[soIdx.pos]] || 'Promising';
}

/* ── SEARCH OVERLAY: live search with split view ── */
let soSortKey = 'potential';
let soSelectedPlayerIdx = null;

function soSetSort(key) {
    soSortKey = key;
    document.querySelectorAll('.so-list-sort span').forEach(el => {
        el.classList.toggle('active', el.textContent.toLowerCase() === key);
    });
    soPopulateList();
}

function soRunSearch() {
    const query = document.getElementById('soNameInput').value.trim().toLowerCase();
    const container = document.getElementById('soNameResults');

    // Name autocomplete dropdown
    if (query.length < 1) {
        container.innerHTML = '';
    } else {
        const ageMin = parseInt(document.getElementById('soAgeMin').value) || 16;
        const ageMax = parseInt(document.getElementById('soAgeMax').value) || 40;
        const pos    = soPositions[soIdx.pos];
        const currentYear = gameState.currentDate?.getFullYear() || 2025;

        let matches = gameState.allPlayers.filter(p => {
            const name = (p.basic_info?.short_name || '').toLowerCase();
            if (!name.includes(query)) return false;
            const age  = p.basic_info?.age || 25;
            if (age < ageMin || age > ageMax) return false;
            if (pos !== 'Any' && !(p.player_positions||'').includes(pos)) return false;
            if (gameState.squad.find(s => s.player_id === p.player_id)) return false;
            return true;
        }).slice(0, 10);

        container.innerHTML = matches.map(p => {
            const faceUrl = p.media?.face_url || '';
            const faceImg = faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : '';
            return `<div class="so-name-row" onclick="soPickPlayer('${p.player_id}')">
                <div class="so-name-row-face">
                    <svg width="12" height="14" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
                    ${faceImg}
                </div>
                <div class="so-name-row-info">
                    <div class="so-name-row-name">${p.basic_info?.short_name||'?'}</div>
                    <div class="so-name-row-club">${p.club?.name||'Free'} · ${p.club?.league||''}</div>
                </div>
                <div class="so-name-row-age">${p.basic_info?.age||'?'}</div>
            </div>`;
        }).join('');
    }

    // Also update the list
    soPopulateList();
}

function soPopulateList() {
    const results = soGetCurrentResults();

    // Update count
    document.getElementById('soListCount').textContent = results.length;

    // Render list
    const listEl = document.getElementById('soListScroll');
    if (results.length === 0) {
        listEl.innerHTML = '<div class="so-list-empty">No players match your filters.<br>Try broadening your search criteria.</div>';
        soRenderPreview(null);
        return;
    }

    listEl.innerHTML = results.map((r, idx) => {
        const faceUrl = r.face_url || '';
        const faceImg = faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : '';
        const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : (r.overall || '?');
        const scoutMark = isPlayerScoutDone(r.player_id) ? ' ✓' : '';
        const activeClass = (soSelectedPlayerIdx === idx) ? ' active' : '';
        return `<div class="so-list-card${activeClass}" onclick="soSelectPlayer(${idx})">
            <div class="so-card-face">
                <svg width="18" height="20" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
                ${faceImg}
            </div>
            <div class="so-card-info">
                <div class="so-card-name">${r.short_name}${scoutMark}</div>
                <div class="so-card-club">${r.club} <span class="pos-tag">${r.position}</span></div>
            </div>
            <div class="so-card-right">
                <div class="so-card-ovr">${ovrDisplay}</div>
                <div class="so-card-age">${r.age || '?'}</div>
            </div>
        </div>`;
    }).join('');

    // Auto-select first if none selected
    if (soSelectedPlayerIdx === null && results.length > 0) {
        soSelectedPlayerIdx = 0;
        soRenderPreview(results[0]);
    } else if (soSelectedPlayerIdx !== null && results[soSelectedPlayerIdx]) {
        soRenderPreview(results[soSelectedPlayerIdx]);
    } else {
        soRenderPreview(null);
    }
}

function soSelectPlayer(idx) {
    soSelectedPlayerIdx = idx;
    const results = soGetCurrentResults();
    if (results[idx]) {
        soRenderPreview(results[idx]);
        // Update active class on cards
        document.querySelectorAll('.so-list-card').forEach((el, i) => {
            el.classList.toggle('active', i === idx);
        });
    }
}

function soRenderPreview(report) {
    const previewEl = document.getElementById('soPreviewWrap');
    if (!report) {
        previewEl.innerHTML = '<div class="so-preview-empty">Select a player to view details</div>';
        return;
    }

    const faceUrl = report.face_url || '';
    const ovrDisplay = typeof report.overall === 'object' ? `${report.overall.min}-${report.overall.max}` : (report.overall || '?');
    const potDisplay = typeof report.potential === 'object' ? `${report.potential.min}-${report.potential.max}` : (report.potential || '?');

    const scouted = isPlayerScoutDone(report.player_id);
    const scouting = isPlayerScouting(report.player_id);

    // Stats
    const statKeys = ['pace','shooting','passing','dribbling','defending','physic'];
    const statLabels = { pace:'Pace', shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', physic:'Physical' };
    let statsHtml = statKeys.map(key => {
        const val = report[key];
        let displayVal, cls = '';
        if (val === null || val === undefined) {
            displayVal = '?'; cls = 'unknown';
        } else if (typeof val === 'object') {
            displayVal = `${val.min}-${val.max}`; cls = 'range';
        } else {
            displayVal = val;
        }
        return `<div class="so-prev-stat">
            <div class="so-prev-stat-label">${statLabels[key]}</div>
            <div class="so-prev-stat-val ${cls}">${displayVal}</div>
        </div>`;
    }).join('');

    // Scout status
    let scoutStatus = '';
    if (!scouted && !scouting) {
        scoutStatus = '<div class="so-prev-scout-status not">⚠ Unknown — Scout for full details</div>';
    } else if (scouting) {
        scoutStatus = '<div class="so-prev-scout-status scouting">⏳ Scouting in progress...</div>';
    } else {
        scoutStatus = '<div class="so-prev-scout-status done">✓ Full scout report available</div>';
    }

    // Finances
    const fmtVal = (v) => {
        if (v === null || v === undefined) return '?';
        if (typeof v === 'object') return `€${transferSystem.formatMoney(v.min)}-${transferSystem.formatMoney(v.max)}`;
        return `€${transferSystem.formatMoney(v)}`;
    };
    const valueDisplay = report.value_known ? fmtVal(report.market_value) : '?';
    const wageDisplay = report.value_known && report.wage !== null ? fmtVal(report.wage)+'/wk' : '?';

    // Action button
    let actionBtn = '';
    if (!scouted && !scouting) {
        actionBtn = `<button class="so-prev-action" onclick="soStartScouting('${report.player_id}', ${getScoutDaysNeeded(report)})">📋 Ask Scout to Scout ${report.short_name}</button>`;
    } else if (scouting) {
        actionBtn = `<button class="so-prev-action disabled">⏳ Scouting in progress...</button>`;
    } else {
        actionBtn = `<button class="so-prev-action" onclick="soOpenBidModal('${report.player_id}')">💰 Place a Bid</button>`;
    }

    previewEl.innerHTML = `<div class="so-preview-content">
        <div class="so-prev-header">
            <div class="so-prev-face-wrap">
                <svg width="44" height="50" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.2)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.12)"/></svg>
                ${faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : ''}
            </div>
            <div class="so-prev-info">
                <div class="so-prev-name">${report.long_name || report.short_name}</div>
                <div class="so-prev-meta">${report.age || '?'} · ${report.position} · ${report.preferred_foot || '—'}</div>
                <div class="so-prev-club">${report.club}</div>
                <span class="intel-tier ${report.tier}">${report.tier}</span>
            </div>
            <div class="so-prev-ovr-block">
                <div class="so-prev-ovr-num">${ovrDisplay}</div>
                <div class="so-prev-ovr-pot">POT ${potDisplay}</div>
            </div>
        </div>
        ${scoutStatus}
        <div class="so-prev-stats">${statsHtml}</div>
        <div class="so-prev-finances">
            <div class="so-prev-fin">
                <div class="so-prev-fin-label">Value</div>
                <div class="so-prev-fin-value ${report.value_known?'':'unknown'}">${valueDisplay}</div>
            </div>
            <div class="so-prev-fin">
                <div class="so-prev-fin-label">Wage</div>
                <div class="so-prev-fin-value ${report.value_known?'':'unknown'}">${wageDisplay}</div>
            </div>
            <div class="so-prev-fin">
                <div class="so-prev-fin-label">Contract</div>
                <div class="so-prev-fin-value">${report.contract_until || '?'}</div>
            </div>
            ${report.release_clause ? `<div class="so-prev-fin">
                <div class="so-prev-fin-label">Release</div>
                <div class="so-prev-fin-value">€${transferSystem.formatMoney(report.release_clause)}</div>
            </div>` : ''}
        </div>
        ${report.traits ? `<div style="font-size:0.68rem;color:#00d4ff;padding:6px 10px;background:rgba(0,212,255,0.08);border-radius:5px;text-align:center;">⚡ ${report.traits}</div>` : ''}
        ${actionBtn}
    </div>`;
}

function soStartScouting(playerId, daysNeeded) {
    scoutQueue[playerId] = { status:'queued', startDay: gameState.fixtures.filter(f=>f.played).length, daysNeeded: daysNeeded };
    soPopulateList(); // Refresh to show scouting status
}

function soOpenBidModal(playerId) {
    // Find the report and open the full detail modal
    const results = soGetCurrentResults();
    const report = results.find(r => r.player_id === playerId);
    if (report) {
        currentSearchResults = results;
        selectedResultIdx = results.indexOf(report);
        openPlayerDetail(report);
    }
}

function soPickPlayer(playerId) {
    soSelectedPlayer = playerId;
    document.getElementById('soNameResults').innerHTML = '';
    soPopulateList();
}

function soGetCurrentResults() {
    // Rebuild the current filtered results (same logic as soPopulateResults but returns array)
    const query   = document.getElementById('soNameInput').value.trim();
    const pos     = soPositions[soIdx.pos];
    const nat     = soNats[soIdx.nat];
    const league  = soLeagues[soIdx.league];
    const country = soCountries[soIdx.country];
    const status  = soStatuses[soIdx.status];
    const team    = soTeams[soIdx.team];
    const ageMin  = parseInt(document.getElementById('soAgeMin').value) || 16;
    const ageMax  = parseInt(document.getElementById('soAgeMax').value) || 40;

    const filters = {
        query:      soSelectedPlayer ? '__id__' + soSelectedPlayer : query,
        position:   pos === 'Any' ? '' : pos,
        league:     league === 'Any' ? '' : league,
        country:    country === 'Any' ? '' : country,
        nationality: nat === 'Any' ? '' : nat,
        team:       team === 'Any' ? '' : team,
        status, ageMin, ageMax,
        minOvr: 0, maxOvr: 0, maxPrice: 0,
        freeAgents: status === 'Free Agents'
    };
    if (!transferSystem) return [];
    const hasFilter = filters.query || filters.position || filters.league || filters.country || filters.nationality || filters.team || filters.freeAgents || ageMin > 16 || ageMax < 35;
    let results;
    if (hasFilter) {
        results = transferSystem.searchPlayers(filters);
    } else {
        results = transferSystem.searchPlayers({ position:'', league:'', country:'', query:'', minOvr:55, maxOvr:99, maxPrice:0, freeAgents:false });
    }
    results.sort((a, b) => {
        const getVal = (r, key) => {
            if (key === 'potential') { const v = r.potential; return typeof v === 'object' ? (v.min+v.max)/2 : (v||0); }
            if (key === 'overall')   { const v = r.overall;   return typeof v === 'object' ? (v.min+v.max)/2 : (v||0); }
            if (key === 'value')     { const v = r.market_value; if (!r.value_known || v == null) return -1; return typeof v === 'object' ? (v.min+v.max)/2 : v; }
            if (key === 'age')       { return -(r.age||99); }
            return 0;
        };
        return getVal(b, soSortKey) - getVal(a, soSortKey);
    });
    return results.slice(0, 80);
}

/* ── RESET / SUBMIT ── */
function soResetFilters() {
    soIdx = { pos:0, nat:0, status:0, country:0, league:0, team:0 };
    soSelectedPlayer = null;
    soSelectedPlayerIdx = null;
    document.getElementById('soNameInput').value = '';
    document.getElementById('soNameResults').innerHTML = '';
    document.getElementById('soPosVal').textContent     = 'Any';
    document.getElementById('soPosRole').textContent    = 'Promising';
    document.getElementById('soNatVal').textContent     = 'Any';
    document.getElementById('soStatusVal').textContent  = 'Any';
    document.getElementById('soCountryVal').textContent = 'Any';
    document.getElementById('soLeagueVal').textContent  = 'Any';
    document.getElementById('soTeamVal').textContent    = 'Any';
    document.getElementById('soAgeMin').value = '16';
    document.getElementById('soAgeMax').value = '35';
    soPopulateList();
}

function soSubmitSearch() {
    // Push current results to main tab player list and close overlay
    currentSearchResults = soGetCurrentResults();
    selectedResultIdx = 0;
    closeSearchOverlay();
    renderPlayerList(currentSearchResults);
}

/* ── RENDER PLAYER LIST: 50/50 split layout ── */
function renderPlayerList(reports) {
    const container = document.getElementById('tpPlayerList');
    const titleEl   = document.getElementById('tpTitle');
    const subEl     = document.getElementById('tpPositionLabel');

    const pos = soPositions[soIdx.pos];
    titleEl.textContent = pos === 'Any' ? 'SEARCH RESULTS' : pos + ' PLAYERS';
    subEl.textContent = reports.length + ' found';

    // Left column: compact boxes
    let leftHtml = reports.map((r, i) => {
        const faceUrl = r.face_url || '';
        const faceImg = faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : '';
        const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : r.overall;
        const activeClass = (i === selectedResultIdx) ? ' active' : '';
        const scoutStatus = isPlayerScoutDone(r.player_id) ? ' scouted' : (isPlayerScouting(r.player_id) ? ' scouting' : '');
        return `<div class="tp-player-row${activeClass}${scoutStatus}" onclick="selectPlayerResult(${i})" onmouseenter="hoverPlayerResult(${i})">
            <div class="tp-player-face">
                <svg width="14" height="16" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
                ${faceImg}
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

    // Right column: preview of selected player
    const rightHtml = renderPlayerPreview(reports[selectedResultIdx] || null);

    container.innerHTML = `<div class="tp-split">
        <div class="tp-split-left">${leftHtml}</div>
        <div class="tp-split-right">${rightHtml}</div>
    </div>`;
}

function hoverPlayerResult(idx) {
    if (idx === selectedResultIdx) return;
    // Update active highlight on left
    document.querySelectorAll('.tp-player-row').forEach((el,i) => el.classList.toggle('active', i===idx));
    // Update right preview
    const right = document.querySelector('.tp-split-right');
    if (right) right.innerHTML = renderPlayerPreview(currentSearchResults[idx] || null);
}

function selectPlayerResult(idx) {
    selectedResultIdx = idx;
    const report = currentSearchResults[idx];
    if (!report) return;
    // Open the detail overlay
    openScoutOverlay(report);
}

/* ── RENDER RIGHT-SIDE PLAYER PREVIEW ── */
function renderPlayerPreview(r) {
    if (!r) return `<div class="tp-preview-empty">Select a player</div>`;

    const faceUrl = r.face_url || '';
    const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : r.overall;
    const potDisplay = typeof r.potential === 'object' ? `${r.potential.min}-${r.potential.max}` : (r.potential || '?');

    // Build stat rows — show known or "?"
    const statKeys = ['pace','shooting','passing','dribbling','defending','physic'];
    const statLabels = { pace:'Pace', shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', physic:'Physical' };
    let statsHtml = statKeys.map(key => {
        const val = r[key];
        let displayVal, barW, cls = '';
        if (val === null || val === undefined) {
            displayVal = '?'; barW = 0; cls = 'unknown';
        } else if (typeof val === 'object') {
            displayVal = `${val.min}-${val.max}`; barW = ((val.min+val.max)/2); cls = 'range';
        } else {
            displayVal = val; barW = val;
        }
        return `<div class="tp-prev-stat">
            <div class="tp-prev-stat-label">${statLabels[key]}</div>
            <div class="tp-prev-stat-bar"><div class="tp-prev-stat-fill ${cls}" style="width:${barW}%;"></div></div>
            <div class="tp-prev-stat-val ${cls}">${displayVal}</div>
        </div>`;
    }).join('');

    // Scout status indicators
    const scouted = isPlayerScoutDone(r.player_id);
    const scouting = isPlayerScouting(r.player_id);
    let scoutInfo = '';
    if (scouted) {
        scoutInfo = `<div class="tp-prev-scout-status done">✓ Scout Report Complete</div>`;
    } else if (scouting) {
        scoutInfo = `<div class="tp-prev-scout-status scouting">⏳ Scouting in progress...</div>`;
    } else {
        scoutInfo = `<div class="tp-prev-scout-status not">◯ Not Scouting</div>`;
    }

    // Traits / notes
    const traitsHtml = r.traits ? `<div class="tp-prev-trait">⚡ ${r.traits}</div>` : '';

    return `<div class="tp-preview">
        <div class="tp-preview-face">
            <div class="tp-preview-face-circle">
                <svg width="48" height="56" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.2)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.12)"/></svg>
                ${faceUrl ? `<img src="${faceUrl}" alt="${r.short_name}" onerror="this.style.display='none';">` : ''}
            </div>
            <div class="tp-preview-name">${r.long_name || r.short_name}</div>
            <div class="tp-preview-club">${r.club}</div>
            <div class="tp-preview-meta">
                <span>${r.age || '?'} · ${r.position}</span>
                <span class="intel-tier ${r.tier}">${r.tier}</span>
            </div>
            ${scoutInfo}
            ${traitsHtml}
        </div>
        <div class="tp-preview-stats">
            <div class="tp-preview-ovr-row">
                <div class="tp-prev-ovr-box"><div class="tp-prev-ovr-num">${ovrDisplay}</div><div class="tp-prev-ovr-lbl">OVR</div></div>
                <div class="tp-prev-ovr-box pot"><div class="tp-prev-ovr-num">${potDisplay}</div><div class="tp-prev-ovr-lbl">POT</div></div>
            </div>
            ${statsHtml}
            <div class="tp-preview-finances">
                <div class="tp-prev-fin"><div class="tp-prev-fin-lbl">Value</div><div class="tp-prev-fin-val ${r.value_known?'':'unknown'}">${r.value_known ? (typeof r.market_value==='object' ? '€'+transferSystem.formatMoney(r.market_value.min)+'-'+transferSystem.formatMoney(r.market_value.max) : '€'+transferSystem.formatMoney(r.market_value)) : '?'}</div></div>
                <div class="tp-prev-fin"><div class="tp-prev-fin-lbl">Wage</div><div class="tp-prev-fin-val ${r.value_known?'':'unknown'}">${r.value_known && r.wage !== null ? '€'+(typeof r.wage==='object'?transferSystem.formatMoney(r.wage.min):transferSystem.formatMoney(r.wage))+'/wk' : '?'}</div></div>
                <div class="tp-prev-fin"><div class="tp-prev-fin-lbl">Contract</div><div class="tp-prev-fin-val">${r.contract_until || '?'}</div></div>
            </div>
        </div>
    </div>`;
}

/* ── SCOUT OVERLAY (click on player) ── */
function openScoutOverlay(report) {
    const overlay = document.getElementById('scoutOverlay');
    const content = document.getElementById('scoutOverlayContent');
    if (!overlay || !content) return;

    const faceUrl = report.face_url || '';
    const ovrDisplay = typeof report.overall === 'object' ? `${report.overall.min}-${report.overall.max}` : report.overall;
    const potDisplay = typeof report.potential === 'object' ? `${report.potential.min}-${report.potential.max}` : (report.potential || '?');

    const scouted = isPlayerScoutDone(report.player_id);
    const scouting = isPlayerScouting(report.player_id);

    // Left side: big face + basic info + scout status/actions
    const statKeys = ['pace','shooting','passing','dribbling','defending','physic'];
    const statLabels = { pace:'Pace', shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', physic:'Physical' };

    let leftStatsHtml = `<div class="sco-stats-grid">`;
    ['overall','value','wage','form'].forEach(key => {
        let label, val;
        if (key === 'overall')  { label = 'OVERALL'; val = report.value_known ? ovrDisplay : '?'; }
        if (key === 'value')    { label = 'VALUE';   val = report.value_known && report.market_value ? (typeof report.market_value==='object'?'€'+transferSystem.formatMoney(report.market_value.min)+'-'+transferSystem.formatMoney(report.market_value.max):'€'+transferSystem.formatMoney(report.market_value)) : '?'; }
        if (key === 'wage')     { label = 'WAGE';    val = report.value_known && report.wage !== null ? '€'+(typeof report.wage==='object'?transferSystem.formatMoney(report.wage.min):transferSystem.formatMoney(report.wage))+'/wk' : '?'; }
        if (key === 'form')     { label = 'FORM';    val = 'Okay'; }
        const isUnknown = (val === '?');
        leftStatsHtml += `<div class="sco-stat-row">
            <div class="sco-stat-label">${label}</div>
            <div class="sco-stat-val ${isUnknown?'unknown':''}">${val}</div>
        </div>`;
    });
    leftStatsHtml += `</div>`;

    // Scout indicators
    let scoutIndicators = '';
    if (!scouted && !scouting) {
        scoutIndicators = `<div class="sco-indicator unknown">⚠ Unknown</div>
            <div class="sco-indicator warning">⚠ Match Fit</div>
            <div class="sco-indicator info">💡 Showing Great Potential</div>`;
    } else if (scouting) {
        scoutIndicators = `<div class="sco-indicator info">⏳ Scout is gathering information...</div>`;
    } else {
        scoutIndicators = `<div class="sco-indicator success">✓ Full scout report available</div>
            <div class="sco-indicator success">✓ Match Fit confirmed</div>`;
    }

    // Scout actions
    let scoutActions = '';
    if (!scouted && !scouting) {
        scoutActions = `<div class="sco-actions">
            <div class="sco-action-btn primary" onclick="startScouting('${report.player_id}', ${getScoutDaysNeeded(report)})">📋 Ask Scout to Scout ${report.short_name}</div>
            <div class="sco-action-btn" onclick="shortlistPlayer('${report.player_id}')">📌 Shortlist in Transfer Hub</div>
            <div class="sco-action-btn" onclick="shortlistAndView('${report.player_id}')">📌 Shortlist & View in Transfer Hub</div>
        </div>`;
    } else if (scouting) {
        scoutActions = `<div class="sco-actions">
            <div class="sco-action-btn disabled">⏳ Scouting in progress... (complete after next match)</div>
            <div class="sco-action-btn" onclick="shortlistPlayer('${report.player_id}')">📌 Shortlist in Transfer Hub</div>
        </div>`;
    } else {
        scoutActions = `<div class="sco-actions">
            <div class="sco-action-btn primary" onclick="openBidModal('${report.player_id}')">💰 Place a Bid</div>
            <div class="sco-action-btn" onclick="shortlistPlayer('${report.player_id}')">📌 Shortlist in Transfer Hub</div>
        </div>`;
    }

    // Right side: another face + summary stats
    let rightStatsHtml = statKeys.map(key => {
        const val = report[key];
        let displayVal;
        if (val === null || val === undefined) displayVal = '?';
        else if (typeof val === 'object') displayVal = `${val.min}-${val.max}`;
        else displayVal = val;
        return `<div class="sco-right-stat"><span class="sco-right-stat-label">${statLabels[key]}</span><span class="sco-right-stat-val">${displayVal}</span></div>`;
    }).join('');

    // Scouting report label
    let reportLabel = 'Preliminary Report';
    if (scouted) reportLabel = 'Full Report';
    else if (scouting) reportLabel = 'Scouting...';

    content.innerHTML = `
        <button class="sco-close" onclick="closeScoutOverlay()">✕</button>
        <div class="sco-split">
            <!-- LEFT: big face + info + actions -->
            <div class="sco-left">
                <div class="sco-left-header">
                    <div class="sco-left-face">
                        <svg width="56" height="64" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.2)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.12)"/></svg>
                        ${faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : ''}
                    </div>
                    <div class="sco-left-info">
                        <div class="sco-left-name">${report.long_name || report.short_name}</div>
                        <div class="sco-left-age">Age ${report.age || '?'} · ${report.position}</div>
                        <div class="sco-left-meta">
                            <span>Height: ${report.height || '—'}</span>
                            <span>Foot: ${report.preferred_foot || '—'}</span>
                        </div>
                    </div>
                    <div class="sco-left-club">
                        <div class="sco-left-club-name">${report.club}</div>
                        <span class="intel-tier ${report.tier}">${report.tier}</span>
                    </div>
                </div>
                ${leftStatsHtml}
                <div class="sco-indicators">${scoutIndicators}</div>
                ${scoutActions}
            </div>
            <!-- RIGHT: face again + summary / report -->
            <div class="sco-right">
                <div class="sco-right-header">
                    <div class="sco-right-face">
                        <svg width="40" height="46" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.2)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.12)"/></svg>
                        ${faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : ''}
                    </div>
                    <div class="sco-right-info">
                        <div class="sco-right-name">${report.short_name}</div>
                        <div class="sco-right-club">${report.club}</div>
                        <div class="sco-right-pos">${report.age || '?'} · ${report.position} · ${report.preferred_foot || '—'}</div>
                    </div>
                </div>
                <div class="sco-right-report-label ${scouted?'done':(scouting?'scouting':'')}">${scouting ? '⏳' : (scouted ? '✓' : '◯')} ${reportLabel}</div>
                <div class="sco-right-stats">${rightStatsHtml}</div>
                ${report.traits ? `<div class="sco-right-trait">⚡ ${report.traits}</div>` : ''}
            </div>
        </div>`;

    overlay.classList.remove('hidden');
}

function closeScoutOverlay() {
    document.getElementById('scoutOverlay').classList.add('hidden');
}

function startScouting(playerId, daysNeeded) {
    scoutQueue[playerId] = { status:'queued', startDay: gameState.fixtures.filter(f=>f.played).length, daysNeeded: daysNeeded };
    // Re-render to show updated status
    const report = currentSearchResults.find(r => r.player_id === playerId);
    if (report) openScoutOverlay(report);
    // Also refresh the list
    renderPlayerList(currentSearchResults);
}

function shortlistPlayer(playerId) {
    // Visual feedback only for now
    closeScoutOverlay();
}

function shortlistAndView(playerId) {
    closeScoutOverlay();
}

function openBidModal(playerId) {
    // Close scout overlay, open the full bid modal
    closeScoutOverlay();
    const report = currentSearchResults.find(r => r.player_id === playerId);
    if (report) openPlayerDetail(report);
}

/* ── RENDER TRANSFER HUB (called on tab open) ── */
function renderTransferHub() {
    if (!transferSystem) return;

    const budgetEl = document.getElementById('thubBudget');
    if (budgetEl) budgetEl.textContent = '€' + transferSystem.formatMoney(transferSystem.transferBudget);

    updateOfferBadge();
    renderNetworkOffers();
    renderHistoryPanel();

    // Default player list: top prospects
    const defaults = transferSystem.searchPlayers({ position:'', league:'', country:'', query:'', minOvr:60, maxOvr:99, maxPrice:0, freeAgents:false });
    defaults.sort((a,b) => {
        const potA = typeof a.potential === 'object' ? (a.potential.min+a.potential.max)/2 : (a.potential||0);
        const potB = typeof b.potential === 'object' ? (b.potential.min+b.potential.max)/2 : (b.potential||0);
        return potB - potA;
    });
    currentSearchResults = defaults.slice(0, 50);
    selectedResultIdx = 0;
    renderPlayerList(currentSearchResults);
}

/* ── GLOBAL TRANSFER NETWORK ── */
function renderNetworkOffers() {
    const container = document.getElementById('tnetOffers');
    if (!container || !transferSystem) return;
    const pending = transferSystem.getPendingOffers();
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
                <div class="tnet-offer-amount">€${transferSystem.formatMoney(offer.amount)}</div>
                <div class="tnet-offer-from">from ${offer.club}</div>
            </div>
            <div class="tnet-offer-btns">
                <button class="tnet-btn accept" onclick="acceptIncomingOffer(${offer.id})">Accept</button>
                <button class="tnet-btn reject" onclick="rejectIncomingOffer(${offer.id})">Reject</button>
            </div>
        </div>
    `).join('');
}

function acceptIncomingOffer(offerId) {
    const result = transferSystem.acceptOffer(offerId);
    if (result.success) { renderSquad(); renderTransferHub(); }
}
function rejectIncomingOffer(offerId) {
    transferSystem.rejectOffer(offerId);
    renderTransferHub();
}

/* ── TRANSFER HISTORY ── */
function renderHistoryPanel() {
    const container = document.getElementById('thistContent');
    if (!container || !transferSystem) return;
    const history = transferSystem.transferHistory;
    if (history.length === 0) {
        container.innerHTML = '<div class="thist-empty">No transfers completed yet this window.</div>';
        return;
    }
    container.innerHTML = history.map(deal => `
        <div class="thist-row">
            <div class="thist-type ${deal.type.toLowerCase()}">${deal.type}</div>
            <div class="thist-info">
                <div class="thist-name">${deal.player}</div>
                <div class="thist-detail">${deal.type === 'IN' ? 'from ' + deal.from : 'to ' + deal.to} · ${deal.date?.toLocaleDateString('en-US',{month:'short',day:'numeric'})||''}</div>
            </div>
            <div class="thist-fee">€${transferSystem.formatMoney(deal.fee)}</div>
        </div>
    `).join('');
}

function switchTransferView(view) {
    if (view === 'offers') renderNetworkOffers();
    if (view === 'history') renderHistoryPanel();
}

/* ── PLAYER DETAIL MODAL (full bid flow) ── */
function openPlayerDetail(report) {
    if (typeof report === 'string') { try { report = JSON.parse(report); } catch(e) { return; } }
    const modal   = document.getElementById('playerDetailModal');
    const content = document.getElementById('playerDetailContent');

    const fmtOvr = v => typeof v === 'object' ? `${v.min}-${v.max}` : v;
    const fmtVal = (v) => {
        if (v === null || v === undefined) return '?';
        if (typeof v === 'object') return `€${transferSystem.formatMoney(v.min)}-${transferSystem.formatMoney(v.max)}`;
        return `€${transferSystem.formatMoney(v)}`;
    };

    const attrKeys   = ['pace','shooting','passing','dribbling','defending','physic'];
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
            attrsHtml += `<div class="detail-attr"><div class="detail-attr-label">${attrLabels[key]}</div><div class="detail-attr-bar-wrap"><div class="detail-attr-bar"><div class="detail-attr-bar-fill" style="width:${val}%;"></div></div><div class="detail-attr-val">${val}</div></div></div>`;
        }
    });

    const currentYear = gameState.currentDate?.getFullYear() || 2025;
    const contractEnd = report.contract_until || 2025;
    const isFreeAgent = contractEnd <= currentYear;
    const isExpiring  = contractEnd <= currentYear + 1;
    const releaseHtml = report.release_clause ? `<div class="detail-fin-item"><div class="detail-fin-label">Release Clause</div><div class="detail-fin-value">€${transferSystem.formatMoney(report.release_clause)}</div></div>` : '';

    const faceUrl = report.face_url || '';
    let modalFaceHtml;
    if (faceUrl) {
        modalFaceHtml = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3a6a,#0d2240);display:flex;align-items:center;justify-content:center;position:relative;">
            <svg width="36" height="42" viewBox="0 0 32 36" fill="none" style="position:relative;z-index:0;"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
            <img src="${faceUrl}" alt="${report.short_name}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:50%;z-index:1;" onerror="this.style.display='none';">
        </div>`;
    } else {
        modalFaceHtml = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#1a3a6a,#0d2240);display:flex;align-items:center;justify-content:center;">
            <svg width="36" height="42" viewBox="0 0 32 36" fill="none"><ellipse cx="16" cy="12" rx="8" ry="9" fill="rgba(255,255,255,0.25)"/><ellipse cx="16" cy="34" rx="14" ry="10" fill="rgba(255,255,255,0.15)"/></svg>
        </div>`;
    }

    const bidPlaceholder = report.value_known && report.market_value
        ? 'e.g. ' + transferSystem.formatMoney(typeof report.market_value === 'object' ? report.market_value.min : report.market_value)
        : 'Enter amount';

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
                </div>
                <div class="detail-meta" style="margin-top:3px;">
                    <span>📋 ${report.position}</span>
                    ${report.age ? `<span>🎂 Age ${report.age}</span>` : ''}
                    <span class="intel-tier ${report.tier}" style="margin-left:4px;">${report.tier}</span>
                </div>
            </div>
        </div>
        <div class="detail-attrs">${attrsHtml}</div>
        <div class="detail-finances">
            <div class="detail-fin-item"><div class="detail-fin-label">Market Value</div><div class="detail-fin-value ${report.value_known?'':'unknown'}">${fmtVal(report.market_value)}</div></div>
            <div class="detail-fin-item"><div class="detail-fin-label">Weekly Wage</div><div class="detail-fin-value ${report.value_known?'':'unknown'}">${fmtVal(report.wage)}/wk</div></div>
            ${releaseHtml}
        </div>
        <div class="detail-contract-info">
            <span>📄 Contract until: <strong style="color:${isExpiring?'#ff3366':'#fff'}">${isFreeAgent?'FREE AGENT':contractEnd}</strong></span>
            ${report.traits ? `<span>🏷️ ${report.traits}</span>` : ''}
        </div>
        <div class="bid-form" id="bidForm">
            <div class="bid-form-title">${isFreeAgent ? '✍️ Sign Free Agent' : '💰 Place a Bid'}</div>
            ${isFreeAgent ? `
                <div style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin-bottom:10px;">No transfer fee required.</div>
                <button class="bid-btn success" onclick="startContractNegotiation('${report.player_id}', 0)">Negotiate Contract</button>
            ` : `
                <div class="bid-form-row">
                    <span style="font-size:0.82rem;color:rgba(255,255,255,0.5);">€</span>
                    <input type="number" class="bid-input" id="bidAmount" placeholder="${bidPlaceholder}">
                    <button class="bid-btn" onclick="submitBid('${report.player_id}')">Place Bid</button>
                </div>
                <div class="bid-result" id="bidResult"></div>
            `}
        </div>
        <div class="contract-form" id="contractForm">
            <div class="bid-form-title">✍️ Contract Negotiation</div>
            <div class="contract-form-row">
                <div class="contract-field"><label>Contract Length</label><select id="contractLength"><option value="1">1 Year</option><option value="2">2 Years</option><option value="3" selected>3 Years</option><option value="4">4 Years</option><option value="5">5 Years</option></select></div>
                <div class="contract-field"><label>Weekly Wage (€)</label><input type="number" id="contractWage" placeholder="e.g. 50000"></div>
                <div class="contract-field"><label>Signing Bonus (€)</label><input type="number" id="contractBonus" placeholder="e.g. 500000"></div>
            </div>
            <div class="contract-form-row">
                <button class="bid-btn success" onclick="submitContract('${report.player_id}')">Sign Contract</button>
                <button class="bid-btn danger" onclick="closePlayerDetail()">Cancel</button>
            </div>
            <div class="bid-result" id="contractResult"></div>
        </div>`;

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closePlayerDetail() {
    const modal = document.getElementById('playerDetailModal');
    modal.classList.add('hidden');
    modal.classList.remove('active');
}

/* ── BID LOGIC ── */
let pendingTransferFee = 0;

function submitBid(playerId) {
    const amount = parseInt(document.getElementById('bidAmount')?.value) || 0;
    if (amount <= 0) { showBidResult('Enter a valid bid amount.', 'rejected'); return; }
    const result = transferSystem.placeBid(playerId, amount);
    if (result.status === 'accepted' || result.status === 'release_clause') {
        pendingTransferFee = result.fee || amount;
        showBidResult(result.message, 'success');
        setTimeout(() => {
            const cf = document.getElementById('contractForm');
            if (cf) cf.classList.add('show');
            const player = gameState.allPlayers.find(p => p.player_id === playerId);
            if (player) {
                const suggestedWage = Math.floor((player.value?.wage_eur || transferSystem.estimateWage(player)) * 1.05 / 1000) * 1000;
                document.getElementById('contractWage').value = suggestedWage;
                document.getElementById('contractBonus').value = Math.floor(suggestedWage * 8);
            }
        }, 800);
    } else if (result.status === 'counter') {
        showBidResult(result.message, 'counter');
        document.getElementById('bidAmount').value = result.counter;
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

/* ── CONTRACT ── */
function startContractNegotiation(playerId, fee) {
    pendingTransferFee = fee;
    const cf = document.getElementById('contractForm');
    if (cf) cf.classList.add('show');
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
        transferSystem.finaliseTransfer(player, pendingTransferFee, contractOffer);
        showContractResult(`✅ ${result.message} Transfer complete!`, 'success');
        renderSquad(); updateOfferBadge();
        setTimeout(() => { closePlayerDetail(); renderTransferHub(); }, 1200);
    } else if (result.reason === 'counter') {
        showContractResult(result.message, 'counter');
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

/* ── OFFICE ── */
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
    container.innerHTML = `
        <div class="budget-item ${tb < 5000000?'warning':''}"><div class="budget-label">Transfer Budget</div><div class="budget-value ${tbClass}">€${transferSystem.formatMoney(tb)}</div><div class="budget-sub">Available for signings</div></div>
        <div class="budget-item ${wb < 10000?'danger':''}"><div class="budget-label">Wage Budget</div><div class="budget-value ${wbClass}">€${transferSystem.formatMoney(wb)}/wk</div><div class="budget-sub">Remaining wage capacity</div></div>
        <div class="budget-item"><div class="budget-label">Total Wages</div><div class="budget-value" style="color:#ffd900;">€${transferSystem.formatMoney(tw)}/wk</div><div class="budget-sub">of €${transferSystem.formatMoney(maxWages)} max</div></div>
        <div class="budget-item"><div class="budget-label">Squad Size</div><div class="budget-value">${gameState.squad.length}</div><div class="budget-sub">Players registered</div></div>`;
}

function renderContractsTable() {
    const container = document.getElementById('contractsTable');
    if (!container) return;
    const currentYear = gameState.currentDate.getFullYear();
    container.innerHTML = `<div class="contracts-header"><div>Player</div><div>Position</div><div>OVR</div><div>Weekly Wage</div><div>Contract Ends</div><div></div></div>`;
    [...gameState.squad].sort((a,b) => {
        const wA = a.contract?.wage || transferSystem.estimateWage(a);
        const wB = b.contract?.wage || transferSystem.estimateWage(b);
        return wB - wA;
    }).forEach(player => {
        const info = player.basic_info || {};
        const ovr  = player.ratings?.overall || 70;
        const wage = player.contract?.wage || transferSystem.estimateWage(player);
        const ends = player.contract?.endYear || player.club?.contract_until || 2025;
        const isExpiring = ends <= currentYear + 1;
        const row = document.createElement('div');
        row.className = 'contract-row';
        row.innerHTML = `
            <div><div class="cr-name">${info.short_name || 'Unknown'}</div></div>
            <div class="cr-pos">${(player.player_positions||'—').split(',')[0].trim()}</div>
            <div class="cr-val">${ovr}</div>
            <div class="cr-wage">€${transferSystem.formatMoney(wage)}/wk</div>
            <div class="cr-ends ${isExpiring?'expiring':''}">${isExpiring?'⚠️ ':''}${ends}</div>
            <div><button class="cr-sell-btn" onclick="quickSell('${player.player_id}','${(info.short_name||'').replace(/'/g,"\\'")}')" >Sell</button></div>`;
        container.appendChild(row);
    });
}

function quickSell(playerId, playerName) {
    const player = gameState.squad.find(p => p.player_id === playerId);
    if (!player) return;
    const mv = player.value?.market_value_eur || transferSystem.estimateMarketValue(player);
    const fee = Math.floor(mv * (0.70 + Math.random() * 0.15) / 1000) * 1000;
    if (confirm(`Sell ${playerName} for €${transferSystem.formatMoney(fee)}?`)) {
        transferSystem.sellPlayer(playerId, fee);
        transferSystem.transferHistory.push({ type:'OUT', player:playerName, fee, date:new Date(gameState.currentDate), to:'Transfer Market' });
        renderSquad(); renderOffice(); renderTransferHub();
    }
}

function updateOfferBadge() {
    if (!transferSystem) return;
    const count = transferSystem.getPendingOffers().length;
    const badge = document.getElementById('offerBadge');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline' : 'none'; }
    const countEl = document.getElementById('offerCount');
    if (countEl) { countEl.textContent = count; countEl.style.display = count > 0 ? 'inline' : 'none'; }
}

// Start game when page loads
window.onload = init;
