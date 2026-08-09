
const $=id=>document.getElementById(id);
const KINGDOMS=[
 {n:"Цзинь",region:"Запад",army:"Железные копья",desc:"Строгое царство реформаторов и тяжёлой пехоты."},
 {n:"Лян",region:"Центр",army:"Золотая стража",desc:"Богатые равнины, торговые города и сильная бюрократия."},
 {n:"Яньло",region:"Север",army:"Северные всадники",desc:"Степи, крепкие кони и генералы, воспитанные пограничной войной."},
 {n:"Чуань",region:"Юг",army:"Багровые легионы",desc:"Самое населённое царство, способное выставлять огромные армии."},
 {n:"Хай",region:"Восток",army:"Морские арбалеты",desc:"Порты, флот и богатство восточных морей."},
 {n:"Вэйшань",region:"Горы",army:"Каменные щиты",desc:"Горные перевалы, крепости и непревзойдённые инженеры."},
 {n:"Юэ",region:"Юго-восток",army:"Тени Юэ",desc:"Купеческие дома, разведчики, наёмники и тайные союзы."}
];
const ORIGINS=[
 ["Крестьянский сын","+2 Стойкость · уважение простых солдат"],
 ["Обедневший дворянин","+2 Харизма · +10 Влияние"],
 ["Наёмник","+2 Сила · +80 серебра"],
 ["Сирота войны","+2 Разведка · +1 Стойкость"],
 ["Ученик стратега","+3 Тактика · ускоренное обучение"]
];
const RANKS=["Рекрут","Солдат","Десятник","Сотник","Пятисотник","Тысячник","Командир 3000","Командир 5000","Генерал","Старший генерал","Великий генерал","Верховный главнокомандующий"];
const CHAPTER_NAMES=[
"Пепел старой империи","Сто имён на бамбуке","Кровь на границе","Знамя Го Чжэня","Первый приказ","Волчий перевал",
"Город без ворот","Клятва сотни","Три дороги","Полководец из тумана","Падение Шуйчэна","Тысячник",
"Пир перед бурей","Семь послов","Алый союз","Шесть армий идут на запад","Багровая Лисица","Ночь горящих складов",
"Стена из десяти тысяч щитов","Цена победы","Чёрный снег Яньло","Кавалерия севера","Дуэль на реке Цан","Коронованный ребёнок",
"Змеи императорского двора","Указ о железе","Восстание Чёрного Знамени","Предатель в штабе","Осада Небесных ворот","Падение первого царства",
"Сломанная корона","Две столицы","Война наследников","Пять великих армий","Река мёртвых знамён","Последний союз",
"Семь корон","Мандат без императора","Великая кампания","Последняя война Поднебесной","Врата Тянь","Мандат Неба"
];
const chapter = i => ({
 id:i+1,name:CHAPTER_NAMES[i],
 summary:[
 "Пограничная война втягивает героя в конфликт, который намного больше его первого отряда.",
 "Политика двора сталкивается с военной необходимостью, и каждое решение создаёт новых союзников и врагов.",
 "Разведка раскрывает слабое место противника, но операция может изменить отношения между царствами.",
 "Большая битва проверяет армию, снабжение и способность героя удерживать людей под своим знаменем."
 ][i%4],
 recommended:1+i*2,
 reward:120+i*28
});
const CHAPTERS=Array.from({length:42},(_,i)=>chapter(i));
const OP_TYPES=["Разведка","Ночной рейд","Сопровождение","Охота на офицера","Защита обоза","Диверсия","Полевое сражение","Переговоры","Спасение","Осада"];
const OPERATIONS=Array.from({length:420},(_,i)=>({
 id:i+1,chapter:Math.floor(i/10)+1,type:OP_TYPES[i%OP_TYPES.length],
 name:`${OP_TYPES[i%10]}: операция «${["Тихая цапля","Сломанное копьё","Красный дождь","Пепельный мост","Нефритовый волк","Десять факелов","Мёртвый колокол","Белая река","Тёмный бамбук","Грозовой барабан"][i%10]}»`,
 power:12+Math.floor(i/7),energy:6+(i%8),gold:15+(i%17)*4,xp:8+(i%9)*2
}));
const EDICTS=Array.from({length:60},(_,i)=>({
 id:i+1,name:["Указ о зерне","Военная перепись","Кузницы короны","Дорожная повинность","Охрана караванов","Набор инженеров"][i%6]+" "+(Math.floor(i/6)+1),
 desc:["+снабжение армии","+резерв рекрутов","+качество оружия","+скорость передвижения","+доход торговли","+осадная эффективность"][i%6],
 cost:80+i*12
}));
const GOODS=[
 ["Закалённый цзянь",180,"Редкий"],["Ламеллярный доспех",240,"Редкий"],["Боевой конь",320,"Эпический"],
 ["Походный паёк ×5",35,"Обычный"],["Карта тайных троп",90,"Редкий"],["Талисман Белого Тигра",540,"Легендарный"],
 ["Копьё Полярной звезды",860,"Легендарный"],["Императорская печать Тянь",2200,"Небесный"]
];
const NAV=[
 ["campaign","⚔ Кампания"],["chronicles","☰ Хроники"],["map","🗺 Карта"],["army","👥 Армия"],["inventory","🎒 Снаряжение"],
 ["market","🏮 Рынок"],["intel","🕵 Разведка"],["relations","❤️ Отношения"],["estate","🏯 Владения"],["edicts","令 Указы"],
 ["annals","📜 Летопись"],["profile","王 Профиль"]
];
let selectedOrigin=ORIGINS[0][0], S=null, token=localStorage.getItem("mandateToken")||"", account=JSON.parse(localStorage.getItem("mandateAccount")||"null");
refreshAccessState();

