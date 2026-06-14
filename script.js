const DICE_PER_SIDE = 5;

const state = {
  humanDice: [],
  cpuDice: [],
  currentBid: null,
  turn: "human",
  roundActive: false,
  humanCups: 0,
  cpuCups: 0,
  challenge: null,
  maxStake: 4,
  bidType: 'buzhai',
};

const el = {
  humanDice: document.getElementById("humanDice"),
  cpuDice: document.getElementById("cpuDice"),
  currentBid: document.getElementById("currentBid"),
  turnIndicator: document.getElementById("turnIndicator"),
  log: document.getElementById("log"),
  countInput: document.getElementById("countInput"),
  faceInput: document.getElementById("faceInput"),
  bidBtn: document.getElementById("bidBtn"),
  openBtn: document.getElementById("openBtn"),
  splitBtn: document.getElementById("splitBtn"),
  acceptBtn: document.getElementById("acceptBtn"),
  counterSplitBtn: document.getElementById("counterSplitBtn"),
  declineBtn: document.getElementById("declineBtn"),
  newRoundBtn: document.getElementById("newRoundBtn"),
  humanStatus: document.getElementById("humanStatus"),
  cpuStatus: document.getElementById("cpuStatus"),
  humanAvatar: document.getElementById("humanAvatar"),
  cpuAvatar: document.getElementById("cpuAvatar"),
  humanCups: document.getElementById("humanCups"),
  cpuCups: document.getElementById("cpuCups"),
  drunkOverlay: document.getElementById("drunkOverlay"),
  tauntText: document.getElementById("tauntText"),
  zhaiToggle: document.getElementById("zhaiToggle"),
};

function rollDice() {
  return Array.from({ length: DICE_PER_SIDE }, () => Math.floor(Math.random() * 6) + 1);
}

function createPipGrid(value, hidden) {
  const grid = document.createElement("div");
  grid.className = "pip-grid";

  if (hidden) {
    for (let i = 0; i < 9; i += 1) {
      const pip = document.createElement("span");
      pip.className = "pip";
      grid.appendChild(pip);
    }
    return grid;
  }

  const map = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const active = new Set(map[value] || []);
  for (let i = 0; i < 9; i += 1) {
    const pip = document.createElement("span");
    pip.className = active.has(i) ? "pip on" : "pip";
    grid.appendChild(pip);
  }
  return grid;
}

function renderDice(container, dice, hidden = false) {
  container.innerHTML = "";
  dice.forEach((d) => {
    const die = document.createElement("div");
    die.className = hidden ? "die hidden" : "die";
    die.style.setProperty("--r", `${Math.floor(Math.random() * 12 - 6)}deg`);
    die.appendChild(createPipGrid(d, hidden));
    container.appendChild(die);
  });
}

function bidToText(bid) {
  if (!bid) return "暂无";
  const typeLabel = bid.type === 'zhai' ? '斋' : '';
  return `${bid.count}个${typeLabel}${bid.face}`;
}

