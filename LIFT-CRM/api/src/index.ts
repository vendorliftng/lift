import {Hono} from 'hono'
import {cors} from 'hono/cors'
type Env={DB:D1Database,ALLOWED_ORIGINS:string}
type U={id:string,name:string,email:string,role:string}
const app=new Hono<{Bindings:Env,Variables:{user:U}}>()
const ENT='/:e{leads|accounts|contacts|jobs}'
const PRE:Record<string,string>={leads:'LD',accounts:'AC',contacts:'CT',jobs:'JB'}
// Which modules each role may use. Keep in step with ROLE_TABS in web/src/Auth.tsx.
const ACCESS:Record<string,string[]>={super_admin:['leads','accounts','contacts','jobs'],marketing:['leads','accounts','contacts'],sales:['leads','accounts','contacts','jobs'],finance:['leads','accounts','jobs'],production:['accounts','jobs'],customer_success:['accounts','contacts','jobs']}
const ROLES=Object.keys(ACCESS)
app.use('*',(c,n)=>cors({origin:o=>c.env.ALLOWED_ORIGINS.split(',').map(x=>x.trim()).includes(o)?o:null,allowHeaders:['Authorization','Content-Type'],allowMethods:['GET','POST','PUT','DELETE','OPTIONS']})(c,n))