function notify(t){$("toast").textContent=t;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),1800)}
function updateAccountButton(){$("accountBtn").textContent=account?`王 ${account.username}`:"Войти"}
updateAccountButton();

function openAuth(){$("authOverlay").classList.remove("hidden")}
function closeAuth(){$("authOverlay").classList.add("hidden");$("authMsg").textContent=""}
function authTab(t){$("loginForm").classList.toggle("hidden",t!=="login");$("registerForm").classList.toggle("hidden",t!=="register");$("loginTab").classList.toggle("active",t==="login");$("registerTab").classList.toggle("active",t==="register")}
async function api(url,opt={}){
 opt.headers={...(opt.headers||{}),"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})};
 const r=await fetch(url,opt); const d=await r.json().catch(()=>({}));
 if(!r.ok) throw new Error(d.error||"Ошибка сервера"); return d;
}
async function register(){
 try{const d=await api("/api/register",{method:"POST",body:JSON.stringify({username:$("regName").value,email:$("regEmail").value,password:$("regPass").value})});token=d.token;account=d.user;localStorage.setItem("mandateToken",token);localStorage.setItem("mandateAccount",JSON.stringify(account));await refreshAccessState();updateAccountButton();closeAuth();notify("Аккаунт создан")}
 catch(e){$("authMsg").textContent=e.message}
}
async function login(){
 try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({login:$("loginId").value,password:$("loginPass").value})});token=d.token;account=d.user;localStorage.setItem("mandateToken",token);localStorage.setItem("mandateAccount",JSON.stringify(account));await refreshAccessState();updateAccountButton();closeAuth();notify("Вход выполнен")}
 catch(e){$("authMsg").textContent=e.message}
}
async function refreshAccessState(){
 if(!token)return;
 try{
  const r=await fetch("/api/access",{headers:{Authorization:"Bearer "+token}});
  const a=await r.json();
  window.mandateAccess=a;
  localStorage.setItem("mandateAccess",JSON.stringify(a));
 }catch(e){console.warn("access refresh",e)}
}

function logout(){token="";account=null;localStorage.removeItem("mandateToken");localStorage.removeItem("mandateAccount");localStorage.removeItem("mandateAccess");updateAccountButton();notify("Вы вышли из аккаунта")}
function openPurchase(){$("purchaseModal").classList.remove("hidden")}function closePurchase(){$("purchaseModal").classList.add("hidden")}

