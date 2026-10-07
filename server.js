const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const WORLD = 5000;
const TICK = 30;
const MAX_FOOD = 900;
const MAX_BOTS = 20;

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const players = new Map();
const foods = new Map();
const bots = new Map();

function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

function addFood() {
  if (foods.size >= MAX_FOOD) return;
  const id = "f" + Math.random().toString(36).slice(2);
  foods.set(id, { id, x: rand(50,WORLD-50), y: rand(50,WORLD-50), size: rand(7,12) });
}
while (foods.size < MAX_FOOD) addFood();

for (let i=0;i<MAX_BOTS;i++) {
  const id = "bot"+i;
  bots.set(id, {
    id, name: "Bot " + (i+1), x: rand(200,WORLD-200), y: rand(200,WORLD-200),
    size: rand(18,34), color: `hsl(${Math.floor(rand(0,360))} 75% 58%)`,
    tx: rand(0,WORLD), ty: rand(0,WORLD), change: 0
  });
}

function publicPlayers() {
  return [...players.values()].map(p => ({
    id:p.id,name:p.name,x:p.x,y:p.y,size:p.size,color:p.color
  }));
}
function publicBots() {
  return [...bots.values()].map(b => ({
    id:b.id,name:b.name,x:b.x,y:b.y,size:b.size,color:b.color
  }));
}

io.on("connection", socket => {
  socket.on("join", rawName => {
    let name = String(rawName || "Játékos").trim().slice(0,18) || "Játékos";
    const p = {
      id: socket.id, name, x: rand(500,WORLD-500), y: rand(500,WORLD-500),
      size: 28, color: `hsl(${Math.floor(rand(0,360))} 75% 58%)`,
      dx:0, dy:0, score:0
    };
    players.set(socket.id,p);
    socket.emit("init", { id: socket.id, world: WORLD });
  });

  socket.on("input", data => {
    const p = players.get(socket.id);
    if (!p) return;
    const x = Number(data?.x), y = Number(data?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const len = Math.hypot(x,y) || 1;
    p.dx = clamp(x/len,-1,1);
    p.dy = clamp(y/len,-1,1);
  });

  socket.on("disconnect", () => players.delete(socket.id));
});

function eatFood(p) {
  for (const [id,f] of foods) {
    const reach = p.size/2 + f.size;
    if (Math.hypot(p.x-f.x,p.y-f.y) < reach) {
      foods.delete(id);
      p.size = Math.min(240, p.size + Math.max(0.35, f.size*0.035));
      p.score += Math.round(f.size);
      addFood();
    }
  }
}

function canEat(big, small) {
  return big.size > small.size * 1.12;
}

function handlePlayerCollisions() {
  const ps = [...players.values()];
  for (let i=0;i<ps.length;i++) for (let j=i+1;j<ps.length;j++) {
    const a=ps[i], b=ps[j];
    if (!canEat(a,b) && !canEat(b,a)) continue;
    const d=dist(a,b);
    if (d < a.size*0.52 + b.size*0.52) {
      const winner = canEat(a,b) ? a : b;
      const loser = winner===a ? b : a;
      winner.size = Math.min(260, Math.sqrt(winner.size*winner.size + loser.size*loser.size*0.82));
      winner.score += Math.round(loser.size*2);
      loser.x=rand(300,WORLD-300); loser.y=rand(300,WORLD-300);
      loser.size=28; loser.score=0;
      io.to(loser.id).emit("respawn", { score:0 });
    }
  }
}

function handleBotCollisions() {
  for (const p of players.values()) {
    for (const b of bots.values()) {
      if (canEat(p,b) && dist(p,b) < p.size*.55+b.size*.55) {
        p.size = Math.min(260, Math.sqrt(p.size*p.size+b.size*b.size*.82));
        p.score += Math.round(b.size*2);
        b.x=rand(200,WORLD-200); b.y=rand(200,WORLD-200); b.size=rand(18,34);
      } else if (canEat(b,p) && dist(p,b) < p.size*.55+b.size*.55) {
        b.size = Math.min(260, Math.sqrt(b.size*b.size+p.size*p.size*.75));
        p.x=rand(300,WORLD-300); p.y=rand(300,WORLD-300); p.size=28; p.score=0;
        io.to(p.id).emit("respawn", {score:0});
      }
    }
  }
}

setInterval(() => {
  for (const p of players.values()) {
    const speed = Math.max(2.0, 8.0 - p.size/45);
    p.x = clamp(p.x + p.dx*speed, p.size/2, WORLD-p.size/2);
    p.y = clamp(p.y + p.dy*speed, p.size/2, WORLD-p.size/2);
    eatFood(p);
  }

  for (const b of bots.values()) {
    b.change--;
    if (b.change <= 0) {
      b.tx=rand(50,WORLD-50); b.ty=rand(50,WORLD-50); b.change=Math.floor(rand(40,160));
    }
    let vx=b.tx-b.x, vy=b.ty-b.y, len=Math.hypot(vx,vy)||1;
    const speed=Math.max(1.5,6-b.size/45);
    b.x=clamp(b.x+vx/len*speed,b.size/2,WORLD-b.size/2);
    b.y=clamp(b.y+vy/len*speed,b.size/2,WORLD-b.size/2);
  }

  handlePlayerCollisions();
  handleBotCollisions();

  io.emit("state", {
    players: publicPlayers(),
    bots: publicBots(),
    foods: [...foods.values()]
  });
}, TICK);

server.listen(PORT, () => console.log(`Kocka.io fut: http://localhost:${PORT}`));
