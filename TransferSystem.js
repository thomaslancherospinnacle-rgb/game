/**
 * FIFA MANAGER — TRANSFER & SCOUTING SYSTEM
 * 
 * Handles:
 *   1. Scouting intel tiers (same league → full info, same country → partial, abroad → minimal)
 *   2. Scout report generation (attributes shown as ranges when info is limited)
 *   3. Player search with filters (position, league, country, rating range, price range)
 *   4. Incoming offers from AI clubs (random but contextually weighted)
 *   5. Outgoing bid / negotiation flow (bid → counter → accept/reject)
 *   6. Contract negotiation (length, wages, signing bonus)
 *   7. Transfer budget & wage budget accounting
 *   8. Transfer window state (open / closed)
 */

class TransferSystem {
    constructor(gameState) {
        this.gs = gameState;                // reference to main gameState
        this.incomingOffers = [];           // offers other clubs have made on YOUR players
        this.outgoingBids   = [];           // bids YOU have placed on other players
        this.transferHistory = [];          // completed deals this window
        this.scoutedPlayers  = new Set();   // player_ids the user has "scouted"

        // Budget tracking
        this.transferBudget = 0;            // set on team select
        this.wageBudget     = 0;            // monthly wage cap remaining
        this.totalWages     = 0;            // current monthly wage bill

        // Transfer window dates (simplified: Jan 1 – Jan 31 and Jun 1 – Aug 31)
        this.windowOpen = true;            // we start inside a window for gameplay

        // AI offer generation timer (generates every few simulated days)
        this.lastOfferDate = null;
    }

    /* ────────────────────────────────────────────
       INITIALISE  –  call once after team is selected
       ──────────────────────────────────────────── */
    init() {
        const team = this.gs.selectedTeam;
        this.transferBudget = team.budget || 50000000;
        this.recalcWages();
        this.lastOfferDate  = new Date(this.gs.currentDate);
        this.generateInitialOffers();        // seed a couple of offers on load
    }

    /* ────────────────────────────────────────────
       WAGE ACCOUNTING
       ──────────────────────────────────────────── */
    recalcWages() {
        this.totalWages = this.gs.squad.reduce((sum, p) => {
            return sum + (p.contract?.wage || this.estimateWage(p));
        }, 0);
        // Wage budget = 70% of what a team of this overall rating "earns"
        const teamRating = this.gs.selectedTeam.overall_rating || 75;
        this.wageBudget = Math.floor((teamRating * 18000) - this.totalWages);
    }

    /** Estimate a realistic wage from player overall if none stored */
    estimateWage(player) {
        const ovr = player.ratings?.overall || 70;
        // Exponential-ish curve: 70 OVR ≈ €40k/wk, 90 OVR ≈ €250k/wk
        return Math.floor(Math.pow(1.12, ovr) * 120);
    }

    /* ────────────────────────────────────────────
       SCOUTING INTEL  –  what info does the user see?
       ──────────────────────────────────────────── */

    /**
     * Returns the intel TIER for a given player relative to the user's club.
     *   "full"    – same league  (you see everything)
     *   "partial" – same country but different league (most stats, some blurred)
     *   "limited" – different country, top-tier league (name, position, OVR range, price range)
     *   "unknown" – deep abroad, low reputation (very little shown)
     */
    getIntelTier(player) {
        const myLeague  = this.gs.selectedTeam.league_name;
        const myCountry = this.gs.selectedTeam.country;
        const pLeague   = player.club?.league;
        const pCountry  = player.basic_info?.nationality;

        if (pLeague === myLeague)           return 'full';
        if (pCountry === myCountry)         return 'partial';
        // Check if the player's league is a "top 5" league — scouts know more
        const top5 = ['English Premier League','La Liga','Serie A','1. Bundesliga','Ligue 1','French Ligue 1','German 1. Bundesliga'];
        if (top5.includes(pLeague))         return 'limited';
        return 'unknown';
    }

