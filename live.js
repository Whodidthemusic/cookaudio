/* COOK live sections. Draws the Sequencer, Piano Roll, Arrangement and Mixer panels on the page.
   Each panel only runs while it is on screen. Sound stays off until a Sound button is pressed. */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const now=()=>performance.now()/1000;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function fit(cv){const d=Math.min(devicePixelRatio||1,2),w=cv.clientWidth,h=cv.clientHeight;
  if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d)}
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return{c,w,h}}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- visibility + idle ("take over") ---------- */
const vis={};
const io=new IntersectionObserver(es=>es.forEach(e=>vis[e.target.id]=e.isIntersecting),{threshold:.15});
$$('.live').forEach(el=>io.observe(el));
const idleAt={};                       // section id -> time the demo may resume
function touch(id,secs=10){idleAt[id]=now()+secs;const p=$('#'+id+' [data-pill]');if(p){p.textContent='You';p.classList.add('you')}}
function idle(id){const ok=!REDUCED&&now()>(idleAt[id]||0);
  if(ok){const p=$('#'+id+' [data-pill]');if(p&&p.classList.contains('you')){p.textContent='Live';p.classList.remove('you')}}return ok}

/* ---------- sound (off until a Sound button is pressed) ---------- */
let AC=null,master=null,soundOn=false,owner=null;const ch={};
const CH=['kick','snare','hat','bass','keys','synth'];
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=.8;const comp=AC.createDynamicsCompressor();master.connect(comp);comp.connect(AC.destination);
  CH.forEach(n=>{ch[n]=AC.createGain();ch[n].gain.value=.8;ch[n].connect(master)})}catch(e){AC=null}}
function setSound(on,who){if(on){initAudio();if(!AC)return;AC.resume&&AC.resume().catch(()=>{})}
  soundOn=on&&!!AC;owner=soundOn?who:null;
  $$('.snd').forEach(b=>{const a=soundOn&&b.dataset.snd===owner;b.classList.toggle('on',a);b.textContent=a?'Sound on':'Sound'})}
$$('.snd').forEach(b=>b.addEventListener('click',()=>{const w=b.dataset.snd;setSound(!(soundOn&&owner===w),w)}));
$$('.live').forEach(el=>el.addEventListener('pointerdown',()=>{if(soundOn&&owner!==el.dataset.owner)setSound(true,el.dataset.owner)}));
const can=who=>soundOn&&owner===who&&AC;
function env(g,t,a,d,peak){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d)}
function noise(dur){const b=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=AC.createBufferSource();s.buffer=b;return s}
const drum={
  kick(){const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);env(g,t,.002,.28,1);o.connect(g).connect(ch.kick);o.start(t);o.stop(t+.35)},
  snare(){const t=AC.currentTime,n=noise(.2),f=AC.createBiquadFilter(),g=AC.createGain();f.type='highpass';f.frequency.value=1400;env(g,t,.001,.16,.7);n.connect(f).connect(g).connect(ch.snare);n.start(t);
    const o=AC.createOscillator(),g2=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(140,t+.08);env(g2,t,.001,.1,.5);o.connect(g2).connect(ch.snare);o.start(t);o.stop(t+.15)},
  hat(){const t=AC.currentTime,n=noise(.06),f=AC.createBiquadFilter(),g=AC.createGain();f.type='highpass';f.frequency.value=7500;env(g,t,.001,.045,.35);n.connect(f).connect(g).connect(ch.hat);n.start(t)},
  bass(){const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(58,t);o.frequency.exponentialRampToValueAtTime(49,t+.3);env(g,t,.004,.5,.9);o.connect(g).connect(ch.bass);o.start(t);o.stop(t+.6)}
};
const hz=p=>440*Math.pow(2,(p-69)/12);
function tone(p,dur,chan,o={}){const t=AC.currentTime,os=AC.createOscillator(),os2=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();
  os.type=os2.type=o.type||'sawtooth';os.frequency.value=hz(p);os2.frequency.value=hz(p);os2.detune.value=(o.detune??.2)*40;
  f.type='lowpass';f.frequency.value=200+Math.pow(o.cut??.5,2)*9000;f.Q.value=.5+(o.res??.2)*14;
  const a=.004+(o.atk??0)*.4,r=.06+(o.rel??.3)*1.2;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+a);g.gain.setValueAtTime(.22,t+a+dur);g.gain.exponentialRampToValueAtTime(.0001,t+a+dur+r);
  (o.glides||[]).forEach(G=>[os,os2].forEach(x=>{x.frequency.setValueAtTime(hz(G.from),Math.max(t,t+G.at-G.reach));x.frequency.exponentialRampToValueAtTime(hz(G.to),t+G.at+G.reach)}));
  os.connect(f);os2.connect(f);f.connect(g).connect(ch[chan]);os.start(t);os2.start(t);os.stop(t+a+dur+r+.05);os2.stop(t+a+dur+r+.05)}