function isHigherBid(newBid, oldBid) {
  if (!oldBid) return true;
  const faceRank = { 1: 6, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
  const typeRank = { buzhai: 1, zhai: 0 };

  // 斋 → 不斋：必须 +2 数量
  if (oldBid.type === 'zhai' && newBid.type === 'buzhai') {
    if (newBid.count >= oldBid.count + 2) return true;
    return false;
  }

  // 同类型 / 不斋→斋
  if (newBid.count !== oldBid.count) return newBid.count > oldBid.count;
  if (faceRank[newBid.face] !== faceRank[oldBid.face]) return faceRank[newBid.face] > faceRank[oldBid.face];
  return typeRank[newBid.type] > typeRank[oldBid.type];
}

function countWithWild(face, type = 'buzhai') {
  const all = [...state.humanDice, ...state.cpuDice];
  if (type === 'zhai') return all.filter((d) => d === face).length;
  return all.filter((d) => d === face || d === 1).length;
}

function addLog(text) {
  const line = document.createElement("div");
  line.textContent = `- ${text}`;
  el.log.prepend(line);
}

function setTurn(turn) {
  state.turn = turn;
  if (turn === "human") {
    el.turnIndicator.textContent = "你的回合";
    el.humanStatus.textContent = "思考中";
    el.cpuStatus.textContent = "观察你";
    el.bidBtn.disabled = false;
    el.openBtn.disabled = !state.currentBid;
    el.splitBtn.disabled = !state.currentBid;
    el.acceptBtn.disabled = true;
    el.counterSplitBtn.disabled = true;
    el.declineBtn.disabled = true;
    if (el.zhaiToggle) el.zhaiToggle.disabled = !!state.currentBid;
  } else {
    el.turnIndicator.textContent = "电脑回合";
    el.humanStatus.textContent = "等待中";
    el.cpuStatus.textContent = "正在叫骰";
    el.bidBtn.disabled = true;
    el.openBtn.disabled = true;
    el.splitBtn.disabled = true;
    el.acceptBtn.disabled = true;
    el.counterSplitBtn.disabled = true;
    el.declineBtn.disabled = true;
    if (el.zhaiToggle) el.zhaiToggle.disabled = true;
  }
}

function setChallengeUIForHuman() {
  el.bidBtn.disabled = true;
  el.openBtn.disabled = true;
  el.splitBtn.disabled = true;
  el.acceptBtn.disabled = false;
  el.declineBtn.disabled = false;
  el.counterSplitBtn.disabled = state.challenge && state.challenge.level >= 2;
  if (el.zhaiToggle) el.zhaiToggle.disabled = true;
}

function updateCupBoard() {
  el.humanCups.textContent = String(state.humanCups);
  el.cpuCups.textContent = String(state.cpuCups);
}

function startRound() {
  state.humanDice = rollDice();
  state.cpuDice = rollDice();
  state.currentBid = null;
  state.roundActive = true;
  state.challenge = null;
  state.bidType = 'buzhai';
  if (el.zhaiToggle) {
    el.zhaiToggle.textContent = '不斋';
    el.zhaiToggle.classList.remove('active');
  }

  renderDice(el.humanDice, state.humanDice, false);
  renderDice(el.cpuDice, state.cpuDice, true);
  el.currentBid.textContent = bidToText(state.currentBid);
  el.log.innerHTML = "";
  addLog("新一局开始，双方摇盅完毕。")

  const first = Math.random() < 0.5 ? "human" : "cpu";
  setTurn(first);
  if (first === "cpu") {
    window.setTimeout(cpuAction, 900);
  }
}

function endRound(loser) {
  state.roundActive = false;
  renderDice(el.cpuDice, state.cpuDice, false);
  el.bidBtn.disabled = true;
  el.openBtn.disabled = true;
  el.splitBtn.disabled = true;
  el.acceptBtn.disabled = true;
  el.counterSplitBtn.disabled = true;
  el.declineBtn.disabled = true;
  el.turnIndicator.textContent = "本局结束";

  if (loser === "human") {
    playDrinkAnimation(el.humanAvatar);
  } else {
    playDrinkAnimation(el.cpuAvatar);
  }
}

function addCups(player, cups) {
  if (player === "human") {
    state.humanCups += cups;
  } else {
    state.cpuCups += cups;
  }
  updateCupBoard();
}

function settleByBid(opener, stake) {
  if (!state.currentBid) return;
  renderDice(el.cpuDice, state.cpuDice, false);
  const bid = state.currentBid;
  const actual = countWithWild(bid.face, bid.type);
  const modeLabel = bid.type === 'zhai' ? '（斋，1不算万能）' : '（不斋，1万能）';
  addLog(`开盅！当前叫点 ${bidToText(bid)}${modeLabel}，实际有 ${actual} 个。`);

  const lastBidder = opener === "human" ? "cpu" : "human";
  if (actual >= state.currentBid.count) {
    addLog(`这口叫点没问题，发起判定的一方喝 ${stake} 杯。`);
    addCups(opener, stake);
    endRound(opener);
  } else {
    addLog(`抓到吹牛了，上一位叫点者喝 ${stake} 杯。`);
    addCups(lastBidder, stake);
    endRound(lastBidder);
  }
  checkDrunk();
}

function checkDrunk() {
  if (state.humanCups < 20) return;
  const taunts = [
    "小菜鸟，今天状态有点飘，先喝口水冷静一下。",
    "这波有点上头啦，稳一稳你还是很有机会的。",
    "别急，节奏慢下来，你会越来越会玩。",
  ];
  el.tauntText.textContent = taunts[Math.floor(Math.random() * taunts.length)];
  el.drunkOverlay.classList.add("show");
  window.setTimeout(() => {
    el.drunkOverlay.classList.remove("show");
  }, 5000);
}

function playDrinkAnimation(avatar) {
  avatar.classList.remove("drink");
  void avatar.offsetWidth;
  avatar.classList.add("drink");
}

function openBy(opener) {
  settleByBid(opener, 1);
}

function humanBid() {
  if (!state.roundActive || state.turn !== "human") return;
  const count = Number(el.countInput.value);
  const face = Number(el.faceInput.value);

  if (!Number.isInteger(count) || !Number.isInteger(face) || count < 1 || face < 1 || face > 6) {
    addLog("叫点输入无效，请输入合法数量和点数。")
    return;
  }

  const bid = { count, face, type: state.bidType || 'buzhai' };
  if (!isHigherBid(bid, state.currentBid)) {
    const hint = state.currentBid && state.currentBid.type === 'zhai' && (state.bidType || 'buzhai') === 'buzhai'
      ? '斋→不斋需要 +2 数量。'
      : '叫点必须比当前更大。';
    addLog(hint)
    return;
  }

  state.currentBid = bid;
  el.currentBid.textContent = bidToText(state.currentBid);
  addLog(`你叫骰：${bidToText(bid)}`);

  setTurn("cpu");
  window.setTimeout(cpuAction, 900);
}

function cpuAction() {
  if (!state.roundActive || state.turn !== "cpu") return;

  if (state.challenge && state.challenge.target === "cpu") {
    const level = state.challenge.level;
    if (level === 1) {
      const r = Math.random();
      if (r < 0.25) {
        addLog("电脑不接受劈，直接认输喝 1 杯。")
        addCups("cpu", 1);
        endRound("cpu");
        checkDrunk();
        return;
      }
      if (r < 0.55) {
        addLog("电脑接受劈，直接开盅判定（2杯）。")
        settleByBid(state.challenge.from, 2);
        return;
      }
      addLog("电脑选择反劈！本局升级到 4 杯。")
      state.challenge = { level: 2, target: "human", from: "cpu" };
      setChallengeUIForHuman();
      return;
    }

    addLog("电脑面对反劈，选择接受，直接开盅判定（4杯）。")
    settleByBid(state.challenge.from, 4);
    return;
  }

  const targetFace = state.currentBid ? state.currentBid.face : (Math.floor(Math.random() * 6) + 1);
  const bidType = state.currentBid ? state.currentBid.type : 'buzhai';
  const confidence = countWithWild(targetFace, bidType);

  if (state.currentBid && confidence + Math.floor(Math.random() * 2) < state.currentBid.count) {
    addLog("电脑选择开盅！")
    openBy("cpu");
    return;
  }

  let nextBid;
  if (!state.currentBid) {
    const useZhai = Math.random() < 0.3;
    nextBid = { count: 2 + Math.floor(Math.random() * 2), face: targetFace, type: useZhai ? 'zhai' : 'buzhai' };
  } else {
    nextBid = { ...state.currentBid };
    // 斋→不斋：+2 跳
    if (nextBid.type === 'zhai' && Math.random() < 0.35) {
      nextBid.type = 'buzhai';
      nextBid.count += 2;
    } else if (Math.random() < 0.6) {
      nextBid.count += 1;
    } else if (nextBid.face < 6) {
      nextBid.face += 1;
    } else {
      nextBid.count += 1;
      nextBid.face = 2;
    }
  }

  if (!isHigherBid(nextBid, state.currentBid)) {
    nextBid = { count: state.currentBid.count + 1, face: state.currentBid.face, type: state.currentBid.type };
  }

  state.currentBid = nextBid;
  el.currentBid.textContent = bidToText(state.currentBid);
  addLog(`电脑叫骰：${bidToText(nextBid)}`);
  setTurn("human");
}

function humanOpen() {
  if (!state.roundActive || state.turn !== "human" || !state.currentBid) return;
  addLog("你选择开盅！")
  openBy("human");
}

function humanSplit() {
  if (!state.roundActive || state.turn !== "human" || !state.currentBid) return;
  addLog("你发起了劈！对方可接受/不接受/反劈。")
  state.challenge = { level: 1, target: "cpu", from: "human" };
  setTurn("cpu");
  window.setTimeout(cpuAction, 900);
}

function humanAccept() {
  if (!state.roundActive || !state.challenge || state.challenge.target !== "human") return;
  if (state.challenge.level === 1) {
    addLog("你接受劈，直接开盅判定（2杯）。")
    settleByBid(state.challenge.from, 2);
    return;
  }
  addLog("你接受反劈，直接开盅判定（4杯）。")
  settleByBid(state.challenge.from, 4);
}

function humanDecline() {
  if (!state.roundActive || !state.challenge || state.challenge.target !== "human") return;
  if (state.challenge.level === 1) {
    addLog("你不接受劈，直接认输喝 1 杯。")
    addCups("human", 1);
    endRound("human");
    checkDrunk();
    return;
  }
  addLog("你不接受反劈，直接认输喝 2 杯。")
  addCups("human", 2);
  endRound("human");
  checkDrunk();
}

function humanCounterSplit() {
  if (!state.roundActive || !state.challenge || state.challenge.target !== "human") return;
  if (state.challenge.level >= 2) return;
  addLog("你选择反劈！本局封顶 4 杯。")
  state.challenge = { level: 2, target: "cpu", from: "human" };
  setTurn("cpu");
  window.setTimeout(cpuAction, 900);
}

el.newRoundBtn.addEventListener("click", startRound);
el.bidBtn.addEventListener("click", humanBid);
el.openBtn.addEventListener("click", humanOpen);
el.splitBtn.addEventListener("click", humanSplit);
el.acceptBtn.addEventListener("click", humanAccept);
el.declineBtn.addEventListener("click", humanDecline);
el.counterSplitBtn.addEventListener("click", humanCounterSplit);

function toggleZhai() {
  if (!state.roundActive || state.turn !== 'human' || state.currentBid) {
    // 只能在轮到玩家且没有当前叫点时切换首叫类型
    if (state.currentBid) return;
    if (!state.roundActive || state.turn !== 'human') return;
  }
  state.bidType = state.bidType === 'zhai' ? 'buzhai' : 'zhai';
  el.zhaiToggle.textContent = state.bidType === 'zhai' ? '斋' : '不斋';
  el.zhaiToggle.classList.toggle('active', state.bidType === 'zhai');
}
if (el.zhaiToggle) {
  el.zhaiToggle.addEventListener("click", toggleZhai);
}

el.bidBtn.disabled = true;
el.openBtn.disabled = true;
el.splitBtn.disabled = true;
el.acceptBtn.disabled = true;
el.counterSplitBtn.disabled = true;
el.declineBtn.disabled = true;
updateCupBoard();

/* ─── 微信分享引导 ─── */
(function initShareTip() {
  const tip = document.getElementById("shareTip");
  if (!tip) return;

  const ua = navigator.userAgent.toLowerCase();
  const isWechat = ua.includes("micromessenger");

  if (isWechat) {
    tip.classList.add("show");
    window.setTimeout(() => {
      tip.classList.remove("show");
    }, 8000);
  }
})();
