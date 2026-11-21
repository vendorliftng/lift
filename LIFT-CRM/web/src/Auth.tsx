import {useState,ChangeEvent,FormEvent} from 'react'
export type Role='super_admin'|'marketing'|'sales'|'finance'|'production'|'customer_success'
export type User={id:string;name:string;email:string;role:Role}
export const ROLES:Record<Role,string>={super_admin:'Super Admin',marketing:'Marketing',sales:'Sales',finance:'Finance',production:'Production',customer_success:'Customer Success'}
// Which screens each role sees. Adjust to match the access matrix in PRD section 2. The back end must still enforce this (403).
export const ROLE_TABS:Record<Role,string[]>={super_admin:['home','leads','accounts','contacts','jobs','team'],marketing:['home','leads','accounts','contacts'],sales:['home','leads','accounts','contacts','jobs'],finance:['home','leads','accounts','jobs'],production:['home','accounts','jobs'],customer_success:['home','accounts','contacts','jobs']}
const BASE=import.meta.env.VITE_API_URL as string|undefined
const DEMO:User[]=[{id:'U1',name:'Amina Bello',email:'amina@vendorlift.ng',role:'super_admin'},{id:'U2',name:'Tunde Okafor',email:'tunde@vendorlift.ng',role:'sales'},{id:'U3',name:'Grace Adamu',email:'grace@vendorlift.ng',role:'production'},{id:'U4',name:'Ibrahim Musa',email:'ibrahim@vendorlift.ng',role:'finance'}]
async function post(path:string,body:any){
 if(BASE){const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error?.message||'Something went wrong. Please try again.');return d}
 await new Promise(r=>setTimeout(r,400))
 if(path==='/auth/login'){const u=DEMO.find(x=>x.email===body.email.trim().toLowerCase());if(!u||body.password!=='Lift@2026')throw new Error('The email or password is not correct.');return{mfaToken:u.id}}
 if(path==='/auth/mfa'){if(body.code!=='123456')throw new Error('That code is not correct. Please try again.');return{token:'demo',user:DEMO.find(x=>x.id===body.mfaToken)}}
 if(path==='/auth/activate'){if(body.code!=='123456')throw new Error('That code is not correct. Please try again.');return{token:'demo',user:{id:'U9',name:body.name,email:body.email,role:'sales'}}}
 return{}}
