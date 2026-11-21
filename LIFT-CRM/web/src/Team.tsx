import {useEffect,useState} from 'react'
import {ROLES,Role} from './Auth'
const BASE=import.meta.env.VITE_API_URL as string|undefined
const hd=()=>({'Content-Type':'application/json',Authorization:'Bearer '+sessionStorage.getItem('lift:token')})
type P={id:string,name:string,email:string,role:Role,active:number,invite_code?:string|null}
const inp='w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
export default function Team(){
 const [rows,setRows]=useState<P[]>([]),[f,setF]=useState({name:'',email:'',role:'sales'}),[res,setRes]=useState<{inviteCode:string,setupKey:string,email:string}|null>(null),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState('')
 const load=async()=>{if(!BASE)return;const r=await fetch(BASE+'/users',{headers:hd()});if(r.ok)setRows(await r.json())}
 useEffect(()=>{load()},[])
 if(!BASE)return <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">Team management needs the back end. Add <b>VITE_API_URL</b> to web/.env and restart the front end.</p>
 const invite=async()=>{setErr('');setBusy(true);try{const r=await fetch(BASE+'/users',{method:'POST',headers:hd(),body:JSON.stringify(f)}),d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'Could not create the invitation.');setRes({...d,email:f.email});setF({name:'',email:'',role:'sales'});load()}catch(e:any){setErr(e.message)}setBusy(false)}
 const cancel=async(id:string)=>{if(!confirm('Cancel this invitation?'))return;await fetch(BASE+'/users/'+id,{method:'DELETE',headers:hd()});load()}
 const copy=(k:string,t:string)=>{navigator.clipboard.writeText(t);setCopied(k);setTimeout(()=>setCopied(''),1500)}
 const msg=res?`Hi, you have been invited to Lift (VendorLift).\n1. Add this setup key to your authenticator app, as a time-based key: ${res.setupKey}\n2. On the sign-in page, click "Have an invitation?"\n3. Invitation code: ${res.inviteCode}\n4. Use this email: ${res.email}`:''
 return <div className="mx-auto max-w-4xl"><h1 className="text-3xl font-semibold tracking-tight">Team</h1><p className="mb-6 text-sm text-zinc-500">Invite staff and choose what they can access.</p>
  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">Invite someone</h2>
   <div className="grid gap-3 sm:grid-cols-3"><div><label className="mb-1 block text-sm font-medium">Full name</label><input className={inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
    <div><label className="mb-1 block text-sm font-medium">Work email</label><input type="email" className={inp} value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
    <div><label className="mb-1 block text-sm font-medium">Role</label><select className={inp} value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{(Object.keys(ROLES) as Role[]).map(r=><option key={r} value={r}>{ROLES[r]}</option>)}</select></div></div>
   {err&&<p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}<button disabled={busy||!f.email} onClick={invite} className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-dark disabled:opacity-60">{busy?'Creating…':'Create invitation'}</button></div>
  {res&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">Invitation ready for {res.email}</h2><p className="mb-3 text-sm text-amber-900">Copy this now and send it privately. The setup key is shown only once.</p>
   <div className="space-y-2 text-sm">{[['Invitation code',res.inviteCode],['Setup key',res.setupKey]].map(([l,v])=><div key={l} className="flex items-center justify-between gap-3 rounded-md bg-white p-3"><div className="min-w-0"><div className="text-xs text-zinc-500">{l}</div><div className="break-all font-mono font-medium">{v}</div></div><button onClick={()=>copy(l,v)} className="shrink-0 text-xs font-medium text-brand">{copied===l?'Copied':'Copy'}</button></div>)}</div>
   <button onClick={()=>copy('msg',msg)} className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900">{copied==='msg'?'Message copied':'Copy full message to send'}</button></div>}
  <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">{rows.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5 text-sm last:border-0"><div><div className="font-semibold text-brand-dark">{p.name||p.email}</div><div className="text-zinc-500">{p.email} · {ROLES[p.role]}</div></div>
   <div className="flex items-center gap-3">{p.active?<span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>:<><span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Invited · code {p.invite_code}</span><button onClick={()=>cancel(p.id)} className="text-xs font-medium text-red-700">Cancel</button></>}</div></div>)}
   {!rows.length&&<p className="p-8 text-center text-sm text-zinc-500">No team members yet.</p>}</div></div>}
