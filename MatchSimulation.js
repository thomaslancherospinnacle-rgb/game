/**
 * FIFA MANAGER - MATCH SIMULATION (PLACEHOLDER)
 * 
 * This is a simplified placeholder that generates realistic match results.
 * Will be replaced with advanced minute-by-minute simulation later.
 * 
 * Returns: Complete match result with goals, cards, ratings, stats
 */

class MatchSimulation {
    constructor() {
        this.advancedSimulationEnabled = false; // Toggle for future advanced system
    }

    /**
     * Main simulation function - generates complete match result
     * 
     * @param {Object} homeTeam - Home team data with squad and ratings
     * @param {Object} awayTeam - Away team data with squad and ratings
     * @param {Object} options - Match options (competition, importance, etc.)
     * @returns {Object} Complete match result
     */
    simulateMatch(homeTeam, awayTeam, options = {}) {
        // Check if advanced simulation is enabled
        if (this.advancedSimulationEnabled) {
            return this.advancedMatchSimulation(homeTeam, awayTeam, options);
        }
        
        // Use placeholder simulation
        return this.placeholderSimulation(homeTeam, awayTeam, options);
    }

    /**
     * PLACEHOLDER SIMULATION
     * Generates realistic results based on team ratings
     */
    placeholderSimulation(homeTeam, awayTeam, options = {}) {
        console.log("🎮 Running PLACEHOLDER match simulation...");
        console.log(`   ${homeTeam.name} vs ${awayTeam.name}`);
        
        // Calculate team strengths
        const homeStrength = this.calculateTeamStrength(homeTeam);
        const awayStrength = this.calculateTeamStrength(awayTeam);
        
        // Apply modifiers
        const homeRating = homeStrength + this.getHomeAdvantage(homeTeam);
        const awayRating = awayStrength + this.getFormBonus(awayTeam);
        const importance = options.importance || 'normal';
        
        // Generate scoreline
        const result = this.generateScoreline(homeRating, awayRating, importance);
        
        // Generate match events
        const events = this.generateMatchEvents(homeTeam, awayTeam, result);
        
        // Generate player ratings
        const ratings = this.generatePlayerRatings(homeTeam, awayTeam, result);
        
        // Generate match statistics
        const stats = this.generateMatchStats(homeRating, awayRating, result);
        
        // Compile complete result
        const matchResult = {
            // Basic info
            homeTeam: homeTeam.name,
            awayTeam: awayTeam.name,
            homeScore: result.homeGoals,
            awayScore: result.awayGoals,
            winner: this.determineWinner(result.homeGoals, result.awayGoals),
            
            // Match events
            events: events,
            
            // Player ratings (0-10 scale)
            ratings: ratings,
            
            // Match statistics
            statistics: stats,
            
            // Metadata
            competition: options.competition || 'League',
            matchday: options.matchday || 1,
            attendance: this.generateAttendance(homeTeam),
            referee: this.getRandomReferee(),
            weather: this.getRandomWeather(),
            
            // Placeholder flag
            isPlaceholder: true,
            message: "⚠️ This is a placeholder result. Advanced simulation coming soon!"
        };
        
        console.log(`   Result: ${homeTeam.name} ${result.homeGoals} - ${result.awayGoals} ${awayTeam.name}`);
        
        return matchResult;
    }

    /**
     * Calculate overall team strength from squad
     */
    calculateTeamStrength(team) {
        // If team has overall rating, use it
        if (team.overall_rating) {
            return team.overall_rating;
        }
        
        // Otherwise calculate from squad
        if (team.squad && team.squad.length > 0) {
            const starting11 = team.squad.slice(0, 11);
            const avgRating = starting11.reduce((sum, player) => {
                return sum + (player.ratings?.overall || 75);
            }, 0) / starting11.length;
            return Math.round(avgRating);
        }
        
        // Default
        return 75;
    }

    /**
     * Home advantage bonus
     */
    getHomeAdvantage(team) {
        const stadiumSize = team.stadium_capacity || 30000;
        
        if (stadiumSize > 60000) return 5;  // Massive home advantage
        if (stadiumSize > 40000) return 4;
        if (stadiumSize > 25000) return 3;
        return 2;
    }

    /**
     * Form bonus based on recent results
     */
    getFormBonus(team) {
        if (!team.form) return 0;
        
        // Form string like "WWDLW"
        const wins = (team.form.match(/W/g) || []).length;
        return wins - 2; // Range: -2 to +3
    }

    /**
     * Generate realistic scoreline based on team ratings
     */
    generateScoreline(homeRating, awayRating, importance) {
        const ratingDiff = homeRating - awayRating;
        
        // Base goal expectancy
        let homeGoalExpectancy = 1.5 + (ratingDiff / 20);
        let awayGoalExpectancy = 1.2 - (ratingDiff / 25);
        
        // Ensure reasonable range
        homeGoalExpectancy = Math.max(0.5, Math.min(3.5, homeGoalExpectancy));
        awayGoalExpectancy = Math.max(0.3, Math.min(3.0, awayGoalExpectancy));
        
        // Generate goals using Poisson-like distribution
        const homeGoals = this.generateGoals(homeGoalExpectancy);
        const awayGoals = this.generateGoals(awayGoalExpectancy);
        
        return { homeGoals, awayGoals };
    }