$("origins").innerHTML=ORIGINS.map((o,i)=>`<div class="origin ${i===0?"active":""}" onclick="pickOrigin(this,'${o[0]}')"><b>${o[0]}</b><small>${o[1]}</small></div>`).join("");
function pickOrigin(el,n){selectedOrigin=n;document.querySelectorAll(".origin").forEach(x=>x.classList.remove("active"));el.classList.add("active")}

function baseState(){
 const s={name:$("heroName").value.trim()||"Безымянный",home:$("heroHome").value,origin:selectedOrigin,year:217,day:1,chapter:1,level:1,xp:0,rankIndex:0,
 gold:150,energy:100,reputation:0,influence:0,intel:15,army:0,estate:0,hp:100,
 stats:{Сила:8,Стойкость:8,Тактика:7,Харизма:6,Разведка:6},
 inventory:["Старый цзянь","Кожаный нагрудник","Походный паёк ×3"],units:[],
 relations:{"Го Чжэнь":8,"Хуа Нин":0,"Линь Жаоюэ":0,"Шэнь Ло":0,"Мэй Ша":0,"Сунь Цэлин":0},
 completedOps:[],edicts:[],annals:["217 год — герой прибыл в пограничный лагерь Цзинь."],flags:{},lastPage:"campaign"};
 if(selectedOrigin==="Крестьянский сын")s.stats.Стойкость+=2;
 if(selectedOrigin==="Обедневший дворянин"){s.stats.Харизма+=2;s.influence+=10}
 if(selectedOrigin==="Наёмник"){s.stats.Сила+=2;s.gold+=80}
 if(selectedOrigin==="Сирота войны"){s.stats.Разведка+=2;s.stats.Стойкость+=1}
 if(selectedOrigin==="Ученик стратега")s.stats.Тактика+=3;
 return s;
}
function newCampaign(){$("landing").classList.add("hidden");$("createScreen").classList.remove("hidden")}
function exitCreate(){$("createScreen").classList.add("hidden");$("landing").classList.remove("hidden")}
function startCampaign(){S=baseState();localSave();enterGame()}
async function continueCampaign(){
 let loaded=null;
 if(token){try{const d=await api("/api/save");loaded=d.save}catch(e){}}
 if(!loaded)loaded=JSON.parse(localStorage.getItem("mandateLocalSave")||"null");
 if(!loaded){notify("Сохранений пока нет");return}
 S=loaded;enterGame();
}
function enterGame(){$("landing").classList.add("hidden");$("createScreen").classList.add("hidden");$("gameScreen").classList.remove("hidden");$("gameNav").innerHTML=NAV.map(([k,n])=>`<button data-page="${k}" onclick="render('${k}')">${n}</button>`).join("");render(S.lastPage||"campaign")}
function exitGame(){$("gameScreen").classList.add("hidden");$("landing").classList.remove("hidden");localSave()}
function localSave(){if(S)localStorage.setItem("mandateLocalSave",JSON.stringify(S))}
async function cloudSave(){if(!S)return;if(!token){localSave();notify("Сохранено локально. Войди в аккаунт для облака.");return}try{await api("/api/save",{method:"PUT",body:JSON.stringify({save:S})});localSave();notify("Сохранено в аккаунте")}catch(e){notify(e.message)}}
function topUI(){
 $("playerBlock").innerHTML=`<b>${S.name}</b><br><span class="gold">${RANKS[S.rankIndex]}</span> · Ур. ${S.level}<br>${S.origin}<br><span class="muted">${S.home}</span>`;
 $("resources").innerHTML=`<span class="pill">⚡ ${S.energy}/100</span><span class="pill">🪙 ${S.gold}</span><span class="pill">⭐ ${S.reputation}</span><span class="pill">🕵 ${S.intel}</span><span class="pill">👥 ${S.army}</span>`;
 $("chapterLine").textContent=`Глава ${S.chapter}/42 · ${CHAPTERS[S.chapter-1].name} · День ${S.day}, ${S.year} г.`;
}
function render(k){S.lastPage=k;localSave();document.querySelectorAll("#gameNav button").forEach(b=>b.classList.toggle("active",b.dataset.page===k));topUI();const names=Object.fromEntries(NAV);$("pageTitle").textContent=(names[k]||k).replace(/^[^ ]+ /,"");window["page_"+k]()}
function gainXP(n){S.xp+=n;while(S.xp>=100){S.xp-=100;S.level++;S.stats.Сила++;S.stats.Стойкость++;if(S.level%3===0)S.stats.Тактика++}}
function advanceDay(){S.day++;if(S.day>360){S.day=1;S.year++}}
function event(text,delta={}){for(const[k,v]of Object.entries(delta)){if(k==="xp")gainXP(v);else S[k]=(S[k]||0)+v}S.energy=Math.max(0,Math.min(100,S.energy));S.annals.push(`${S.year} год, день ${S.day} — ${text}`);advanceDay();localSave();notify(text)}

