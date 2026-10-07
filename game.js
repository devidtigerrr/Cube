const socket = io();
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const form = document.getElementById("joinForm");
const nameInput = document.getElementById("name");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const leadersEl = document.getElementById("leaders");
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
const exitBtn = document.getElementById("exit");

let me = null, world = 5000, state = {players:[],bots:[],foods:[]};
let input = {x:0,y:0};
let mouse = {x:0,y:0,active:false};
let cam = {x:2500,y:2500};
let dpr=1;

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize",resize); resize();

form.addEventListener("submit",e=>{
  e.preventDefault();
  const name=nameInput.value.trim().slice(0,18)||"Játékos";
  socket.emit("join",name);
  menu.hidden=true; game.hidden=false;
});

socket.on("init", data=>{ me=data.id; world=data.world; });
socket.on("state", s=>{
  state=s;
  const p=s.players.find(x=>x.id===me);
  if(p){ scoreEl.textContent=Math.round(p.size*p.size/8); cam.x=p.x; cam.y=p.y; }
  const all=[...s.players,...s.bots].sort((a,b)=>b.size-a.size).slice(0,7);
  leadersEl.innerHTML=all.map((p,i)=>`<div>${i+1}. ${escapeHtml(p.name)} <b>${Math.round(p.size*p.size/8)}</b></div>`).join("");
});
socket.on("respawn",()=>{});

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function sendInput(){
  socket.emit("input",input);
}
setInterval(sendInput,50);

function worldToScreen(x,y){
  return {x:x-cam.x+innerWidth/2,y:y-cam.y+innerHeight/2};
}
function drawGrid(){
  const gap=100;
  const startX=-(cam.x%gap)+innerWidth/2;
  const startY=-(cam.y%gap)+innerHeight/2;
  ctx.strokeStyle="#ffffff08"; ctx.lineWidth=1;
  for(let x=startX;x<innerWidth;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,innerHeight);ctx.stroke();}
  for(let y=startY;y<innerHeight;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(innerWidth,y);ctx.stroke();}
  const tl=worldToScreen(0,0), br=worldToScreen(world,world);
  ctx.strokeStyle="#ffffff22"; ctx.lineWidth=4; ctx.strokeRect(tl.x,tl.y,world,world);
}
function drawFood(f){
  const p=worldToScreen(f.x,f.y), s=f.size;
  if(p.x<-20||p.x>innerWidth+20||p.y<-20||p.y>innerHeight+20)return;
  ctx.fillStyle="#e9edf5"; ctx.fillRect(p.x-s/2,p.y-s/2,s,s);
}
function drawEntity(p){
  const q=worldToScreen(p.x,p.y), s=p.size;
  if(q.x<-s||q.x>innerWidth+s||q.y<-s||q.y>innerHeight+s)return;
  ctx.fillStyle=p.color; ctx.fillRect(q.x-s/2,q.y-s/2,s,s);
  ctx.strokeStyle="#0005";ctx.lineWidth=2;ctx.strokeRect(q.x-s/2,q.y-s/2,s,s);
  ctx.textAlign="center";ctx.font=`700 ${Math.max(11,Math.min(18,s*.38))}px system-ui`;
  ctx.fillStyle="#fff";ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(p.name,q.x,q.y+5);ctx.shadowBlur=0;
}
function render(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  drawGrid();
  for(const f of state.foods)drawFood(f);
  for(const b of state.bots)drawEntity(b);
  for(const p of state.players)drawEntity(p);
  requestAnimationFrame(render);
}
render();

function setInputFromPoint(clientX,clientY){
  const r=joystick.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  let dx=clientX-cx,dy=clientY-cy,len=Math.hypot(dx,dy),max=39;
  if(len>max){dx=dx/len*max;dy=dy/len*max}
  input.x=dx/max;input.y=dy/max;
  stick.style.transform=`translate(${dx}px,${dy}px)`;
}
joystick.addEventListener("pointerdown",e=>{joystick.setPointerCapture(e.pointerId);setInputFromPoint(e.clientX,e.clientY)});
joystick.addEventListener("pointermove",e=>{if(e.buttons)setInputFromPoint(e.clientX,e.clientY)});
joystick.addEventListener("pointerup",()=>{input={x:0,y:0};stick.style.transform="translate(0,0)"});
joystick.addEventListener("pointercancel",()=>{input={x:0,y:0};stick.style.transform="translate(0,0)"});

addEventListener("keydown",e=>{
  if(e.key==="w"||e.key==="ArrowUp")input.y=-1;
  if(e.key==="s"||e.key==="ArrowDown")input.y=1;
  if(e.key==="a"||e.key==="ArrowLeft")input.x=-1;
  if(e.key==="d"||e.key==="ArrowRight")input.x=1;
});
addEventListener("keyup",e=>{
  if(["w","s","ArrowUp","ArrowDown"].includes(e.key))input.y=0;
  if(["a","d","ArrowLeft","ArrowRight"].includes(e.key))input.x=0;
});
canvas.addEventListener("pointermove",e=>{
  if(e.pointerType==="mouse"){mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true}
});
canvas.addEventListener("pointerleave",()=>mouse.active=false);

exitBtn.addEventListener("click",()=>location.reload());