    /**
     * Build a scout report object.  Attributes are either exact numbers or
     * { min, max } range objects depending on the tier.
     */
    buildScoutReport(player) {
        const tier  = this.getIntelTier(player);
        const ovr   = player.ratings?.overall || 70;
        const pot   = player.ratings?.potential || ovr;
        const attrs = player.core_attributes || {};
        const info  = player.basic_info || {};

        const report = {
            player_id   : player.player_id,
            tier        : tier,
            short_name  : info.short_name || 'Unknown',
            long_name   : info.long_name  || info.short_name || 'Unknown',
            age         : info.age,
            nationality : info.nationality,
            position    : player.player_positions || 'Unknown',
            club        : player.club?.name || 'Free Agent',
            league      : player.club?.league || '—',
            face_url    : player.media?.face_url || null,
            club_logo   : player.media?.club_logo_url || null,
            nation_flag : player.media?.nation_flag_url || null,
            preferred_foot: info.preferred_foot || '—',
            work_rate   : info.work_rate || '—',
            traits      : player.traits || '',
            contract_until: player.club?.contract_until || 2025,
            // These are always shown (headline stats)
            overall     : ovr,
            potential   : pot,
            market_value: player.value?.market_value_eur || this.estimateMarketValue(player),
            wage        : player.value?.wage_eur || this.estimateWage(player),
            release_clause: player.value?.release_clause_eur || null,
        };

        // Now layer in attribute detail based on tier
        if (tier === 'full') {
            // Everything visible
            report.pace       = attrs.pace || 70;
            report.shooting   = attrs.shooting || 70;
            report.passing    = attrs.passing || 70;
            report.dribbling  = attrs.dribbling || 70;
            report.defending  = attrs.defending || 70;
            report.physic     = attrs.physic || 70;
            report.stats_known = true;
            report.value_known = true;
        } else if (tier === 'partial') {
            // Stats as ranges ± 4
            report.pace       = this.toRange(attrs.pace || 70, 4);
            report.shooting   = this.toRange(attrs.shooting || 70, 4);
            report.passing    = this.toRange(attrs.passing || 70, 4);
            report.dribbling  = this.toRange(attrs.dribbling || 70, 4);
            report.defending  = this.toRange(attrs.defending || 70, 4);
            report.physic     = this.toRange(attrs.physic || 70, 4);
            report.stats_known = true;   // shown but as ranges
            report.value_known = true;
        } else if (tier === 'limited') {
            // OVR shown, individual stats hidden, value as range
            report.pace       = null;
            report.shooting   = null;
            report.passing    = null;
            report.dribbling  = null;
            report.defending  = null;
            report.physic     = null;
            report.stats_known = false;
            report.value_known = true;   // market value still visible (top league)
            // Show overall as a range ± 2
            report.overall    = this.toRange(ovr, 2);
            report.potential  = this.toRange(pot, 3);
        } else {
            // 'unknown' – almost nothing
            report.pace       = null;
            report.shooting   = null;
            report.passing    = null;
            report.dribbling  = null;
            report.defending  = null;
            report.physic     = null;
            report.stats_known = false;
            report.value_known = false;
            report.overall    = this.toRange(ovr, 5);
            report.potential  = this.toRange(pot, 6);
            report.market_value = this.toRange(report.market_value, Math.floor(report.market_value * 0.3));
            report.wage       = this.toRange(report.wage, Math.floor(report.wage * 0.25));
            report.age        = null;    // even age hidden for unknown
        }

        return report;
    }

    /** Helper: wrap a value into a { min, max } range object */
    toRange(value, spread) {
        return {
            min: Math.max(0, value - spread),
            max: value + spread
        };
    }

    /** Estimate market value from overall rating */
    estimateMarketValue(player) {
        const ovr = player.ratings?.overall || 70;
        const age = player.basic_info?.age || 28;
        // Base value curve
        let base = Math.pow(1.22, ovr) * 800;
        // Age penalty after 30
        if (age > 30) base *= (1 - (age - 30) * 0.08);
        // Young player bonus
        if (age < 23) base *= 1.3;
        return Math.floor(base / 1000) * 1000; // round to nearest 1k
    }

    /* ────────────────────────────────────────────
       SEARCH  –  find players to buy
       ──────────────────────────────────────────── */