function page_campaign(){
 const c=CHAPTERS[S.chapter-1], nextRank=Math.min(11,Math.floor((S.chapter-1)/4));
 if(nextRank>S.rankIndex)S.rankIndex=nextRank;
 const special=S.chapter===17?`<div class="panel"><h3 class="gold">Особая сюжетная линия: Багровая Лисица</h3><p>На поле боя ты впервые сталкиваешься с Линь Жаоюэ, Великим генералом Чуань. Она могла приказать лучникам открыть огонь, но вместо этого заинтересовалась человеком, сорвавшим её манёвр.</p><div class="choiceList"><button class="choice" onclick="relationEvent()">Ответить на её провокацию и принять интеллектуальную дуэль</button></div></div>`:"";
 $("page").innerHTML=`<div class="panel"><div class="eyebrow">ГЛАВА ${c.id} ИЗ 42</div><h2>${c.name}</h2><p>${c.summary}</p><p class="muted">Рекомендуемый уровень: ${c.recommended}. Награда главы: ${c.reward} серебра.</p><div class="choiceList">
 <button class="choice" onclick="chapterAction('aggressive')">⚔ Ставка на прямой удар — выше риск, больше славы</button>
 <button class="choice" onclick="chapterAction('tactical')">令 Использовать разведку и манёвр</button>
 <button class="choice" onclick="chapterAction('diplomatic')">王 Искать политическое решение</button></div></div>${special}
 <div class="cards"><div class="card"><h3>Военный путь</h3><b>${RANKS[S.rankIndex]}</b><div class="progress"><span style="width:${S.xp}%"></span></div><small class="muted">${S.xp}/100 опыта</small></div>
 <div class="card"><h3>Текущий фронт</h3><p>${S.chapter<15?"Западные границы":S.chapter<30?"Война семи царств":"Объединение Поднебесной"}</p></div>
 <div class="card"><h3>Операции главы</h3><p>${S.completedOps.filter(id=>OPERATIONS[id-1].chapter===S.chapter).length}/10 завершено</p></div></div>`;
}
function chapterAction(type){
 let chance=S.stats.Тактика+S.stats.Сила+S.reputation/5+Math.random()*20;
 if(type==="tactical"){if(S.intel<5)return notify("Нужно 5 разведданных");S.intel-=5;chance+=8}
 if(type==="diplomatic")chance+=S.stats.Харизма;
 if(chance<17){event("План провалился, но армия сохранила боеспособность.",{energy:-18,xp:8});render("campaign");return}
 S.gold+=CHAPTERS[S.chapter-1].reward;gainXP(30);S.reputation+=type==="aggressive"?8:5;S.energy=Math.max(0,S.energy-15);
 S.annals.push(`${S.year} год — завершена глава «${CHAPTERS[S.chapter-1].name}».`);
 if(S.chapter<42)S.chapter++; else S.flags.finished=true;
 advanceDay();localSave();render("campaign");notify(S.flags.finished?"Мандат Неба решён. Летопись завершена.":"Глава завершена");
}
function relationEvent(){S.relations["Линь Жаоюэ"]=Math.max(S.relations["Линь Жаоюэ"],12);S.annals.push("Первая встреча с Линь Жаоюэ — Багровой Лисицей Чуань.");notify("Линь Жаоюэ: Интерес +12");render("relations")}

