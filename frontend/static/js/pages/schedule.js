async function schedule() {
  if (!appSettings.active_event_code) { noEventPage(); return; }
  loadingPage();

  const season = appSettings.active_season || 2025;
  const [schedData, rankData, oprResult, matchRpData, officialScores] = await Promise.all([
    API.getSchedule('qual').catch(() => null),
    API.getRankings().catch(() => null),
    API.ftcscoutEventOprs(appSettings.active_event_code, season).catch(() => null),
    API.ftcscoutEventMatchRP(appSettings.active_event_code, season).catch(() => null),
    Number(season) === 2026 ? API.getMatches('qual').catch(() => null) : null,
  ]);
  if (currentPage !== 'schedule') return;  // stale fetch — user navigated away

  const matches  = schedData?.schedule || [];
  const rankings = rankData?.rankings || rankData?.Rankings || [];
  const rankMap  = Object.fromEntries(rankings.map(r=>[r.teamNumber,r]));
  rankings.forEach(r=>{window._teamNames=window._teamNames||{};window._teamNames[r.teamNumber]=r.teamName||'';});

  // Build per-match scores map: matchNumber -> {red, blue} with RP flags from FTCScout GraphQL
  const scoresMap = {};
  (matchRpData?.matches || []).forEach(ms => {
    if (ms.tournamentLevel && ms.tournamentLevel !== 'Quals' && ms.tournamentLevel !== 'qual') return;
    scoresMap[ms.matchNum] = { red: ms.red, blue: ms.blue };
  });
  // Prefer the official FIRST score sheets for BIOBUZZ whenever available.
  // Each match contains one score record for red and another for blue.
  const officialScoreMap = {};
  for (const match of officialScores?.matchScores || []) {
    const red = match.alliances?.find(alliance => alliance.alliance === 'Red');
    const blue = match.alliances?.find(alliance => alliance.alliance === 'Blue');
    if (match.matchNumber == null || !red || !blue) continue;
    officialScoreMap[match.matchNumber] = {red, blue};
    scoresMap[match.matchNumber] = {
      red: {...red, tips: (red.autoHiveTips || 0) + (red.teleopHiveTips || 0)},
      blue: {...blue, tips: (blue.autoHiveTips || 0) + (blue.teleopHiveTips || 0)},
    };
  }
  window._officialMatchScoresMap = officialScoreMap;
  window._matchScoresMap = scoresMap;

  // Build OPR map from FTCScout GraphQL
  const oprMap = {};
  if (oprResult && Array.isArray(oprResult.oprList)) {
    oprResult.oprList.forEach(t => {
      if (t.teamNumber) {
        oprMap[t.teamNumber] = {
          total:   t.opr    || 0,
          auto:    t.autoOpr || 0,
          teleop:  t.dcOpr   || 0,
          endgame: t.egOpr   || 0,
        };
      }
    });
  }

  window._oprMap = oprMap;  // shared with the match detail modal / other pages

  if (!matches.length) {
    renderPage('<div class="empty-state"><div>No schedule yet.</div></div>');
    return;
  }

  // Store for match detail modal
  window._scheduleData = matches;
  window._schedRankMap = rankMap;

  renderPage(`
    <div class="tabs" style="margin-bottom:.5rem">
      <button class="tab active" id="tab-all">All</button>
      <button class="tab" id="tab-ours">Ours</button>
      <button class="tab" id="tab-upcoming">Upcoming</button>
    </div>
    <div id="sched-list"></div>`);

  function predictMatch(m) {
    const redTeams  = (m.teams || []).filter(t => t.station?.startsWith('Red'));
    const blueTeams = (m.teams || []).filter(t => t.station?.startsWith('Blue'));
    return oprPredictSides(redTeams, blueTeams, oprMap);
  }

  function teamLabel(t, alliance) {
    const isOurs = t.teamNumber == TEAM_NUMBER;
    const name = window._teamNames?.[t.teamNumber] || '';
    const shortName = name.length > 12 ? name.slice(0,11) + '…' : name;
    const chip = `<span class="team-chip ${alliance}${isOurs?' our clickable-chip':' clickable-chip'}" data-team="${t.teamNumber}"
      style="${isOurs?'font-weight:800;border-width:2px':''}">
      ${isOurs?`<strong>${t.teamNumber}</strong>`:t.teamNumber}${shortName ? `<span style="font-size:.58rem;opacity:.7;margin-left:2px">${shortName}</span>` : ''}
    </span>`;
    return chip;
  }

  function renderMatches(list) {
    if (!list.length) {
      document.getElementById('sched-list').innerHTML='<div class="empty-state" style="padding:2rem 0"><div>No matches.</div></div>';
      return;
    }
    document.getElementById('sched-list').innerHTML = list.map(m => {
      const isOurs = m.teams?.some(t=>t.teamNumber==TEAM_NUMBER);
      const played = m.scoreRedFinal !== null;
      const red    = (m.teams||[]).filter(t=>t.station?.startsWith('Red'));
      const blue   = (m.teams||[]).filter(t=>t.station?.startsWith('Blue'));

      const fieldNum = m.series != null ? `Field ${m.series + 1}` : '';

      let scoreHtml, winBadge='';
      if (played) {
        if (isOurs) {
          const ourA = m.teams.find(t=>t.teamNumber==TEAM_NUMBER)?.station?.startsWith('Red')?'Red':'Blue';
          const won  = ourA==='Red'?m.redWins:m.blueWins;
          winBadge   = `<span style="font-size:.68rem;font-weight:800;color:${won?'var(--green)':'var(--red)'}"> ${won?'W':'L'}</span>`;
        }
        scoreHtml=`
          <div class="match-score">
            <div class="red-score" style="${m.redWins?'font-weight:800;font-size:1rem':''}">${m.scoreRedFinal}</div>
            <div class="blue-score" style="${m.blueWins?'font-weight:800;font-size:1rem':''}">${m.scoreBlueFinal}</div>
          </div>`;
      } else {
        scoreHtml=`<div class="match-time">${formatTime(m.startTime)}</div>`;
      }

      // Use official ranking-point flags when available, or FTCScout as fallback.
      const sc = scoresMap[m.matchNumber];
      let rpLine = '';
      if (played && sc) {
        const isTie = !m.redWins && !m.blueWins;
        const redRP  = computeMatchRP(sc.red,  m.redWins,  isTie);
        const blueRP = computeMatchRP(sc.blue, m.blueWins, isTie);
        rpLine = rpPairChip(redRP, blueRP, sc.red, sc.blue);
      }

      // OPR prediction for all matches
      let predLine = '';
      if (Object.keys(oprMap).length) {
        const pred = predictMatch(m);
        const ourTeam = m.teams?.find(t => t.teamNumber == TEAM_NUMBER);
        if (ourTeam) {
          const ourA = ourTeam.station?.startsWith('Red') ? 'Red' : 'Blue';
          const weFavored = pred.winner === ourA;
          const tossup = pred.winner === 'Tie';
          const color = tossup ? 'var(--yellow)' : weFavored ? 'var(--green)' : 'var(--red)';
          const label = tossup ? 'Toss-up' : weFavored ? 'Favored' : 'Unfavored';
          predLine = `<span style="color:${color};font-weight:700">${label}</span>
            <span>${pred.confidence}%</span>
            <span style="font-size:.6rem">OPR <span style="color:var(--alliance-red)">${pred.redOPR.toFixed(0)}</span> v <span style="color:var(--alliance-blue)">${pred.blueOPR.toFixed(0)}</span></span>`;
        } else {
          const predColor = pred.winner === 'Red' ? 'var(--alliance-red)' : pred.winner === 'Blue' ? 'var(--alliance-blue)' : 'var(--yellow)';
          predLine = `<span style="color:${predColor};font-weight:700">${pred.winner === 'Tie' ? 'Toss-up' : pred.winner + ' favored'}</span>
            <span>${pred.confidence}%</span>
            <span style="font-size:.6rem">OPR <span style="color:var(--alliance-red)">${pred.redOPR.toFixed(0)}</span> v <span style="color:var(--alliance-blue)">${pred.blueOPR.toFixed(0)}</span></span>`;
        }
      }

      const subStats = played
        ? `<div class="match-sub-stats">
            ${pairChip('Auto', m.scoreRedAuto??'?', m.scoreBlueAuto??'?')}
            ${(m.scoreRedFoul||m.scoreBlueFoul)?pairChip('Fouls', m.scoreRedFoul||0, m.scoreBlueFoul||0):''}
            ${rpLine}
            ${Number(season) === 2026 && sc?.red?.tips != null && sc?.blue?.tips != null
              ? pairChip('Tips', sc.red.tips, sc.blue.tips) : ''}
            ${fieldChip(m.series)}
           </div>
           ${predLine ? `<div class="match-sub-stats">${predLine}</div>` : ''}`
        : `<div class="match-sub-stats">
            ${fieldChip(m.series)}
            ${predLine}
           </div>`;

      return `
        <div class="match-row ${isOurs?'our-match':''}" onclick="openMatchDetail(${m.matchNumber})" style="cursor:pointer">
          <div class="match-num">Q${m.matchNumber}${winBadge}</div>
          <div class="match-alliances" style="flex:1">
            <div class="alliance-teams">${red.map(t=>teamLabel(t,'red')).join('')}</div>
            <div class="alliance-teams">${blue.map(t=>teamLabel(t,'blue')).join('')}</div>
            ${subStats}
          </div>
          ${scoreHtml}
        </div>`;
    }).join('');
    bindTeamClicks(rankings);
  }

  let currentFilter = 'all';
  function getFilteredList() {
    if (currentFilter === 'ours') return matches.filter(m=>m.teams?.some(t=>t.teamNumber==TEAM_NUMBER));
    if (currentFilter === 'upcoming') return matches.filter(m=>m.scoreRedFinal===null);
    return matches;
  }

  renderMatches(matches);

  document.getElementById('tab-all').addEventListener('click', ()=>{ currentFilter='all'; setActiveTab('tab-all'); renderMatches(getFilteredList()); });
  document.getElementById('tab-ours').addEventListener('click', ()=>{ currentFilter='ours'; setActiveTab('tab-ours'); renderMatches(getFilteredList()); });
  document.getElementById('tab-upcoming').addEventListener('click', ()=>{ currentFilter='upcoming'; setActiveTab('tab-upcoming'); renderMatches(getFilteredList()); });

}

