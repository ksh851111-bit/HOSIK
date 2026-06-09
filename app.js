/* ==========================================================================
   ROAD TO 2026 | CORE JS APPLICATION LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  // 2026 World Cup Group A Initial Standings Team Objects
  const TEAMS = {
    KOR: { id: 'KOR', name: '대한민국', flagClass: 'flag-ko', isKorea: true },
    MEX: { id: 'MEX', name: '멕시코', flagClass: 'flag-mx' },
    CZE: { id: 'CZE', name: '체코', flagClass: 'flag-cz' },
    RSA: { id: 'RSA', name: '남아공', flagClass: 'flag-za' }
  };

  // Match configurations and current predicted scores
  const matchScores = {
    1: { home: 'KOR', away: 'CZE', homeScore: 0, awayScore: 0, date: '6월 12일' },
    2: { home: 'KOR', away: 'MEX', homeScore: 0, awayScore: 0, date: '6월 19일' },
    3: { home: 'KOR', away: 'RSA', homeScore: 0, awayScore: 0, date: '6월 25일' },
    4: { home: 'MEX', away: 'RSA', homeScore: 0, awayScore: 0, date: '6월 12일' },
    5: { home: 'CZE', away: 'MEX', homeScore: 0, awayScore: 0, date: '6월 24일' },
    6: { home: 'RSA', away: 'CZE', homeScore: 0, awayScore: 0, date: '6월 19일' }
  };

  // User details
  let userNickname = '붉은 악마';

  // Live Simulation state variables
  let isSimulating = false;
  let simInterval = null;
  let simTime = 0;
  let simScoreHome = 0;
  let simScoreAway = 0;
  let currentSimMatchId = 1;
  let currentSimTactic = 'attack';
  let currentSimFormation = '4-2-3-1';
  let currentSimSpeed = 'fast';
  let ballMoveInterval = null;

  // Sound Engine setup
  let audioCtx = null;
  let soundEnabled = true;

  // Confetti Engine state
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let confettiActive = false;
  let confettiParticles = [];
  const colors = ['#d7141a', '#ffffff', '#002395', '#007a4d', '#ffcc00'];

  // Dynamic D-Day countdown target (June 12, 2026 11:00 KST)
  const WORLD_CUP_START = new Date('2026-06-12T11:00:00+09:00');

  // Pre-configured player directories for interactive commentary
  const KOREA_PLAYERS = {
    FW: ['손흥민', '황희찬', '조규성', '오현규'],
    MF: ['이강인', '황인범', '이재성', '홍현석'],
    DF: ['김민재', '설영우', '김영권', '김진수'],
    GK: ['조현우', '송범근']
  };

  const CZECH_PLAYERS = ['쉬크', '수첵', '흘로젝', '바라크', '초우팔'];
  const MEXICO_PLAYERS = ['히메네스', '로사노', '알바레스', '차베스', '오초아'];
  const RSA_PLAYERS = ['타우', '모코에나', '모디바', '레필레', '윌리엄스'];

  // ========================================================================
  // INITIALIZATION & TAB NAVIGATION
  // ========================================================================

  function init() {
    setupCountdown();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize Hosigi FC Event Panel
    setupHosigiEvent();
  }

  function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Remove active class from all buttons and tabs
        navButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));
        
        // Activate current selection
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'tab-simulator') {
          // Sync pitch formations when entering simulator tab
          updatePitchFormation();
        }
      });
    });
  }

  // ========================================================================
  // D-DAY COUNTDOWN ENGINE
  // ========================================================================

  function setupCountdown() {
    function updateTimer() {
      const now = new Date();
      const difference = WORLD_CUP_START - now;

      if (difference <= 0) {
        document.getElementById('countdown-widget').innerHTML = `
          <div class="dday-tag" style="color:var(--clr-green)">WORLD CUP IS LIVE</div>
          <div class="timer-display" style="font-size:1.15rem">2026 북중미 월드컵 개막!</div>
        `;
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      document.getElementById('dday-days').textContent = String(days).padStart(2, '0');
      document.getElementById('dday-hours').textContent = String(hours).padStart(2, '0');
      document.getElementById('dday-minutes').textContent = String(minutes).padStart(2, '0');
      document.getElementById('dday-seconds').textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // ========================================================================
  // PREDICTOR & STANDINGS ENGINE
  // ========================================================================

  function setupPredictorListeners() {
    const scoreButtons = document.querySelectorAll('.score-btn');
    
    scoreButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const matchId = btn.getAttribute('data-match');
        const isHome = btn.classList.contains('minus') ? false : (btn.getAttribute('data-team') === 'home');
        const isMinus = btn.classList.contains('minus');
        
        let homeInput, awayInput;
        
        if (matchId <= 3) {
          homeInput = document.getElementById(`score-${matchId}-home`);
          awayInput = document.getElementById(`score-${matchId}-away`);
        } else {
          homeInput = document.getElementById(`score-${matchId}-home`);
          awayInput = document.getElementById(`score-${matchId}-away`);
        }

        let currentHomeVal = parseInt(homeInput.value) || 0;
        let currentAwayVal = parseInt(awayInput.value) || 0;

        if (isMinus) {
          // Deduct score based on which side was clicked
          const isHomeClick = btn.getAttribute('data-team') === 'home';
          if (isHomeClick && currentHomeVal > 0) currentHomeVal--;
          if (!isHomeClick && currentAwayVal > 0) currentAwayVal--;
        } else {
          // Add score based on which side was clicked
          const isHomeClick = btn.getAttribute('data-team') === 'home';
          if (isHomeClick) currentHomeVal++;
          else currentAwayVal++;
        }

        homeInput.value = currentHomeVal;
        awayInput.value = currentAwayVal;

        // Save into score state
        matchScores[matchId].homeScore = currentHomeVal;
        matchScores[matchId].awayScore = currentAwayVal;

        // Perform recalculations
        recalculateStandings();
        triggerScoreCelebration(matchId);
      });
    });

    // Random Other Scores button
    document.getElementById('btn-random-other-scores').addEventListener('click', () => {
      for (let matchId = 4; matchId <= 6; matchId++) {
        const homeScore = Math.floor(Math.random() * 3);
        const awayScore = Math.floor(Math.random() * 3);
        
        document.getElementById(`score-${matchId}-home`).value = homeScore;
        document.getElementById(`score-${matchId}-away`).value = awayScore;
        
        matchScores[matchId].homeScore = homeScore;
        matchScores[matchId].awayScore = awayScore;
      }
      recalculateStandings();
      playSyntheticSound('clap');
    });

    // Ticket nickname applier
    const nicknameBtn = document.getElementById('btn-apply-nickname');
    const nicknameInput = document.getElementById('user-nickname');
    const ticketHolder = document.getElementById('ticket-holder-name');

    nicknameBtn.addEventListener('click', () => {
      const val = nicknameInput.value.trim();
      if (val) {
        userNickname = val;
        ticketHolder.textContent = val;
        playSyntheticSound('whistle');
      }
    });

    // Ticket download button
    document.getElementById('btn-download-ticket').addEventListener('click', downloadTicketAsPNG);
  }

  function triggerScoreCelebration(matchId) {
    // Confetti and sounds only trigger if Korea scores in a Korea match (1, 2, or 3)
    if (matchId <= 3) {
      const homeScore = matchScores[matchId].homeScore;
      if (homeScore > 0) {
        startConfetti();
        playSyntheticSound('cheer');
        setTimeout(stopConfetti, 4000);
      }
    }
  }

  function recalculateStandings() {
    // 1. Initialize empty statistics for each team
    const standings = {
      KOR: { teamId: 'KOR', team: TEAMS.KOR, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
      MEX: { teamId: 'MEX', team: TEAMS.MEX, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
      CZE: { teamId: 'CZE', team: TEAMS.CZE, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
      RSA: { teamId: 'RSA', team: TEAMS.RSA, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    };

    // 2. Iterate matches and compile results
    Object.values(matchScores).forEach(match => {
      const h = match.home;
      const a = match.away;
      const hScore = match.homeScore;
      const aScore = match.awayScore;

      // Add played games, goals for, goals against
      standings[h].p++;
      standings[h].gf += hScore;
      standings[h].ga += aScore;

      standings[a].p++;
      standings[a].gf += aScore;
      standings[a].ga += hScore;

      // Win / Draw / Loss points calculations
      if (hScore > aScore) {
        standings[h].w++;
        standings[h].pts += 3;
        standings[a].l++;
      } else if (hScore < aScore) {
        standings[a].w++;
        standings[a].pts += 3;
        standings[h].l++;
      } else {
        standings[h].d++;
        standings[h].pts += 1;
        standings[a].d++;
        standings[a].pts += 1;
      }
    });

    // 3. Compute Goal Difference for all teams
    Object.keys(standings).forEach(key => {
      standings[key].gd = standings[key].gf - standings[key].ga;
    });

    // 4. Sort standings based on standard World Cup rules: Points -> GD -> GF -> alphabetical
    const sortedTeams = Object.values(standings).sort((teamA, teamB) => {
      if (teamB.pts !== teamA.pts) return teamB.pts - teamA.pts;
      if (teamB.gd !== teamA.gd) return teamB.gd - teamA.gd;
      if (teamB.gf !== teamA.gf) return teamB.gf - teamA.gf;
      return teamA.team.name.localeCompare(teamB.team.name);
    });

    // 5. Render Standings Table UI
    const tbody = document.querySelector('#standings-table tbody');
    tbody.innerHTML = '';

    sortedTeams.forEach((item, index) => {
      const rank = index + 1;
      const tr = document.createElement('tr');
      
      // Determine if row is Korea
      if (item.team.isKorea) tr.classList.add('row-korea');
      
      // Highlight top 2 as qualified zone
      if (rank <= 2) tr.classList.add('qualified-zone');

      tr.innerHTML = `
        <td class="cell-rank">${rank}</td>
        <td class="cell-team">
          <div class="flag ${item.team.flagClass}"></div>
          <span>${item.team.name}</span>
        </td>
        <td class="cell-stat">${item.p}</td>
        <td class="cell-stat">${item.w}</td>
        <td class="cell-stat">${item.d}</td>
        <td class="cell-stat">${item.l}</td>
        <td class="cell-stat">${item.gd > 0 ? '+' + item.gd : item.gd}</td>
        <td class="cell-stat">${item.gf}</td>
        <td class="cell-points">${item.pts}</td>
      `;
      tbody.appendChild(tr);
    });

    // 6. Evaluate Korea Advancement Status
    const korIndex = sortedTeams.findIndex(item => item.team.isKorea);
    const korRank = korIndex + 1;
    const korStats = sortedTeams[korIndex];

    const qualBanner = document.getElementById('qual-status-banner');
    const ticketOutcome = document.getElementById('ticket-outcome-status');
    
    // Reset banner states
    qualBanner.className = 'qual-status-banner glass-panel';

    let scenarioTitle = '';
    let scenarioDesc = '';
    let outcomeText = '';
    let isAdvancing = false;

    if (korStats.p < 3) {
      scenarioTitle = '예측 진행 중...';
      scenarioDesc = '조별리그 3경기의 모든 예측 스코어를 입력하여 진출 가능성을 확인하세요!';
      outcomeText = '분석 대기 중';
      qualBanner.classList.add('state-neutral');
    } else {
      if (korRank <= 2) {
        scenarioTitle = `🎉 대한민국 32강 토너먼트 진출! (조 ${korRank}위)`;
        scenarioDesc = `승점 ${korStats.pts}점, 골득실 ${korStats.gd > 0 ? '+' + korStats.gd : korStats.gd}의 준수한 성적으로 조별리그를 통과했습니다. 대단합니다!`;
        outcomeText = `32강 진출 (${korRank}위)`;
        qualBanner.classList.add('state-success');
        isAdvancing = true;
      } else if (korRank === 3) {
        scenarioTitle = '⚠️ 조 3위 와일드카드 대기 상황';
        scenarioDesc = '조 3위를 차지하였습니다. 타 조의 3위 성적 비교(최상위 3위 8개 팀 진출)에 따라 토너먼트 진출 여부가 결정됩니다.';
        outcomeText = '32강 대기 (조 3위)';
        qualBanner.classList.add('state-neutral');
      } else {
        scenarioTitle = '❌ 아쉬운 조별리그 탈락 위기...';
        scenarioDesc = '조 4위로 최하위에 머물렀습니다. 예측 스코어를 보강하고 대표팀의 전술을 수정해 기적을 만들어보세요!';
        outcomeText = '조별리그 탈락';
        qualBanner.classList.add('state-danger');
      }
    }

    qualBanner.querySelector('h4').textContent = scenarioTitle;
    qualBanner.querySelector('p').textContent = scenarioDesc;
    qualBanner.querySelector('.status-icon').textContent = korRank <= 2 ? '🔥' : korRank === 3 ? '⚽' : '😢';
    
    ticketOutcome.textContent = outcomeText;
    ticketOutcome.style.color = isAdvancing ? 'var(--clr-green)' : korRank === 3 ? 'var(--clr-gold)' : 'var(--clr-red)';
    ticketOutcome.style.textShadow = isAdvancing ? '0 0 10px var(--clr-green-glow)' : korRank === 3 ? '0 0 10px var(--clr-gold-glow)' : '0 0 10px var(--clr-red-glow)';

    // Update ticket scores
    document.getElementById('ticket-score-match1').textContent = `${matchScores[1].homeScore} : ${matchScores[1].awayScore}`;
    document.getElementById('ticket-score-match2').textContent = `${matchScores[2].homeScore} : ${matchScores[2].awayScore}`;
    document.getElementById('ticket-score-match3').textContent = `${matchScores[3].homeScore} : ${matchScores[3].awayScore}`;
  }

  // ========================================================================
  // LIVE STADIUM SIMULATOR ENGINE
  // ========================================================================

  function setupSimulatorListeners() {
    const tacticsButtons = document.querySelectorAll('.tactic-btn');
    const formationButtons = document.querySelectorAll('.formation-btn');
    const speedButtons = document.querySelectorAll('.speed-btn');

    tacticsButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tacticsButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSimTactic = btn.getAttribute('data-tactic');
      });
    });

    formationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        formationButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSimFormation = btn.getAttribute('data-formation');
        updatePitchFormation();
      });
    });

    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSimSpeed = btn.getAttribute('data-speed');
      });
    });

    // Sound toggle in scoreboard
    document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
      soundEnabled = !soundEnabled;
      e.target.textContent = soundEnabled ? '🔊 소리 켬' : '🔇 소리 끔';
      e.target.style.background = soundEnabled ? 'rgba(255, 255, 255, 0.05)' : 'hsla(348, 83%, 47%, 0.2)';
    });

    // Start Simulation Button
    document.getElementById('btn-start-simulation').addEventListener('click', startMatchSimulation);
    document.getElementById('btn-stop-simulation').addEventListener('click', stopMatchSimulation);
  }

  function updatePitchFormation() {
    const layer = document.getElementById('pitch-players-layer');
    layer.innerHTML = '';

    // Define standard positioning maps (left-side Korea red dots, right-side opponent gray dots)
    const sideLeft = (x, y) => ({ left: `${x}%`, top: `${y}%` });
    const sideRight = (x, y) => ({ left: `${100 - x}%`, top: `${y}%` });

    const koreaFormation = currentSimFormation;
    let koreaPositions = [];

    // Formulate team layouts
    if (koreaFormation === '4-2-3-1') {
      koreaPositions = [
        sideLeft(5, 50),   // GK
        sideLeft(20, 20), sideLeft(18, 40), sideLeft(18, 60), sideLeft(20, 80), // DF
        sideLeft(32, 35), sideLeft(32, 65), // MF
        sideLeft(44, 25), sideLeft(46, 50), sideLeft(44, 75), // AM
        sideLeft(48, 50)  // FW
      ];
    } else if (koreaFormation === '4-3-3') {
      koreaPositions = [
        sideLeft(5, 50),   // GK
        sideLeft(20, 15), sideLeft(18, 38), sideLeft(18, 62), sideLeft(20, 85), // DF
        sideLeft(35, 25), sideLeft(32, 50), sideLeft(35, 75), // MF
        sideLeft(46, 20), sideLeft(48, 50), sideLeft(46, 80)  // FW
      ];
    } else if (koreaFormation === '3-5-2') {
      koreaPositions = [
        sideLeft(5, 50),   // GK
        sideLeft(18, 25), sideLeft(16, 50), sideLeft(18, 75), // DF
        sideLeft(32, 15), sideLeft(35, 38), sideLeft(38, 50), sideLeft(35, 62), sideLeft(32, 85), // MF
        sideLeft(48, 35), sideLeft(48, 65)  // FW
      ];
    }

    // Opponent Standard 4-4-2 setup on the right half
    const opponentPositions = [
      sideRight(5, 50), // GK
      sideRight(20, 18), sideRight(18, 38), sideRight(18, 62), sideRight(20, 82), // DF
      sideRight(35, 15), sideRight(35, 38), sideRight(35, 62), sideRight(35, 85), // MF
      sideRight(48, 35), sideRight(48, 65) // FW
    ];

    // Render red Korea dots
    koreaPositions.forEach((pos) => {
      const dot = document.createElement('div');
      dot.className = 'player-dot korea';
      dot.style.left = pos.left;
      dot.style.top = pos.top;
      layer.appendChild(dot);
    });

    // Render gray opponent dots
    opponentPositions.forEach((pos) => {
      const dot = document.createElement('div');
      dot.className = 'player-dot opponent';
      dot.style.left = pos.left;
      dot.style.top = pos.top;
      layer.appendChild(dot);
    });
  }

  function startMatchSimulation() {
    if (isSimulating) return;

    // Retrieve targets
    currentSimMatchId = parseInt(document.getElementById('sim-match-select').value);
    const match = matchScores[currentSimMatchId];
    const opponent = TEAMS[match.away];

    // Init state values
    isSimulating = true;
    simTime = 0;
    simScoreHome = 0;
    simScoreAway = 0;

    // Toggle interactive layouts
    document.getElementById('btn-start-simulation').classList.add('hidden');
    document.getElementById('btn-stop-simulation').classList.remove('hidden');
    document.getElementById('live-indicator').classList.remove('hidden');
    document.getElementById('commentary-status').textContent = 'LIVE';
    document.getElementById('commentary-status').className = 'status-light active';

    // Scoreboard UI initial sync
    document.getElementById('scoreboard-match-title').textContent = `대한민국 VS ${opponent.name}`;
    document.getElementById('board-away-name').textContent = opponent.id === 'CZE' ? 'CZECH' : opponent.id === 'MEX' ? 'MEXICO' : 'S.AFRICA';
    
    // Handle opponent flags
    const awayFlagEl = document.getElementById('board-away-flag');
    awayFlagEl.className = `board-flag ${opponent.flagClass}`;

    document.getElementById('board-score-home').textContent = '0';
    document.getElementById('board-score-away').textContent = '0';
    document.getElementById('board-time').textContent = '00:00';
    document.getElementById('match-period').textContent = '전반전';

    // Whitelist sound
    playSyntheticSound('whistle');

    // Clear commentary board
    const commList = document.getElementById('commentary-list');
    commList.innerHTML = `
      <div class="commentary-item system-msg">
        <div class="msg-time">00'</div>
        <div class="msg-text">경기 시작 휘슬이 울렸습니다! 2026 북중미 월드컵 대한민국 대 ${opponent.name}의 치열한 조별리그 경기가 시작됩니다!</div>
      </div>
    `;

    // Dynamic Ball kicking micro-animation start
    animateBallKicking();

    // Set simulator loop timings
    const intervalTime = currentSimSpeed === 'fast' ? 220 : 650; // milliseconds per game minute
    
    simInterval = setInterval(() => {
      simTime++;
      
      // Update scoreboard timer display
      document.getElementById('board-time').textContent = `${String(simTime).padStart(2, '0')}:00`;

      // Handle Half-time break
      if (simTime === 45) {
        document.getElementById('match-period').textContent = '하프타임';
        addCommentary(45, "⚽ 주심의 휘슬과 함께 전반전이 마무리됩니다. 스코어는 현재 " + simScoreHome + ":" + simScoreAway + " 입니다.", "system-msg");
        playSyntheticSound('whistle');
      } else if (simTime === 46) {
        document.getElementById('match-period').textContent = '후반전';
        addCommentary(46, "🏁 후반전 경기가 시작되었습니다. 양 팀 진영을 바꾸고 진격합니다.", "system-msg");
      }

      // Check for Goal Events or Gameplay Highlights
      processSimulationMinute(opponent);

      // Finish Game
      if (simTime >= 90) {
        finishMatchSimulation(opponent);
      }
    }, intervalTime);
  }

  function animateBallKicking() {
    const ball = document.getElementById('soccer-ball');
    ballMoveInterval = setInterval(() => {
      // Shift soccer ball position values within boundary thresholds
      const randX = Math.floor(Math.random() * 80) + 10; // 10% ~ 90%
      const randY = Math.floor(Math.random() * 60) + 20; // 20% ~ 80%
      ball.style.left = `${randX}%`;
      ball.style.top = `${randY}%`;
    }, 1500);
  }

  function processSimulationMinute(opponent) {
    // 1. Goal probability metrics
    let baseKorGoalChance = 0.015; // 1.5% chance per minute
    let baseOppGoalChance = 0.013; // 1.3% chance per minute (varies based on opponents)

    if (opponent.id === 'MEX') {
      baseOppGoalChance = 0.017; // Mexico is strong
    } else if (opponent.id === 'RSA') {
      baseOppGoalChance = 0.011; // South Africa slightly weaker
    }

    // Apply tactics modifiers
    if (currentSimTactic === 'attack') {
      baseKorGoalChance *= 1.4;
      baseOppGoalChance *= 1.3;
    } else if (currentSimTactic === 'defense') {
      baseKorGoalChance *= 0.7;
      baseOppGoalChance *= 0.65;
    }

    const randHome = Math.random();
    const randAway = Math.random();

    if (randHome < baseKorGoalChance && simTime !== 45) {
      // KOREA GOAL SCORE!
      simScoreHome++;
      document.getElementById('board-score-home').textContent = simScoreHome;
      
      const scorers = KOREA_PLAYERS.FW.concat(KOREA_PLAYERS.MF);
      const randomScorer = scorers[Math.floor(Math.random() * scorers.length)];
      
      const goalCommentaries = [
        `골!!! 대한민국 선제 득점! ${randomScorer} 선수가 강력한 슛으로 골망을 시원하게 갈라놓습니다! 스타디움이 떠나갈 듯한 함성입니다!`,
        `GOAL!!! 대~한민국! ${randomScorer} 선수가 패널티 박스 외곽에서 얻어낸 프리킥 찬스를 기가 막힌 궤적의 슛으로 성공시킵니다!`,
        `골!!! 대한민국의 극적인 추가골! ${randomScorer} 선수가 수비진 한가운데를 파고들며 낮게 깐 슛으로 상대 골망을 흔듭니다!`
      ];
      
      const commText = goalCommentaries[Math.floor(Math.random() * goalCommentaries.length)];
      addCommentary(simTime, commText, "goal-msg");
      
      // Goal Effects
      playSyntheticSound('cheer');
      playSyntheticSound('whistle');
      startConfetti();
      setTimeout(stopConfetti, 4000);
      
      // Retro scoreboard flash
      const scoreboard = document.querySelector('.retro-scoreboard');
      scoreboard.classList.add('goal-flash');
      setTimeout(() => scoreboard.classList.remove('goal-flash'), 1500);

    } else if (randAway < baseOppGoalChance && simTime !== 45) {
      // OPPONENT GOAL SCORE!
      simScoreAway++;
      document.getElementById('board-score-away').textContent = simScoreAway;
      
      const opponentScorers = opponent.id === 'CZE' ? CZECH_PLAYERS : opponent.id === 'MEX' ? MEXICO_PLAYERS : RSA_PLAYERS;
      const randomScorer = opponentScorers[Math.floor(Math.random() * opponentScorers.length)];

      const oppCommentaries = [
        `실점... ${opponent.name}의 ${randomScorer} 선수가 골대 측면에서 들어온 얼리 크로스를 정밀한 헤더로 밀어 넣습니다.`,
        `아쉬운 실점입니다. 대한민국의 골문 구석을 찌르는 ${opponent.name} ${randomScorer} 선수의 강력한 중거리 슛이 실점으로 연결됩니다.`
      ];

      const commText = oppCommentaries[Math.floor(Math.random() * oppCommentaries.length)];
      addCommentary(simTime, commText, "system-msg");
      playSyntheticSound('whistle');

    } else {
      // Standard highlight commentary events (about 12% probability per minute)
      if (Math.random() < 0.12) {
        const generalHighlights = [
          `이강인 선수의 환상적인 대지 가르는 패스! 하지만 수비수에 의해 차단됩니다.`,
          `김민재 선수가 상대 공격수를 미친 어깨싸움으로 완벽하게 밀어내고 볼 소유권을 가집니다. 통곡의 벽!`,
          `황희찬 선수가 우측 터치라인을 폭풍 질주하며 돌파를 시도합니다. 돌파력 대단합니다!`,
          `조현우 선수의 슈퍼 세이브! 상대 공격수와의 1대1 찬스에서 동물적인 감각으로 쳐냅니다!`,
          `손흥민 선수가 박스 근처에서 수비수를 제치고 슛을 날려보지만, 골대 상단을 아쉽게 빗나갑니다.`,
          `황인범 선수의 조율 하에 대한민국 국가대표팀이 중앙에서 차근차근 빌드업을 시도하고 있습니다.`,
          `상대팀이 측면 돌파를 시도하지만, 설영우 선수가 몸을 날려 코너킥으로 걷어냅니다.`
        ];
        const highlightText = generalHighlights[Math.floor(Math.random() * generalHighlights.length)];
        addCommentary(simTime, highlightText);
      }
    }
  }

  function addCommentary(time, text, className = "") {
    const commList = document.getElementById('commentary-list');
    const item = document.createElement('div');
    item.className = `commentary-item ${className}`;
    item.innerHTML = `
      <div class="msg-time">${time}'</div>
      <div class="msg-text">${text}</div>
    `;
    commList.appendChild(item);
    commList.scrollTop = commList.scrollHeight; // Auto-scroll to bottom
  }

  function finishMatchSimulation(opponent) {
    stopMatchSimulation();
    
    // Play final whistle sounds
    playSyntheticSound('whistle');
    setTimeout(() => playSyntheticSound('whistle'), 400);
    setTimeout(() => playSyntheticSound('whistle'), 800);

    addCommentary(90, `🏁 경기 종료! 최종 스코어 ${simScoreHome} 대 ${simScoreAway}로 대한민국 대 ${opponent.name}의 경기가 막을 내립니다!`, "system-msg");

    // Automatically sync back the results to the predictor scorecard
    const homeInput = document.getElementById(`score-${currentSimMatchId}-home`);
    const awayInput = document.getElementById(`score-${currentSimMatchId}-away`);
    
    homeInput.value = simScoreHome;
    awayInput.value = simScoreAway;

    matchScores[currentSimMatchId].homeScore = simScoreHome;
    matchScores[currentSimMatchId].awayScore = simScoreAway;

    // Recalculate group standings and scenarios automatically
    recalculateStandings();

    // Show custom completion alerts
    setTimeout(() => {
      alert(`대한민국 vs ${opponent.name} 경기 시뮬레이션 완료!\n최종 스코어 ${simScoreHome}:${simScoreAway}\n결과가 예측 순위표에 반영되었습니다.`);
    }, 1000);
  }

  function stopMatchSimulation() {
    isSimulating = false;
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
    }
    if (ballMoveInterval) {
      clearInterval(ballMoveInterval);
      ballMoveInterval = null;
    }

    // Toggle button visibility state
    document.getElementById('btn-start-simulation').classList.remove('hidden');
    document.getElementById('btn-stop-simulation').classList.add('hidden');
    document.getElementById('live-indicator').classList.add('hidden');
    document.getElementById('commentary-status').textContent = 'OFFLINE';
    document.getElementById('commentary-status').className = 'status-light';
  }

  // ========================================================================
  // SYNTHESIZED WEB AUDIO MUSIC & CHEERING SOUND ENGINE
  // ========================================================================

  function setupCheeringListeners() {
    const padButtons = document.querySelectorAll('.sound-pad-btn');
    padButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-sound');
        playSyntheticSound(type);
      });
    });

    // Note Posting Handler
    const postNoteBtn = document.getElementById('btn-post-note');
    postNoteBtn.addEventListener('click', postCheeringNote);
  }

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSyntheticSound(type) {
    if (!soundEnabled) return;
    
    try {
      initAudioContext();
      
      switch (type) {
        case 'whistle':
          synthesizeWhistle();
          break;
        case 'vuvuzela':
          synthesizeVuvuzela();
          break;
        case 'cheer':
          synthesizeCrowdCheer();
          break;
        case 'clap':
          synthesizeRedDevilClapPattern();
          break;
      }
    } catch (e) {
      console.warn("AudioContext failed to initialize or generate audio synthesis.", e);
    }
  }

  function synthesizeWhistle() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1550, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1750, audioCtx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1550, audioCtx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.28, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  }

  function synthesizeVuvuzela() {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(233, audioCtx.currentTime); // Bb3 vuvuzela key note
    
    // Add LFO for natural air wobble/buzz
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 14; 
    lfoGain.gain.value = 6; 
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    filter.type = 'bandpass';
    filter.frequency.value = 466; // First harmonic octave
    filter.Q.value = 3.5;
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.6);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    lfo.start();
    osc.start();
    
    lfo.stop(audioCtx.currentTime + 1.6);
    osc.stop(audioCtx.currentTime + 1.6);
  }

  function synthesizeCrowdCheer() {
    const duration = 2.8;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Populate buffer with standard white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    // Use bandpass filters to mold white noise into crowd stadium roaring acoustic frequencies
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.0;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.4);
    gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 1.8);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  }

  function synthesizeRedDevilClapPattern() {
    // Rhythm: "대~한민국! 짝짝-짝-짝짝!"
    // Schedule drum beats (low sweep) and hand claps (noise click) sequentially
    const now = audioCtx.currentTime;
    
    // 1. Drum Beats "대-한-민-국" (4 quarter notes)
    const drumTimes = [0.0, 0.4, 0.8, 1.2];
    drumTimes.forEach(t => {
      triggerDrumSweep(now + t);
    });

    // 2. Clap Clicks "짝짝-짝-짝짝!"
    const clapTimes = [1.8, 2.0, 2.3, 2.6, 2.8];
    clapTimes.forEach(t => {
      triggerClapClick(now + t);
    });
  }

  function triggerDrumSweep(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);
    
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  function triggerClapClick(time) {
    const duration = 0.08;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 2.5;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(time);
    noise.stop(time + duration);
  }

  // ========================================================================
  // CHEERING BOARD (GUESTBOOK) ENGINE
  // ========================================================================

  function loadCheeringNotes() {
    let notes = JSON.parse(localStorage.getItem('red_devils_notes'));
    
    // Populate default notes if local storage is empty
    if (!notes || notes.length === 0) {
      notes = [
        { author: '붉은악마 서포터즈', content: '2002년의 열정, 2018년 카잔의 기적, 2022년 알라이얀의 투혼을 모아 2026년 미국 땅에서 다시 한번 신화를 씁시다!', date: '2026.05.30' },
        { author: '캡틴흥 지지자', content: '손흥민 선수의 마지막 댄스가 될 2026년 월드컵! 꼭 다치지 말고 다 함께 조별리그 폭격하고 16강, 8강 쭉쭉 우승까지 달리자!', date: '2026.05.30' },
        { author: '철벽민재팬', content: '체코 공격진, 멕시코 쾌속 날개 전부 다 민재 장벽 앞에서 쓸려나갈 겁니다. 무실점 3승 토너먼트 진출 가자!!! 🇰🇷', date: '2026.05.30' }
      ];
      localStorage.setItem('red_devils_notes', JSON.stringify(notes));
    }

    renderNotes(notes);
  }

  function renderNotes(notes) {
    const grid = document.getElementById('notes-grid');
    grid.innerHTML = '';

    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'sticky-note';
      card.innerHTML = `
        <div class="note-text">"${escapeHtml(note.content)}"</div>
        <div class="note-footer">
          <span class="note-author">👤 ${escapeHtml(note.author)}</span>
          <span class="note-time">${note.date}</span>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function postCheeringNote() {
    const authorInput = document.getElementById('note-author');
    const contentInput = document.getElementById('note-content');

    const author = authorInput.value.trim();
    const content = contentInput.value.trim();

    if (!author || !content) {
      alert('닉네임과 응원 글귀를 모두 적어주세요!');
      return;
    }

    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    const newNote = { author, content, date: formattedDate };
    
    // Add to list and persist
    let notes = JSON.parse(localStorage.getItem('red_devils_notes')) || [];
    notes.unshift(newNote); // Put at front of array
    localStorage.setItem('red_devils_notes', JSON.stringify(notes));

    // Reload and clear form fields
    renderNotes(notes);
    authorInput.value = '';
    contentInput.value = '';

    // Success sound trigger
    playSyntheticSound('clap');
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // ========================================================================
  // PREMIUM HTML5 CANVAS TICKET IMAGE DOWNLOAD GENERATOR
  // ========================================================================

  function downloadTicketAsPNG() {
    // Generate beautiful custom pass ticket dimensions
    const ticketCanvas = document.createElement('canvas');
    ticketCanvas.width = 720;
    ticketCanvas.height = 420;
    const tCtx = ticketCanvas.getContext('2d');

    // 1. Draw solid dark ticket backdrop colors
    const gradient = tCtx.createLinearGradient(0, 0, 720, 420);
    gradient.addColorStop(0, '#101625');
    gradient.addColorStop(1, '#0b0f19');
    tCtx.fillStyle = gradient;
    tCtx.fillRect(0, 0, 720, 420);

    // 2. Draw border lines
    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    tCtx.lineWidth = 4;
    tCtx.strokeRect(12, 12, 696, 396);

    // 3. Draw Ticket Punch out circles on sides
    tCtx.fillStyle = '#080c14'; // Match base body background
    tCtx.beginPath();
    tCtx.arc(0, 210, 20, 0, Math.PI * 2);
    tCtx.fill();

    tCtx.beginPath();
    tCtx.arc(720, 210, 20, 0, Math.PI * 2);
    tCtx.fill();

    // 4. Draw dotted separation tearing lines
    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    tCtx.lineWidth = 2;
    tCtx.setLineDash([8, 8]);
    tCtx.beginPath();
    tCtx.moveTo(480, 20);
    tCtx.lineTo(480, 400);
    tCtx.stroke();
    tCtx.setLineDash([]); // Reset line dashes

    // 5. Header labels "2026 FIFA WORLD CUP PREDICTOR"
    tCtx.fillStyle = '#ffcc00'; // Victory Gold
    tCtx.font = 'bold 12px "Inter", sans-serif';
    tCtx.letterSpacing = '2px';
    tCtx.fillText('★ 2026 FIFA WORLD CUP PREDICTOR ★', 40, 50);

    tCtx.fillStyle = '#ffffff';
    tCtx.font = '900 36px "Outfit", "Arial Black", sans-serif';
    tCtx.fillText('RED DEVILS PASS', 40, 95);

    // Crimson Red underline glow
    tCtx.fillStyle = '#d7141a';
    tCtx.fillRect(40, 110, 160, 4);

    // 6. Draw Prediction statistics
    tCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    tCtx.font = 'bold 12px "Inter", sans-serif';
    tCtx.fillText('PREDICTED BY', 40, 160);

    tCtx.fillStyle = '#ffffff';
    tCtx.font = 'bold 24px "Inter", sans-serif';
    tCtx.fillText(userNickname, 40, 195);

    tCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    tCtx.font = 'bold 12px "Inter", sans-serif';
    tCtx.fillText('CALCULATED OUTCOME', 40, 260);

    const outcomeText = document.getElementById('ticket-outcome-status').textContent;
    tCtx.fillStyle = outcomeText.includes('탈락') ? '#ff3344' : '#00cc66';
    tCtx.font = '900 28px "Outfit", sans-serif';
    tCtx.fillText(outcomeText, 40, 298);

    // 7. Right Tear-Off summary matches
    tCtx.fillStyle = '#ffcc00';
    tCtx.font = 'bold 14px "Inter", sans-serif';
    tCtx.fillText('MATCHES PREDICTION', 505, 55);

    const scores = [
      { name: '🇨🇿 vs 체코', val: document.getElementById('ticket-score-match1').textContent },
      { name: '🇲🇽 vs 멕시코', val: document.getElementById('ticket-score-match2').textContent },
      { name: '🇿🇦 vs 남아공', val: document.getElementById('ticket-score-match3').textContent }
    ];

    scores.forEach((s, i) => {
      const yOffset = 110 + (i * 65);
      
      // Match name
      tCtx.fillStyle = 'rgba(255,255,255,0.7)';
      tCtx.font = '500 13px "Inter", sans-serif';
      tCtx.fillText(s.name, 505, yOffset);

      // Score prediction digits
      tCtx.fillStyle = '#ffffff';
      tCtx.font = 'bold 20px "Outfit", sans-serif';
      tCtx.fillText(s.val, 505, yOffset + 28);
    });

    // 8. Footer stamping & Barcode
    tCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    tCtx.font = '500 10px "Inter", sans-serif';
    tCtx.fillText('CERTIFIED BY 2026 RED DEVILS COMMITTEE', 40, 360);

    // Mock barcode layout on tearing zone
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(505, 320, 170, 25);
    // Draw fine vertical lines over white block to mimic real barcode barcode
    tCtx.fillStyle = '#0b0f19';
    for (let col = 0; col < 170; col += 4) {
      if (Math.random() < 0.6) {
        tCtx.fillRect(505 + col, 320, Math.floor(Math.random() * 2) + 1, 25);
      }
    }
    tCtx.fillStyle = 'rgba(255,255,255,0.4)';
    tCtx.font = 'bold 8px "Outfit", sans-serif';
    tCtx.fillText('KOR-A-2026-FIFA', 505, 362);

    // 9. Generate download anchor link for user
    const dataURL = ticketCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `붉은악마-2026월드컵-예측티켓-${userNickname}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ========================================================================
  // CONFETTI CANVAS ANIMATION ENGINE
  // ========================================================================

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function startConfetti() {
    if (confettiActive) return;
    confettiActive = true;
    confettiParticles = [];
    
    // Spawn 120 colorful falling confetti flakes
    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

    animateConfetti();
  }

  function stopConfetti() {
    confettiActive = false;
    // Clear canvas when finished
    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 1000);
  }

  function animateConfetti() {
    if (!confettiActive && confettiParticles.length === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < confettiParticles.length; i++) {
      const p = confettiParticles[i];
      
      // Update coordinates
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;

      // Draw particle
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();

      // Recirculate particle if it falls off screen bounds
      if (p.y > canvas.height) {
        if (confettiActive) {
          confettiParticles[i] = {
            x: Math.random() * canvas.width,
            y: -20,
            r: p.r,
            d: p.d,
            color: p.color,
            tilt: p.tilt,
            tiltAngleIncremental: p.tiltAngleIncremental,
            tiltAngle: p.tiltAngle
          };
        } else {
          // Splice particle if stopping
          confettiParticles.splice(i, 1);
          i--;
        }
      }
    }

    if (confettiActive || confettiParticles.length > 0) {
      requestAnimationFrame(animateConfetti);
    }
  }

  // ========================================================================
  // RUN APPLICATION (Moved to the end of the script to prevent TDZ error)
  // ========================================================================

  // ========================================================================
  // HOSIGI FC WORLD CUP MULTIPLAYER EVENT LOGIC
  // ========================================================================

  // States
  let hosigiMembers = [];
  try {
    const rawData = localStorage.getItem('hosigi_members_data');
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        hosigiMembers = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse hosigi_members_data from localStorage", e);
  }

  // Schema normalization and validation for all members
  hosigiMembers = hosigiMembers.map(member => {
    if (!member || typeof member !== 'object') return null;
    if (!member.name) member.name = '무명 멤버';
    if (member.points === undefined) member.points = 0;
    if (!member.detailPoints || typeof member.detailPoints !== 'object') {
      member.detailPoints = { 1: 0, 2: 0, 3: 0 };
    }
    if (!member.predictions || typeof member.predictions !== 'object') {
      member.predictions = {
        1: { home: 0, away: 0 },
        2: { home: 0, away: 0 },
        3: { home: 0, away: 0 }
      };
    } else {
      [1, 2, 3].forEach(matchId => {
        if (!member.predictions[matchId] || typeof member.predictions[matchId] !== 'object') {
          member.predictions[matchId] = { home: 0, away: 0 };
        } else {
          if (member.predictions[matchId].home === undefined || member.predictions[matchId].home === null) {
            member.predictions[matchId].home = 0;
          }
          if (member.predictions[matchId].away === undefined || member.predictions[matchId].away === null) {
            member.predictions[matchId].away = 0;
          }
        }
      });
    }
    return member;
  }).filter(member => member !== null);

  let actualScores = {
    1: { home: null, away: null },
    2: { home: null, away: null },
    3: { home: null, away: null }
  };
  try {
    const rawScores = localStorage.getItem('hosigi_actual_scores');
    if (rawScores) {
      const parsedScores = JSON.parse(rawScores);
      if (parsedScores && typeof parsedScores === 'object') {
        [1, 2, 3].forEach(matchId => {
          if (parsedScores[matchId] && typeof parsedScores[matchId] === 'object') {
            const h = parsedScores[matchId].home;
            const a = parsedScores[matchId].away;
            actualScores[matchId].home = (h !== undefined && h !== null) ? parseInt(h) : null;
            actualScores[matchId].away = (a !== undefined && a !== null) ? parseInt(a) : null;
          }
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse hosigi_actual_scores from localStorage", e);
  }

  const formPredictions = {
    1: { home: 0, away: 0 },
    2: { home: 0, away: 0 },
    3: { home: 0, away: 0 }
  };

  const DUMMY_MEMBERS = [
    {
      name: "김호식 (회장)",
      predictions: {
        1: { home: 2, away: 1 },
        2: { home: 1, away: 2 },
        3: { home: 3, away: 0 }
      },
      points: 0,
      detailPoints: { 1: 0, 2: 0, 3: 0 }
    },
    {
      name: "이태극 (부회장)",
      predictions: {
        1: { home: 1, away: 0 },
        2: { home: 1, away: 1 },
        3: { home: 2, away: 0 }
      },
      points: 0,
      detailPoints: { 1: 0, 2: 0, 3: 0 }
    },
    {
      name: "박축구 (총무)",
      predictions: {
        1: { home: 3, away: 1 },
        2: { home: 0, away: 2 },
        3: { home: 4, away: 1 }
      },
      points: 0,
      detailPoints: { 1: 0, 2: 0, 3: 0 }
    },
    {
      name: "골잡이최씨",
      predictions: {
        1: { home: 2, away: 2 },
        2: { home: 1, away: 0 },
        3: { home: 2, away: 1 }
      },
      points: 0,
      detailPoints: { 1: 0, 2: 0, 3: 0 }
    },
    {
      name: "손세이셔널",
      predictions: {
        1: { home: 2, away: 0 },
        2: { home: 2, away: 1 },
        3: { home: 3, away: 1 }
      },
      points: 0,
      detailPoints: { 1: 0, 2: 0, 3: 0 }
    }
  ];

  function setupHosigiEvent() {
    // 1. predicted score buttons click listener
    const emButtons = document.querySelectorAll('.em-btn');
    emButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const matchId = btn.getAttribute('data-match');
        const isHome = btn.getAttribute('data-side') === 'home';
        const isMinus = btn.classList.contains('minus');
        
        const targetSpan = document.getElementById(`em-score-${matchId}-${isHome ? 'home' : 'away'}`);
        let currentVal = parseInt(targetSpan.textContent) || 0;
        
        if (isMinus) {
          if (currentVal > 0) currentVal--;
        } else {
          currentVal++;
        }
        
        targetSpan.textContent = currentVal;
        formPredictions[matchId][isHome ? 'home' : 'away'] = currentVal;
      });
    });

    // 2. Submit Button click listener
    const submitBtn = document.getElementById('btn-submit-prediction');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('member-name-input');
        const name = nameInput.value.trim();
        
        if (!name) {
          alert('이름을 입력해 주세요!');
          return;
        }
        
        if (hosigiMembers.some(m => m.name === name)) {
          alert('이미 동일한 이름으로 등록된 멤버가 있습니다. 다른 이름을 사용해 주세요!');
          return;
        }
        
        const newMember = {
          name: name,
          predictions: {
            1: { home: formPredictions[1].home, away: formPredictions[1].away },
            2: { home: formPredictions[2].home, away: formPredictions[2].away },
            3: { home: formPredictions[3].home, away: formPredictions[3].away }
          },
          points: 0,
          detailPoints: { 1: 0, 2: 0, 3: 0 }
        };
        
        hosigiMembers.push(newMember);
        localStorage.setItem('hosigi_members_data', JSON.stringify(hosigiMembers));
        
        // Points calculations
        recalculateMemberPoints();
        renderLeaderboard();
        
        // Clear form
        nameInput.value = '';
        [1, 2, 3].forEach(matchId => {
          document.getElementById(`em-score-${matchId}-home`).textContent = '0';
          document.getElementById(`em-score-${matchId}-away`).textContent = '0';
          formPredictions[matchId].home = 0;
          formPredictions[matchId].away = 0;
        });
        
        // Confetti & whistle sounds
        startConfetti();
        playSyntheticSound('whistle');
        playSyntheticSound('cheer');
        setTimeout(stopConfetti, 4000);
        
        // Popup prediction ticket success
        setTimeout(() => {
          showMemberTicketModal(newMember);
        }, 1000);
      });
    }

    // 3. Admin actual score save and reset buttons click listener
    const saveActualBtn = document.getElementById('btn-save-actual-scores');
    if (saveActualBtn) {
      saveActualBtn.addEventListener('click', () => {
        [1, 2, 3].forEach(matchId => {
          const homeVal = document.getElementById(`actual-${matchId}-home`).value;
          const awayVal = document.getElementById(`actual-${matchId}-away`).value;
          
          if (homeVal !== '' && awayVal !== '') {
            actualScores[matchId].home = parseInt(homeVal);
            actualScores[matchId].away = parseInt(awayVal);
          } else {
            actualScores[matchId].home = null;
            actualScores[matchId].away = null;
          }
        });
        
        localStorage.setItem('hosigi_actual_scores', JSON.stringify(actualScores));
        
        recalculateMemberPoints();
        renderLeaderboard();
        
        playSyntheticSound('whistle');
        alert('실제 경기 결과가 저장되었으며 멤버들의 포인트와 랭킹이 성공적으로 반영되었습니다!');
      });
    }

    const resetActualBtn = document.getElementById('btn-reset-actual-scores');
    if (resetActualBtn) {
      resetActualBtn.addEventListener('click', () => {
        if (confirm('모든 실제 경기 결과를 초기화하시겠습니까? (이전 예측 멤버 데이터는 보존됩니다)')) {
          [1, 2, 3].forEach(matchId => {
            actualScores[matchId].home = null;
            actualScores[matchId].away = null;
          });
          
          localStorage.setItem('hosigi_actual_scores', JSON.stringify(actualScores));
          fillAdminScoreInputs();
          recalculateMemberPoints();
          renderLeaderboard();
          
          playSyntheticSound('whistle');
        }
      });
    }

    // 4. Data Backup Ops
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const exportObject = {
          hosigiMembers: hosigiMembers,
          actualScores: actualScores
        };
        
        const jsonString = JSON.stringify(exportObject, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `hosigi_fc_worldcup_predictions_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }

    const importInput = document.getElementById('input-import-data');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
          try {
            const imported = JSON.parse(evt.target.result);
            if (imported.hosigiMembers && Array.isArray(imported.hosigiMembers)) {
              hosigiMembers = imported.hosigiMembers;
              actualScores = imported.actualScores || {
                1: { home: null, away: null },
                2: { home: null, away: null },
                3: { home: null, away: null }
              };
              
              localStorage.setItem('hosigi_members_data', JSON.stringify(hosigiMembers));
              localStorage.setItem('hosigi_actual_scores', JSON.stringify(actualScores));
              
              fillAdminScoreInputs();
              recalculateMemberPoints();
              renderLeaderboard();
              
              playSyntheticSound('cheer');
              alert('데이터를 성공적으로 가져왔습니다!');
            } else {
              alert('올바른 호식이 FC 월드컵 이벤트 데이터 JSON 파일이 아닙니다.');
            }
          } catch (err) {
            alert('파일 분석 중 오류가 발생했습니다: ' + err.message);
          }
        };
        reader.readAsText(file);
        importInput.value = ''; // Reset input
      });
    }

    const loadDummyBtn = document.getElementById('btn-load-dummy-data');
    if (loadDummyBtn) {
      loadDummyBtn.addEventListener('click', () => {
        if (hosigiMembers.length > 0 && !confirm('기존 참가 멤버들이 존재합니다. 테스트 데이터를 추가하시겠습니까? (중복 이름은 제외됩니다)')) {
          return;
        }
        
        DUMMY_MEMBERS.forEach(dummy => {
          if (!hosigiMembers.some(m => m.name === dummy.name)) {
            hosigiMembers.push(JSON.parse(JSON.stringify(dummy)));
          }
        });
        
        localStorage.setItem('hosigi_members_data', JSON.stringify(hosigiMembers));
        recalculateMemberPoints();
        renderLeaderboard();
        
        playSyntheticSound('clap');
        alert('테스트용 가상 멤버 5명이 성공적으로 리더보드에 추가되었습니다!');
      });
    }

    const clearAllBtn = document.getElementById('btn-clear-all-data');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (confirm('⚠️ 경고! 호식이 FC 예측 이벤트 전체 데이터를 완전히 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
          hosigiMembers = [];
          [1, 2, 3].forEach(matchId => {
            actualScores[matchId].home = null;
            actualScores[matchId].away = null;
          });
          
          localStorage.removeItem('hosigi_members_data');
          localStorage.removeItem('hosigi_actual_scores');
          
          fillAdminScoreInputs();
          renderLeaderboard();
          
          alert('모든 멤버 및 경기 결과 데이터가 완전히 삭제되었습니다.');
        }
      });
    }

    // 5. Kakao Invite share listener
    const shareKakaoBtn = document.getElementById('btn-share-kakao');
    if (shareKakaoBtn) {
      shareKakaoBtn.addEventListener('click', () => {
        inviteToKakao();
      });
    }

    // Initial Loading sync
    fillAdminScoreInputs();
    recalculateMemberPoints();
    renderLeaderboard();
  }

  function fillAdminScoreInputs() {
    [1, 2, 3].forEach(matchId => {
      const actual = actualScores[matchId];
      const homeInput = document.getElementById(`actual-${matchId}-home`);
      const awayInput = document.getElementById(`actual-${matchId}-away`);
      
      if (homeInput && awayInput) {
        if (actual && actual.home !== null && actual.away !== null) {
          homeInput.value = actual.home;
          awayInput.value = actual.away;
        } else {
          homeInput.value = '';
          awayInput.value = '';
        }
      }
    });
  }

  function recalculateMemberPoints() {
    hosigiMembers.forEach(member => {
      let matchedCount = 0;
      member.detailPoints = { 1: 0, 2: 0, 3: 0 };
      
      [1, 2, 3].forEach(matchId => {
        const actual = actualScores[matchId];
        const pred = member.predictions[matchId];
        
        if (actual && actual.home !== null && actual.away !== null) {
          const actHome = parseInt(actual.home);
          const actAway = parseInt(actual.away);
          const predHome = parseInt(pred.home);
          const predAway = parseInt(pred.away);
          
          // Exact score match
          if (predHome === actHome && predAway === actAway) {
            member.detailPoints[matchId] = 1;
            matchedCount++;
          } else {
            member.detailPoints[matchId] = 0;
          }
        } else {
          member.detailPoints[matchId] = 0;
        }
      });
      member.points = matchedCount; // Points field now holds matched count (0-3)
    });
    
    localStorage.setItem('hosigi_members_data', JSON.stringify(hosigiMembers));
  }

  function renderLeaderboard() {
    const tbody = document.querySelector('#leaderboard-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const sortedMembers = [...hosigiMembers].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return a.name.localeCompare(b.name, 'ko');
    });
    
    const badge = document.getElementById('member-count-badge');
    if (badge) {
      badge.textContent = `참여자 ${sortedMembers.length}명`;
    }
    
    if (sortedMembers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--clr-text-muted); padding: 2rem;">
            등록된 예측 멤버가 없습니다. 왼쪽 폼에서 첫 번째 멤버를 등록해 보세요! 🔮
          </td>
        </tr>
      `;
      return;
    }

    const anyActualEntered = [1, 2, 3].some(matchId => actualScores[matchId].home !== null && actualScores[matchId].away !== null);
    
    sortedMembers.forEach((member) => {
      const tr = document.createElement('tr');
      
      const getMatchDisplay = (matchId) => {
        const pred = member.predictions[matchId];
        const actual = actualScores[matchId];
        let scoreStr = `${pred.home} : ${pred.away}`;
        let statusClass = '';
        let badgeEarned = '';
        
        if (actual && actual.home !== null && actual.away !== null) {
          const actHome = parseInt(actual.home);
          const actAway = parseInt(actual.away);
          const predHome = parseInt(pred.home);
          const predAway = parseInt(pred.away);
          
          if (predHome === actHome && predAway === actAway) {
            statusClass = 'style="color: var(--clr-green); font-weight: 700;"';
            badgeEarned = ' <span style="font-size: 0.72rem; background: hsla(142, 65%, 42%, 0.2); border: 1px solid var(--clr-green); padding: 0.05rem 0.25rem; border-radius: 4px;">적중</span>';
          } else {
            statusClass = 'style="color: var(--clr-text-muted); opacity: 0.6;"';
            badgeEarned = ' <span style="font-size: 0.72rem; background: rgba(255,255,255,0.02); border: 1px solid var(--clr-border); padding: 0.05rem 0.25rem; border-radius: 4px; opacity:0.5;">미적중</span>';
          }
        }
        
        return `<span class="pred-score" ${statusClass}>${scoreStr}</span>${badgeEarned}`;
      };

      const getPrizeDisplay = (matchedCount) => {
        if (!anyActualEntered) {
          return '<span style="color: var(--clr-text-muted); opacity: 0.7;">대기 중 ⏳</span>';
        }
        
        if (matchedCount === 3) {
          return '<span style="color: var(--clr-gold); font-weight: 700; text-shadow: 0 0 10px var(--clr-gold-glow);">🎁 5만원 상품권</span>';
        } else if (matchedCount === 2) {
          return '<span style="color: #00ccff; font-weight: 700; text-shadow: 0 0 10px rgba(0, 204, 255, 0.4);">🎁 3만원 상품권</span>';
        } else if (matchedCount === 1) {
          return '<span style="color: #ff9933; font-weight: 700; text-shadow: 0 0 10px rgba(255, 153, 51, 0.4);">🎁 1만원 상품권</span>';
        } else {
          return '<span style="color: var(--clr-text-muted); opacity: 0.5;">없음 😢</span>';
        }
      };
      
      tr.innerHTML = `
        <td style="vertical-align: middle;"><span class="member-name" data-name="${escapeHtml(member.name)}">${escapeHtml(member.name)}</span></td>
        <td style="vertical-align: middle;">${getMatchDisplay(1)}</td>
        <td style="vertical-align: middle;">${getMatchDisplay(2)}</td>
        <td style="vertical-align: middle;">${getMatchDisplay(3)}</td>
        <td style="vertical-align: middle; font-family: var(--font-digit); font-weight: 700; color: #fff;">${member.points} 경기</td>
        <td style="vertical-align: middle;">${getPrizeDisplay(member.points)}</td>
      `;
      
      tbody.appendChild(tr);
    });

    const nameElements = tbody.querySelectorAll('.member-name');
    nameElements.forEach(el => {
      el.addEventListener('click', () => {
        const mName = el.getAttribute('data-name');
        const found = hosigiMembers.find(m => m.name === mName);
        if (found) {
          showMemberTicketModal(found);
        }
      });
    });
  }

  function getKoreaAdvancementStatusForPredictions(predictions) {
    const TEAMS_LOCAL = {
      KOR: { name: '대한민국', isKorea: true },
      MEX: { name: '멕시코' },
      CZE: { name: '체코' },
      RSA: { name: '남아공' }
    };
    
    const matchesLocal = {
      1: { home: 'KOR', away: 'CZE', homeScore: predictions[1].home, awayScore: predictions[1].away },
      2: { home: 'KOR', away: 'MEX', homeScore: predictions[2].home, awayScore: predictions[2].away },
      3: { home: 'KOR', away: 'RSA', homeScore: predictions[3].home, awayScore: predictions[3].away },
      4: { home: 'MEX', away: 'RSA', homeScore: 1, awayScore: 0 },
      5: { home: 'CZE', away: 'MEX', homeScore: 1, awayScore: 1 },
      6: { home: 'RSA', away: 'CZE', homeScore: 1, awayScore: 2 }
    };

    const standings = {
      KOR: { team: TEAMS_LOCAL.KOR, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
      MEX: { team: TEAMS_LOCAL.MEX, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
      CZE: { team: TEAMS_LOCAL.CZE, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
      RSA: { team: TEAMS_LOCAL.RSA, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    };

    Object.values(matchesLocal).forEach(match => {
      const h = match.home;
      const a = match.away;
      const hScore = parseInt(match.homeScore) || 0;
      const aScore = parseInt(match.awayScore) || 0;

      standings[h].gf += hScore;
      standings[h].ga += aScore;
      standings[a].gf += aScore;
      standings[a].ga += hScore;

      if (hScore > aScore) {
        standings[h].w++;
        standings[h].pts += 3;
        standings[a].l++;
      } else if (hScore < aScore) {
        standings[a].w++;
        standings[a].pts += 3;
        standings[h].l++;
      } else {
        standings[h].d++;
        standings[h].pts += 1;
        standings[a].d++;
        standings[a].pts += 1;
      }
    });

    Object.keys(standings).forEach(key => {
      standings[key].gd = standings[key].gf - standings[key].ga;
    });

    const sortedTeams = Object.values(standings).sort((teamA, teamB) => {
      if (teamB.pts !== teamA.pts) return teamB.pts - teamA.pts;
      if (teamB.gd !== teamA.gd) return teamB.gd - teamA.gd;
      if (teamB.gf !== teamA.gf) return teamB.gf - teamA.gf;
      return teamA.team.name.localeCompare(teamB.team.name);
    });

    const korIndex = sortedTeams.findIndex(item => item.team.isKorea);
    const korRank = korIndex + 1;
    
    if (korRank <= 2) {
      return {
        text: `32강 진출 (${korRank}위)`,
        color: 'var(--clr-green)',
        shadow: 'var(--clr-green-glow)'
      };
    } else if (korRank === 3) {
      return {
        text: '32강 대기 (조 3위)',
        color: 'var(--clr-gold)',
        shadow: 'var(--clr-gold-glow)'
      };
    } else {
      return {
        text: '조별리그 탈락',
        color: 'var(--clr-red)',
        shadow: 'var(--clr-red-glow)'
      };
    }
  }

  // KakaoTalk and Clipboard Sharing Helper Functions
  function inviteToKakao() {
    const shareUrl = window.location.origin + window.location.pathname;
    const kakaoSharerUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}`;
    window.open(kakaoSharerUrl, '_blank', 'width=400,height=500');
  }

  function sharePredictToKakao(member) {
    const shareUrl = window.location.origin + window.location.pathname;
    const kakaoSharerUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}`;
    window.open(kakaoSharerUrl, '_blank', 'width=400,height=500');
  }

  function copyPredictionTextToClipboard(member) {
    const shareUrl = window.location.origin + window.location.pathname;
    const score1 = `${member.predictions[1].home} : ${member.predictions[1].away}`;
    const score2 = `${member.predictions[2].home} : ${member.predictions[2].away}`;
    const score3 = `${member.predictions[3].home} : ${member.predictions[3].away}`;

    const text = `🏆 [호식이 FC 2026 월드컵 예측 이벤트]
${member.name}님이 조별리그 대한민국 경기 스코어 예측을 완료했습니다!

⚽ ${member.name}님의 예측 스코어:
- 🇨🇿 vs 체코전: ${score1}
- 🇲🇽 vs 멕시코전: ${score2}
- 🇿🇦 vs 남아공전: ${score3}

👉 여러분도 호식이 FC 실시간 예측표에 등록하고 상품권에 도전해보세요!
🔗 ${shareUrl}`;

    navigator.clipboard.writeText(text).then(() => {
      alert(`📝 ${member.name}님의 예측 스코어 요약 텍스트가 클립보드에 복사되었습니다!\n카카오톡 단톡방에 붙여넣기(Ctrl+V)해서 공유해보세요!`);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Fallback using textarea hack
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert(`📝 ${member.name}님의 예측 스코어 요약 텍스트가 복사되었습니다!\n단톡방에 공유해보세요!`);
      } catch (e) {
        alert("텍스트 복사에 실패했습니다. 수동으로 복사해주세요:\n\n" + text);
      }
      document.body.removeChild(textArea);
    });
  }

  function showMemberTicketModal(member) {
    let overlay = document.getElementById('member-ticket-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'member-ticket-modal';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const outcome = getKoreaAdvancementStatusForPredictions(member.predictions);
    
    const ticketHtml = `
      <div class="modal-content-card glass-panel" style="padding: 1.5rem; position: relative;">
        <button class="btn-close-modal" style="position: absolute; top: 1rem; right: 1rem; background: transparent; border: none; color: var(--clr-text-muted); font-size: 1.5rem; cursor: pointer; transition: var(--transition-smooth);">&times;</button>
        
        <h3 style="font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: 1.2rem; text-align: center;">🛡️ 호식이 FC 예언자 인증 Pass</h3>
        
        <div class="ticket-preview-wrapper" style="margin-bottom: 1.5rem; display: flex; justify-content: center; overflow: hidden; width: 100%;">
          <div class="worldcup-ticket" id="modal-worldcup-ticket" style="transform: scale(0.95); transform-origin: center; margin: 0 auto;">
            <div class="ticket-border-cut ticket-left-cut"></div>
            <div class="ticket-border-cut ticket-right-cut"></div>
            
            <div class="ticket-header">
              <div class="ticket-brand">
                <span class="star-icon" style="color:var(--clr-gold);">★</span>
                <span>HOSIGI FC WORLD CUP PREDICTOR</span>
                <span class="star-icon" style="color:var(--clr-gold);">★</span>
              </div>
              <div class="ticket-pass-type" style="background:var(--clr-green); box-shadow:0 0 10px var(--clr-green-glow);">MEMBER PASS</div>
            </div>

            <div class="ticket-body">
              <div class="ticket-main-info">
                <div class="ticket-holder">
                  <div class="holder-label">MEMBER NAME</div>
                  <div class="holder-name" style="color: #fff; font-weight: 800;">${escapeHtml(member.name)}</div>
                </div>
                <div class="ticket-outcome">
                  <div class="outcome-label">KOR ADVANCEMENT</div>
                  <div class="outcome-status" id="modal-ticket-outcome" style="color: ${outcome.color}; text-shadow: 0 0 10px ${outcome.shadow};">${outcome.text}</div>
                </div>
              </div>

              <div class="ticket-score-summary">
                <div class="ticket-score-row">
                  <span>🇨🇿 vs 체코</span>
                  <strong>${member.predictions[1].home} : ${member.predictions[1].away}</strong>
                </div>
                <div class="ticket-score-row">
                  <span>🇲🇽 vs 멕시코</span>
                  <strong>${member.predictions[2].home} : ${member.predictions[2].away}</strong>
                </div>
                <div class="ticket-score-row">
                  <span>🇿🇦 vs 남아공</span>
                  <strong>${member.predictions[3].home} : ${member.predictions[3].away}</strong>
                </div>
              </div>
            </div>

            <div class="ticket-footer">
              <div class="ticket-stamp">
                <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="ticket-seal" style="color:var(--clr-green);">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="4" stroke-dasharray="6 4"/>
                  <path d="M30 65 L45 35 L55 35 L70 65 Z" fill="currentColor"/>
                  <circle cx="50" cy="23" r="6" fill="currentColor"/>
                </svg>
                <div class="stamp-text">
                  <span style="color:var(--clr-green); font-size:0.5rem; font-weight:700;">OFFICIAL HOSIGI</span>
                  <small style="font-size:0.65rem; font-weight:700; color:#fff;">${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}</small>
                </div>
              </div>
              <!-- Mock Barcode -->
              <div class="ticket-barcode">
                <div class="barcode-lines"></div>
                <small style="font-size: 0.5rem; color: var(--clr-text-muted); margin-top: 0.2rem;">HOSIGI-A-2026-FIFA</small>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.6rem; margin-bottom: 0.6rem;">
          <button class="btn btn-primary btn-full" id="btn-download-modal-ticket">
            📥 인증 티켓 다운로드 (PNG)
          </button>
          <button class="btn btn-kakao btn-full" id="btn-modal-share-kakao">
            💬 카톡으로 내 예측 공유
          </button>
        </div>
        <div style="display: flex; gap: 0.6rem;">
          <button class="btn btn-secondary btn-full" id="btn-copy-predict-text">
            📝 예측 텍스트 복사
          </button>
          <button class="btn btn-secondary btn-full" id="btn-close-modal-ticket">
            닫기
          </button>
        </div>
      </div>
    `;

    overlay.innerHTML = ticketHtml;
    overlay.classList.add('active');

    const closeBtn = overlay.querySelector('.btn-close-modal');
    const closeBtn2 = overlay.querySelector('#btn-close-modal-ticket');
    
    const closeModal = () => {
      overlay.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    closeBtn2.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const dlBtn = overlay.querySelector('#btn-download-modal-ticket');
    dlBtn.addEventListener('click', () => {
      downloadMemberTicketAsPNG(member, outcome);
    });

    const modalShareKakao = overlay.querySelector('#btn-modal-share-kakao');
    if (modalShareKakao) {
      modalShareKakao.addEventListener('click', () => {
        sharePredictToKakao(member);
      });
    }

    const copyTextBtn = overlay.querySelector('#btn-copy-predict-text');
    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', () => {
        copyPredictionTextToClipboard(member);
      });
    }
  }

  function downloadMemberTicketAsPNG(member, outcome) {
    const ticketCanvas = document.createElement('canvas');
    ticketCanvas.width = 720;
    ticketCanvas.height = 420;
    const tCtx = ticketCanvas.getContext('2d');

    const gradient = tCtx.createLinearGradient(0, 0, 720, 420);
    gradient.addColorStop(0, '#101625');
    gradient.addColorStop(1, '#0b0f19');
    tCtx.fillStyle = gradient;
    tCtx.fillRect(0, 0, 720, 420);

    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    tCtx.lineWidth = 4;
    tCtx.strokeRect(12, 12, 696, 396);

    tCtx.fillStyle = '#080c14';
    tCtx.beginPath();
    tCtx.arc(0, 210, 20, 0, Math.PI * 2);
    tCtx.fill();

    tCtx.beginPath();
    tCtx.arc(720, 210, 20, 0, Math.PI * 2);
    tCtx.fill();

    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    tCtx.lineWidth = 2;
    tCtx.setLineDash([8, 8]);
    tCtx.beginPath();
    tCtx.moveTo(480, 20);
    tCtx.lineTo(480, 400);
    tCtx.stroke();
    tCtx.setLineDash([]);

    tCtx.fillStyle = '#ffcc00';
    tCtx.font = 'bold 12px "Inter", sans-serif';
    tCtx.letterSpacing = '1px';
    tCtx.fillText('★ HOSIGI FC WORLD CUP PREDICTOR ★', 40, 50);

    tCtx.fillStyle = '#ffffff';
    tCtx.font = '900 36px "Outfit", "Arial Black", sans-serif';
    tCtx.fillText('MEMBER PASS', 40, 95);

    tCtx.fillStyle = '#00cc66';
    tCtx.fillRect(40, 110, 160, 4);

    tCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    tCtx.font = 'bold 12px "Inter", sans-serif';
    tCtx.fillText('MEMBER NAME', 40, 160);

    tCtx.fillStyle = '#ffffff';
    tCtx.font = 'bold 24px "Inter", sans-serif';
    tCtx.fillText(member.name, 40, 195);

    tCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    tCtx.font = 'bold 12px "Inter", sans-serif';
    tCtx.fillText('CALCULATED OUTCOME', 40, 260);

    tCtx.fillStyle = outcome.text.includes('탈락') ? '#ff3344' : outcome.text.includes('대기') ? '#ffcc00' : '#00cc66';
    tCtx.font = '900 28px "Outfit", sans-serif';
    tCtx.fillText(outcome.text, 40, 298);

    tCtx.fillStyle = '#ffcc00';
    tCtx.font = 'bold 14px "Inter", sans-serif';
    tCtx.fillText('MATCHES PREDICTION', 505, 55);

    const scores = [
      { name: '🇨🇿 vs 체코', val: `${member.predictions[1].home} : ${member.predictions[1].away}` },
      { name: '🇲🇽 vs 멕시코', val: `${member.predictions[2].home} : ${member.predictions[2].away}` },
      { name: '🇿🇦 vs 남아공', val: `${member.predictions[3].home} : ${member.predictions[3].away}` }
    ];

    scores.forEach((s, i) => {
      const yOffset = 110 + (i * 65);
      
      tCtx.fillStyle = 'rgba(255,255,255,0.7)';
      tCtx.font = '500 13px "Inter", sans-serif';
      tCtx.fillText(s.name, 505, yOffset);

      tCtx.fillStyle = '#ffffff';
      tCtx.font = 'bold 20px "Outfit", sans-serif';
      tCtx.fillText(s.val, 505, yOffset + 28);
    });

    tCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    tCtx.font = '500 10px "Inter", sans-serif';
    tCtx.fillText('CERTIFIED BY HOSIGI FC WORLD CUP EVENT', 40, 360);

    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(505, 320, 170, 25);
    tCtx.fillStyle = '#0b0f19';
    for (let col = 0; col < 170; col += 4) {
      if (Math.random() < 0.6) {
        tCtx.fillRect(505 + col, 320, Math.floor(Math.random() * 2) + 1, 25);
      }
    }
    tCtx.fillStyle = 'rgba(255,255,255,0.4)';
    tCtx.font = 'bold 8px "Outfit", sans-serif';
    tCtx.fillText('HOSIGI-A-2026-FIFA', 505, 362);

    const dataURL = ticketCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `호식이FC-2026월드컵-인증티켓-${member.name}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // RUN APPLICATION (Called after all variables and functions are initialized)
  init();
});
