import {useEffect,useState} from 'react'
import {SCHEMAS,STAGES,Entity,Rec,Field,naira,validate} from './lib'
import {api} from './api'
import Auth,{User,ROLE_TABS,ROLES} from './Auth'
type DB=Record<Entity,Rec[]>;type Tab='home'|Entity
const fd=(d?:string)=>d?new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'short'}):'–'
const tone=(v:string)=>['Accepted / Live','On Track','Paid / Won'].includes(v)?'bg-emerald-100 text-emerald-800':['Lost','Blocked','Cancelled'].includes(v)?'bg-red-100 text-red-800':['At Risk','On Hold','Awaiting Brief','Awaiting Client Approval'].includes(v)?'bg-amber-100 text-amber-800':'bg-stone-200/70 text-stone-700'
const label=(db:DB,e:Entity,id:string)=>{const r=db[e].find(x=>x.id===id);return r?r.name||r.businessName:'–'}
const late=(r:Rec)=>r.status!=='Lost'&&r.nextActionDue&&new Date(r.nextActionDue)<new Date(new Date().toDateString())
const input='w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const NAV:[Tab,string][]=[['home','Today'],['leads','Leads'],['accounts','Accounts'],['contacts','Contacts'],['jobs','Jobs']]
export default function App(){
 const [user,setUser]=useState<User|null>(()=>{try{return JSON.parse(sessionStorage.getItem('lift:user')||'null')}catch{return null}})
 const out=(m?:string)=>{sessionStorage.removeItem('lift:user');if(m)sessionStorage.setItem('lift:msg',m);setUser(null)}
 return user?<Shell user={user} onOut={out}/>:<Auth onLogin={u=>{sessionStorage.setItem('lift:user',JSON.stringify(u));setUser(u)}}/>}
function Shell({user,onOut}:{user:User,onOut:(m?:string)=>void}){
 const allowed=ROLE_TABS[user.role],[tab,setTab]=useState<Tab>(allowed[0] as Tab),[db,setDb]=useState<DB|null>(null)
 const reload=async()=>setDb(await api.all())
 useEffect(()=>{reload()},[])
 useEffect(()=>{let last=Date.now();const t=()=>{last=Date.now()},ev=['click','keydown','touchstart'];ev.forEach(e=>addEventListener(e,t));const i=setInterval(()=>{if(Date.now()-last>8*36e5)onOut('You were signed out after 8 hours of inactivity.')},30000);return()=>{clearInterval(i);ev.forEach(e=>removeEventListener(e,t))}},[])
 return <div className="min-h-screen bg-[#f6f5f1] font-sans text-stone-900 md:flex">
  <aside className="border-b border-stone-200 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
   <div className="flex items-center gap-2 px-5 py-4 md:py-6"><div className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-bold text-white">L</div><div><div className="font-semibold leading-none">Lift</div><div className="text-xs text-stone-500">VendorLift CRM</div></div></div>
   <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">{NAV.filter(([k])=>allowed.includes(k)).map(([k,t])=><button key={k} onClick={()=>setTab(k)} aria-current={tab===k} className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium ${tab===k?'bg-brand-soft text-brand':'text-stone-600 hover:bg-stone-100'}`}>{t}</button>)}<button onClick={()=>onOut()} className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-stone-500 hover:bg-stone-100">Sign out ({user.name.split(' ')[0]}, {ROLES[user.role]})</button></nav></aside>
  <main className="min-w-0 flex-1 p-4 md:p-10">{!db?<p className="text-stone-500">Loading…</p>:!allowed.includes(tab)?<p className="rounded-xl bg-white p-6">403: your role does not have access to this page.</p>:tab==='home'?<Home db={db} go={setTab}/>:<Page key={tab} e={tab} db={db} reload={reload}/>}</main></div>}