    /**
     * Search all players with filters.
     * @param {Object} filters
     *   .query       – text search (name)
     *   .position    – e.g. 'ST','GK','CB' or '' for all
     *   .league      – league_name or '' for all
     *   .country     – nationality or '' for all
     *   .minOvr      – minimum overall (number)
     *   .maxOvr      – maximum overall
     *   .maxPrice    – max market value (number)
     *   .freeAgents  – boolean, only show free agents (contract_until <= current year)
     * @returns {Array} array of scout report objects
     */
    searchPlayers(filters = {}) {
        const myTeam = this.gs.selectedTeam.team_name;
        const currentYear = this.gs.currentDate.getFullYear();

        let results = this.gs.allPlayers.filter(p => {
            // Exclude own squad
            if (p.club?.name === myTeam) return false;

            const info  = p.basic_info || {};
            const ovr   = p.ratings?.overall || 70;
            const name  = (info.short_name || '').toLowerCase();
            const pos   = (p.player_positions || '').toLowerCase();

            // Text search
            if (filters.query && !name.includes(filters.query.toLowerCase())) return false;

            // Position filter – check if any listed position matches
            if (filters.position && filters.position !== '') {
                if (!pos.includes(filters.position.toLowerCase())) return false;
            }

            // League
            if (filters.league && filters.league !== '' && p.club?.league !== filters.league) return false;

            // Country / nationality
            if (filters.country && filters.country !== '' && info.nationality !== filters.country) return false;

            // Overall rating range
            if (filters.minOvr && ovr < filters.minOvr) return false;
            if (filters.maxOvr && ovr > filters.maxOvr) return false;

            // Max price
            if (filters.maxPrice) {
                const mv = p.value?.market_value_eur || this.estimateMarketValue(p);
                if (mv > filters.maxPrice) return false;
            }

            // Free agents only
            if (filters.freeAgents) {
                const contractEnd = p.club?.contract_until || 2099;
                if (contractEnd > currentYear) return false;
            }

            return true;
        });

        // Sort by overall desc
        results.sort((a, b) => ((b.ratings?.overall) || 70) - ((a.ratings?.overall) || 70));

        // Cap at 60 results for performance
        results = results.slice(0, 60);

        // Convert to scout reports
        return results.map(p => this.buildScoutReport(p));
    }

    /* ────────────────────────────────────────────
       BIDDING  –  place a bid on a player
       ──────────────────────────────────────────── */

    /**
     * Place a bid.  Returns a result object.
     * AI instantly decides: accept, counter-offer, or reject.
     */
    placeBid(playerId, bidAmount) {
        if (!this.windowOpen) {
            return { success: false, status: 'window_closed', message: 'The transfer window is closed.' };
        }
        if (bidAmount > this.transferBudget) {
            return { success: false, status: 'no_budget', message: 'Insufficient transfer budget.' };
        }

        // Find the player
        const player = this.gs.allPlayers.find(p => p.player_id === playerId);
        if (!player) return { success: false, status: 'not_found', message: 'Player not found.' };

        const marketValue = player.value?.market_value_eur || this.estimateMarketValue(player);
        const releaseClause = player.value?.release_clause_eur || null;
        const clubName = player.club?.name || 'Free Agent';
        const isFreeAgent = (player.club?.contract_until || 2099) <= this.gs.currentDate.getFullYear();

        // Free agent — no bid needed, go straight to contract negotiation
        if (isFreeAgent) {
            return { success: true, status: 'free_agent', message: 'Player is a free agent. Proceed to contract negotiation.', player: player };
        }

        // Release clause met → instant deal
        if (releaseClause && bidAmount >= releaseClause) {
            return { success: true, status: 'release_clause', message: `Release clause of €${this.formatMoney(releaseClause)} met. Transfer confirmed pending contract.`, player: player, fee: releaseClause };
        }

        // AI negotiation logic
        const ratio = bidAmount / marketValue;

        if (ratio >= 1.15) {
            // Well above market value → accept
            return { success: true, status: 'accepted', message: `${clubName} accepted your bid of €${this.formatMoney(bidAmount)}.`, player: player, fee: bidAmount };
        } else if (ratio >= 0.85) {
            // Near market value → counter-offer (they want 5-15% more)
            const counterPercent = 1.05 + Math.random() * 0.10;
            const counter = Math.floor(marketValue * counterPercent / 1000) * 1000;
            return {
                success: false, status: 'counter',
                message: `${clubName} countered with €${this.formatMoney(counter)}.`,
                counter: counter,
                player: player,
                originalBid: bidAmount
            };
        } else if (ratio >= 0.6) {
            // Below market → rejected but door left open
            return { success: false, status: 'rejected_open', message: `${clubName} rejected your bid. They value the player higher.`, player: player };
        } else {
            // Insult → flat rejection
            return { success: false, status: 'rejected', message: `${clubName} rejected your bid outright. The offer was too low.`, player: player };
        }
    }

    /* ────────────────────────────────────────────
       CONTRACT NEGOTIATION  –  after transfer fee agreed
       ──────────────────────────────────────────── */

