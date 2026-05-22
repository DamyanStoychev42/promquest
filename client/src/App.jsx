
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Users, CheckCircle2, Copy, Gamepad2 } from "lucide-react";
import { socket } from "./socket/socket";
import { games, quizQuestions, geoLocations, revealClues, finalRevealSentences, finalQuestion } from "./games/gameData";
import { GoogleMap, Marker, LoadScript } from "@react-google-maps/api";


const revealPhotos = [
  "/photo1.jpg",
  "/photo2.jpg",
  "/photo3.jpg",
  "/photo4.jpg",
  "/photo5.jpg",
  "/photo6.jpg",
  "/photo7.jpg",
];

function makeRoomCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function distanceMeters(a,b){
  const R=6371000;
  const toRad=x=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat);
  const dLng=toRad(b.lng-a.lng);
  const lat1=toRad(a.lat);
  const lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(h)));
}
function playerName(room,id){return room?.players.find(p=>p.socketId===id)?.name || "Player";}

export default function App(){
  const [screen,setScreen]=useState("intro");
  const [showSplash,setShowSplash]=useState(true);
  const [playerNameInput,setPlayerNameInput]=useState("");
  const [roomCode,setRoomCode]=useState("");
  const [room,setRoom]=useState(null);
  const [roomStatus,setRoomStatus]=useState("");
  const [activeGame,setActiveGame]=useState(null);
  const [raiseAmount,setRaiseAmount]=useState(50);
  const [quizIndex,setQuizIndex]=useState(0);
  const [quizCorrect,setQuizCorrect]=useState(0);
  const [geoIndex,setGeoIndex]=useState(0);
  const [geoAnswer,setGeoAnswer]=useState("");
  const [geoGuess,setGeoGuess]=useState(null);
  const [geoDistance,setGeoDistance]=useState(null);
  const [revealStarted,setRevealStarted]=useState(false);
  const [accepted,setAccepted]=useState(false);
  const [clueOverlay,setClueOverlay]=useState(null);

  useEffect(()=>{
    socket.connect();

    socket.on("connect",()=>setRoomStatus("Connected."));
    socket.on("disconnect",()=>setRoomStatus("Disconnected. Restart backend if needed."));
    socket.on("connect_error",()=>setRoomStatus("Could not connect to backend."));
    socket.on("room:update",(nextRoom)=>{
      setRoom(nextRoom);
      setRoomStatus(`Joined room ${nextRoom.code}.`);
    });

    return()=>{
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("room:update");
      socket.disconnect();
    }
  },[]);
  const unlockedIds=room?.unlocked||[];
  const progress=unlockedIds.length/games.length;
  const game=games.find(g=>g.id===activeGame);
  const me=socket.id;
  const currentPlayer=useMemo(()=>room?.players.find(p=>p.socketId===me),[room,me]);

  function createRoom(){
    const code=makeRoomCode();
    setRoomCode(code);
    setRoomStatus("Creating room...");
    socket.emit("room:create",{roomCode:code,playerName:playerNameInput||"Player 1"},(res)=>{
      if(!res?.ok){
        setRoomStatus(res?.error || "Could not create room.");
        return;
      }
      setScreen("lobby");
    });
  }

  function joinRoom(){
    const code=roomCode.trim().toUpperCase();
    if(!code){
      setRoomStatus("Enter the room code first.");
      return;
    }

    setRoomStatus("Joining room...");
    socket.emit("room:join",{roomCode:code,playerName:playerNameInput||"Player 2"},(res)=>{
      if(!res?.ok){
        setRoomStatus(res?.error || "Could not join room.");
        return;
      }
      setScreen("lobby");
    });
  }
  function startGame(gameId){setActiveGame(gameId);setQuizIndex(0);setQuizCorrect(0);setGeoIndex(0);setGeoAnswer("");setGeoGuess(null);setGeoDistance(null);socket.emit("game:start",{roomCode:room.code,gameId});setScreen("game");}
  function completeGame(gameId){
    const completedGame = games.find(g=>g.id===gameId);
    socket.emit("game:complete",{roomCode:room.code,gameId});
    setActiveGame(null);
    setScreen("map");
    setClueOverlay(completedGame || null);
  }

  function PokerGame(){
    const p=room?.poker;
    if(!p)return <p>Loading poker...</p>;

    const myHand=p.hands?.[me]||[];
    const opponent=room.players.find(pl=>pl.socketId!==me);
    const opponentHand=opponent ? (p.hands?.[opponent.socketId] || []) : [];
    const isMyTurn=p.turn===me;
    const myBet=p.bets?.[me]||0;
    const toCall=Math.max(0,(p.currentBet||0)-myBet);
    const winnerName=p.winner?playerName(room,p.winner):null;

    return <div className="stack">
      <div className="row">
        <span className="badge">{p.phase.toUpperCase()}</span>
        <span className="chips">Your chips: ${p.chips?.[me]??0}</span>
      </div>

      <div className="poker-table">
        <div className="stack" style={{width:"100%"}}>
          <div style={{textAlign:"center"}}>
            <div className="small text-muted">Opponent: {opponent?.name||"Waiting"}</div>
            <div className="cards-row">
              {[0,1].map(i=><div className={`playing-card ${!opponentHand[i]||opponentHand[i]?.hidden?"back":""}`} key={i}>{opponentHand[i]?.code||"?"}</div>)}
            </div>
          </div>

          <div style={{textAlign:"center"}}>
            <div className="small text-muted">Community cards</div>
            <div className="cards-row">
              {[0,1,2,3,4].map(i=><div className={`playing-card ${!p.community[i]?"back":""}`} key={i}>{p.community[i]?.code||"?"}</div>)}
            </div>
          </div>

          <div className="row">
            <span>Pot: <b>${p.pot}</b></span>
            <span>Bet: <b>${p.currentBet}</b></span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="small text-muted">Your hand {p.handLabels?.[me] ? `— ${p.handLabels[me]}` : ""}</div>
        <div className="cards-row">{myHand.map((c,i)=><div className="playing-card" key={i}>{c.code}</div>)}</div>
      </div>

      <p className="small text-muted">Dealer: {playerName(room,p.dealer)} | Turn: {playerName(room,p.turn)}</p>
      <p>{p.message}</p>

      {p.phase==="finished" ? <div className="stack">
        <p><b>Winner:</b> {winnerName}</p>
        {opponent && p.handLabels?.[opponent.socketId] && <p className="small text-muted">{opponent.name}: {p.handLabels[opponent.socketId]}</p>}
        <button className="button secondary" onClick={()=>socket.emit("poker:newHand",{roomCode:room.code})}>New poker hand</button>
        <button className="button" onClick={()=>completeGame("poker")}>Unlock poker clue</button>
      </div> : <div className="stack">
        <input className="input" type="number" value={raiseAmount} onChange={e=>setRaiseAmount(e.target.value)} placeholder="Raise to amount" />
        <div className="grid-2">
          <button className="button secondary" disabled={!isMyTurn||toCall!==0} onClick={()=>socket.emit("poker:action",{roomCode:room.code,action:"check"})}>Check</button>
          <button className="button secondary" disabled={!isMyTurn||toCall===0} onClick={()=>socket.emit("poker:action",{roomCode:room.code,action:"call"})}>Call ${toCall}</button>
          <button className="button secondary" disabled={!isMyTurn} onClick={()=>socket.emit("poker:action",{roomCode:room.code,action:"raise",amount:Number(raiseAmount)})}>Raise</button>
          <button className="button danger" disabled={!isMyTurn} onClick={()=>socket.emit("poker:action",{roomCode:room.code,action:"fold"})}>Fold</button>
        </div>
        <button className="button danger" disabled={!isMyTurn} onClick={()=>socket.emit("poker:action",{roomCode:room.code,action:"allin"})}>All in</button>
      </div>}
    </div>
  }

  function WarshipsGame(){
    const w=room?.warships;
    if(!w)return <p>Loading warships...</p>;

    const myBoard=w.boards?.[me]||{fleet:[],shotsReceived:[],ready:false};
    const enemy=room.players.find(p=>p.socketId!==me);
    const enemyBoard=enemy?w.boards?.[enemy.socketId]:null;
    const isMyTurn=w.turn===me;

    const myShipCells = myBoard.fleet?.flatMap(s=>s.cells) || [];
    const selectedShip = myBoard.fleet?.find(s=>s.id===myBoard.selectedShipId);
    const totalShips = myBoard.fleet?.length || 3;
    const enemyRemaining = enemyBoard?.fleet
      ? enemyBoard.fleet.filter(ship => !ship.cells.every(cell => enemyBoard.shotsReceived.includes(cell))).length
      : totalShips;
    const myRemaining = myBoard.fleet
      ? myBoard.fleet.filter(ship => !ship.cells.every(cell => myBoard.shotsReceived.includes(cell))).length
      : totalShips;

    if(w.phase==="placing"){
      const opponentReady = enemy ? w.boards?.[enemy.socketId]?.ready : false;
      return <div className="stack">
        <p className="text-muted small">Place your fleet: one size-2 ship, two size-3 ships, and one size-4 ship. Each ship must be straight and connected.</p>
        <p className="small text-muted">You: {myBoard.ready ? "Ready ✅" : "Not ready"} | Opponent: {opponentReady ? "Ready ✅" : "Not ready"}</p>

        <div className="stack">
          {myBoard.fleet?.map(ship => (
            <button
              key={ship.id}
              className={`button ${myBoard.selectedShipId===ship.id ? "" : "secondary"}`}
              disabled={myBoard.ready || ship.locked}
              onClick={()=>socket.emit("warships:selectShip",{roomCode:room.code,shipId:ship.id})}
            >
              {ship.name} — size {ship.size} — {ship.locked ? "Locked ✅" : `${ship.cells.length}/${ship.size}`}
            </button>
          ))}
        </div>

        <p><b>Selected:</b> {selectedShip?.name || "None"}</p>

        <div className="grid-5">{Array.from({length:25},(_,i)=>{
          const shipHere = myBoard.fleet?.find(s=>s.cells.includes(i));
          return <button
            key={i}
            className={`cell ${shipHere?"ship":""}`}
            disabled={myBoard.ready || !selectedShip || selectedShip.locked || selectedShip.cells.length>=selectedShip.size || myShipCells.includes(i)}
            onClick={()=>socket.emit("warships:place",{roomCode:room.code,cell:i})}
          >
            {shipHere ? "🚢" : ""}
          </button>
        })}</div>

        <div className="grid-2">
          <button className="button secondary" disabled={myBoard.ready || !selectedShip || selectedShip.locked} onClick={()=>socket.emit("warships:clearShip",{roomCode:room.code})}>Clear selected</button>
          <button className="button secondary" disabled={myBoard.ready || !selectedShip || selectedShip.locked || selectedShip.cells.length!==selectedShip.size} onClick={()=>socket.emit("warships:lockShip",{roomCode:room.code})}>Lock ship</button>
        </div>

        <button className="button" disabled={myBoard.ready || !myBoard.fleet?.every(s=>s.locked)} onClick={()=>socket.emit("warships:commitPlacement",{roomCode:room.code})}>Commit fleet</button>
        <button className="button secondary" disabled={myBoard.ready} onClick={()=>socket.emit("warships:clearPlacement",{roomCode:room.code})}>Clear full fleet</button>
        <p className="small text-muted">{w.message}</p>
      </div>
    }

    if(w.phase==="finished"){
      return <div className="stack">
        <p className="big-title">{w.winner===me?"You won!":"You lost!"}</p>
        <p>{w.message}</p>
        <button className="button" onClick={()=>completeGame("warships")}>Unlock warships clue</button>
      </div>
    }

    return <div className="stack">
      <p className="small text-muted">Turn: {playerName(room,w.turn)} | {w.message}</p>

      <div className="card">
        <div className="row">
          <span>Enemy fleet</span>
          <b>{enemyRemaining}/{totalShips} ships left</b>
        </div>
        <div className="meter"><div className="meter-inner" style={{width:`${enemyRemaining/totalShips*100}%`}} /></div>
      </div>

      <h3>Enemy waters</h3>
      <div className="grid-5">{Array.from({length:25},(_,i)=>{
        const shot=enemyBoard?.shotsReceived?.includes(i);
        const hit=shot && enemyBoard?.fleet?.some(ship=>ship.cells.includes(i));
        return <button key={i} className={`cell ${shot?(hit?"hit":"miss"):""}`} disabled={!isMyTurn||shot||!enemy} onClick={()=>socket.emit("warships:attack",{roomCode:room.code,targetId:enemy.socketId,cell:i})}>{shot?(hit?"💥":"•"):""}</button>
      })}</div>

      <div className="card">
        <div className="row">
          <span>Your fleet</span>
          <b>{myRemaining}/{totalShips} ships left</b>
        </div>
        <div className="meter"><div className="meter-inner" style={{width:`${myRemaining/totalShips*100}%`}} /></div>
      </div>

      <h3>Your board</h3>
      <div className="grid-5">{Array.from({length:25},(_,i)=>{
        const shot=myBoard.shotsReceived?.includes(i);
        const ship=myBoard.fleet?.some(s=>s.cells.includes(i));
        return <div key={i} className={`cell ${shot&&ship?"hit":ship?"ship":shot?"miss":""}`} style={{display:"grid",placeItems:"center"}}>{shot&&ship?"💥":ship?"🚢":shot?"•":""}</div>
      })}</div>
    </div>
  }

  function QuizGame(){
    const finished=quizIndex>=quizQuestions.length;
    if(finished)return <div className="stack"><p>You got {quizCorrect}/{quizQuestions.length} correct.</p><button className="button" onClick={()=>completeGame("quiz")}>Unlock quiz clue</button></div>
    const q=quizQuestions[quizIndex];
    return <div className="stack"><span className="badge">Question {quizIndex+1}/{quizQuestions.length}</span><h3>{q.question}</h3>{q.options.map((o,i)=><button className="button secondary" key={o} onClick={()=>{if(i===q.correct)setQuizCorrect(v=>v+1);setQuizIndex(v=>v+1)}}>{o}</button>)}</div>
  }

  function GeoGame(){
    const finished=geoIndex>=geoLocations.length;
    const mapsKey=import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if(finished)return <div className="stack"><p>All memory locations completed.</p><button className="button" onClick={()=>completeGame("geo")}>Unlock GeoGuessr clue</button></div>

    const loc=geoLocations[geoIndex];
    const target={lat:loc.lat,lng:loc.lng};
    const correct=geoDistance!==null && geoDistance <= loc.thresholdMeters;
    const score=geoDistance===null ? null : Math.max(0, Math.round(5000 - geoDistance / 2));

    function submitGuess(){
      if(!geoGuess)return;
      setGeoDistance(distanceMeters(geoGuess,target));
    }

    function nextLocation(){
      setGeoIndex(v=>v+1);
      setGeoGuess(null);
      setGeoDistance(null);
      setGeoAnswer("");
    }

    return <div className="stack">
      <span className="badge">Location {geoIndex+1}/{geoLocations.length}</span>
      <h3>{loc.question}</h3>
      <div className="card"><p className="text-muted">{loc.hint}</p></div>

      {mapsKey ? (
        <LoadScript googleMapsApiKey={mapsKey}>
          <GoogleMap
            mapContainerClassName="map-box"
            center={geoDistance!==null ? target : { lat: 48.5, lng: 12.5 }}
            zoom={geoDistance!==null ? 13 : 4}
            onClick={(e)=>{
              if(geoDistance!==null)return;
              setGeoGuess({lat:e.latLng.lat(),lng:e.latLng.lng()});
              setGeoDistance(null);
            }}
            options={{
              streetViewControl:false,
              mapTypeControl:false,
              fullscreenControl:false,
            }}
          >
            {geoGuess && <Marker position={geoGuess} label="Guess"/>}
            {geoDistance!==null && <Marker position={target} label="Real"/>}
          </GoogleMap>
        </LoadScript>
      ) : (
        <div className="card">
          <p className="warn"><b>Google Maps API key missing.</b></p>
          <p className="text-muted small">Create <b>client/.env</b> and add VITE_GOOGLE_MAPS_API_KEY. Then restart the frontend.</p>
        </div>
      )}

      {geoGuess && geoDistance===null && <p className="small text-muted">Pin selected. Submit to check distance.</p>}
      {geoDistance!==null && <div className="card">
        <p><b>Distance:</b> {geoDistance} meters</p>
        <p><b>Score:</b> {score}/5000</p>
        <p className={correct ? "" : "warn"}>{correct ? "Correct! Memory unlocked." : `Not close enough. Try within ${loc.thresholdMeters}m.`}</p>
        {correct && <p className="text-muted">{loc.memoryText}</p>}
      </div>}

      <div className="grid-2">
        <button className="button secondary" disabled={!geoGuess||geoDistance!==null} onClick={submitGuess}>Check guess</button>
        <button className="button" disabled={!correct} onClick={nextLocation}>Next</button>
      </div>
    </div>
  }

  function renderGame(){
    if(game?.id==="poker")return <PokerGame/>;
    if(game?.id==="warships")return <WarshipsGame/>;
    if(game?.id==="quiz")return <QuizGame/>;
    if(game?.id==="geo")return <GeoGame/>;
    return null;
  }




  function SplashScreen(){
    return <motion.div
      className="splash-screen"
      initial={{opacity:1}}
      exit={{opacity:0,scale:1.03}}
      transition={{duration:.7}}
    >
      <motion.div
        className="splash-orb"
        animate={{scale:[1,1.08,1],rotate:[0,4,-4,0]}}
        transition={{duration:2.4,repeat:Infinity}}
      >
        🫐
      </motion.div>
      <motion.h1
        initial={{opacity:0,y:18}}
        animate={{opacity:1,y:0}}
        transition={{delay:.25}}
      >
        Buba Protocol
      </motion.h1>
      <motion.div
        className="loading-lines"
        initial={{opacity:0}}
        animate={{opacity:1}}
        transition={{delay:.55}}
      >
        <p>Loading memories...</p>
        <p>Preparing games...</p>
        <p>Decrypting final question...</p>
      </motion.div>
      <motion.button
        className="button splash-button"
        initial={{opacity:0,y:18}}
        animate={{opacity:1,y:0}}
        transition={{delay:1.05}}
        onClick={()=>setShowSplash(false)}
      >
        Enter
      </motion.button>
    </motion.div>
  }

  function ClueUnlockedOverlay(){
    if(!clueOverlay)return null;

    return <motion.div
      className="clue-overlay"
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
    >
      <motion.div
        className="clue-orb"
        initial={{scale:.4,rotate:-12,opacity:0}}
        animate={{scale:1,rotate:0,opacity:1}}
        transition={{type:"spring",duration:.8}}
      >
        <span>🫐</span>
      </motion.div>

      <motion.p
        className="clue-kicker"
        initial={{opacity:0,y:16}}
        animate={{opacity:1,y:0}}
        transition={{delay:.35}}
      >
        Puzzle part unlocked
      </motion.p>

      <motion.h2
        className="clue-overlay-title"
        initial={{opacity:0,y:18,filter:"blur(8px)"}}
        animate={{opacity:1,y:0,filter:"blur(0px)"}}
        transition={{delay:.65,duration:.8}}
      >
        {clueOverlay.clueText}
      </motion.h2>

      <motion.div
        className="mini-puzzle-piece"
        initial={{opacity:0,scale:.6,y:20}}
        animate={{opacity:1,scale:1,y:0}}
        transition={{delay:1.2,type:"spring"}}
      >
        Част от пъзела е завършена ✓
      </motion.div>

      <motion.button
        className="button clue-continue"
        initial={{opacity:0,y:20}}
        animate={{opacity:1,y:0}}
        transition={{delay:1.8}}
        onClick={()=>setClueOverlay(null)}
      >
        {clueOverlay.id === "geo" ? "Към финалния въпрос" : "Продължи"}
      </motion.button>
    </motion.div>
  }


  function PhotoRevealBackground(){
    return <div className="photo-reveal-bg">
      {revealPhotos.map((photo,index)=>(
        <motion.div
          key={photo}
          className="photo-layer"
          initial={{opacity:0,scale:1}}
          animate={{opacity:[0,.48,.48,0],scale:[1,1.06,1.1,1.13]}}
          transition={{
            duration:24,
            delay:index*4,
            repeat:Infinity,
            ease:"easeInOut"
          }}
          style={{backgroundImage:`url(${photo})`}}
        />
      ))}
      <div className="photo-dark-overlay"/>
    </div>
  }

  function FloatingParticles(){
    const particles = Array.from({length:34},(_,i)=>({
      id:i,
      left:(i*29)%100,
      delay:(i%9)*0.45,
      duration:7+(i%6),
      type:i%3===0 ? "blueberry" : "heart",
      size:18+(i%5)*4,
    }));

    return <div className="particles">
      {particles.map(p=>(
        <span
          key={p.id}
          className={`particle ${p.type}`}
          style={{
            left:`${p.left}%`,
            animationDelay:`${p.delay}s`,
            animationDuration:`${p.duration}s`,
            fontSize:`${p.size}px`
          }}
        >
          {p.type==="blueberry" ? "🫐" : "♥"}
        </span>
      ))}
    </div>
  }

  function FinalReveal(){
    return <motion.div key="final" initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="final-screen">
      <PhotoRevealBackground />
      <audio id="runway-audio" src="/runway.mp3" preload="auto" loop />
      <FloatingParticles />

      {!revealStarted ? (
        <div className="card final-card stack" style={{textAlign:"center"}}>
          <Heart size={70} fill="#c084fc" color="#c084fc"/>
          <h2 className="final-title">Последна изненада</h2>
          <p className="text-muted">Натисни, за да отключиш финалния въпрос.</p>
          <button className="button" onClick={()=>{
            const audio=document.getElementById("runway-audio");
            if(audio){
              audio.volume=0;
              audio.play().catch(()=>{});
              let v=0;
              const fade=setInterval(()=>{
                v=Math.min(0.65,v+0.05);
                audio.volume=v;
                if(v>=0.65)clearInterval(fade);
              },180);
            }
            setRevealStarted(true);
          }}>Start final reveal</button>
        </div>
      ) : (
        <div className="final-content">
          <div className="clue-stack">
            {finalRevealSentences.map((clue,index)=>(
              <motion.p
                key={clue}
                className="final-clue"
                initial={{opacity:0,y:18,filter:"blur(8px)"}}
                animate={{opacity:1,y:0,filter:"blur(0px)"}}
                transition={{delay:index*2.1,duration:1.1}}
              >
                {clue}
              </motion.p>
            ))}
          </div>

          <motion.div
            className="final-question-card"
            initial={{opacity:0,scale:.86,y:24}}
            animate={{opacity:1,scale:1,y:0}}
            transition={{delay:finalRevealSentences.length*2.1+0.8,duration:1.2,type:"spring"}}
          >
            <Heart size={54} fill="#a855f7" color="#d8b4fe"/>
            <h2 className="final-title">{finalQuestion}</h2>
            {accepted ? (
              <motion.div
                className="accepted-box"
                initial={{opacity:0,scale:.8,y:12}}
                animate={{opacity:1,scale:1,y:0}}
                transition={{type:"spring"}}
              >
                <div className="accepted-hearts">💜 🫐 💜</div>
                <p>Буба protocol completed.</p>
              </motion.div>
            ) : (
              <div className="grid-2">
                <button className="button" onClick={()=>setAccepted(true)}>ДА</button>
                <button className="button secondary" onClick={()=>setAccepted(true)}>пак ДА</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  }

  return <main className="app-shell"><section className="phone">
    <AnimatePresence>{showSplash&&<SplashScreen />}</AnimatePresence>
    <AnimatePresence>{clueOverlay&&<ClueUnlockedOverlay />}</AnimatePresence>
    <header className="header"><div><div className="kicker">PromQuest</div><h1 className="title">Private Multiplayer Invite</h1></div><Sparkles color="#fbcfe8"/></header>
    <AnimatePresence mode="wait">
      {screen==="intro"&&<motion.div key="intro" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="center"><div className="card stack"><Heart size={52} fill="#fbcfe8" color="#fbcfe8"/><h2 className="big-title">A little buba adventure.</h2><p className="text-muted">Create a private room, join from both phones, and unlock the final question together.</p><button className="button" onClick={()=>setScreen("room")}>Start</button></div></motion.div>}
      {screen==="room"&&<motion.div key="room" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="center"><div className="card stack"><Users color="#fbcfe8" size={44}/><h2 className="big-title">Enter the private room</h2>{roomStatus&&<p className="small text-muted">{roomStatus}</p>}<input className="input" placeholder="Your name" value={playerNameInput} onChange={e=>setPlayerNameInput(e.target.value)}/><button className="button" onClick={createRoom}>Create buba room</button><div style={{height:1,background:"rgba(255,255,255,.15)",margin:"8px 0"}}/><input className="input" placeholder="Room code" value={roomCode} onChange={e=>setRoomCode(e.target.value)}/><button className="button secondary" onClick={joinRoom} disabled={!roomCode.trim()}>Join room</button></div></motion.div>}
      {screen==="lobby"&&<motion.div key="lobby" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="center"><div className="card stack"><h2 className="big-title">Room ready</h2><p className="text-muted">Send her this room code:</p><div className="card" style={{textAlign:"center",fontSize:32,fontWeight:950,letterSpacing:4}}>{room?.code || roomCode}</div><button className="button secondary" onClick={()=>navigator.clipboard?.writeText(room?.code || roomCode)}><Copy size={16}/> Copy code</button><div><p className="small text-muted">Players:</p>{room?.players?.map(p=><p key={p.socketId}>• {p.name}{p.socketId===me?" (you)":""}</p>) || <p className="small text-muted">Waiting for room update...</p>}</div><button className="button" onClick={()=>setScreen("map")}>Start the quest</button></div></motion.div>}
      {screen==="map"&&room&&<motion.div key="map" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span className="small text-muted">Room {room.code}</span><span className="small text-muted">{unlockedIds.length}/{games.length}</span></div><div className="progress"><div className="progress-inner" style={{width:`${progress*100}%`}}/></div><div className="grid-2" style={{marginBottom:18}}>{games.map(g=><div key={g.id} className={`reward-piece ${unlockedIds.includes(g.id)?"unlocked":""}`}>{unlockedIds.includes(g.id)?g.clueText:"?"}</div>)}</div><div className="stack">{games.map(g=>{const done=unlockedIds.includes(g.id);return <button key={g.id} className={`game-card ${g.themeClass}`} onClick={()=>startGame(g.id)}><div className="game-icon">{done?<CheckCircle2/>:<Gamepad2/>}</div><div><strong>{g.title}</strong><div className="small text-muted">{done?"Reward unlocked":g.subtitle}</div></div></button>})}</div>{unlockedIds.length===games.length&&<div style={{marginTop:18}}><button className="button" onClick={()=>setScreen("final")}>Open final reveal</button></div>}<button className="button secondary" style={{marginTop:12}} onClick={()=>socket.emit("room:reset",{roomCode:room.code})}>Reset room progress</button></motion.div>}
      {screen==="game"&&game&&room&&<motion.div key="game" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}><div className={`card stack ${game.themeClass}`}><h2 className="big-title">{game.title}</h2><p className="text-muted">{game.subtitle}</p><p className="small text-muted">Room: {room.code} | Player: {currentPlayer?.name||"Unknown"}</p>{renderGame()}<button className="button secondary" onClick={()=>setScreen("map")}>Back</button></div></motion.div>}
      {screen==="final"&&<FinalReveal />}
    </AnimatePresence>
  </section></main>
}