/* ---------- themes ---------- */
const THEMES=[
 {name:'COOK blue',acc:'#3f8cff',pal:['#3fb68b','#e2b84a','#4aa8d8','#a678ff','#e39a4a','#4fd08a']},
 {name:'Pink',acc:'#ff4fa3',pal:['#ff7ab8','#ffb86b','#c77dff','#ff5c7a','#f9d56e','#ff9de2']},
 {name:'Green',acc:'#35e0a1',pal:['#35e0a1','#b6e35a','#4ad8c8','#7be07b','#e2d44a','#58c9ff']},
 {name:'Orange',acc:'#ff9a3c',pal:['#ff9a3c','#ffd166','#ff6b4a','#e2b84a','#ff8fa3','#f4a261']},
 {name:'Purple',acc:'#a678ff',pal:['#a678ff','#6ea8ff','#e07bff','#7be0d0','#ff8ad8','#8f9bff']}];
let theme=0;
function setTheme(i){theme=(i+THEMES.length)%THEMES.length;document.documentElement.style.setProperty('--acc',THEMES[theme].acc);
  $$('.sw').forEach((b,k)=>{b.classList.toggle('on',k===theme);b.setAttribute('aria-pressed',k===theme)})}
THEMES.forEach((t,i)=>{const b=document.createElement('button');b.className='sw';b.style.background=t.acc;b.title=t.name;b.setAttribute('aria-label',t.name+' theme');
  b.onclick=()=>{setTheme(i);touch('hero',14)};$('#swatches').appendChild(b)});

