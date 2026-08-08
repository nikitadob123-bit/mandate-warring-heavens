const express=require("express");
const path=require("path");
const {Pool}=require("pg");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");

const app=express();
app.set("trust proxy",1);
const PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||"change-this-secret";
const ADMIN_KEY=process.env.ADMIN_KEY||"";
const BOOSTY_URL=process.env.BOOSTY_URL||"https://boosty.to/7thdimension/purchase/2906702?ssource=DIRECT&share=subscription_link";
const BOOSTY_PRICE_USD=process.env.BOOSTY_PRICE_USD||"3";
const DISCORD_CLIENT_ID=process.env.DISCORD_CLIENT_ID||"1535774561756962160";
const DISCORD_CLIENT_SECRET=process.env.DISCORD_CLIENT_SECRET||"";
const DISCORD_BOT_TOKEN=process.env.DISCORD_BOT_TOKEN||"";
const DISCORD_GUILD_ID=process.env.DISCORD_GUILD_ID||"1535767072188137523";
const DISCORD_BOOSTY_ROLE_ID=process.env.DISCORD_BOOSTY_ROLE_ID||"1535767431094734948";
const DISCORD_API="https://discord.com/api/v10";
if(!process.env.DATABASE_URL){console.error("DATABASE_URL required");process.exit(1)}
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const q=(t,p=[])=>pool.query(t,p);

