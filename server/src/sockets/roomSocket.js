
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i + 2]));

function createDeck() {
  return SUITS
    .flatMap(s => RANKS.map(r => ({ rank: r, suit: s, code: `${r}${s}`, value: RANK_VALUE[r] })))
    .sort(() => Math.random() - 0.5);
}

function publicRoom(room, viewerId) {
  const copy = JSON.parse(JSON.stringify(room));

  if (copy.poker?.hands) {
    const finished = copy.poker.phase === "finished";
    for (const playerId of Object.keys(copy.poker.hands)) {
      if (playerId !== viewerId && !finished) {
        copy.poker.hands[playerId] = copy.poker.hands[playerId].map(() => ({ code: "?", hidden: true }));
      }
    }
    delete copy.poker.deck;
  }

  if (copy.warships?.boards) {
    for (const playerId of Object.keys(copy.warships.boards)) {
      if (playerId !== viewerId) {
        copy.warships.boards[playerId].ships = [];
      }
    }
  }

  return copy;
}

function emitRoom(io, room) {
  for (const p of room.players) {
    io.to(p.socketId).emit("room:update", publicRoom(room, p.socketId));
  }
}

function createRoom(roomCode) {
  return {
    code: roomCode,
    players: [],
    activeGame: null,
    unlocked: [],
    poker: null,
    pokerDealerIndex: 0,
    warships: null,
    createdAt: Date.now(),
  };
}

function addPlayer(room, socket, playerName) {
  if (!room.players.some(p => p.socketId === socket.id)) {
    room.players.push({ socketId: socket.id, name: playerName, joinedAt: Date.now() });
  }
}

function nextPlayer(room, currentId) {
  const ids = room.players.map(p => p.socketId);
  const idx = ids.indexOf(currentId);
  return ids[(idx + 1) % ids.length] || ids[0];
}

function activePlayerIds(room) {
  return room.players.map(p => p.socketId);
}

function playerName(room, id) {
  return room.players.find(p => p.socketId === id)?.name || "Player";
}

function rankCounts(cards) {
  const counts = {};
  for (const c of cards) counts[c.value] = (counts[c.value] || 0) + 1;
  return counts;
}

function isFlush(cards) {
  const suits = {};
  for (const c of cards) suits[c.suit] = (suits[c.suit] || 0) + 1;
  return Object.values(suits).some(v => v >= 5);
}

function straightHigh(cards) {
  const values = [...new Set(cards.map(c => c.value))].sort((a, b) => a - b);
  if (values.includes(14)) values.unshift(1);
  let run = 1;
  let best = null;
  for (let i = 1; i < values.length; i++) {
    if (values[i] === values[i - 1] + 1) {
      run++;
      if (run >= 5) best = values[i] === 1 ? 14 : values[i];
    } else if (values[i] !== values[i - 1]) {
      run = 1;
    }
  }
  return best;
}

function evaluateHand(cards) {
  const counts = rankCounts(cards);
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  const flush = isFlush(cards);
  const straight = straightHigh(cards);
  const highCards = [...cards].sort((a, b) => b.value - a.value).map(c => c.value);

  if (flush && straight) return { score: 800 + straight, label: "Straight Flush" };
  if (groups[0]?.count === 4) return { score: 700 + groups[0].value, label: "Four of a Kind" };
  if (groups[0]?.count === 3 && groups.some(g => g.count >= 2 && g.value !== groups[0].value)) return { score: 600 + groups[0].value, label: "Full House" };
  if (flush) return { score: 500 + highCards[0], label: "Flush" };
  if (straight) return { score: 400 + straight, label: "Straight" };
  if (groups[0]?.count === 3) return { score: 300 + groups[0].value, label: "Three of a Kind" };
  const pairs = groups.filter(g => g.count === 2);
  if (pairs.length >= 2) return { score: 200 + pairs[0].value * 15 + pairs[1].value, label: "Two Pair" };
  if (pairs.length === 1) return { score: 100 + pairs[0].value, label: "Pair" };
  return { score: highCards[0], label: "High Card" };
}

function takeChips(poker, playerId, amount) {
  const paid = Math.min(amount, poker.chips[playerId] || 0);
  poker.chips[playerId] -= paid;
  poker.pot += paid;
  poker.bets[playerId] = (poker.bets[playerId] || 0) + paid;
  return paid;
}