/* ---------- HERO: arrangement ---------- */
const hero=(()=>{
  const cv=$('#heroCv');const BARS=16,LOOP=15,LANE=46,RUL=20;let tracks=[],uid=1,rec=null,fired={},lastLoop=-1,takes=0,hits=[];
  const DEF=[['Pattern 1',[[2,4],[6,4],[12,4]],true],['Guitar loop',[[0,12]],false],['808 + kick',[[0,3.5],[4,6],[10.5,5.5]],false],
             ['Keys',[[0,8],[10,6]],false],['Vocal',[[4,4],[9,7]],false]];
  function mk(name,clips,pat,col){return{id:uid++,name,col,pat,h:0,dead:false,clips:clips.map(c=>({s:c[0],l:c[1],seed:Math.random()*1e9|0}))}}
  function reset(){tracks=DEF.map((d,i)=>mk(d[0],d[1],d[2],i));tracks.forEach(t=>t.h=1);rec=null}
  function add(name){if(tracks.filter(t=>!t.dead).length>=6)return null;const t=mk(name,[],false,tracks.length%6);tracks.push(t);return t}
  function startRec(pos){let live=tracks.filter(t=>!t.dead);if(live.length>=6)live[live.length-1].dead=true;const t=add('Take '+(++takes));if(!t)return;const c={s:pos,l:0,seed:Math.random()*1e9|0,rec:true};t.clips.push(c);t.rec=true;rec={t,c};$('#recBtn').classList.add('on');$('#recBtn').textContent='■ Stop'}
  function stopRec(){if(rec){rec.t.rec=false;rec.c.rec=false;if(rec.c.l<.3)rec.t.dead=true}rec=null;$('#recBtn').classList.remove('on');$('#recBtn').textContent='● Record'}
  function wave(c,x,y,w,h,seed,col,upto){const r=rng(seed);c.fillStyle=col;const n=Math.max(4,Math.floor(w/3));let e=.5;
    for(let i=0;i<n;i++){e=clamp(e+(r()-.5)*.5,.12,1);const beat=(i%8<2)?1:.6;const a=e*beat*(h/2-3);const px=x+i*3;if(px>x+upto)break;c.fillRect(px,y+h/2-a,2,a*2)}}
  let pos=0;
  reset();
  $('#recBtn').onclick=()=>{touch('hero',14);rec?stopRec():startRec(pos)};
  $('#addBtn').onclick=()=>{touch('hero',14);add('Audio '+(tracks.length+1))};
  $('#resetBtn').onclick=()=>{stopRec();reset();takes=0;touch('hero',3)};
  /* J jabs in, as in COOK: with the mouse over the arrangement, J punches a take in at the playhead and J again punches out */
  let over=false;const box=$('#hero');box.addEventListener('pointerenter',()=>{over=true});box.addEventListener('pointerleave',()=>{over=false});
  document.addEventListener('keydown',e=>{if(!over||e.repeat||e.ctrlKey||e.metaKey||e.altKey||(e.key!=='j'&&e.key!=='J'))return;e.preventDefault();touch('hero',14);rec?stopRec():startRec(pos)});
  cv.addEventListener('pointerdown',e=>{const b=cv.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
    for(const h of hits)if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){h.t.dead=true;if(rec&&rec.t===h.t)stopRec();touch('hero',14);return}});
  function frame(t,dt){
    const {c,w,h}=fit(cv);const hw=Math.min(150,w*.26),tw=w-hw,acc=THEMES[theme].acc,pal=THEMES[theme].pal;
    const loop=Math.floor(t/LOOP);pos=REDUCED?5:(t%LOOP)/LOOP*BARS;
    if(loop!==lastLoop){lastLoop=loop;fired={};if(rec)stopRec();if(idle('hero')&&loop>0){reset()}}
    if(idle('hero')){
      if(pos>2&&!fired.th){fired.th=1;setTheme(theme+1)}
      if(pos>4&&!fired.r){fired.r=1;startRec(pos)}
      if(pos>9.5&&!fired.rs){fired.rs=1;stopRec()}
      if(pos>11.5&&!fired.rm){fired.rm=1;const live=tracks.filter(x=>!x.dead);if(live.length>3)live[1].dead=true}
    }
    if(rec){rec.c.l=Math.max(0,pos-rec.c.s);if(pos<rec.c.s)stopRec()}
    tracks.forEach(k=>{k.h=clamp(k.h+(k.dead?-1:1)*dt*4,0,1)});tracks=tracks.filter(k=>!(k.dead&&k.h<=0));
    c.clearRect(0,0,w,h);c.fillStyle='#0b0f14';c.fillRect(0,0,w,h);
    // ruler + grid
    c.fillStyle='#0e141b';c.fillRect(hw,0,tw,RUL);c.font='10px ui-monospace,Consolas,monospace';c.textBaseline='middle';
    for(let b=0;b<=BARS;b++){const x=hw+b/BARS*tw;c.fillStyle=b%4?'#17202b':'#243244';c.fillRect(x,0,1,h);if(b<BARS){c.fillStyle='#5f6d7d';c.fillText(b+1,x+4,RUL/2)}}
    let y=RUL;hits=[];
    tracks.forEach(k=>{const lh=LANE*k.h;if(lh<1){return}const col=pal[k.col%pal.length];
      c.save();c.beginPath();c.rect(0,y,w,lh);c.clip();c.globalAlpha=k.h;
      c.fillStyle='#131a23';c.fillRect(0,y,hw-2,LANE-2);c.fillStyle=col;c.fillRect(0,y,4,LANE-2);
      c.fillStyle='#cfd8e3';c.font='600 12px Inter,Arial,sans-serif';c.fillText(k.name,12,y+15,hw-44);
      c.fillStyle='#1d2733';c.fillRect(12,y+25,16,13);c.fillRect(32,y+25,16,13);c.fillStyle='#8a97a6';c.font='700 9px Inter,Arial';c.fillText('M',16,y+32);c.fillText('S',37,y+32);
      c.beginPath();c.arc(62,y+31.5,5,0,7);c.fillStyle=k.rec?(Math.sin(t*10)>0?'#ff3b4e':'#7a1d27'):'#2a3542';c.fill();
      c.fillStyle='#8a97a6';c.font='700 14px Inter,Arial';c.fillText('×',hw-22,y+15);hits.push({x:hw-32,y:y,w:30,h:28,t:k});
      c.fillStyle='#0d1219';c.fillRect(hw,y,tw,LANE-2);
      k.clips.forEach(cl=>{const cc=cl.rec?'#ff3b4e':col,x=hw+cl.s/BARS*tw,cw=Math.max(2,cl.l/BARS*tw);
        c.globalAlpha=k.h*.26;c.fillStyle=cc;c.fillRect(x,y+1,cw,LANE-4);c.globalAlpha=k.h;c.fillRect(x,y+1,cw,3);
        if(k.pat){const r=rng(cl.seed);c.fillStyle=cc;for(let i=0;i<cw/7;i++){c.fillRect(x+3+i*7,y+9+Math.floor(r()*5)*6,5,3)}}
        else wave(c,x+2,y+5,cw-4,LANE-10,cl.seed,cc,cw-4)});
      c.restore();y+=lh});
    // playhead with trailing glow
    const px=hw+pos/BARS*tw,g=c.createLinearGradient(px-70,0,px,0);g.addColorStop(0,'transparent');g.addColorStop(1,acc+'55');
    c.save();c.beginPath();c.rect(hw,0,tw,h);c.clip();c.fillStyle=g;c.fillRect(px-70,0,70,h);c.fillStyle=acc;c.shadowColor=acc;c.shadowBlur=12;c.fillRect(px-1,0,2,h);c.restore();
    c.fillStyle='#1f2b3a';c.fillRect(hw-2,0,2,h);
  }
  return{frame}})();