/* ---------- crypto helpers (Web Crypto, no dependencies) ---------- */
const hex=(b:ArrayBuffer|Uint8Array)=>[...new Uint8Array(b instanceof Uint8Array?b.buffer as ArrayBuffer:b)].map(x=>x.toString(16).padStart(2,'0')).join('')
const rnd=(n:number)=>hex(crypto.getRandomValues(new Uint8Array(n)))
async function hash(pw:string,salt=rnd(16)){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);return salt+':'+hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},k,256))}
const verify=async(pw:string,st:string)=>(await hash(pw,st.split(':')[0]))===st
const A32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const newSecret=()=>[...crypto.getRandomValues(new Uint8Array(20))].map(x=>A32[x%32]).join('')
function b32(s:string){let bits='';for(const c of s)bits+=A32.indexOf(c).toString(2).padStart(5,'0');const o=new Uint8Array(bits.length>>3);for(let i=0;i<o.length;i++)o[i]=parseInt(bits.slice(i*8,i*8+8),2);return o}
async function totp(secret:string,t:number){const k=await crypto.subtle.importKey('raw',b32(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);const buf=new ArrayBuffer(8);new DataView(buf).setUint32(4,Math.floor(t/30000));const h=new Uint8Array(await crypto.subtle.sign('HMAC',k,buf)),o=h[19]&15;return String((((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%1e6).padStart(6,'0')}
const okCode=async(s:string,code:string)=>{for(const d of[-1,0,1])if(await totp(s,Date.now()+d*30000)===String(code))return true;return false}

/* ---------- audit log (append-only; enforced again by database triggers) ---------- */
const audit=(c:any,action:string,target:string,before:any=null,after:any=null,actor?:string)=>c.env.DB.prepare('INSERT INTO audit_log(id,ts,actor_id,ip,action,target,before_json,after_json) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),actor??c.get('user')?.id??null,c.req.header('CF-Connecting-IP')??null,action,target,before&&JSON.stringify(before),after&&JSON.stringify(after)).run()
const err=(c:any,m:string,s=400)=>c.json({error:{message:m}},s)

/* ---------- sessions: 8 hours of inactivity ends the session ---------- */
const guard=async(c:any,next:any)=>{
 const t=(c.req.header('Authorization')||'').replace('Bearer ','')
 const s:any=await c.env.DB.prepare("SELECT s.last_seen,u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.kind='session' AND u.active=1").bind(t).first()
 if(!s||Date.now()-s.last_seen>8*36e5){if(s)await c.env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(t).run();return err(c,'Please sign in again.',401)}
 await c.env.DB.prepare('UPDATE sessions SET last_seen=? WHERE token=?').bind(Date.now(),t).run()
 c.set('user',{id:s.id,name:s.name,email:s.email,role:s.role});await next()}
const deny=async(c:any,mod:string)=>{await audit(c,'SECURITY_ALERT_403',mod);return err(c,'Your role cannot access this.',403)}
const newSession=async(c:any,uid:string)=>{const t=rnd(32),n=Date.now();await c.env.DB.prepare("INSERT INTO sessions(token,user_id,kind,created_at,last_seen) VALUES(?,?,'session',?,?)").bind(t,uid,n,n).run();return t}
const pub=(u:any)=>({id:u.id,name:u.name,email:u.email,role:u.role})
const strong=(p:string)=>/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/.test(p||'')

/* ---------- auth ---------- */
app.post('/auth/bootstrap',async (c:any)=>{ // only works while there are no users
 if((await c.env.DB.prepare('SELECT COUNT(*) n FROM users').first<any>())!.n>0)return err(c,'Already set up.',403)
 const b=await c.req.json();if(!b.email||!b.name||!strong(b.password))return err(c,'Name, email and a strong password are required.')
 const id=crypto.randomUUID(),sec=newSecret()
 await c.env.DB.prepare("INSERT INTO users(id,name,email,role,password_hash,totp_secret,active,created_at) VALUES(?,?,?,'super_admin',?,?,1,?)").bind(id,b.name,b.email.toLowerCase(),await hash(b.password),sec,new Date().toISOString()).run()
 await audit(c,'BOOTSTRAP_ADMIN',id,null,{email:b.email},id);return c.json({setupKey:sec,note:'Add this key to your authenticator app, then sign in.'})})
app.post('/auth/login',async (c:any)=>{
 const b=await c.req.json(),u:any=await c.env.DB.prepare('SELECT * FROM users WHERE email=? AND active=1').bind(String(b.email||'').trim().toLowerCase()).first()
 if(!u||!(await verify(String(b.password||''),u.password_hash))){await audit(c,'LOGIN_FAILED',String(b.email||''),null,null,'anonymous');return err(c,'The email or password is not correct.',401)}
 const t=rnd(32),n=Date.now();await c.env.DB.prepare("INSERT INTO sessions(token,user_id,kind,created_at,last_seen) VALUES(?,?,'mfa',?,?)").bind(t,u.id,n,n).run();return c.json({mfaToken:t})})
app.post('/auth/mfa',async (c:any)=>{
 const b=await c.req.json(),s:any=await c.env.DB.prepare("SELECT s.token,s.created_at,s.attempts,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.kind='mfa'").bind(b.mfaToken||'').first()
 if(!s||Date.now()-s.created_at>5*6e4||s.attempts>=5)return err(c,'Please sign in again.',401)
 if(!(await okCode(s.totp_secret,b.code))){await c.env.DB.prepare('UPDATE sessions SET attempts=attempts+1 WHERE token=?').bind(s.token).run();await audit(c,'MFA_FAILED',s.id,null,null,s.id);return err(c,'That code is not correct. Please try again.',401)}
 await c.env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(s.token).run();const token=await newSession(c,s.id);await audit(c,'LOGIN',s.id,null,null,s.id);return c.json({token,user:pub(s)})})
app.post('/auth/activate',async (c:any)=>{
 const b=await c.req.json(),u:any=await c.env.DB.prepare('SELECT * FROM users WHERE lower(invite_code)=? AND active=0 AND lower(email)=?').bind(String(b.inviteCode||'').trim().toLowerCase(),String(b.email||'').trim().toLowerCase()).first()
 if(!u)return err(c,'The invitation code or email is not correct. Check both match the invitation exactly.')
 if(!(await okCode(u.totp_secret,String(b.code||'').trim())))return err(c,'The 6-digit code is not correct. Use the code from the authenticator app that holds this person’s setup key.')
 if(!strong(b.password))return err(c,'Password must be 10+ characters with upper case, lower case and a number.')
 await c.env.DB.prepare('UPDATE users SET name=?,password_hash=?,active=1,invite_code=NULL WHERE id=?').bind(b.name||u.name,await hash(b.password),u.id).run()
 await audit(c,'ACCOUNT_ACTIVATED',u.id,null,null,u.id);return c.json({token:await newSession(c,u.id),user:pub(u)})})
app.post('/auth/forgot',async (c:any)=>{await audit(c,'PASSWORD_RESET_REQUESTED',String((await c.req.json()).email||''),null,null,'anonymous');return c.json({})}) // email sending not built yet
app.post('/auth/logout',guard,async (c:any)=>{await c.env.DB.prepare('DELETE FROM sessions WHERE token=?').bind((c.req.header('Authorization')||'').replace('Bearer ','')).run();return c.body(null,204)})

/* ---------- users (Super Admin invites people) ---------- */
app.get('/users',guard,async (c:any)=>{if(c.get('user').role!=='super_admin')return deny(c,'users');const {results}=await c.env.DB.prepare('SELECT id,name,email,role,active,invite_code FROM users').all();return c.json(results)})
app.post('/users',guard,async (c:any)=>{
 if(c.get('user').role!=='super_admin')return deny(c,'users')
 const b=await c.req.json();if(!b.email||!ROLES.includes(b.role))return err(c,'A valid email and role are required.')
 const id=crypto.randomUUID(),sec=newSecret(),code=rnd(4)
 try{await c.env.DB.prepare('INSERT INTO users(id,name,email,role,totp_secret,invite_code,active,created_at) VALUES(?,?,?,?,?,?,0,?)').bind(id,b.name||'',b.email.toLowerCase(),b.role,sec,code,new Date().toISOString()).run()}catch{return err(c,'That email already has an account.',409)}
 await audit(c,'USER_INVITED',id,null,{email:b.email,role:b.role});return c.json({id,inviteCode:code,setupKey:sec},201)})

app.delete('/users/:id',guard,async (c:any)=>{ // cancel a pending invitation (never an active account)
 if(c.get('user').role!=='super_admin')return deny(c,'users')
 const id=c.req.param('id'),r=await c.env.DB.prepare('DELETE FROM users WHERE id=? AND active=0').bind(id).run()
 if(!r.meta.changes)return err(c,'Only pending invitations can be cancelled.',404)
 await audit(c,'INVITE_CANCELLED',id);return c.body(null,204)})

/* ---------- business rules (PRD) ---------- */
const REQ:Record<string,string[]>={leads:['businessName','contactPerson','phone','source','status','assignedTo','nextAction','nextActionDue'],accounts:['name','assignedTo'],contacts:['name','accountId','assignedTo'],jobs:['accountId','package','contractValue','status','health']}
async function check(c:any,e:string,b:any,old:any):Promise<string|null>{
 const need=[...REQ[e]]
 if(e==='jobs'&&b.status!=='Awaiting Brief')need.push('targetDate','productionOwner','csOwner')
 const missing=need.filter(k=>b[k]===undefined||b[k]===null||b[k]==='')
 if(missing.length)return 'Missing: '+missing.join(', ')
 if(e==='leads'){
  if(!['whatsapp','email','terms'].every(k=>b.consent&&b.consent[k]))return 'All three consents are required.'
  if(['Agent Referral','Customer Referral'].includes(b.source)&&!b.referralCode)return 'A referral code is required for referral sources.'
  if(b.status==='Lost'&&!b.lostReason)return 'A lost reason is required.'
  const becomingWon=b.status==='Paid / Won'&&(!old||old.status!=='Paid / Won')
  if(becomingWon&&!['finance','super_admin'].includes(c.get('user').role))return 'Only Finance can mark a lead Paid / Won.'
  const dup:any=await c.env.DB.prepare("SELECT id FROM records WHERE entity='leads' AND json_extract(data,'$.phone')=? AND id IS NOT ?").bind(b.phone,old?old.id:null).first()
  if(dup)return 'This phone number already exists ('+dup.id+').'
 }
 if(e==='jobs'){
  if(Number(b.amountPaid||0)>Number(b.contractValue))return 'Amount paid cannot be more than the contract value.'
  if(['At Risk','Blocked'].includes(b.health)&&!b.blockerNote)return 'A blocker note is required when a job is At Risk or Blocked.'
 }
 return null
}
const load=(c:any,id:string,e:string)=>c.env.DB.prepare('SELECT id,data FROM records WHERE id=? AND entity=?').bind(id,e).first()

/* ---------- records: leads, accounts, contacts, jobs ---------- */
app.get(ENT,guard,async (c:any)=>{const e=c.req.param('e');if(!ACCESS[c.get('user').role].includes(e))return deny(c,e)
 const {results}=await c.env.DB.prepare('SELECT id,data FROM records WHERE entity=? ORDER BY seq DESC').bind(e).all<any>();await audit(c,'READ',e);return c.json(results.map(r=>({...JSON.parse(r.data),id:r.id})))})
app.post(ENT,guard,async (c:any)=>{const e=c.req.param('e');if(!ACCESS[c.get('user').role].includes(e))return deny(c,e)
 const b=await c.req.json();delete b.id;const m=await check(c,e,b,null);if(m)return err(c,m,m.includes('exists')?409:400)
 const seq=(await c.env.DB.prepare('SELECT COALESCE(MAX(seq),0)+1 n FROM records WHERE entity=?').bind(e).first<any>())!.n,id=PRE[e]+'-'+String(seq).padStart(3,'0'),now=new Date().toISOString()
 await c.env.DB.prepare('INSERT INTO records(id,entity,seq,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,e,seq,JSON.stringify(b),now,now).run();await audit(c,'CREATE',e+':'+id,null,b);return c.json({...b,id},201)})
app.put(ENT+'/:id',guard,async (c:any)=>{const e=c.req.param('e'),id=c.req.param('id');if(!ACCESS[c.get('user').role].includes(e))return deny(c,e)
 const o:any=await load(c,id,e);if(!o)return err(c,'Not found.',404);const b=await c.req.json();b.id=id;const old={...JSON.parse(o.data),id},m=await check(c,e,b,old);if(m)return err(c,m,m.includes('exists')?409:400)
 const {id:_,...data}=b;await c.env.DB.prepare('UPDATE records SET data=?,updated_at=? WHERE id=?').bind(JSON.stringify(data),new Date().toISOString(),id).run();await audit(c,'UPDATE',e+':'+id,old,b);return c.json(b)})
app.delete(ENT+'/:id',guard,async (c:any)=>{const e=c.req.param('e'),id=c.req.param('id');if(c.get('user').role!=='super_admin')return deny(c,e+' delete')
 const o:any=await load(c,id,e);if(!o)return err(c,'Not found.',404);await c.env.DB.prepare('DELETE FROM records WHERE id=?').bind(id).run();await audit(c,'DELETE',e+':'+id,JSON.parse(o.data),null);return c.body(null,204)})

/* ---------- export: Super Admin and Finance only, always logged ---------- */
app.get('/export/:e{leads|accounts|contacts|jobs}',guard,async (c:any)=>{const e=c.req.param('e');if(!['super_admin','finance'].includes(c.get('user').role)||!ACCESS[c.get('user').role].includes(e))return deny(c,'export '+e)
 const {results}=await c.env.DB.prepare('SELECT id,data FROM records WHERE entity=? ORDER BY seq').bind(e).all<any>(),rows=results.map(r=>({id:r.id,...JSON.parse(r.data)}))
 const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))],q=(v:any)=>'"'+String(typeof v==='object'&&v?JSON.stringify(v):v??'').replace(/"/g,'""')+'"'
 await audit(c,'EXPORT',e,null,{rows:rows.length});return c.text([cols.join(','),...rows.map(r=>cols.map(k=>q((r as any)[k])).join(','))].join('\n'),200,{'Content-Type':'text/csv'})})
app.get('/',c=>c.json({name:'lift-api',ok:true}))
export default app