function page_chronicles(){
 const ops=OPERATIONS.filter(o=>o.chapter===S.chapter);
 $("page").innerHTML=`<div class="panel"><h2>Операции хроник</h2><p class="muted">Всего в кампании 420 операций — по десять на каждую из 42 глав.</p><div class="cards">${ops.map(o=>`<div class="card"><h3>${o.name}</h3><div class="muted">${o.type} · Сложность ${o.power}</div><p>⚡ ${o.energy} · награда ${o.gold} 🪙 / ${o.xp} опыта</p><button class="btn small ${S.completedOps.includes(o.id)?"ghost":""}" ${S.completedOps.includes(o.id)?"disabled":""} onclick="runOp(${o.id})">${S.completedOps.includes(o.id)?"Завершено":"Начать"}</button></div>`).join("")}</div></div>`;
}
function runOp(id){const o=OPERATIONS[id-1];if(S.energy<o.energy)return notify("Не хватает энергии");let power=S.stats.Сила+S.stats.Тактика+Math.floor(S.army/100)+Math.floor(S.intel/8)+Math.random()*18;if(power<o.power){event(`Операция «${o.name}» сорвана.`,{energy:-o.energy,xp:Math.floor(o.xp/3)});render("chronicles");return}S.energy-=o.energy;S.gold+=o.gold;gainXP(o.xp);S.completedOps.push(id);S.intel+=o.type==="Разведка"?4:0;S.annals.push(`Успешно завершена ${o.name}.`);advanceDay();localSave();render("chronicles");notify("Операция выполнена")}

function page_map(){$("page").innerHTML=`<div class="mapGrid">${KINGDOMS.map((k,i)=>`<div class="kingdom"><span class="status">${i===0?"Союзник":i===3&&S.chapter>=15?"Главный противник":"Нейтрально"}</span><h3>${k.n}</h3><div class="muted">${k.region} · ${k.army}</div><p>${k.desc}</p></div>`).join("")}</div>`}

function syncArmy(){if(S.army>0&&!S.units.length)S.units=[["Копейщики",Math.ceil(S.army*.45),1],["Лучники",Math.ceil(S.army*.25),1],["Конница",Math.ceil(S.army*.15),1],["Разведчики",Math.ceil(S.army*.15),1]]}
function page_army(){syncArmy();$("page").innerHTML=`<div class="panel"><h2>Армия под твоим знаменем</h2><p>Общая численность: <b>${S.army}</b></p><button class="btn small" onclick="recruit()">Нанять 50 бойцов · 120 🪙</button><table class="table"><tr><th>Подразделение</th><th>Численность</th><th>Ступень</th><th></th></tr>${S.units.map((u,i)=>`<tr><td>${u[0]}</td><td>${u[1]}</td><td>${u[2]}</td><td><button class="btn small ghost" onclick="upgradeUnit(${i})">Улучшить · ${100*u[2]} 🪙</button></td></tr>`).join("")}</table></div>`}
function recruit(){if(S.gold<120)return notify("Недостаточно серебра");S.gold-=120;S.army+=50;S.units=[];syncArmy();event("К знамени присоединились 50 новых воинов.",{});render("army")}
function upgradeUnit(i){let c=100*S.units[i][2];if(S.gold<c)return notify("Недостаточно серебра");S.gold-=c;S.units[i][2]++;notify("Войска улучшены");render("army")}