/* ---------- beat clock + SEQUENCER ---------- */
let bpm=141;const lvl={kick:0,snare:0,hat:0,bass:0,keys:0,synth:0};
const vol={kick:.72,snare:.72,hat:.72,bass:.72};
const seq=(()=>{
  const ROWS=[{n:'Kick',sub:'COOK KICK 01',k:'kick'},{n:'Snare',sub:'COOK SNARE 03',k:'snare'},{n:'Hat',sub:'COOK HAT 02',k:'hat'},{n:'808',sub:'COOK 808 LONG',k:'bass'}];
  const PATS=[['x.....x...x.....','....x.......x...','x.x.x.xxx.x.x.x.','x.........x.....'],
              ['x..x..x...x..x..','....x.......x..x','xxx.xx.xxxx.xxxx','x..x......x.....'],
              ['x.......x.x.....','....x..x....x...','x.x.xxx.x.x.x.xx','x.......x.....x.']];
  let pi=0,step=-1,next=0,hold=0;const el=$('#seqRows');
  const KEYS='<svg viewBox="0 0 78 13" aria-hidden="true">'+Array.from({length:10},(_,i)=>'<rect x="'+(i*7.8+.4)+'" y=".5" width="7" height="12" rx="1" fill="'+(i?'#e4e7ea':'#4fd9c2')+'"/>').join('')+[0,1,3,4,5,7,8].map(i=>'<rect x="'+(i*7.8+5.6)+'" y=".5" width="4.4" height="7.5" fill="#1b1f24"/>').join('')+'</svg>';
  const WAVE=['M4 19 L8 5 Q10 2 12 9 Q16 17 24 18.5 L40 19 L24 19.5 Q16 21 12 29 Q10 36 8 33 Z','M4 19 L7 7 Q9 3 12 12 Q15 17 20 18 L40 19 L20 20 Q15 21 12 26 Q9 35 7 31 Z','M4 19 L7 9 L10 16 L13 18.5 L40 19 L13 19.5 L10 22 L7 29 Z','M4 19 L8 6 Q14 4 20 11 Q28 17 40 19 Q28 21 20 27 Q14 34 8 32 Z'];
  const lamps=document.createElement('div');lamps.className='seq-lamps';lamps.appendChild(document.createElement('span'));const L=[];
  for(let i=0;i<16;i++){const l=document.createElement('span');l.className='lamp';lamps.appendChild(l);L.push(l)}el.appendChild(lamps);
  ROWS.forEach((r,ri)=>{r.s=Array(16).fill(false);r.mute=false;r.solo=false;const row=document.createElement('div');row.className='seq-row';
    const hd=document.createElement('div');hd.className='seq-head';
    hd.innerHTML='<button class="ms m">M</button><button class="ms s">S</button><span class="grip" aria-hidden="true">•<br>•</span><span class="nmw"><b></b><small></small></span>'+
      '<span class="wavebox" aria-hidden="true"><svg viewBox="0 0 44 38"><path d="'+WAVE[ri]+'" fill="#c9d1da"/></svg></span><span class="sk" aria-hidden="true"><u><i></i></u>VOL</span><span class="sk pan" aria-hidden="true"><u><i></i></u></span>';
    hd.querySelector('b').textContent=r.n;hd.querySelector('small').textContent=r.sub;
    const m=hd.querySelector('.m'),so=hd.querySelector('.s');m.setAttribute('aria-label','Mute '+r.n);so.setAttribute('aria-label','Solo '+r.n);r.knob=hd.querySelector('.sk i');
    m.onclick=()=>{r.mute=!r.mute;m.classList.toggle('on',r.mute);touch('seq')};so.onclick=()=>{r.solo=!r.solo;so.classList.toggle('on',r.solo);touch('seq')};
    row.appendChild(hd);r.b=[];
    for(let i=0;i<16;i++){const b=document.createElement('button');b.className='step'+((i>>2)%2?' b':'');b.setAttribute('aria-label',r.n+' step '+(i+1));b.setAttribute('aria-pressed','false');
      b.onclick=()=>{set(ri,i,!r.s[i]);touch('seq',12);if(r.s[i]&&can('seq'))drum[r.k]()};
      b.addEventListener('contextmenu',e=>{e.preventDefault();if(r.s[i])set(ri,i,false);touch('seq',12)});   /* right-click removes a step, as in COOK */
      row.appendChild(b);r.b.push(b)}
    r.row=row;el.appendChild(row)});
  function set(ri,i,v){const r=ROWS[ri];r.s[i]=v;r.b[i].classList.toggle('on',v);r.b[i].setAttribute('aria-pressed',v);if(v){r.b[i].classList.remove('pop');void r.b[i].offsetWidth;r.b[i].classList.add('pop')}}
  function clear(){ROWS.forEach((r,ri)=>r.s.forEach((_,i)=>r.s[i]&&set(ri,i,false)))}
  function pat(d){pi=(pi+d+PATS.length)%PATS.length;hold=0;$('#sqPat').textContent='0'+(pi+1)+'  PATTERN '+(pi+1)}
  function recolor(){const T=THEMES[theme];ROWS.forEach((r,i)=>{r.row.style.setProperty('--rc',i%2?T.pal[1]:T.acc);r.knob.style.transform='rotate('+(-135+vol[r.k]*270)+'deg)';r.knob.parentNode.style.setProperty('--v',vol[r.k])})}
  $('#seqClear').onclick=()=>{clear();touch('seq',6)};
  $('#sqNew').onclick=()=>{clear();pat(1);touch('seq',2)};
  $('#sqUp').onclick=()=>{clear();pat(1);touch('seq',1)};$('#sqDn').onclick=()=>{clear();pat(-1);touch('seq',1)};
  $('#sqRoll').onclick=()=>{const full=ROWS[2].s.every(Boolean);for(let i=0;i<16;i++)set(2,i,!full);touch('seq',12)};
  const setBpm=v=>{bpm=clamp(v,70,180);$('#bpm').textContent=bpm};
  $('#bpmUp').onclick=()=>{setBpm(bpm+5);touch('seq',4)};$('#bpmDn').onclick=()=>{setBpm(bpm-5);touch('seq',4)};
  function demo(){const P=PATS[pi],miss=[];P.forEach((p,ri)=>{for(let i=0;i<16;i++)if(p[i]==='x'&&!ROWS[ri].s[i])miss.push([ri,i])});
    if(miss.length){const m=miss[0];set(m[0],m[1],true);hold=0}else if(++hold>20){clear();pat(1)}}
  function tick(){step=(step+1)%16;const solo=ROWS.some(r=>r.solo);L.forEach((l,i)=>l.classList.toggle('now',i===step));
    ROWS.forEach(r=>{r.b.forEach((b,i)=>b.classList.toggle('now',i===step));
      if(r.s[step]&&!r.mute&&(!solo||r.solo)){lvl[r.k]=1;if(can('seq'))drum[r.k]()}});
    if([0,6,8,14].includes(step))lvl.keys=1;if(step%2===0)lvl.synth=.8;
    if(idle('seq')&&vis.seq&&step%2===1)demo()}
  if(REDUCED){PATS[0].forEach((p,ri)=>[...p].forEach((x,i)=>x==='x'&&set(ri,i,true)))}
  function frame(t){recolor();if(REDUCED&&!soundOn)return;const d=60/bpm/4;if(t-next>.5)next=t;while(t>=next){tick();next+=d}}
  return{frame}})();

