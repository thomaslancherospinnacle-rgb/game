/**
 * FIFA MANAGER - Transfers Module (Part 2)
 * Player list rendering, detail modals, and bidding
 */

(function(window) {

    // ============================================================
    // RENDER PLAYER LIST (50/50 SPLIT)
    // ============================================================

    window.renderPlayerList = function(reports) {
        const container = document.getElementById('tpPlayerList');
        const titleEl = document.getElementById('tpTitle');
        const subEl = document.getElementById('tpPositionLabel');

        const pos = soPositions[soIdx.pos];
        titleEl.textContent = pos === 'Any' ? 'SEARCH RESULTS' : pos + ' PLAYERS';
        subEl.textContent = reports.length + ' found';

        // Left column: compact boxes
        let leftHtml = reports.map((r, i) => {
            const faceUrl = r.face_url || '';
            const faceImg = faceUrl ? `<img src="${faceUrl}" onerror="this.style.display='none';">` : '';
            const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : r.overall;
            const activeClass = (i === selectedResultIdx) ? ' active' : '';
            const scoutStatus = window.isPlayerScoutDone(r.player_id) ? ' scouted' : (window.isPlayerScouting(r.player_id) ? ' scouting' : '');
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

        // Right column: preview
        const rightHtml = renderPlayerPreview(reports[selectedResultIdx] || null);

        container.innerHTML = `<div class="tp-split">
            <div class="tp-split-left">${leftHtml}</div>
            <div class="tp-split-right">${rightHtml}</div>
        </div>`;
    };

    window.hoverPlayerResult = function(idx) {
        if (idx === selectedResultIdx) return;
        document.querySelectorAll('.tp-player-row').forEach((el,i) => el.classList.toggle('active', i===idx));
        const right = document.querySelector('.tp-split-right');
        if (right) right.innerHTML = renderPlayerPreview(currentSearchResults[idx] || null);
    };

    window.selectPlayerResult = function(idx) {
        selectedResultIdx = idx;
        const report = currentSearchResults[idx];
        if (!report) return;
        window.openScoutOverlay(report);
    };

    function renderPlayerPreview(r) {
        if (!r) return `<div class="tp-preview-empty">Select a player</div>`;

        const faceUrl = r.face_url || '';
        const ovrDisplay = typeof r.overall === 'object' ? `${r.overall.min}-${r.overall.max}` : r.overall;
        const potDisplay = typeof r.potential === 'object' ? `${r.potential.min}-${r.potential.max}` : (r.potential || '?');

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

        const scouted = window.isPlayerScoutDone(r.player_id);
        const scouting = window.isPlayerScouting(r.player_id);
        let scoutInfo = '';
        if (scouted) {
            scoutInfo = `<div class="tp-prev-scout-status done">✓ Scout Report Complete</div>`;
        } else if (scouting) {
            scoutInfo = `<div class="tp-prev-scout-status scouting">⏳ Scouting in progress...</div>`;
        } else {
            scoutInfo = `<div class="tp-prev-scout-status not">◯ Not Scouting</div>`;
        }

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
                    <div class="tp-prev-fin"><div class="tp-prev-fin-lbl">Value</div><div class="tp-prev-fin-val ${r.value_known?'':'unknown'}">${r.value_known ? (typeof r.market_value==='object' ? '€'+window.transferSystem.formatMoney(r.market_value.min)+'-'+window.transferSystem.formatMoney(r.market_value.max) : '€'+window.transferSystem.formatMoney(r.market_value)) : '?'}</div></div>
                    <div class="tp-prev-fin"><div class="tp-prev-fin-lbl">Wage</div><div class="tp-prev-fin-val ${r.value_known?'':'unknown'}">${r.value_known && r.wage !== null ? '€'+(typeof r.wage==='object'?window.transferSystem.formatMoney(r.wage.min):window.transferSystem.formatMoney(r.wage))+'/wk' : '?'}</div></div>
                    <div class="tp-prev-fin"><div class="tp-prev-fin-lbl">Contract</div><div class="tp-prev-fin-val">${r.contract_until || '?'}</div></div>
                </div>
            </div>
        </div>`;
    }

    // ============================================================
    // SCOUT OVERLAY (DETAILED VIEW)
    // ============================================================

    window.openScoutOverlay = function(report) {
        const overlay = document.getElementById('scoutOverlay');
        const content = document.getElementById('scoutOverlayContent');
        if (!overlay || !content) return;

        const faceUrl = report.face_url || '';
        const ovrDisplay = typeof report.overall === 'object' ? `${report.overall.min}-${report.overall.max}` : report.overall;
        const potDisplay = typeof report.potential === 'object' ? `${report.potential.min}-${report.potential.max}` : (report.potential || '?');

        const scouted = window.isPlayerScoutDone(report.player_id);
        const scouting = window.isPlayerScouting(report.player_id);

        const statKeys = ['pace','shooting','passing','dribbling','defending','physic'];
        const statLabels = { pace:'Pace', shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', physic:'Physical' };

        let leftStatsHtml = `<div class="sco-stats-grid">`;
        ['overall','value','wage','form'].forEach(key => {
            let label, val;
            if (key === 'overall') { label = 'OVERALL'; val = report.value_known ? ovrDisplay : '?'; }
            if (key === 'value') { label = 'VALUE'; val = report.value_known && report.market_value ? (typeof report.market_value==='object'?'€'+window.transferSystem.formatMoney(report.market_value.min)+'-'+window.transferSystem.formatMoney(report.market_value.max):'€'+window.transferSystem.formatMoney(report.market_value)) : '?'; }
            if (key === 'wage') { label = 'WAGE'; val = report.value_known && report.wage !== null ? '€'+(typeof report.wage==='object'?window.transferSystem.formatMoney(report.wage.min):window.transferSystem.formatMoney(report.wage))+'/wk' : '?'; }
            if (key === 'form') { label = 'FORM'; val = 'Okay'; }
            const isUnknown = (val === '?');
            leftStatsHtml += `<div class="sco-stat-row">
                <div class="sco-stat-label">${label}</div>
                <div class="sco-stat-val ${isUnknown?'unknown':''}">${val}</div>
            </div>`;
        });
        leftStatsHtml += `</div>`;

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

        let scoutActions = '';
        if (!scouted && !scouting) {
            scoutActions = `<div class="sco-actions">
                <div class="sco-action-btn primary" onclick="startScouting('${report.player_id}', ${window.getScoutDaysNeeded(report)})">📋 Ask Scout to Scout ${report.short_name}</div>
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

        let rightStatsHtml = statKeys.map(key => {
            const val = report[key];
            let displayVal;
            if (val === null || val === undefined) displayVal = '?';
            else if (typeof val === 'object') displayVal = `${val.min}-${val.max}`;
            else displayVal = val;
            return `<div class="sco-right-stat"><span class="sco-right-stat-label">${statLabels[key]}</span><span class="sco-right-stat-val">${displayVal}</span></div>`;
        }).join('');

        let reportLabel = 'Preliminary Report';
        if (scouted) reportLabel = 'Full Report';
        else if (scouting) reportLabel = 'Scouting...';

        content.innerHTML = `
            <button class="sco-close" onclick="closeScoutOverlay()">✕</button>
            <div class="sco-split">
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
    };

    window.closeScoutOverlay = function() {
        document.getElementById('scoutOverlay').classList.add('hidden');
    };

    window.startScouting = function(playerId, daysNeeded) {
        window.scoutQueue[playerId] = {
            status:'queued',
            startDay: window.gameState.fixtures.filter(f=>f.played).length,
            daysNeeded: daysNeeded
        };
        const report = currentSearchResults.find(r => r.player_id === playerId);
        if (report) window.openScoutOverlay(report);
        window.renderPlayerList(currentSearchResults);
    };

    window.shortlistPlayer = function(playerId) {
        window.closeScoutOverlay();
    };

    window.shortlistAndView = function(playerId) {
        window.closeScoutOverlay();
    };

    window.openBidModal = function(playerId) {
        window.closeScoutOverlay();
        const report = currentSearchResults.find(r => r.player_id === playerId);
        if (report) window.openPlayerDetail(report);
    };

    // ============================================================
    // TRANSFER HUB
    // ============================================================

    window.renderTransferHub = function() {
        if (!window.transferSystem) return;

        const budgetEl = document.getElementById('thubBudget');
        if (budgetEl) budgetEl.textContent = '€' + window.transferSystem.formatMoney(window.transferSystem.transferBudget);

        window.updateOfferBadge();
        window.renderNetworkOffers();
        window.renderHistoryPanel();

        const defaults = window.transferSystem.searchPlayers({ position:'', league:'', country:'', query:'', minOvr:60, maxOvr:99, maxPrice:0, freeAgents:false });
        defaults.sort((a,b) => {
            const potA = typeof a.potential === 'object' ? (a.potential.min+a.potential.max)/2 : (a.potential||0);
            const potB = typeof b.potential === 'object' ? (b.potential.min+b.potential.max)/2 : (b.potential||0);
            return potB - potA;
        });
        currentSearchResults = defaults.slice(0, 50);
        selectedResultIdx = 0;
        window.renderPlayerList(currentSearchResults);
    };

    window.updateTransferNetwork = function() {
        const listEl = document.getElementById('transferPlayerList');
        if (!listEl) return;

        const completedScouts = Object.keys(window.scoutQueue).filter(pid => window.scoutQueue[pid].status === 'complete');
        const scoutCountEl = document.getElementById('newScoutCount');
        if (scoutCountEl) scoutCountEl.textContent = completedScouts.length;

        if (completedScouts.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;">No scouting reports<br><span style="font-size:0.8rem;">Scout players from Transfers tab</span></div>';
            return;
        }

        const html = completedScouts.slice(0, 5).map(playerId => {
            const player = window.gameState.allPlayers.find(p => p.player_id === playerId);
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
    };

    window.openPlayerFromScout = function(playerId) {
        if (!window.transferSystem) return;
        const filters = { query: '__id__' + playerId, position:'', league:'', country:'', minOvr:0, maxOvr:0, maxPrice:0, freeAgents:false };
        const results = window.transferSystem.searchPlayers(filters);
        if (results.length > 0) {
            window.openPlayerDetail(results[0]);
        }
    };

    window.renderNetworkOffers = function() {
        const container = document.getElementById('tnetOffers');
        if (!container || !window.transferSystem) return;
        const pending = window.transferSystem.getPendingOffers();
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
                    <div class="tnet-offer-amount">€${window.transferSystem.formatMoney(offer.amount)}</div>
                    <div class="tnet-offer-from">from ${offer.club}</div>
                </div>
                <div class="tnet-offer-btns">
                    <button class="tnet-btn accept" onclick="acceptIncomingOffer(${offer.id})">Accept</button>
                    <button class="tnet-btn reject" onclick="rejectIncomingOffer(${offer.id})">Reject</button>
                </div>
            </div>
        `).join('');
    };

    window.acceptIncomingOffer = function(offerId) {
        const result = window.transferSystem.acceptOffer(offerId);
        if (result.success) {
            window.renderSquad();
            window.renderTransferHub();
        }
    };

    window.rejectIncomingOffer = function(offerId) {
        window.transferSystem.rejectOffer(offerId);
        window.renderTransferHub();
    };

    window.renderHistoryPanel = function() {
        const container = document.getElementById('thistContent');
        if (!container || !window.transferSystem) return;
        const history = window.transferSystem.transferHistory;
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
                <div class="thist-fee">€${window.transferSystem.formatMoney(deal.fee)}</div>
            </div>
        `).join('');
    };

    window.switchTransferView = function(view) {
        if (view === 'offers') window.renderNetworkOffers();
        if (view === 'history') window.renderHistoryPanel();
    };

    // ============================================================
    // PLAYER DETAIL MODAL & BIDDING
    // ============================================================

    let pendingTransferFee = 0;

    window.openPlayerDetail = function(report) {
        if (typeof report === 'string') {
            try { report = JSON.parse(report); } catch(e) { return; }
        }
        const modal = document.getElementById('playerDetailModal');
        const content = document.getElementById('playerDetailContent');

        const fmtOvr = v => typeof v === 'object' ? `${v.min}-${v.max}` : v;
        const fmtVal = (v) => {
            if (v === null || v === undefined) return '?';
            if (typeof v === 'object') return `€${window.transferSystem.formatMoney(v.min)}-${window.transferSystem.formatMoney(v.max)}`;
            return `€${window.transferSystem.formatMoney(v)}`;
        };

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
                attrsHtml += `<div class="detail-attr"><div class="detail-attr-label">${attrLabels[key]}</div><div class="detail-attr-bar-wrap"><div class="detail-attr-bar"><div class="detail-attr-bar-fill" style="width:${val}%;"></div></div><div class="detail-attr-val">${val}</div></div></div>`;
            }
        });

        const currentYear = window.gameState.currentDate?.getFullYear() || 2025;
        const contractEnd = report.contract_until || 2025;
        const isFreeAgent = contractEnd <= currentYear;
        const isExpiring = contractEnd <= currentYear + 1;
        const releaseHtml = report.release_clause ? `<div class="detail-fin-item"><div class="detail-fin-label">Release Clause</div><div class="detail-fin-value">€${window.transferSystem.formatMoney(report.release_clause)}</div></div>` : '';

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
            ? 'e.g. ' + window.transferSystem.formatMoney(typeof report.market_value === 'object' ? report.market_value.min : report.market_value)
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
    };

    window.closePlayerDetail = function() {
        const modal = document.getElementById('playerDetailModal');
        modal.classList.add('hidden');
        modal.classList.remove('active');
    };

    window.submitBid = function(playerId) {
        const amount = parseInt(document.getElementById('bidAmount')?.value) || 0;
        if (amount <= 0) {
            showBidResult('Enter a valid bid amount.', 'rejected');
            return;
        }
        const result = window.transferSystem.placeBid(playerId, amount);
        if (result.status === 'accepted' || result.status === 'release_clause') {
            pendingTransferFee = result.fee || amount;
            showBidResult(result.message, 'success');
            setTimeout(() => {
                const cf = document.getElementById('contractForm');
                if (cf) cf.classList.add('show');
                const player = window.gameState.allPlayers.find(p => p.player_id === playerId);
                if (player) {
                    const suggestedWage = Math.floor((player.value?.wage_eur || window.transferSystem.estimateWage(player)) * 1.05 / 1000) * 1000;
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
    };

    function showBidResult(msg, type) {
        const el = document.getElementById('bidResult');
        if (!el) return;
        el.textContent = msg;
        el.className = 'bid-result show ' + type;
    }

    window.startContractNegotiation = function(playerId, fee) {
        pendingTransferFee = fee;
        const cf = document.getElementById('contractForm');
        if (cf) cf.classList.add('show');
        const player = window.gameState.allPlayers.find(p => p.player_id === playerId);
        if (player) {
            const suggestedWage = Math.floor((player.value?.wage_eur || window.transferSystem.estimateWage(player)) * 1.1 / 1000) * 1000;
            document.getElementById('contractWage').value = suggestedWage;
            document.getElementById('contractBonus').value = Math.floor(suggestedWage * 5);
        }
    };

    window.submitContract = function(playerId) {
        const length = parseInt(document.getElementById('contractLength')?.value) || 3;
        const wage = parseInt(document.getElementById('contractWage')?.value) || 0;
        const bonus = parseInt(document.getElementById('contractBonus')?.value) || 0;
        if (wage <= 0) {
            showContractResult('Enter a weekly wage.', 'rejected');
            return;
        }
        const player = window.gameState.allPlayers.find(p => p.player_id === playerId);
        if (!player) {
            showContractResult('Player not found.', 'rejected');
            return;
        }
        const contractOffer = { length, weeklyWage: wage, signingBonus: bonus };
        const result = window.transferSystem.negotiateContract(player, contractOffer, pendingTransferFee);
        if (result.success) {
            window.transferSystem.finaliseTransfer(player, pendingTransferFee, contractOffer);
            showContractResult(`✅ ${result.message} Transfer complete!`, 'success');
            window.renderSquad();
            window.updateOfferBadge();
            setTimeout(() => {
                window.closePlayerDetail();
                window.renderTransferHub();
            }, 1200);
        } else if (result.reason === 'counter') {
            showContractResult(result.message, 'counter');
            document.getElementById('contractLength').value = result.counter.length;
            document.getElementById('contractWage').value = result.counter.weeklyWage;
        } else {
            showContractResult(result.message, 'rejected');
        }
    };

    function showContractResult(msg, type) {
        const el = document.getElementById('contractResult');
        if (!el) return;
        el.textContent = msg;
        el.className = 'bid-result show ' + type;
    }

    window.updateOfferBadge = function() {
        if (!window.transferSystem) return;
        const count = window.transferSystem.getPendingOffers().length;
        const badge = document.getElementById('offerBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
        const countEl = document.getElementById('offerCount');
        if (countEl) {
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'inline' : 'none';
        }
    };

    console.log('✅ Transfers module loaded');

})(window);