    /**
     * Negotiate a contract.  Returns success/failure.
     * @param {Object} player
     * @param {Object} contractOffer  { length (years), weeklyWage (EUR), signingBonus (EUR) }
     * @param {number} transferFee    – fee already agreed (0 for free agents)
     */
    negotiateContract(player, contractOffer, transferFee = 0) {
        const ovr = player.ratings?.overall || 70;
        const age = player.basic_info?.age || 25;
        const currentWage = player.value?.wage_eur || this.estimateWage(player);

        // Player's minimum expectations
        const minWage = Math.floor(currentWage * 0.9);       // won't accept less than 90% of current
        const minLength = age < 25 ? 3 : (age < 30 ? 2 : 1); // younger players want longer

        // Check wage budget
        if (contractOffer.weeklyWage > (this.wageBudget + 5000)) {
            return { success: false, reason: 'wage_budget', message: 'Exceeds your club wage budget.' };
        }

        // Check total cost vs transfer budget
        const totalCost = transferFee + (contractOffer.signingBonus || 0);
        if (totalCost > this.transferBudget) {
            return { success: false, reason: 'transfer_budget', message: 'Total cost exceeds transfer budget.' };
        }

        // Player satisfaction check
        let satisfaction = 0;
        // Wage
        if (contractOffer.weeklyWage >= currentWage * 1.1)  satisfaction += 3;
        else if (contractOffer.weeklyWage >= currentWage)    satisfaction += 2;
        else if (contractOffer.weeklyWage >= minWage)        satisfaction += 1;
        else                                                  satisfaction -= 2;
        // Length
        if (contractOffer.length >= minLength + 1)           satisfaction += 2;
        else if (contractOffer.length >= minLength)          satisfaction += 1;
        else                                                  satisfaction -= 1;
        // Signing bonus
        if (contractOffer.signingBonus >= currentWage * 10)  satisfaction += 2;
        else if (contractOffer.signingBonus >= currentWage * 5) satisfaction += 1;

        // Club prestige bonus (higher rated team → player more willing)
        const myRating = this.gs.selectedTeam.overall_rating || 75;
        if (myRating >= 85) satisfaction += 1;

        if (satisfaction >= 3) {
            // Accept — finalise
            return { success: true, reason: 'accepted', message: `${player.basic_info?.short_name} agreed to a ${contractOffer.length}-year contract.` };
        } else if (satisfaction >= 1) {
            // Counter — wants a bit more wage or length
            const counterWage = Math.floor(contractOffer.weeklyWage * 1.08 / 1000) * 1000;
            return {
                success: false, reason: 'counter',
                message: `${player.basic_info?.short_name} wants slightly better terms.`,
                counter: { length: Math.max(contractOffer.length, minLength), weeklyWage: counterWage, signingBonus: contractOffer.signingBonus }
            };
        } else {
            return { success: false, reason: 'rejected', message: `${player.basic_info?.short_name} rejected your contract offer.` };
        }
    }

    /**
     * Finalise a transfer — deduct fees, add player to squad, update budgets.
     */
    finaliseTransfer(player, transferFee, contract) {
        // Deduct transfer fee
        this.transferBudget -= transferFee;

        // Attach contract info to player object
        player.contract = {
            wage: contract.weeklyWage,
            length: contract.length,
            signingBonus: contract.signingBonus || 0,
            startDate: new Date(this.gs.currentDate),
            endYear: this.gs.currentDate.getFullYear() + contract.length
        };

        // Update club field
        player.club = {
            name: player.club?.name || 'Free Agent',  // keep old for history
            league: this.gs.selectedTeam.league_name,
            contract_until: player.contract.endYear
        };

        // Add to squad
        this.gs.squad.push(player);
        this.gs.squad.sort((a, b) => ((b.ratings?.overall) || 0) - ((a.ratings?.overall) || 0));

        // Record in history
        this.transferHistory.push({
            type: 'IN',
            player: player.basic_info?.short_name || 'Unknown',
            fee: transferFee,
            wage: contract.weeklyWage,
            date: new Date(this.gs.currentDate),
            from: player.club?.name || 'Free Agent'
        });

        // Recalculate wages
        this.recalcWages();

        return true;
    }

    /* ────────────────────────────────────────────
       SELL PLAYER  –  accept an incoming offer
       ──────────────────────────────────────────── */
    sellPlayer(playerId, fee) {
        const idx = this.gs.squad.findIndex(p => p.player_id === playerId);
        if (idx === -1) return false;

        const player = this.gs.squad[idx];
        this.gs.squad.splice(idx, 1);
        this.transferBudget += fee;

        this.transferHistory.push({
            type: 'OUT',
            player: player.basic_info?.short_name || 'Unknown',
            fee: fee,
            date: new Date(this.gs.currentDate),
            to: 'AI Club'
        });

        this.recalcWages();
        return true;
    }

    /* ────────────────────────────────────────────
       INCOMING OFFERS  –  AI clubs bidding on your players
       ──────────────────────────────────────────── */