const inp='w-full rounded-md border border-zinc-200 shadow-sm bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const btn='w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60'
type V='login'|'mfa'|'activate'|'forgot'
export default function Auth({onLogin}:{onLogin:(u:User)=>void}){
 const [v,setV]=useState<V>('login'),[f,setF]=useState<Record<string,string>>({}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[tok,setTok]=useState(''),[sent,setSent]=useState(false),[bgFail,setBgFail]=useState(false)
 const msg=sessionStorage.getItem('lift:msg'),p=f.password||''
 const set=(k:string)=>(e:ChangeEvent<HTMLInputElement>)=>setF(s=>({...s,[k]:e.target.value}))
 const go=(x:V)=>{setV(x);setErr('');setSent(false)}
 const run=(fn:()=>Promise<void>)=>async(e:FormEvent)=>{e.preventDefault();setErr('');setBusy(true);try{await fn()}catch(x:any){setErr(x.message)}setBusy(false)}
 const rules:[string,boolean][]=[['At least 10 characters',p.length>=10],['An uppercase letter',/[A-Z]/.test(p)],['A lowercase letter',/[a-z]/.test(p)],['A number',/\d/.test(p)]]
 const L=(id:string,t:string)=><label htmlFor={id} className="mb-1 mt-4 block text-sm font-medium">{t}</label>
 const link='text-sm font-medium text-brand hover:underline'
 return <div className="grid min-h-screen bg-[#f6f5f1] font-sans text-zinc-900 md:grid-cols-2">
  <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-dark p-12 text-white md:flex">
   {!bgFail&&<img src="/auth-bg.jpg" alt="" onError={()=>setBgFail(true)} className="absolute inset-0 h-full w-full object-cover opacity-25"/>}
   <div className="absolute inset-0 bg-gradient-to-br from-[#0d1936]/95 via-[#0d1936]/90 to-[#050b1a]"/>
   <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl"/>
   <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>
   <img src="/logo.png" alt="VendorLift" width={112} height={82} className="relative"/>
   <div className="relative"><div className="mb-5 h-1 w-12 rounded bg-gold"/><h1 className="text-4xl font-semibold leading-tight tracking-tight">One record for every customer.</h1><p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">From first enquiry to a live website, everything the team needs is in one place.</p></div>
   <p className="relative text-xs text-slate-400">Internal system. Authorised staff only. All activity is logged.</p></div>
    <div className="flex items-center justify-center p-6"><div className="w-full max-w-sm"><div className="mb-5 flex justify-center rounded-xl bg-brand-dark py-4 md:hidden"><img src="/logo.png" alt="VendorLift" width={90} height={66}/></div><div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
   {msg&&<p className="mb-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">{msg}</p>}
   {!BASE&&<p className="mb-4 rounded-lg bg-brand-soft p-3 text-xs text-zinc-700">Demo mode. Sign in with <b>amina@vendorlift.ng</b> and <b>Lift@2026</b>, then use code <b>123456</b>. Other demo users: tunde@, grace@, ibrahim@ (same password) to see other roles.</p>}
   {v==='login'&&<form onSubmit={run(async()=>{const d=await post('/auth/login',{email:f.email||'',password:p});setTok(d.mfaToken);go('mfa')})}><h2 className="text-2xl font-semibold">Sign in</h2><p className="text-sm text-zinc-500">Use your VendorLift work account.</p>
    {L('em','Email')}<input id="em" type="email" autoComplete="username" required className={inp} value={f.email||''} onChange={set('email')}/>
    {L('pw','Password')}<div className="relative"><input id="pw" type={show?'text':'password'} autoComplete="current-password" required className={inp} value={p} onChange={set('password')}/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-brand">{show?'Hide':'Show'}</button></div>
    {err&&<p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}<button disabled={busy} className={btn+' mt-5'}>{busy?'Checking…':'Continue'}</button>
    <div className="mt-4 flex justify-between"><button type="button" className={link} onClick={()=>go('forgot')}>Forgot password?</button><button type="button" className={link} onClick={()=>go('activate')}>Have an invitation?</button></div></form>}
   {v==='mfa'&&<form onSubmit={run(async()=>{const d=await post('/auth/mfa',{mfaToken:tok,code:f.code||''});sessionStorage.removeItem('lift:msg');sessionStorage.setItem('lift:token',d.token);onLogin(d.user)})}><h2 className="text-2xl font-semibold">Verification code</h2><p className="text-sm text-zinc-500">Enter the 6-digit code from your authenticator app. Staff sign-in always needs this step.</p>
    {L('cd','6-digit code')}<input id="cd" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus className={inp+' h-14 text-center font-mono text-2xl tracking-[0.5em]'} value={f.code||''} onChange={set('code')}/>
    {err&&<p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}<button disabled={busy||(f.code||'').length<6} className={btn+' mt-5'}>{busy?'Verifying…':'Verify and sign in'}</button><button type="button" className={link+' mt-4'} onClick={()=>go('login')}>Back to sign in</button></form>}
   {v==='activate'&&<form onSubmit={run(async()=>{if(!rules.every(r=>r[1]))throw new Error('Your password does not meet all the rules.');if(p!==f.confirm)throw new Error('The two passwords do not match.');const d=await post('/auth/activate',{inviteCode:f.invite,name:f.name,email:f.email,password:p,code:f.code});sessionStorage.removeItem('lift:msg');sessionStorage.setItem('lift:token',d.token);onLogin(d.user)})}><h2 className="text-2xl font-semibold">Set up your account</h2><p className="text-sm text-zinc-500">Accounts are created by invitation only. Your administrator gives you the invitation code and your role.</p>
    {L('iv','Invitation code')}<input id="iv" required className={inp} value={f.invite||''} onChange={set('invite')}/>{L('nm','Full name')}<input id="nm" required className={inp} value={f.name||''} onChange={set('name')}/>
    {L('ae','Work email')}<input id="ae" type="email" required className={inp} value={f.email||''} onChange={set('email')}/>{L('ap','Create password')}<input id="ap" type="password" autoComplete="new-password" required className={inp} value={p} onChange={set('password')}/>
    <ul className="mt-2 grid grid-cols-2 gap-x-3 text-xs">{rules.map(([t,ok])=><li key={t} className={ok?'text-emerald-700':'text-zinc-500'}>{ok?'✓':'○'} {t}</li>)}</ul>
    {L('cp','Confirm password')}<input id="cp" type="password" autoComplete="new-password" required className={inp} value={f.confirm||''} onChange={set('confirm')}/>
    {L('ac','Authenticator code')}<input id="ac" inputMode="numeric" maxLength={6} required className={inp} value={f.code||''} onChange={set('code')}/><p className="mt-1 text-xs text-zinc-500">Add Lift to your authenticator app using the setup key from your administrator, then enter the 6-digit code.</p>
    {err&&<p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}<button disabled={busy} className={btn+' mt-5'}>{busy?'Creating…':'Create account'}</button><button type="button" className={link+' mt-4'} onClick={()=>go('login')}>Back to sign in</button></form>}
   {v==='forgot'&&<form onSubmit={run(async()=>{await post('/auth/forgot',{email:f.email||''});setSent(true)})}><h2 className="text-2xl font-semibold">Reset your password</h2>
    {sent?<p className="mt-3 rounded-lg bg-brand-soft p-3 text-sm">If that email belongs to a Lift account, a reset link is on its way. If nothing arrives, contact your administrator.</p>:<>{L('fe','Work email')}<input id="fe" type="email" required className={inp} value={f.email||''} onChange={set('email')}/>{err&&<p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}<button disabled={busy} className={btn+' mt-5'}>Send reset link</button></>}
    <button type="button" className={link+' mt-4 block'} onClick={()=>go('login')}>Back to sign in</button></form>}
  </div></div></div></div>}
