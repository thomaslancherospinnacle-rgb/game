/**
 * FIFA MANAGER - Core Module
 * Game state, initialization, and data loading
 */

(function(window) {
    'use strict';

    // ============================================================
    // GAME STATE
    // ============================================================
    
    window.gameState = {
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

    // Global systems (initialized later)
    window.matchSimulator = null;
    window.transferSystem = null;

    // ============================================================
    // INITIALIZATION
    // ============================================================

    /**
     * Initialize game - load data and setup
     */
    window.init = async function() {
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
            if (typeof MatchSimulation !== 'undefined') {
                window.matchSimulator = new MatchSimulation();
                console.log('✅ Match simulator initialized');
            } else {
                console.warn('⚠️ MatchSimulation class not found');
            }
            
            // Initialize transfer system
            if (typeof TransferSystem !== 'undefined') {
                window.transferSystem = new TransferSystem(window.gameState);
                console.log('✅ Transfer system initialized');
            } else {
                console.warn('⚠️ TransferSystem class not found');
            }
            
            // Check if data was preloaded from index.html
            const preloadedTeams = localStorage.getItem('fifaAllTeams');
            const selectedTeamData = localStorage.getItem('fifaSelectedTeam');
            
            // Use preloaded teams if available
            if (preloadedTeams && preloadedTeams !== 'undefined') {
                window.gameState.allTeams = JSON.parse(preloadedTeams);
                console.log(`✅ Used preloaded teams: ${window.gameState.allTeams.length}`);
            }
            
            if (selectedTeamData && selectedTeamData !== 'undefined') {
                // Team was selected from index.html, load it directly
                const teamData = JSON.parse(selectedTeamData);
                const team = window.gameState.allTeams.find(t => t.team_name === teamData.team_name);
                
                if (team) {
                    hideLoading();
                    await selectTeam(team);
                    console.log('✅ Game initialized with pre-selected team:', team.team_name);
                    return;
                }
            }
            
            // No team selected, show team selection
            hideLoading();
            if (typeof showTeamSelection === 'function') {
                showTeamSelection();
            } else {
                console.error('❌ showTeamSelection function not found');
            }
            
            console.log('✅ Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing game:', error);
            if (typeof showError === 'function') {
                showError('Failed to load game data. Please ensure teams.json and players.json are in the same directory.');
            }
        }
    };

    // ============================================================
    // DATA LOADING
    // ============================================================

    /**
     * Load teams from teams.json
     */
    async function loadTeamsData() {
        try {
            const response = await fetch('teams.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            window.gameState.allTeams = await response.json();
            console.log(`✅ Loaded ${window.gameState.allTeams.length} teams`);
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
            window.gameState.allPlayers = await response.json();
            console.log(`✅ Loaded ${window.gameState.allPlayers.length} players`);
        } catch (error) {
            console.error('❌ Error loading players:', error);
            throw new Error('Could not load players.json. Make sure it exists in the root directory.');
        }
    }

    /**
     * Organize data into maps and calculate team ratings
     */
    function organizeData() {
        console.log('📊 Organizing data...');
        
        // Create teams map
        window.gameState.allTeams.forEach(team => {
            window.gameState.teamsMap[team.team_name] = team;
        });
        
        // Create players map by team
        window.gameState.allPlayers.forEach(player => {
            const clubName = player.club?.name;
            if (!clubName) return;
            
            if (!window.gameState.playersMap[clubName]) {
                window.gameState.playersMap[clubName] = [];
            }
            window.gameState.playersMap[clubName].push(player);
        });
        
        console.log(`✅ Teams mapped: ${Object.keys(window.gameState.teamsMap).length}`);
        console.log(`✅ Teams with players: ${Object.keys(window.gameState.playersMap).length}`);
        
        // Calculate team overall ratings from squad
        window.gameState.allTeams.forEach(team => {
            const squad = window.gameState.playersMap[team.team_name] || [];
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
    }

    // ============================================================
    // TEAM SELECTION
    // ============================================================

    /**
     * Show team selection modal
     */
    window.showTeamSelection = function() {
        const modal = document.getElementById('teamSelectModal');
        if (!modal) {
            console.error('❌ Team selection modal not found');
            return;
        }
        
        const filterContainer = document.getElementById('leagueFilter');
        
        if (filterContainer) {
            // Get unique leagues
            const leagues = ['All', ...new Set(window.gameState.allTeams.map(t => t.league_name).filter(Boolean))];
            
            // Create league filters
            filterContainer.innerHTML = '';
            leagues.forEach(league => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn' + (league === 'All' ? ' active' : '');
                btn.textContent = league;
                btn.onclick = () => window.filterTeams(league);
                filterContainer.appendChild(btn);
            });
        }
        
        // Display teams
        window.displayTeams();
        
        modal.classList.remove('hidden');
    };

    /**
     * Filter teams by league
     */
    window.filterTeams = function(league) {
        window.gameState.currentLeagueFilter = league;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === league);
        });
        
        // Display filtered teams
        window.displayTeams();
    };

    /**
     * Display teams in grid
     */
    window.displayTeams = function() {
        const grid = document.getElementById('teamGrid');
        if (!grid) {
            console.error('❌ Team grid element not found');
            return;
        }
        
        grid.innerHTML = '';
        
        const filteredTeams = window.gameState.currentLeagueFilter === 'All' 
            ? window.gameState.allTeams 
            : window.gameState.allTeams.filter(t => t.league_name === window.gameState.currentLeagueFilter);
        
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
                card.onclick = () => window.selectTeam(team);
                grid.appendChild(card);
            });
    };

    /**
     * Select a team and start career
     */
    window.selectTeam = async function(team) {
        console.log('✅ Selected team:', team.team_name);
        
        window.gameState.selectedTeam = team;
        
        // Load squad for selected team
        loadSquad(team);
        
        // Generate fixtures
        generateFixtures();
        
        // Hide modal
        const modal = document.getElementById('teamSelectModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Update UI with null checks
        if (typeof window.updateHeader === 'function') {
            window.updateHeader();
        }
        
        if (typeof window.renderSquad === 'function') {
            window.renderSquad();
        }
        
        if (typeof window.generateLeagueTable === 'function') {
            window.generateLeagueTable();
        }
        
        if (typeof window.generateNews === 'function') {
            window.generateNews();
        }
        
        if (typeof window.updateCentralTab === 'function') {
            window.updateCentralTab();
        }
        
        if (typeof window.renderFixtures === 'function') {
            window.renderFixtures();
        }
        
        // Initialize transfer system
        if (window.transferSystem && typeof window.transferSystem.init === 'function') {
            window.transferSystem.init();
        }
        
        // Populate transfer filters - WITH NULL CHECK
        if (typeof window.populateTransferFilters === 'function') {
            window.populateTransferFilters();
        } else {
            console.warn('⚠️ populateTransferFilters function not found - skipping');
        }
        
        // Update offer badge
        if (typeof window.updateOfferBadge === 'function') {
            window.updateOfferBadge();
        }
    };

    /**
     * Load squad for team
     */
    function loadSquad(team) {
        const teamName = team.team_name;
        
        // Try multiple matching strategies
        let squad = window.gameState.allPlayers.filter(p => p.club?.name === teamName);
        
        if (squad.length === 0) {
            const teamNameLower = teamName.toLowerCase();
            squad = window.gameState.allPlayers.filter(p => 
                p.club?.name?.toLowerCase() === teamNameLower
            );
        }
        
        if (squad.length === 0) {
            const teamNameLower = teamName.toLowerCase();
            squad = window.gameState.allPlayers.filter(p => {
                const clubName = p.club?.name?.toLowerCase() || '';
                return clubName.includes(teamNameLower) || teamNameLower.includes(clubName);
            });
        }
        
        if (squad.length === 0 && team.team_id) {
            squad = window.gameState.allPlayers.filter(p => p.club?.id === team.team_id);
        }
        
        if (squad.length > 0) {
            window.gameState.squad = squad;
            window.gameState.squad.sort((a, b) => (b.ratings?.overall || 0) - (a.ratings?.overall || 0));
            console.log(`✅ Loaded squad: ${window.gameState.squad.length} players for ${teamName}`);
        } else {
            console.warn(`⚠️ No players found for ${teamName}, generating placeholder squad`);
            window.gameState.squad = generatePlaceholderSquad(team);
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
        const league = window.gameState.selectedTeam.league_name;
        const leagueTeams = window.gameState.allTeams.filter(t => t.league_name === league);
        
        window.gameState.fixtures = [];
        
        leagueTeams.forEach(opponent => {
            if (opponent.team_name !== window.gameState.selectedTeam.team_name) {
                // Home fixture
                const homeDate = new Date(window.gameState.currentDate);
                homeDate.setDate(homeDate.getDate() + (window.gameState.fixtures.length * 7));
                
                window.gameState.fixtures.push({
                    date: homeDate,
                    home: window.gameState.selectedTeam,
                    away: opponent,
                    played: false
                });
                
                // Away fixture
                const awayDate = new Date(window.gameState.currentDate);
                awayDate.setDate(awayDate.getDate() + ((window.gameState.fixtures.length + 1) * 7));
                
                window.gameState.fixtures.push({
                    date: awayDate,
                    home: opponent,
                    away: window.gameState.selectedTeam,
                    played: false
                });
            }
        });
        
        // Shuffle fixtures
        for (let i = window.gameState.fixtures.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [window.gameState.fixtures[i], window.gameState.fixtures[j]] = [window.gameState.fixtures[j], window.gameState.fixtures[i]];
        }
        
        // Update dates after shuffle
        window.gameState.fixtures.forEach((fixture, index) => {
            const date = new Date(window.gameState.currentDate);
            date.setDate(date.getDate() + (index * 4));
            fixture.date = date;
        });
        
        window.gameState.nextMatch = window.gameState.fixtures[0];
        
        console.log(`✅ Generated ${window.gameState.fixtures.length} fixtures`);
    }

    console.log('✅ Core module loaded');

})(window);