function startPoker(room, preserveChips = true) {
  const deck = createDeck();
  const players = activePlayerIds(room);
  const chips = {};
  const hands = {};

  for (const p of room.players) {
    chips[p.socketId] = preserveChips && room.poker?.chips?.[p.socketId] !== undefined ? room.poker.chips[p.socketId] : 1000;
    hands[p.socketId] = [deck.pop(), deck.pop()];
  }

  const dealerIndex = room.pokerDealerIndex % Math.max(players.length, 1);
  const dealer = players[dealerIndex];
  const firstTurn = players[(dealerIndex + 1) % Math.max(players.length, 1)];

  room.pokerDealerIndex = (room.pokerDealerIndex + 1) % Math.max(players.length, 1);

  room.poker = {
    deck,
    hands,
    chips,
    community: [],
    pot: 0,
    currentBet: 0,
    bets: Object.fromEntries(players.map(id => [id, 0])),
    folded: [],
    turn: firstTurn,
    dealer,
    phase: "preflop",
    message: "New hand started. Dealer button moved.",
    winner: null,
    handLabels: {},
  };

  if (players.length >= 2) {
    const smallBlind = players[(dealerIndex + 1) % players.length];
    const bigBlind = players[(dealerIndex + 2) % players.length] || players[0];
    takeChips(room.poker, smallBlind, 25);
    takeChips(room.poker, bigBlind, 50);
    room.poker.currentBet = 50;
    room.poker.turn = smallBlind;
    room.poker.message = "Blinds posted: $25 / $50.";
  }
}

function advancePoker(room) {
  const poker = room.poker;
  const active = room.players.map(p => p.socketId).filter(id => !poker.folded.includes(id));

  if (active.length === 1) {
    const winner = active[0];
    poker.chips[winner] += poker.pot;
    poker.winner = winner;
    poker.phase = "finished";
    poker.message = `${playerName(room, winner)} wins because the other player folded.`;
    return;
  }

  const equalBets = active.every(id => poker.bets[id] === poker.currentBet);
  if (!equalBets) return;

  poker.bets = Object.fromEntries(room.players.map(p => [p.socketId, 0]));
  poker.currentBet = 0;

  if (poker.phase === "preflop") {
    poker.community.push(poker.deck.pop(), poker.deck.pop(), poker.deck.pop());
    poker.phase = "flop";
    poker.message = "The flop is dealt.";
  } else if (poker.phase === "flop") {
    poker.community.push(poker.deck.pop());
    poker.phase = "turn";
    poker.message = "The turn card is dealt.";
  } else if (poker.phase === "turn") {
    poker.community.push(poker.deck.pop());
    poker.phase = "river";
    poker.message = "The river card is dealt.";
  } else if (poker.phase === "river") {
    const scored = active.map(id => {
      const result = evaluateHand([...poker.hands[id], ...poker.community]);
      poker.handLabels[id] = result.label;
      return { id, ...result };
    }).sort((a, b) => b.score - a.score);

    const winner = scored[0].id;
    poker.chips[winner] += poker.pot;
    poker.winner = winner;
    poker.phase = "finished";
    poker.message = `Showdown! ${playerName(room, winner)} wins with ${scored[0].label}.`;
  }
}

function startWarships(room) {
  room.warships = {
    phase: "placing",
    boards: Object.fromEntries(room.players.map(p => [p.socketId, {
      fleet: createFleet(),
      selectedShipId: "patrol",
      shotsReceived: [],
      ready: false
    }])),
    turn: room.players[0]?.socketId,
    winner: null,
    message: "Place your fleet, lock each ship, then commit placement.",
  };
}

const FLEET_TEMPLATE = [
  { id: "patrol", name: "Patrol Boat", size: 2 },
  { id: "destroyer", name: "Destroyer", size: 3 },
  { id: "battleship", name: "Battleship", size: 4 },
];

function isConnectedShip(cells) {
  if (cells.length <= 1) return true;
  const rows = cells.map(c => Math.floor(c / 5));
  const cols = cells.map(c => c % 5);
  const sameRow = rows.every(r => r === rows[0]);
  const sameCol = cols.every(c => c === cols[0]);
  if (!sameRow && !sameCol) return false;
  const sorted = sameRow ? cols.slice().sort((a,b)=>a-b) : rows.slice().sort((a,b)=>a-b);
  return sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
}

function createFleet() {
  return FLEET_TEMPLATE.map(ship => ({ ...ship, cells: [], locked: false }));
}

function allShipCells(board) {
  return board.fleet.flatMap(ship => ship.cells);
}