    /**
     * Seed initial offers on game start, and generate new ones periodically.
     */
    generateInitialOffers() {
        // Generate 2-4 initial offers
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            this.generateOneOffer();
        }
    }

    /** Called after each match simulation to maybe add a new offer */
    tickOffers() {
        // ~40% chance of a new offer each time a match is simulated
        if (Math.random() < 0.4) {
            this.generateOneOffer();
        }
        // Also occasionally remove old offers (stale after ~3 offers in queue)
        if (this.incomingOffers.length > 5) {
            this.incomingOffers.shift();
        }
    }

    generateOneOffer() {
        if (this.gs.squad.length === 0) return;

        // Pick a random player from your squad (bias toward mid-table players, not your best)
        const candidates = this.gs.squad.filter(p => {
            const ovr = p.ratings?.overall || 70;
            return ovr < 90; // AI won't bid on your absolute stars usually
        });
        if (candidates.length === 0) return;

        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const ovr = target.ratings?.overall || 70;
        const marketValue = target.value?.market_value_eur || this.estimateMarketValue(target);

        // Bid is 85-130% of market value
        const bidMultiplier = 0.85 + Math.random() * 0.45;
        const bidAmount = Math.floor((marketValue * bidMultiplier) / 1000) * 1000;

        // Pick a random AI club (from different league for realism)
        const otherTeams = this.gs.allTeams.filter(t => t.team_name !== this.gs.selectedTeam.team_name);
        const bidder = otherTeams[Math.floor(Math.random() * otherTeams.length)];

        // Don't duplicate offers on same player
        if (this.incomingOffers.some(o => o.playerId === target.player_id && o.club === bidder.team_name)) return;

        this.incomingOffers.push({
            id: Date.now() + Math.random(),
            playerId: target.player_id,
            playerName: target.basic_info?.short_name || 'Unknown',
            playerOvr: ovr,
            club: bidder.team_name,
            clubLogo: bidder.club_logo_url || '',
            league: bidder.league_name || '',
            amount: bidAmount,
            date: new Date(this.gs.currentDate),
            status: 'pending'  // pending | accepted | rejected
        });
    }

    /** Accept an incoming offer */
    acceptOffer(offerId) {
        const offer = this.incomingOffers.find(o => o.id === offerId);
        if (!offer || offer.status !== 'pending') return { success: false, message: 'Offer not found or already handled.' };

        offer.status = 'accepted';
        this.sellPlayer(offer.playerId, offer.amount);
        return { success: true, message: `Sold ${offer.playerName} to ${offer.club} for €${this.formatMoney(offer.amount)}.` };
    }

    /** Reject an incoming offer */
    rejectOffer(offerId) {
        const offer = this.incomingOffers.find(o => o.id === offerId);
        if (!offer || offer.status !== 'pending') return { success: false };
        offer.status = 'rejected';
        return { success: true };
    }

    /* ────────────────────────────────────────────
       COUNTER AN INCOMING OFFER
       ──────────────────────────────────────────── */
    counterOffer(offerId, newAmount) {
        const offer = this.incomingOffers.find(o => o.id === offerId);
        if (!offer || offer.status !== 'pending') return { success: false, message: 'Cannot counter.' };

        const marketValue = this.estimateMarketValueById(offer.playerId);

        // AI response: if counter is reasonable (within 120% of MV) accept, else reject
        if (newAmount <= marketValue * 1.25 && newAmount >= offer.amount * 0.95) {
            offer.status = 'accepted';
            offer.amount = newAmount;
            this.sellPlayer(offer.playerId, newAmount);
            return { success: true, message: `${offer.club} accepted your counter of €${this.formatMoney(newAmount)}.` };
        } else {
            offer.status = 'rejected';
            return { success: false, message: `${offer.club} rejected your counter-offer.` };
        }
    }

    estimateMarketValueById(playerId) {
        const p = this.gs.allPlayers.find(pl => pl.player_id === playerId) ||
                  this.gs.squad.find(pl => pl.player_id === playerId);
        if (!p) return 10000000;
        return p.value?.market_value_eur || this.estimateMarketValue(p);
    }

    /* ────────────────────────────────────────────
       UTILITY
       ──────────────────────────────────────────── */
    formatMoney(amount) {
        if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
        if (amount >= 1000)    return (amount / 1000).toFixed(0) + 'K';
        return amount.toString();
    }

    getPendingOffers() {
        return this.incomingOffers.filter(o => o.status === 'pending');
    }
}

// Export for Node (if ever needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransferSystem;
}