/* ---------- PIANO ROLL ---------- */
const pr=(()=>{
  const cv=$('#prCv');const LO=48,HI=72,ROWS=HI-LO+1,BEATS=16,KW=46,TOP=18,GLIDE=.125;   // GLIDE: COOK's bond bends over an eighth of a beat each side of the join
  let notes=[],qi=0,qt=0,phase=0,lastPos=0,hold=0,drag=null,lit={},bondOn=false;
  // [pitch, start beat, length, index of the note this one is bonded to (-1 = plain note)]
  const PH=[[[52,0,4,3],[59,0,4,4],[64,0,4,-1],[57,4,4,-1],[60,4,4,-1],[64,4,4,-1],[69,2,1,7],[71,3,1,8],[72,4,2,-1],
             [55,8,4,12],[59,8,4,13],[62,8,4,14],[53,12,4,-1],[57,12,4,-1],[60,12,4,-1],[67,10,1,-1],[69,11,1,-1]],
            [[48,0,8,-1],[50,0,2,2],[53,2,2,-1],[57,0,2,-1],[60,2,2,-1],[55,4,4,-1],[62,4,4,-1],[69,6,1,8],[72,7,1,-1],
             [64,8,2,10],[65,10,2,11],[67,12,4,-1],[48,8,8,-1]]];
  const isBlack=p=>[1,3,6,8,10].includes(p%12);
  const reach=(n,m)=>Math.min(GLIDE,n.l*.5,m.l*.5);
  function link(){notes.forEach(n=>{if(n.bt>=0&&!n.next){const m=notes.find(o=>o.pid===n.bt&&o.ph===n.ph);if(m){n.next=m;m.tied=true}}})}
  function unlink(n){notes.forEach(m=>{if(m.next===n)m.next=null});if(n.next)n.next.tied=false}
  function geo(){const b=cv.getBoundingClientRect();return{w:b.width,h:b.height,rh:(b.height-TOP)/ROWS,bw:(b.width-KW)/BEATS,b}}
  function at(e){const g=geo(),x=e.clientX-g.b.left,y=e.clientY-g.b.top;return{p:HI-Math.floor((y-TOP)/g.rh),s:Math.floor((x-KW)/g.bw*2)/2,x,y}}
  // One voice per chain: the first note keeps sounding and bends into each bonded note. A plain note just plays.
  function play(head){const spb=60/bpm,glides=[];let n=head,end=head.s+head.l;
    while(n.next){const m=n.next;glides.push({from:n.p,to:m.p,at:(m.s-head.s)*spb,reach:reach(n,m)*spb});end=m.s+m.l;n=m}
    tone(head.p,Math.min(end-head.s,BEATS)*spb*.92,'keys',{type:'triangle',cut:.55,rel:.2,glides})}
  cv.addEventListener('pointerdown',e=>{const a=at(e);if(a.x<KW||a.y<TOP||a.p<LO||a.p>HI)return;touch('pr',14);
    const i=notes.findIndex(n=>n.p===a.p&&a.s>=n.s&&a.s<n.s+n.l);
    // right-click deletes a note (a tap does on touch screens, which have no right-click); a left click on a note just plays it
    if(e.button===2||(i>=0&&e.pointerType==='touch')){if(i>=0){unlink(notes[i]);notes.splice(i,1)}return}
    if(i>=0){lit[a.p]=now();if(can('pr'))tone(a.p,.25,'keys',{type:'triangle',cut:.6});return}
    drag={p:a.p,s:a.s,l:1,user:true,born:now(),bt:-1};
    if(bondOn){const held=notes.filter(n=>!n.next&&n.p!==a.p&&n.s<a.s&&n.s+n.l>=a.s-.26&&n.s+n.l<=a.s+1).sort((x,y)=>Math.abs(x.p-a.p)-Math.abs(y.p-a.p))[0];
      if(held){if(held.s+held.l>a.s)held.l=a.s-held.s;held.next=drag;drag.tied=true}}
    notes.push(drag);cv.setPointerCapture(e.pointerId);if(can('pr'))tone(a.p,.25,'keys',{type:'triangle',cut:.6})});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const a=at(e);drag.l=clamp(a.s-drag.s+.5,.5,BEATS-drag.s);touch('pr',14)});
  const end=()=>{drag=null};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  $('#prClear').onclick=()=>{notes=[];qi=0;touch('pr',6)};
  $('#prBond').onclick=()=>{bondOn=!bondOn;$('#prBond').classList.toggle('on',bondOn);$('#prBond').setAttribute('aria-pressed',bondOn)};
  const mk=(n,i,ph,born)=>({p:n[0],s:n[1],l:n[2],bt:n[3],pid:i,ph,born});
  if(REDUCED){notes=PH[0].map((n,i)=>mk(n,i,0,-9));link()}
  function frame(t,dt){const {c,w,h}=fit(cv);const rh=(h-TOP)/ROWS,bw=(w-KW)/BEATS,acc=THEMES[theme].acc,pal=THEMES[theme].pal;
    const pos=REDUCED?0:(t*bpm/60)%BEATS;
    if(idle('pr')){qt+=dt;if(qt>.32){qt=0;const P=PH[phase];
      if(qi<P.length){const i=qi++,n=P[i];if(!notes.some(m=>m.p===n[0]&&m.s===n[1])){notes.push(mk(n,i,phase,t));link()}}
      else if(++hold>34){notes=[];qi=0;hold=0;phase=(phase+1)%PH.length}}}
    notes.forEach(n=>{const crossed=lastPos<=pos?(n.s>=lastPos&&n.s<pos):(n.s>=lastPos||n.s<pos);
      if(crossed){lit[n.p]=t;if(!n.tied&&can('pr'))play(n)}});lastPos=pos;
    c.fillStyle='#0d1219';c.fillRect(0,0,w,h);
    for(let i=0;i<ROWS;i++){const p=HI-i,y=TOP+i*rh;c.fillStyle=isBlack(p)?'#0f161e':'#141c26';c.fillRect(KW,y,w-KW,rh-1);
      const on=lit[p]&&t-lit[p]<.25;c.fillStyle=on?acc:(isBlack(p)?'#1b2129':'#aeb4bd');c.fillRect(0,y,isBlack(p)?KW*.62:KW-2,rh-1);
      if(p%12===0){c.fillStyle='#39424d';c.font='9px Inter,Arial';c.textBaseline='middle';c.fillText('C'+(p/12-1),KW-18,y+rh/2)}}
    c.fillStyle='#0e141b';c.fillRect(KW,0,w-KW,TOP);c.font='10px ui-monospace,Consolas,monospace';c.textBaseline='middle';
    for(let b=0;b<=BEATS;b++){const x=KW+b*bw;c.fillStyle=b%4?'#18212c':'#2a394b';c.fillRect(x,0,1,h);if(b%4===0&&b<BEATS){c.fillStyle='#5f6d7d';c.fillText(b/4+1,x+4,TOP/2)}}
    const Y=p=>TOP+(HI-p+.5)*rh,X=s=>KW+s*bw;
    const col=n=>n.user?'#ffd166':pal[(n.p*5)%pal.length];
    notes.forEach(n=>{const a=clamp((t-n.born)*5,0,1),m=n.next,r=m?reach(n,m):0,
        x=X(n.s+(n.tied?Math.min(GLIDE,n.l*.5):0)),x2=m?X(m.s-r):X(n.s+n.l*a)-2,y=Y(n.p),k=col(n);
      const hot=pos>=n.s&&pos<n.s+n.l;c.globalAlpha=hot?.42:.2;c.fillStyle=k;c.fillRect(x,y-rh*.45,Math.max(0,x2-x),rh*.9);
      c.globalAlpha=1;c.strokeStyle=k;c.lineWidth=hot?2.6:1.8;c.shadowColor=k;c.shadowBlur=hot?14:6;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y);
      // a bond: the same line carries on, bending into the next note around the join
      if(m){const x3=X(m.s+r),y3=Y(m.p),xm=(x2+x3)/2;c.bezierCurveTo(xm,y,xm,y3,x3,y3)}
      c.stroke();c.shadowBlur=0;
      if(!n.tied){c.beginPath();c.arc(x,y,3,0,7);c.fillStyle='#0d1219';c.fill();c.stroke()}
      if(m){c.beginPath();c.arc((x2+X(m.s+r))/2,(y+Y(m.p))/2,3.4,0,7);c.fillStyle='#0d1219';c.fill();c.strokeStyle='#e9fff9';c.lineWidth=1.6;c.stroke()}
      else{c.beginPath();c.arc(x2,y,3,0,7);c.fillStyle='#0d1219';c.fill();c.stroke()}});
    const px=X(pos);c.fillStyle=acc;c.shadowColor=acc;c.shadowBlur=10;c.fillRect(px-1,0,2,h);c.shadowBlur=0;
  }
  return{frame}})();