function remainingShips(board) {
  return board.fleet.filter(ship => !ship.cells.every(cell => board.shotsReceived.includes(cell))).length;
}

function shipAtCell(board, cell) {
  return board.fleet.find(ship => ship.cells.includes(cell));
}

function allShipsLocked(board) {
  return board.fleet.every(ship => ship.locked && ship.cells.length === ship.size);
}

function registerRoomHandlers(io, socket, rooms) {
  socket.on("room:create", ({ roomCode, playerName }, callback) => {
    const code = String(roomCode || "").trim().toUpperCase();

    if (!code) {
      if (callback) callback({ ok: false, error: "Missing room code." });
      return;
    }

    if (!rooms.has(code)) rooms.set(code, createRoom(code));

    const room = rooms.get(code);
    socket.join(code);
    addPlayer(room, socket, playerName || "Player");

    console.log(`room:create ${code} by ${socket.id}`);
    emitRoom(io, room);

    if (callback) callback({ ok: true, code });
  });

  socket.on("room:join", ({ roomCode, playerName }, callback) => {
    const code = String(roomCode || "").trim().toUpperCase();

    if (!code) {
      if (callback) callback({ ok: false, error: "Enter a room code." });
      return;
    }

    if (!rooms.has(code)) {
      if (callback) callback({ ok: false, error: "Room not found. Create it first on the other device." });
      return;
    }

    const room = rooms.get(code);
    socket.join(code);
    addPlayer(room, socket, playerName || "Player");

    console.log(`room:join ${code} by ${socket.id}`);
    emitRoom(io, room);

    if (callback) callback({ ok: true, code });
  });

  socket.on("game:start", ({ roomCode, gameId }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) return;
    room.activeGame = gameId;
    if (gameId === "poker") startPoker(room, !room.poker);
    if (gameId === "warships") startWarships(room);
    emitRoom(io, room);
  });

  socket.on("poker:action", ({ roomCode, action, amount }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.poker || room.poker.turn !== socket.id || room.poker.phase === "finished") return;

    const p = room.poker;
    const already = p.bets[socket.id] || 0;

    if (action === "fold") {
      p.folded.push(socket.id);
      p.message = `${playerName(room, socket.id)} folded.`;
    } else if (action === "check") {
      if (p.currentBet !== already) return;
      p.message = `${playerName(room, socket.id)} checked.`;
    } else if (action === "call") {
      const toCall = Math.max(0, p.currentBet - already);
      takeChips(p, socket.id, toCall);
      p.message = `${playerName(room, socket.id)} called $${toCall}.`;
    } else if (action === "raise") {
      const raiseTo = Math.max(p.currentBet + 50, Number(amount || 0));
      const toPay = raiseTo - already;
      if (toPay > p.chips[socket.id]) return;
      takeChips(p, socket.id, toPay);
      p.currentBet = raiseTo;
      p.message = `${playerName(room, socket.id)} raised to $${raiseTo}.`;
    } else if (action === "allin") {
      const all = p.chips[socket.id];
      takeChips(p, socket.id, all);
      if (p.bets[socket.id] > p.currentBet) p.currentBet = p.bets[socket.id];
      p.message = `${playerName(room, socket.id)} went all in.`;
    }

    advancePoker(room);
    if (p.phase !== "finished") p.turn = nextPlayer(room, socket.id);
    emitRoom(io, room);
  });

  socket.on("poker:newHand", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) return;
    startPoker(room, true);
    emitRoom(io, room);
  });

  socket.on("warships:selectShip", ({ roomCode, shipId }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.warships || room.warships.phase !== "placing") return;

    const board = room.warships.boards[socket.id];
    if (!board || board.ready) return;

    const ship = board.fleet.find(s => s.id === shipId);
    if (!ship || ship.locked) return;

    board.selectedShipId = shipId;
    room.warships.message = `Selected ${ship.name}.`;
    emitRoom(io, room);
  });

  socket.on("warships:place", ({ roomCode, cell }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.warships || room.warships.phase !== "placing") return;

    const board = room.warships.boards[socket.id];
    if (!board || board.ready) return;

    const ship = board.fleet.find(s => s.id === board.selectedShipId);
    if (!ship || ship.locked || ship.cells.includes(cell) || ship.cells.length >= ship.size) return;

    const occupiedByOtherShip = board.fleet.some(s => s.id !== ship.id && s.cells.includes(cell));
    if (occupiedByOtherShip) {
      room.warships.message = "That cell is already occupied by another ship.";
      emitRoom(io, room);
      return;
    }

    const nextCells = [...ship.cells, cell];
    if (!isConnectedShip(nextCells)) {
      room.warships.message = `${ship.name} must be connected in a straight line.`;
      emitRoom(io, room);
      return;
    }

    ship.cells.push(cell);
    room.warships.message = ship.cells.length === ship.size
      ? `${ship.name} placed. Lock it or clear it.`
      : `Keep placing ${ship.name}: ${ship.cells.length}/${ship.size}.`;

    emitRoom(io, room);
  });

  socket.on("warships:lockShip", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.warships || room.warships.phase !== "placing") return;

    const board = room.warships.boards[socket.id];
    if (!board || board.ready) return;

    const ship = board.fleet.find(s => s.id === board.selectedShipId);
    if (!ship || ship.cells.length !== ship.size || !isConnectedShip(ship.cells)) {
      room.warships.message = "Finish placing the selected ship before locking it.";
      emitRoom(io, room);
      return;
    }

    ship.locked = true;
    const nextUnlocked = board.fleet.find(s => !s.locked);
    if (nextUnlocked) board.selectedShipId = nextUnlocked.id;

    room.warships.message = `${ship.name} locked.`;
    emitRoom(io, room);
  });

  socket.on("warships:clearShip", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.warships || room.warships.phase !== "placing") return;

    const board = room.warships.boards[socket.id];
    if (!board || board.ready) return;

    const ship = board.fleet.find(s => s.id === board.selectedShipId);
    if (!ship || ship.locked) return;

    ship.cells = [];
    room.warships.message = `${ship.name} cleared.`;
    emitRoom(io, room);
  });

  socket.on("warships:commitPlacement", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.warships || room.warships.phase !== "placing") return;

    const board = room.warships.boards[socket.id];
    if (!board || !allShipsLocked(board)) {
      room.warships.message = "You must place and lock every ship before committing.";
      emitRoom(io, room);
      return;
    }

    board.ready = true;
    room.warships.message = `${playerName(room, socket.id)} committed their fleet.`;

    const allReady = room.players.length >= 2 && room.players.every(p => room.warships.boards[p.socketId]?.ready === true);
    if (allReady) {
      room.warships.phase = "battle";
      room.warships.message = "Both fleets are locked. Battle started.";
    }

    emitRoom(io, room);
  });

  socket.on("warships:clearPlacement", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room?.warships || room.warships.phase !== "placing") return;
    const board = room.warships.boards[socket.id];
    if (!board || board.ready) return;
    board.fleet = createFleet();
    board.selectedShipId = "patrol";
    board.ready = false;
    room.warships.message = "Full fleet placement cleared.";
    emitRoom(io, room);
  });

  socket.on("warships:attack", ({ roomCode, targetId, cell }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    const w = room?.warships;
    if (!w || w.phase !== "battle" || w.turn !== socket.id || targetId === socket.id) return;

    const enemy = w.boards[targetId];
    if (!enemy || enemy.shotsReceived.includes(cell)) return;

    enemy.shotsReceived.push(cell);
    const hitShip = shipAtCell(enemy, cell);
    const hit = Boolean(hitShip);
    const sunkShip = hitShip && hitShip.cells.every(c => enemy.shotsReceived.includes(c));
    const enemyRemaining = remainingShips(enemy);
    const sunkAll = enemyRemaining === 0;

    if (sunkAll) {
      w.winner = socket.id;
      w.phase = "finished";
      w.message = `${playerName(room, socket.id)} destroyed the entire enemy fleet.`;
    } else if (sunkShip) {
      w.message = `Hit and sunk ${hitShip.name}! Enemy ships remaining: ${enemyRemaining}.`;
      w.turn = nextPlayer(room, socket.id);
    } else {
      w.message = hit ? "Direct hit!" : "Splash. Miss.";
      w.turn = nextPlayer(room, socket.id);
    }

    emitRoom(io, room);
  });

  socket.on("game:complete", ({ roomCode, gameId }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) return;
    if (!room.unlocked.includes(gameId)) room.unlocked.push(gameId);
    room.activeGame = null;
    emitRoom(io, room);
  });

  socket.on("room:reset", ({ roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) return;
    room.activeGame = null;
    room.unlocked = [];
    room.poker = null;
    room.warships = null;
    room.pokerDealerIndex = 0;
    emitRoom(io, room);
  });
}

module.exports = { registerRoomHandlers };