async function initDb(){await q(`
CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY,username TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS saves(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,payload JSONB NOT NULL,updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS access_grants(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,source TEXT NOT NULL DEFAULT 'discord_boosty',status TEXT NOT NULL DEFAULT 'inactive',boosty_level TEXT,starts_at TIMESTAMPTZ,expires_at TIMESTAMPTZ,updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS discord_links(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,discord_user_id TEXT UNIQUE NOT NULL,discord_username TEXT,linked_at TIMESTAMPTZ DEFAULT NOW(),last_checked_at TIMESTAMPTZ,last_role_state BOOLEAN DEFAULT FALSE);
`)}
app.use(express.json({limit:"2mb"}));
app.use(express.static(path.join(__dirname,"public")));
function tokenFor(u){return jwt.sign({id:String(u.id),username:u.username},SECRET,{expiresIn:"30d"})}
function auth(req,res,next){const h=req.headers.authorization||"";const t=h.startsWith("Bearer ")?h.slice(7):"";try{req.user=jwt.verify(t,SECRET);next()}catch(e){res.status(401).json({error:"Требуется вход в аккаунт"})}}
function admin(req,res,next){if(!ADMIN_KEY||req.headers["x-admin-key"]!==ADMIN_KEY)return res.status(403).json({error:"Недостаточно прав"});next()}
function configured(){return !!(DISCORD_CLIENT_ID&&DISCORD_CLIENT_SECRET&&DISCORD_BOT_TOKEN&&DISCORD_GUILD_ID&&DISCORD_BOOSTY_ROLE_ID)}
function origin(req){return (process.env.APP_BASE_URL||`${req.protocol}://${req.get("host")}`).replace(/\/+$/,"")}
function redirectUri(req){return `${origin(req)}/api/discord/callback`}
async function dapi(route,opt={}){const r=await fetch(DISCORD_API+route,opt);const txt=await r.text();let d={};try{d=txt?JSON.parse(txt):{}}catch{};if(!r.ok){const e=new Error(d.message||`Discord HTTP ${r.status}`);e.status=r.status;throw e}return d}
async function grant(uid,active){await q(`INSERT INTO access_grants(user_id,source,status,boosty_level,starts_at,expires_at,updated_at) VALUES($1,'discord_boosty',$2,'Boosty / Discord role',NOW(),NULL,NOW()) ON CONFLICT(user_id) DO UPDATE SET source='discord_boosty',status=EXCLUDED.status,boosty_level=EXCLUDED.boosty_level,expires_at=NULL,updated_at=NOW()`,[uid,active?"active":"inactive"])}
async function sync(uid){
 const r=await q("SELECT * FROM discord_links WHERE user_id=$1",[uid]);const l=r.rows[0];
 if(!l)return {active:false,linked:false,reason:"discord_not_linked"};
 if(!configured())return {active:false,linked:true,reason:"discord_not_configured"};
 try{const m=await dapi(`/guilds/${DISCORD_GUILD_ID}/members/${l.discord_user_id}`,{headers:{Authorization:`Bot ${DISCORD_BOT_TOKEN}`}});
 const active=Array.isArray(m.roles)&&m.roles.includes(String(DISCORD_BOOSTY_ROLE_ID));
 await q("UPDATE discord_links SET last_checked_at=NOW(),last_role_state=$1 WHERE user_id=$2",[active,uid]);await grant(uid,active);
 return {active,linked:true,reason:active?"boosty_role_present":"boosty_role_missing"}}
 catch(e){if(e.status===404){await grant(uid,false);return {active:false,linked:true,reason:"not_in_guild"}}return {active:false,linked:true,reason:"discord_check_failed",error:e.message}}
}
app.get("/health",(req,res)=>res.json({ok:true}));
app.post("/api/register",async(req,res)=>{const {username,email,password}=req.body||{};if(!username||username.trim().length<3)return res.status(400).json({error:"Имя пользователя — минимум 3 символа"});if(!email||!String(email).includes("@"))return res.status(400).json({error:"Укажите корректный email"});if(!password||password.length<6)return res.status(400).json({error:"Пароль — минимум 6 символов"});try{const h=bcrypt.hashSync(password,10);const r=await q("INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id,username",[username.trim(),String(email).trim().toLowerCase(),h]);const u=r.rows[0];res.json({token:tokenFor(u),user:{id:String(u.id),username:u.username}})}catch(e){if(e.code==="23505")return res.status(409).json({error:"Такое имя пользователя или email уже заняты"});console.error(e);res.status(500).json({error:"Ошибка регистрации"})}});
app.post("/api/login",async(req,res)=>{const {login,password}=req.body||{};const r=await q("SELECT * FROM users WHERE username=$1 OR email=$2 LIMIT 1",[String(login||""),String(login||"").toLowerCase()]);const u=r.rows[0];if(!u||!bcrypt.compareSync(password||"",u.password_hash))return res.status(401).json({error:"Неверный логин или пароль"});res.json({token:tokenFor(u),user:{id:String(u.id),username:u.username}})});
app.get("/api/me",auth,async(req,res)=>{const r=await q("SELECT id,username,email,created_at FROM users WHERE id=$1",[req.user.id]);res.json(r.rows[0]||{})});
app.get("/api/store",(req,res)=>res.json({provider:"Boosty",price_usd:Number(BOOSTY_PRICE_USD),purchase_url:BOOSTY_URL}));
app.get("/api/access",auth,async(req,res)=>{const s=await sync(req.user.id);const g=(await q("SELECT * FROM access_grants WHERE user_id=$1",[req.user.id])).rows[0]||null;const l=(await q("SELECT discord_user_id,discord_username,linked_at,last_checked_at,last_role_state FROM discord_links WHERE user_id=$1",[req.user.id])).rows[0]||null;res.json({active:s.active,grant:g,discord:l,reason:s.reason,purchase_url:BOOSTY_URL,price_usd:Number(BOOSTY_PRICE_USD),discord_configured:configured()})});
app.get("/api/discord/link",auth,(req,res)=>{if(!configured())return res.status(503).json({error:"Discord интеграция ещё не настроена"});const state=jwt.sign({purpose:"discord_link",user_id:String(req.user.id)},SECRET,{expiresIn:"10m"});const ru=redirectUri(req);const p=new URLSearchParams({client_id:DISCORD_CLIENT_ID,response_type:"code",redirect_uri:ru,scope:"identify",state,prompt:"consent"});res.json({url:`https://discord.com/oauth2/authorize?${p.toString()}`,redirect_uri:ru})});
app.get("/api/discord/callback",async(req,res)=>{const {code,state}=req.query;if(!code||!state)return res.status(400).send("Discord: нет code/state");let pl;try{pl=jwt.verify(state,SECRET);if(pl.purpose!=="discord_link")throw 0}catch{return res.status(400).send("Discord state invalid")};try{const ru=redirectUri(req);const form=new URLSearchParams({client_id:DISCORD_CLIENT_ID,client_secret:DISCORD_CLIENT_SECRET,grant_type:"authorization_code",code:String(code),redirect_uri:ru});const tr=await fetch(DISCORD_API+"/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});const td=await tr.json();if(!tr.ok||!td.access_token)throw new Error(td.error_description||td.error||"OAuth error");const du=await dapi("/users/@me",{headers:{Authorization:`Bearer ${td.access_token}`}});await q(`INSERT INTO discord_links(user_id,discord_user_id,discord_username,linked_at,last_checked_at,last_role_state) VALUES($1,$2,$3,NOW(),NULL,FALSE) ON CONFLICT(user_id) DO UPDATE SET discord_user_id=EXCLUDED.discord_user_id,discord_username=EXCLUDED.discord_username,linked_at=NOW()`,[pl.user_id,String(du.id),du.global_name||du.username||String(du.id)]);const s=await sync(pl.user_id);res.redirect(`/?discord_access=${s.active?"active":"linked"}`)}catch(e){console.error(e);res.redirect("/?discord_access=error")}});
app.post("/api/discord/recheck",auth,async(req,res)=>res.json(await sync(req.user.id)));
app.post("/api/discord/unlink",auth,async(req,res)=>{await q("DELETE FROM discord_links WHERE user_id=$1",[req.user.id]);await grant(req.user.id,false);res.json({ok:true})});
app.get("/api/save",auth,async(req,res)=>{const a=await sync(req.user.id);if(!a.active)return res.status(403).json({error:"Нужна активная роль Discord"});const r=await q("SELECT payload,updated_at FROM saves WHERE user_id=$1",[req.user.id]);const row=r.rows[0];res.json(row?{save:row.payload,updated_at:row.updated_at}:{save:null})});
app.put("/api/save",auth,async(req,res)=>{const a=await sync(req.user.id);if(!a.active)return res.status(403).json({error:"Нужна активная роль Discord"});await q(`INSERT INTO saves(user_id,payload,updated_at) VALUES($1,$2::jsonb,NOW()) ON CONFLICT(user_id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()`,[req.user.id,JSON.stringify(req.body.save||{})]);res.json({ok:true})});
app.delete("/api/save",auth,async(req,res)=>{await q("DELETE FROM saves WHERE user_id=$1",[req.user.id]);res.json({ok:true})});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
initDb().then(()=>app.listen(PORT,"0.0.0.0",()=>console.log(`MANDATE :${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