function page_inventory(){$("page").innerHTML=`<div class="panel"><h2>Инвентарь</h2><div class="cards">${S.inventory.map(x=>`<div class="card"><h3>${x}</h3><p class="muted">Предмет личного снаряжения.</p></div>`).join("")}</div></div><div class="panel"><h2>Характеристики</h2><table class="table">${Object.entries(S.stats).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table></div>`}
function page_market(){$("page").innerHTML=`<div class="cards">${GOODS.map((g,i)=>`<div class="card"><h3>${g[0]}</h3><div class="gold">${g[2]}</div><p>${g[1]} 🪙</p><button class="btn small" onclick="buyGood(${i})">Купить</button></div>`).join("")}</div>`}
function buyGood(i){const g=GOODS[i];if(S.gold<g[1])return notify("Недостаточно серебра");S.gold-=g[1];S.inventory.push(g[0]);notify("Предмет приобретён");render("market")}
function page_intel(){$("page").innerHTML=`<div class="cards"><div class="card"><h3>Сеть информаторов</h3><p>60 🪙 → +12 разведданных</p><button class="btn small" onclick="buyIntel()">Вербовать</button></div><div class="card"><h3>Перехват гонца</h3><p>⚡ 10 → +8 разведданных, шанс получить секрет.</p><button class="btn small" onclick="intelMission()">Провести</button></div><div class="card"><h3>Разведданные</h3><div style="font-size:35px" class="gold">${S.intel}</div><p class="muted">Используются в сюжетных решениях и повышают шанс операций.</p></div></div>`}
function buyIntel(){if(S.gold<60)return notify("Недостаточно серебра");S.gold-=60;S.intel+=12;render("intel")}
function intelMission(){if(S.energy<10)return notify("Не хватает энергии");event("Перехвачен вражеский гонец.",{energy:-10,intel:8,xp:6});render("intel")}

function relStage(v){return v>=85?"Любовь":v>=60?"Привязанность":v>=35?"Уважение":v>=15?"Интерес":v>0?"Знакомство":"Незнакомец"}
function page_relations(){$("page").innerHTML=`<div class="cards">${Object.entries(S.relations).map(([n,v])=>`<div class="card"><h3>${n}</h3><b>${relStage(v)}</b><div class="progress"><span style="width:${Math.min(100,v)}%"></span></div><p class="muted">${n==="Линь Жаоюэ"?"Великий генерал Чуань. Её длинная линия проходит путь от поля боя Алого союза до тайных переговоров и «Ночи тысячи фонарей» на стадии любви.":"Отношения развиваются через сюжет, совместные операции и решения."}</p>${v>=60?`<button class="btn small" onclick="dateEvent('${n}')">Провести время вместе</button>`:""}</div>`).join("")}</div>`}
function dateEvent(n){S.energy=Math.max(0,S.energy-8);S.relations[n]=Math.min(100,S.relations[n]+4);S.annals.push(`${n}: личная встреча укрепила отношения.`);notify(`${n}: отношения +4`);render("relations")}

function page_estate(){const cost=120+S.estate*28;$("page").innerHTML=`<div class="panel"><h2>Владения · уровень ${S.estate}/85</h2><p>${S.estate<10?"Военный двор":S.estate<25?"Укреплённое поместье":S.estate<45?"Городская резиденция":S.estate<65?"Военная столица":"Владение Великого генерала"}</p><div class="progress"><span style="width:${S.estate/85*100}%"></span></div><p class="muted">Казармы, кузницы, госпитали, академии, конюшни и административные здания усиливают твою власть.</p><button class="btn primary" onclick="estateUp()">Развить · ${cost} 🪙</button></div>`}
function estateUp(){if(S.estate>=85)return notify("Достигнут максимальный уровень");let c=120+S.estate*28;if(S.gold<c)return notify("Недостаточно серебра");S.gold-=c;S.estate++;S.influence+=2;S.annals.push(`Владение достигло уровня ${S.estate}.`);render("estate")}

function page_edicts(){$("page").innerHTML=`<div class="panel"><h2>60 государственных указов</h2><p class="muted">Указы становятся важнее с ростом политического влияния и владений.</p><div class="cards">${EDICTS.map(e=>`<div class="card"><h3>${e.name}</h3><p>${e.desc}</p><div>${e.cost} 🪙</div><button class="btn small ${S.edicts.includes(e.id)?"ghost":""}" ${S.edicts.includes(e.id)?"disabled":""} onclick="issueEdict(${e.id})">${S.edicts.includes(e.id)?"Издан":"Издать"}</button></div>`).join("")}</div></div>`}
function issueEdict(id){const e=EDICTS[id-1];if(S.gold<e.cost)return notify("Недостаточно серебра");S.gold-=e.cost;S.edicts.push(id);S.influence+=3;S.annals.push(`Издан «${e.name}».`);notify("Указ вступил в силу");render("edicts")}