function Home({db,go}:{db:DB,go:(t:Tab)=>void}){
 const L=db.leads,J=db.jobs,open=L.filter(l=>!['Lost','Accepted / Live'].includes(l.status))
 const attn=[...L.filter(late).map(l=>({k:'leads' as Tab,t:l.businessName,s:`Overdue: ${l.nextAction} (${fd(l.nextActionDue)})`,b:'Overdue'})),...J.filter(j=>j.health&&j.health!=='On Track').map(j=>({k:'jobs' as Tab,t:label(db,'accounts',j.accountId),s:j.blockerNote||'Needs attention',b:j.health}))]
 const max=Math.max(1,...STAGES.map(s=>L.filter(l=>l.status===s).length))
 return <div className="mx-auto max-w-5xl"><h1 className="text-3xl font-semibold tracking-tight">Good day</h1><p className="mb-6 text-stone-500">Here is what needs you today.</p>
  <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Open leads',open.length],['Pipeline value',naira(open.reduce((a,l)=>a+Number(l.estimatedValue||0),0))],['Overdue actions',L.filter(late).length],['Jobs at risk',J.filter(j=>j.health&&j.health!=='On Track').length]].map(([l,v])=><div key={l as string} className="rounded-2xl bg-white p-4 shadow-sm"><div className="text-xs text-stone-500">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>)}</div>
  <div className="grid gap-6 md:grid-cols-2"><section><h2 className="mb-3 font-semibold">Needs attention</h2><div className="space-y-2">{attn.length?attn.map((a,i)=><button key={i} onClick={()=>go(a.k)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-white p-3 text-left shadow-sm hover:ring-2 hover:ring-brand/30"><div><div className="font-medium">{a.t}</div><div className="text-sm text-stone-500">{a.s}</div></div><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone(a.b==='Overdue'?'At Risk':a.b)}`}>{a.b}</span></button>):<p className="rounded-xl bg-white p-4 text-sm text-stone-500">Nothing overdue. Nice.</p>}</div></section>
  <section><h2 className="mb-3 font-semibold">Pipeline</h2><div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">{STAGES.map(s=>{const n=L.filter(l=>l.status===s).length;return <div key={s} className="grid grid-cols-[110px_1fr_20px] items-center gap-2 text-sm"><span className="truncate text-stone-600">{s}</span><div className="h-2 rounded bg-stone-100"><div className="h-2 rounded bg-brand" style={{width:`${n/max*100}%`}}/></div><b>{n}</b></div>})}</div></section></div></div>}
function cell(S:typeof SCHEMAS[Entity],r:Rec,k:string,db:DB){
 if(k==='balance')return naira(Number(r.contractValue||0)-Number(r.amountPaid||0))
 const f=S.fields.find(x=>x.key===k)!,v=r[k]
 if(k===S.badge||k==='health'||k==='status')return v?<span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone(v)}`}>{v}</span>:'–'
 return f?.type==='ref'?label(db,f.ref!,v):f?.type==='number'?naira(v):f?.type==='date'?fd(v):v||'–'}
function Page({e,db,reload}:{e:Entity,db:DB,reload:()=>void}){
 const S=SCHEMAS[e],[q,setQ]=useState(''),[view,setView]=useState<'list'|'board'>('list'),[open,setOpen]=useState<Rec|null>(null)
 const rows=db[e].filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
 const name=(k:string)=>k==='balance'?'Balance':S.fields.find(x=>x.key===k)!.label.replace(/ \(.*\)/,'')
 const grid={gridTemplateColumns:`repeat(${S.cols.length},minmax(0,1fr))`}
 return <div className="mx-auto max-w-6xl"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold tracking-tight">{S.title}</h1><p className="text-sm text-stone-500">{S.kpi(db[e]).map(([l,v])=>`${v} ${l.toLowerCase()}`).join(' · ')}</p></div>
  <div className="flex gap-2">{e==='leads'&&<div className="flex rounded-lg bg-stone-200/70 p-0.5 text-sm">{(['list','board'] as const).map(v=><button key={v} onClick={()=>setView(v)} className={`rounded-md px-3 py-1.5 capitalize ${view===v?'bg-white shadow-sm':'text-stone-600'}`}>{v}</button>)}</div>}
  <button onClick={()=>setOpen({})} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">+ Add {S.one}</button></div></div>
  <input className={input+' mb-4 max-w-sm'} placeholder={`Search ${S.title.toLowerCase()}`} aria-label="Search" value={q} onChange={x=>setQ(x.target.value)}/>
  {e==='leads'&&view==='board'?<div className="flex gap-3 overflow-x-auto pb-3">{STAGES.map(s=><div key={s} className="w-64 shrink-0 rounded-2xl bg-stone-200/50 p-2"><div className="flex justify-between px-2 py-1.5 text-xs font-semibold text-stone-600"><span>{s}</span><span>{rows.filter(r=>r.status===s).length}</span></div><div className="space-y-2">{rows.filter(r=>r.status===s).map(r=><button key={r.id} onClick={()=>setOpen(r)} className="block w-full rounded-xl bg-white p-3 text-left text-sm shadow-sm hover:ring-2 hover:ring-brand/30"><div className="font-medium">{r.businessName}</div><div className="text-xs text-stone-500">{r.assignedTo} · {naira(r.estimatedValue)}</div><div className={`mt-1 text-xs ${late(r)?'font-medium text-red-700':'text-stone-500'}`}>{r.nextAction} · {fd(r.nextActionDue)}</div></button>)}</div></div>)}</div>
  :<div className="overflow-hidden rounded-2xl bg-white shadow-sm"><div style={grid} className="hidden gap-3 border-b border-stone-100 px-5 py-3 text-xs font-medium text-stone-500 md:grid">{S.cols.map(k=><div key={k}>{name(k)}</div>)}</div>
   {rows.length?rows.map(r=><button key={r.id} onClick={()=>setOpen(r)} style={grid} className="block w-full gap-3 border-b border-stone-100 px-5 py-3.5 text-left text-sm last:border-0 hover:bg-stone-50 md:grid md:items-center">{S.cols.map((k,i)=><div key={k} className={`truncate ${i?'text-stone-600':'font-medium'} max-md:py-0.5`}>{cell(S,r,k,db)}</div>)}</button>):<p className="p-10 text-center text-sm text-stone-500">Nothing here yet. Add your first {S.one}.</p>}</div>}
  {open&&<Drawer e={e} rec={open} db={db} onClose={()=>setOpen(null)} onSaved={()=>{setOpen(null);reload()}}/>}</div>}
function Drawer({e,rec,db,onClose,onSaved}:{e:Entity,rec:Rec,db:DB,onClose:()=>void,onSaved:()=>void}){
 const S=SCHEMAS[e],isNew=!rec.id,[r,setR]=useState<Rec>(isNew?{status:e==='leads'?'New Lead':e==='jobs'?'Awaiting Brief':undefined,health:e==='jobs'?'On Track':undefined}:rec),[err,setErr]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false)
 const set=(k:string,v:any)=>setR(p=>({...p,[k]:v}))
 const save=async(x:Rec=r)=>{const v=validate(e,x,db);setErr(v);if(Object.keys(v).length)return;setBusy(true);await api.save(e,x);onSaved()}
 const del=async()=>{if(confirm(`Delete this ${S.one}? This cannot be undone.`)){await api.remove(e,r.id);onSaved()}}
 const idx=STAGES.indexOf(r.status),next=e==='leads'&&!isNew&&idx>=0&&idx<STAGES.indexOf('Paid / Won')?STAGES[idx+1]:null
 const convert=async()=>{setBusy(true);const a=await api.save('accounts',{name:r.businessName,leadId:r.id,phone:r.phone,assignedTo:r.assignedTo});
  await api.save('contacts',{name:r.contactPerson,accountId:a!.id,phone:r.phone,email:r.email,assignedTo:r.assignedTo,consent:r.consent})
  await api.save('jobs',{accountId:a!.id,package:'Starter',contractValue:r.estimatedValue||0,amountPaid:r.estimatedValue||0,status:'Awaiting Brief',health:'On Track'})
  await api.save('leads',{...r,accountId:a!.id});onSaved()}
 const field=(f:Field)=>{const v=r[f.key]??'';
  if(f.type==='consent')return <div className="space-y-2">{[['whatsapp','WhatsApp messages'],['email','Email contact'],['terms','Terms and data processing']].map(([k,l])=><label key={k} className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#0b6b57]" checked={!!r.consent?.[k]} onChange={x=>set('consent',{...r.consent,[k]:x.target.checked?new Date().toISOString():null})}/>{l}</label>)}</div>
  if(f.type==='select'||f.type==='ref')return <select className={input} value={v} onChange={x=>set(f.key,x.target.value)}><option value="">Choose…</option>{f.type==='ref'?db[f.ref!].map(o=><option key={o.id} value={o.id}>{o.name||o.businessName}</option>):f.options!.map(o=><option key={o}>{o}</option>)}</select>
  if(f.type==='textarea')return <textarea rows={3} className={input} value={v} onChange={x=>set(f.key,x.target.value)}/>
  return <input className={input} type={f.type==='number'?'number':f.type} value={v} onChange={x=>set(f.key,f.type==='number'?x.target.value===''?'':+x.target.value:x.target.value)}/>}
 return <div className="fixed inset-0 z-20 flex justify-end bg-black/40" onClick={onClose}><div role="dialog" className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl" onClick={x=>x.stopPropagation()}>
  <div className="border-b border-stone-200 px-5 py-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{isNew?`New ${S.one}`:r.businessName||r.name||r.id}</h2><button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100">Close</button></div>
   {e==='leads'&&!isNew&&<div className="mt-3"><div className="flex gap-1">{STAGES.slice(0,8).map((s,i)=><div key={s} title={s} className={`h-1.5 flex-1 rounded ${r.status==='Lost'?'bg-red-300':i<=idx?'bg-brand':'bg-stone-200'}`}/>)}</div><p className="mt-1.5 text-xs text-stone-500">Stage: {r.status}</p></div>}</div>
  <div className="grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-5 sm:grid-cols-2">
   {e==='leads'&&r.status==='Paid / Won'&&!r.accountId&&<div className="rounded-xl bg-brand-soft p-3 text-sm sm:col-span-2"><b>Payment cleared.</b> Create the account, contact and job from this lead so production can start.<button disabled={busy} onClick={convert} className="mt-2 block rounded-lg bg-brand px-3 py-2 font-semibold text-white">Create account, contact and job</button></div>}
   {S.fields.filter(f=>!f.show||f.show(r)).map(f=><div key={f.key} className={f.wide?'sm:col-span-2':''}><label className="mb-1 block text-sm font-medium">{f.label}{(typeof f.req==='function'?f.req(r):f.req)&&<span className="text-red-600"> *</span>}</label>{field(f)}{err[f.key]&&<p className="mt-1 text-xs text-red-600">{err[f.key]}</p>}</div>)}
   {e==='jobs'&&<p className="text-sm text-stone-600 sm:col-span-2">Balance: <b>{naira(Number(r.contractValue||0)-Number(r.amountPaid||0))}</b></p>}</div>
  <div className="flex gap-2 border-t border-stone-200 p-4"><button disabled={busy} onClick={()=>save()} className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">{busy?'Saving…':`Save ${S.one}`}</button>
   {next&&<button onClick={()=>save({...r,status:next})} className="rounded-lg border border-brand px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand-soft">Move to {next}</button>}
   {!isNew&&<button onClick={del} className="rounded-lg border border-red-200 px-3 py-2.5 text-sm text-red-700 hover:bg-red-50">Delete</button>}</div></div></div>}