function openMatchDetail(matchNumber) {
  const m = window._scheduleData?.find(x=>x.matchNumber===matchNumber);
  if (!m) return;
  const rankMap = window._schedRankMap || {};
  const red   = (m.teams||[]).filter(t=>t.station?.startsWith('Red'));
  const blue  = (m.teams||[]).filter(t=>t.station?.startsWith('Blue'));
  const played= m.scoreRedFinal !== null;
  const fieldNum = m.series != null ? `Field ${m.series + 1}` : '';
  const scoresMap = window._matchScoresMap || {};
  const sc = scoresMap[matchNumber];
  const officialScore = window._officialMatchScoresMap?.[matchNumber];
  const isTie = played && !m.redWins && !m.blueWins;
  const redRP  = played && sc ? computeMatchRP(sc.red,  m.redWins,  isTie) : null;
  const blueRP = played && sc ? computeMatchRP(sc.blue, m.blueWins, isTie) : null;
  const videoUrl = typeof m.videoURL === 'string' && /^https?:\/\//i.test(m.videoURL) ? m.videoURL : null;
  const rpBadge = (a, isWinner) => {
    if (!a) return '';
    const f = allianceRPFlags(a);
    const items = rankingPointBonuses().map(bonus => [bonus.label, f[bonus.key]]);
    const chips = items.map(([lbl, on]) =>
      `<span style="background:${on?'var(--bg3)':'transparent'};color:${on?'var(--green)':'var(--text3)'};padding:1px 5px;border-radius:3px;font-size:.6rem;font-family:var(--mono);border:1px solid ${on?'var(--green)':'var(--border)'}">${on?'+1':'0'} ${lbl}</span>`
    ).join(' ');
    const winRP = isTie ? '+1 Tie' : isWinner ? '+3 Win' : '0 Loss';
    const winColor = isTie ? 'var(--yellow)' : isWinner ? 'var(--green)' : 'var(--text3)';
    return `<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.35rem">
      ${chips}
      <span style="background:${isWinner||isTie?'var(--bg3)':'transparent'};color:${winColor};padding:1px 5px;border-radius:3px;font-size:.6rem;font-family:var(--mono);border:1px solid ${winColor}">${winRP}</span>
    </div>`;
  };

  const teamDetailRow = (t, alliance) => {
    const r   = rankMap[t.teamNumber];
    const ours= t.teamNumber == TEAM_NUMBER;
    return `
      <div style="display:flex;align-items:center;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--border);cursor:pointer"
           onclick="openTeamModal(${t.teamNumber})">
        <span class="team-chip ${alliance}${ours?' our':''}" style="${ours?'font-weight:800;border-width:2px':''}">
          ${ours?`<strong>${t.teamNumber}</strong>`:t.teamNumber}
        </span>
        <div style="flex:1">
          <div style="font-size:.85rem;font-weight:${ours?800:600}">${t.teamName||window._teamNames?.[t.teamNumber]||t.teamNumber}</div>
          <div style="font-size:.67rem;font-family:var(--mono);color:var(--text2)">
            ${t.station||''}${t.surrogate?' · surrogate':''}${t.dq?' · DQ':''}
          </div>
        </div>
        ${r?`<div style="text-align:right;font-family:var(--mono);font-size:.72rem;color:var(--text2)">#${r.rank}<br>${r.wins}W-${r.losses}L<br>RP ${r.sortOrder1?.toFixed(3)}</div>`:''}
      </div>`;
  };

  const modal = document.createElement('div');
  modal.className='modal';
  modal.innerHTML=`
    <div class="modal-backdrop" id="md-back"></div>
    <div class="modal-sheet">
      <div class="modal-header">
        <div>
          <span class="modal-title">Q${m.matchNumber}</span>
          ${fieldNum?`<span style="font-size:.72rem;font-family:var(--mono);color:var(--text2);margin-left:.5rem">${fieldNum}</span>`:''}
        </div>
        <button class="modal-close" id="md-close" title="Close" aria-label="Close">${uiIcon('x')}</button>
      </div>
      <div class="modal-body">
        ${played ? `
        <div class="stat-grid" style="margin-bottom:1rem">
          <div class="stat-box" style="border-color:color-mix(in srgb, var(--alliance-red) 30%, transparent)">
            <div style="font-size:.75rem;font-weight:600;color:var(--alliance-red);font-family:var(--mono);margin-bottom:.3rem">Red Alliance${redRP!=null?` · <span style="color:var(--text)">${redRP} RP</span>`:''}</div>
            <div class="stat-value" style="color:var(--alliance-red);font-size:2.2rem">${m.scoreRedFinal}</div>
            <div style="font-size:.72rem;font-family:var(--mono);color:var(--text2);margin-top:.3rem">
              Auto: ${m.scoreRedAuto??'?'} · Foul pts committed: ${m.scoreRedFoul??0}
            </div>
            ${sc?rpBadge(sc.red, m.redWins):''}
            ${m.redWins?'<div style="font-size:.75rem;color:var(--green);font-weight:600;margin-top:.25rem">Winner</div>':''}
          </div>
          <div class="stat-box" style="border-color:color-mix(in srgb, var(--alliance-blue) 30%, transparent)">
            <div style="font-size:.75rem;font-weight:600;color:var(--alliance-blue);font-family:var(--mono);margin-bottom:.3rem">Blue Alliance${blueRP!=null?` · <span style="color:var(--text)">${blueRP} RP</span>`:''}</div>
            <div class="stat-value" style="color:var(--alliance-blue);font-size:2.2rem">${m.scoreBlueFinal}</div>
            <div style="font-size:.72rem;font-family:var(--mono);color:var(--text2);margin-top:.3rem">
              Auto: ${m.scoreBlueAuto??'?'} · Foul pts committed: ${m.scoreBlueFoul??0}
            </div>
            ${sc?rpBadge(sc.blue, m.blueWins):''}
            ${m.blueWins?'<div style="font-size:.75rem;color:var(--green);font-weight:600;margin-top:.25rem">Winner</div>':''}
          </div>
        </div>
        ${Number(appSettings.active_season) === 2026
          ? officialScore
            ? renderBioBuzzMatchScoring(officialScore, m)
            : renderBioBuzzScoutingSummary(sc)
          : ''}` : `
        <div class="card" style="text-align:center;margin-bottom:1rem">
          <div style="font-size:.85rem;color:var(--text2);font-family:var(--mono)">Scheduled: ${formatTime(m.startTime)}</div>
          ${fieldNum?`<div style="font-size:.75rem;color:var(--accent2);margin-top:.25rem">${fieldNum}</div>`:''}
          <div style="font-size:.7rem;color:var(--text3);margin-top:.3rem">Match not yet played</div>
        </div>`}

        <div style="margin-bottom:.75rem">
          <div class="section-label" style="color:var(--alliance-red);margin-bottom:.25rem">Red Alliance</div>
          ${red.map(t=>teamDetailRow(t,'red')).join('')}
        </div>
        <div>
          <div class="section-label" style="color:var(--alliance-blue);margin-bottom:.25rem">Blue Alliance</div>
          ${blue.map(t=>teamDetailRow(t,'blue')).join('')}
        </div>

        <div id="md-advanced"></div>

        ${videoUrl ? `<div style="margin-top:.75rem;font-size:.75rem"><a href="${escHtml(videoUrl)}" target="_blank" rel="noopener noreferrer">Watch match video ↗</a></div>` : ''}
        ${m.actualStartTime?`<div style="margin-top:.75rem;font-size:.68rem;font-family:var(--mono);color:var(--text3)">
          Started: ${new Date(m.actualStartTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          ${m.postResultTime?` · Posted: ${new Date(m.postResultTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:''}
        </div>`:''}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    const chip = event.target.closest('.match-scoring-robot-row .clickable-chip');
    if (!chip) return;
    event.stopPropagation();
    openTeamModal(Number(chip.dataset.team));
  });
  document.getElementById('md-back').addEventListener('click', ()=>modal.remove());
  document.getElementById('md-close').addEventListener('click', ()=>modal.remove());
  if (appSettings.advanced_predictions !== false) _fillMatchAdvanced(m, red, blue);
}

// Advanced favoring: per-component OPR comparison (Settings → Pages toggle).
// Loads the OPR map on demand when the modal is opened from a page that
// didn't fetch it (e.g. the dashboard).
async function _fillMatchAdvanced(m, red, blue) {
  let oprMap = window._oprMap;
  if (!oprMap || !Object.keys(oprMap).length) {
    const season = appSettings.active_season || 2025;
    const res = await API.ftcscoutEventOprs(appSettings.active_event_code, season).catch(()=>null);
    oprMap = {};
    (res?.oprList || []).forEach(t => {
      if (t.teamNumber) oprMap[t.teamNumber] = {total: t.opr||0, auto: t.autoOpr||0, teleop: t.dcOpr||0, endgame: t.egOpr||0};
    });
    window._oprMap = oprMap;
  }
  const el = document.getElementById('md-advanced');
  if (!el) return;  // modal already closed
  const pred = oprPredictSides(red, blue, oprMap);
  if (!pred.hasData) return;
  const played = m.scoreRedFinal !== null && m.scoreRedFinal !== undefined;
  const verdict = played ? '' : pred.winner === 'Tie'
    ? `· <span style="color:var(--yellow)">Toss-up</span>`
    : `· <span style="color:${pred.winner === 'Red' ? 'var(--alliance-red)' : 'var(--alliance-blue)'}">${pred.winner} favored ${pred.confidence}%</span>`;
  el.innerHTML = `
    <div style="margin-top:.75rem">
      <div class="section-label" style="margin-bottom:.25rem">OPR Favoring ${verdict}</div>
      ${oprBreakdownHtml(pred)}
      <div style="font-size:.6rem;font-family:var(--mono);color:var(--text3);margin-top:.3rem">Alliance sums of season npOPR per phase (FTCScout)</div>
    </div>`;
}