    /**
     * Generate number of goals using weighted randomness
     */
    generateGoals(expectancy) {
        const random = Math.random();
        const adjusted = expectancy + (Math.random() - 0.5);
        
        if (adjusted < 0.8) return 0;
        if (adjusted < 1.5) return 1;
        if (adjusted < 2.3) return 2;
        if (adjusted < 3.0) return 3;
        if (adjusted < 3.5) return 4;
        return 5;
    }

    /**
     * Generate match events (goals, cards, substitutions)
     */
    generateMatchEvents(homeTeam, awayTeam, result) {
        const events = [];
        
        // Generate goal events
        for (let i = 0; i < result.homeGoals; i++) {
            events.push({
                type: 'goal',
                team: 'home',
                minute: this.randomMinute(),
                player: this.getRandomPlayer(homeTeam, 'attacker'),
                assist: Math.random() > 0.3 ? this.getRandomPlayer(homeTeam, 'midfielder') : null
            });
        }
        
        for (let i = 0; i < result.awayGoals; i++) {
            events.push({
                type: 'goal',
                team: 'away',
                minute: this.randomMinute(),
                player: this.getRandomPlayer(awayTeam, 'attacker'),
                assist: Math.random() > 0.3 ? this.getRandomPlayer(awayTeam, 'midfielder') : null
            });
        }
        
        // Generate yellow cards (0-4 per match)
        const yellowCards = Math.floor(Math.random() * 5);
        for (let i = 0; i < yellowCards; i++) {
            const isHome = Math.random() > 0.5;
            events.push({
                type: 'yellow_card',
                team: isHome ? 'home' : 'away',
                minute: this.randomMinute(),
                player: this.getRandomPlayer(isHome ? homeTeam : awayTeam, 'any')
            });
        }
        
        // Generate red cards (rare, ~5% chance)
        if (Math.random() < 0.05) {
            const isHome = Math.random() > 0.5;
            events.push({
                type: 'red_card',
                team: isHome ? 'home' : 'away',
                minute: this.randomMinute(20, 80),
                player: this.getRandomPlayer(isHome ? homeTeam : awayTeam, 'defender')
            });
        }
        
        // Sort events by minute
        events.sort((a, b) => a.minute - b.minute);
        
        return events;
    }

    /**
     * Generate player ratings (0-10 scale)
     */
    generatePlayerRatings(homeTeam, awayTeam, result) {
        const ratings = {
            home: {},
            away: {}
        };
        
        // Home team ratings
        const homeWin = result.homeGoals > result.awayGoals;
        const homeDraw = result.homeGoals === result.awayGoals;
        
        if (homeTeam.squad) {
            homeTeam.squad.slice(0, 11).forEach(player => {
                const baseRating = homeWin ? 7.0 : (homeDraw ? 6.5 : 6.0);
                const variance = (Math.random() - 0.5) * 2; // -1 to +1
                ratings.home[player.player_id || player.short_name] = 
                    Math.min(10, Math.max(5, baseRating + variance)).toFixed(1);
            });
        }
        
        // Away team ratings
        const awayWin = result.awayGoals > result.homeGoals;
        
        if (awayTeam.squad) {
            awayTeam.squad.slice(0, 11).forEach(player => {
                const baseRating = awayWin ? 7.0 : (homeDraw ? 6.5 : 6.0);
                const variance = (Math.random() - 0.5) * 2;
                ratings.away[player.player_id || player.short_name] = 
                    Math.min(10, Math.max(5, baseRating + variance)).toFixed(1);
            });
        }
        
        return ratings;
    }

    /**
     * Generate match statistics
     */
    generateMatchStats(homeRating, awayRating, result) {
        const ratingDiff = homeRating - awayRating;
        
        // Base possession
        let homePossession = 50 + (ratingDiff * 0.5);
        homePossession = Math.max(30, Math.min(70, homePossession));
        
        // Shots based on goals and possession
        const homeShots = Math.floor((result.homeGoals * 3) + (homePossession / 10) + Math.random() * 5);
        const awayShots = Math.floor((result.awayGoals * 3) + ((100 - homePossession) / 10) + Math.random() * 5);
        
        return {
            possession: {
                home: Math.round(homePossession),
                away: Math.round(100 - homePossession)
            },
            shots: {
                home: homeShots,
                away: awayShots
            },
            shotsOnTarget: {
                home: Math.max(result.homeGoals, Math.floor(homeShots * 0.35)),
                away: Math.max(result.awayGoals, Math.floor(awayShots * 0.35))
            },
            corners: {
                home: Math.floor(3 + Math.random() * 8),
                away: Math.floor(3 + Math.random() * 8)
            },
            fouls: {
                home: Math.floor(8 + Math.random() * 10),
                away: Math.floor(8 + Math.random() * 10)
            },
            offsides: {
                home: Math.floor(Math.random() * 5),
                away: Math.floor(Math.random() * 5)
            },
            passes: {
                home: Math.floor(homePossession * 5 + Math.random() * 100),
                away: Math.floor((100 - homePossession) * 5 + Math.random() * 100)
            },
            passAccuracy: {
                home: Math.floor(70 + Math.random() * 20),
                away: Math.floor(70 + Math.random() * 20)
            }
        };
    }