/* ---------- MIXER ---------- */
const mix=(()=>{
  const S=[{n:'KICK',k:'kick',c:0},{n:'SNARE',k:'snare',c:1},{n:'HAT',k:'hat',c:2},{n:'808',k:'bass',c:3},{n:'KEYS',k:'keys',c:4},{n:'MASTER',k:'master',c:0}];
  const el=$('#strips');
  S.forEach((s,i)=>{s.v=.72;s.man=0;s.disp=0;s.ph=i*1.7;s.sp=.35+((i*37)%10)/22;
    const d=document.createElement('div');d.className='strip';
    d.innerHTML='<div class="nm"></div><div class="vu"><b></b><i></i></div><div class="fwrap"><div class="ftrack" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100"><div class="fcap"></div></div><div class="meter"><i></i></div></div><div class="db"></div>';
    d.querySelector('.nm').textContent=s.n;s.el=d;s.needle=d.querySelector('.vu i');s.tr=d.querySelector('.ftrack');s.cap=d.querySelector('.fcap');s.fill=d.querySelector('.meter i');s.db=d.querySelector('.db');
    s.tr.setAttribute('aria-label',s.n+' fader');
    const drag=e=>{const b=s.tr.getBoundingClientRect();s.v=clamp(1-(e.clientY-b.top-12)/(b.height-24),0,1);s.man=now()+10;touch('mix',10)};
    s.tr.addEventListener('pointerdown',e=>{s.tr.setPointerCapture(e.pointerId);s.dr=true;drag(e)});
    s.tr.addEventListener('pointermove',e=>s.dr&&drag(e));
    const up=()=>s.dr=false;s.tr.addEventListener('pointerup',up);s.tr.addEventListener('pointercancel',up);
    s.tr.addEventListener('keydown',e=>{const k={ArrowUp:.05,ArrowDown:-.05}[e.key];if(k){s.v=clamp(s.v+k,0,1);s.man=now()+10;touch('mix',10);e.preventDefault()}});
    el.appendChild(d)});
  function frame(t,dt){const pal=THEMES[theme].pal;let peak=0;
    S.forEach(s=>{s.el.style.setProperty('--rc',pal[s.c]);
      if(!REDUCED&&t>s.man&&!s.dr){const target=s.k==='master'?.8:.62+.3*Math.sin(t*s.sp+s.ph);s.v+=(target-s.v)*Math.min(1,dt*2.2)}
      let sig;if(s.k==='master'){sig=peak}else{lvl[s.k]*=Math.pow(.02,dt);sig=lvl[s.k]*s.v;peak=Math.max(peak,sig)}
      if(s.k==='master')sig*=s.v;s.disp+=(sig-s.disp)*Math.min(1,dt*(sig>s.disp?30:6));
      s.cap.style.top=(12+(1-s.v)*(s.tr.clientHeight-24))+'px';s.fill.style.height=(s.disp*100)+'%';
      s.needle.style.transform='rotate('+(-42+s.disp*84)+'deg)';s.tr.setAttribute('aria-valuenow',Math.round(s.v*100));
      if(s.k in vol)vol[s.k]=s.v;s.db.textContent=s.v<.02?'-inf':((s.v-.8)*40).toFixed(1);
      if(AC){const g=s.k==='master'?master:ch[s.k];g.gain.setTargetAtTime(s.v*s.v*1.25,AC.currentTime,.03)}})}
  return{frame}})();

/* ---------- one loop for everything; only visible panels run ---------- */
setTheme(0);let last=now();
function loop(){const t=now(),dt=Math.min(.1,t-last);last=t;
  if(vis.hero)hero.frame(t,dt);
  if(vis.seq||vis.mix)seq.frame(t);
  if(vis.pr)pr.frame(t,dt);
  if(vis.mix)mix.frame(t,dt);
  requestAnimationFrame(loop)}
requestAnimationFrame(loop);
})();