function page_annals(){$("page").innerHTML=`<div class="panel"><h2>Летопись ${S.name}</h2><div class="log">${[...S.annals].reverse().map(x=>`<p>${x}</p>`).join("")}</div></div>`}
function page_profile(){$("page").innerHTML=`<div class="panel"><h2>${S.name}</h2><p><span class="gold">${RANKS[S.rankIndex]}</span> · уровень ${S.level}</p><p>${S.origin} · ${S.home}</p><table class="table"><tr><td>Репутация</td><td>${S.reputation}</td></tr><tr><td>Влияние</td><td>${S.influence}</td></tr><tr><td>Операций</td><td>${S.completedOps.length}/420</td></tr><tr><td>Указов</td><td>${S.edicts.length}/60</td></tr><tr><td>Владение</td><td>${S.estate}/85</td></tr></table><div class="heroActions" style="justify-content:flex-start;margin-top:18px"><button class="btn primary" onclick="cloudSave()">Сохранить в аккаунт</button><button class="btn" onclick="rest()">Отдых</button><button class="btn ghost" onclick="exitGame()">Главное меню</button>${account?`<button class="btn ghost" onclick="logout()">Выйти из аккаунта</button>`:""}</div></div>`}
function rest(){S.energy=100;advanceDay();S.annals.push("День отдыха восстановил силы.");notify("Энергия восстановлена");render("profile")}


function toggleMobileMenu(force){
  const s=$("gameSide");
  if(!s)return;
  const open = typeof force==="boolean" ? force : !s.classList.contains("open");
  s.classList.toggle("open",open);
}
function buildMobileBottomNav(){
  const n=$("mobileBottomNav");
  if(!n)return;
  const items=[
    ["campaign","⚔","Сюжет"],
    ["chronicles","☰","Операции"],
    ["army","👥","Армия"],
    ["relations","❤️","Связи"],
    ["profile","王","Профиль"]
  ];
  n.innerHTML=items.map(([k,i,t])=>`<button data-mobile-page="${k}" onclick="render('${k}');toggleMobileMenu(false)"><span>${i}</span><small>${t}</small></button>`).join("");
  n.classList.remove("hidden");
}
const _oldEnterGame=enterGame;
enterGame=function(){
  _oldEnterGame();
  buildMobileBottomNav();
}
const _oldRender=render;
render=function(k){
  _oldRender(k);
  document.querySelectorAll("[data-mobile-page]").forEach(b=>b.classList.toggle("active",b.dataset.mobilePage===k));
  if(window.innerWidth<=820)toggleMobileMenu(false);
}
const _oldExitGame=exitGame;
exitGame=function(){
  _oldExitGame();
  const n=$("mobileBottomNav"); if(n)n.classList.add("hidden");
}
window.addEventListener("resize",()=>{if(window.innerWidth>820)toggleMobileMenu(false)});


// === MANDATE FULL RPG EXPANSION ===
const RPG_ITEMS={
 "Меч Небесного Дракона":{rarity:"Легендарный",attack:150,morale:15},
 "Доспех Черного Дракона":{rarity:"Эпический",defense:120,hp:40}
};

const RPG_UNITS={
 "Железные копья Цзинь":{attack:80,defense:110,morale:90},
 "Лучники Цинь":{attack:120,defense:50,morale:75},
 "Небесная гвардия":{attack:180,defense:160,morale:100}
};

function calculateBattle(player,enemy,formation="Клин"){
 let bonus=formation==="Клин"?1.3:formation==="Черепаха"?0.9:1;
 let p=(player.army+1)*(player.stats.Тактика+player.stats.Сила)*bonus;
 let e=enemy.power||1000;
 return {power:Math.floor(p),enemy:e,result:p>=e?"victory":"defeat"};
}

function startGeneralDuel(name){
 notify("⚔ Дуэль с генералом "+name+" началась!");
}

function unlockDemoCheck(){
 const full=window.accountAccess===true;
 document.querySelectorAll("[data-premium-content]").forEach(e=>{
   if(!full)e.classList.add("locked");
 });
}

window.addEventListener("load",unlockDemoCheck);