    /**
     * Helper: Random minute (1-90)
     */
    randomMinute(min = 1, max = 90) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Helper: Get random player from team
     */
    getRandomPlayer(team, position = 'any') {
        if (!team.squad || team.squad.length === 0) {
            return 'Player ' + Math.floor(Math.random() * 11);
        }
        
        const squad = team.squad.slice(0, 11);
        
        // Filter by position if specified
        let candidates = squad;
        if (position === 'attacker') {
            candidates = squad.slice(0, 4); // Front 4
        } else if (position === 'midfielder') {
            candidates = squad.slice(4, 8); // Middle 4
        } else if (position === 'defender') {
            candidates = squad.slice(8, 11); // Back 3
        }
        
        const player = candidates[Math.floor(Math.random() * candidates.length)];
        return player.basic_info?.short_name || player.short_name || 'Unknown Player';
    }

    /**
     * Helper: Determine winner
     */
    determineWinner(homeGoals, awayGoals) {
        if (homeGoals > awayGoals) return 'home';
        if (awayGoals > homeGoals) return 'away';
        return 'draw';
    }

    /**
     * Helper: Generate attendance
     */
    generateAttendance(homeTeam) {
        const capacity = homeTeam.stadium_capacity || 30000;
        const attendance = Math.floor(capacity * (0.7 + Math.random() * 0.3));
        return attendance;
    }

    /**
     * Helper: Random referee
     */
    getRandomReferee() {
        const referees = [
            'Michael Oliver',
            'Anthony Taylor',
            'Martin Atkinson',
            'Mike Dean',
            'Craig Pawson',
            'Andre Marriner',
            'Kevin Friend',
            'Paul Tierney'
        ];
        return referees[Math.floor(Math.random() * referees.length)];
    }

    /**
     * Helper: Random weather
     */
    getRandomWeather() {
        const conditions = [
            { condition: 'Clear', temperature: 22 },
            { condition: 'Partly Cloudy', temperature: 18 },
            { condition: 'Overcast', temperature: 15 },
            { condition: 'Light Rain', temperature: 12 },
            { condition: 'Heavy Rain', temperature: 10 },
            { condition: 'Sunny', temperature: 25 }
        ];
        return conditions[Math.floor(Math.random() * conditions.length)];
    }

    /**
     * ADVANCED SIMULATION (PLACEHOLDER FOR FUTURE)
     * This will be implemented later with minute-by-minute detail
     */
    advancedMatchSimulation(homeTeam, awayTeam, options) {
        console.log("🚀 Running ADVANCED match simulation...");
        console.log("⚠️  Advanced simulation not yet implemented!");
        console.log("   Falling back to placeholder simulation...");
        
        // For now, fall back to placeholder
        return this.placeholderSimulation(homeTeam, awayTeam, options);
    }

    /**
     * Enable advanced simulation (for future use)
     */
    enableAdvancedSimulation() {
        this.advancedSimulationEnabled = true;
        console.log("✅ Advanced match simulation ENABLED");
    }

    /**
     * Disable advanced simulation
     */
    disableAdvancedSimulation() {
        this.advancedSimulationEnabled = false;
        console.log("⚠️  Advanced match simulation DISABLED - using placeholder");
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchSimulation;
}

/**
 * USAGE EXAMPLE:
 * 
 * const simulator = new MatchSimulation();
 * 
 * const homeTeam = {
 *     name: 'Real Madrid',
 *     overall_rating: 88,
 *     squad: [...players],
 *     form: 'WWDWW',
 *     stadium_capacity: 81044
 * };
 * 
 * const awayTeam = {
 *     name: 'Barcelona',
 *     overall_rating: 87,
 *     squad: [...players],
 *     form: 'WDWLW',
 *     stadium_capacity: 99354
 * };
 * 
 * const result = simulator.simulateMatch(homeTeam, awayTeam, {
 *     competition: 'La Liga',
 *     matchday: 15,
 *     importance: 'high'
 * });
 * 
 * console.log(`${result.homeTeam} ${result.homeScore} - ${result.awayScore} ${result.awayTeam}`);
 * console.log('Events:', result.events);
 * console.log('Stats:', result.statistics);
 * 
 * // Later, when advanced simulation is ready:
 * simulator.enableAdvancedSimulation();
 * const advancedResult = simulator.simulateMatch(homeTeam, awayTeam);
 */
