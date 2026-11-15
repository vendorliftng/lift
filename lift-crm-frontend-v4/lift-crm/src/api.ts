// Data layer. Leave VITE_API_URL empty to use browser-stored demo data; set it to your Hono Worker URL to go live.
import {Entity,Rec,SCHEMAS} from './lib'
const BASE=import.meta.env.VITE_API_URL as string|undefined
const ENT:Entity[]=['leads','accounts','contacts','jobs']
const ok=(w=true)=>w?{whatsapp:'2026-11-02T09:00:00Z',email:'2026-11-02T09:00:00Z',terms:'2026-11-02T09:00:00Z'}:{}
const seed:Record<Entity,Rec[]>={
leads:[{id:'LD-001',businessName:'Yola Fresh Mart',contactPerson:'Halima Musa',phone:'+2348031112222',source:'Field Visit',status:'Discovery',estimatedValue:45000,assignedTo:'Amina Bello',nextAction:'Send Business package quote',nextActionDue:'2026-11-04',consent:ok()},
 {id:'LD-002',businessName:'Jimeta Tailors',contactPerson:'Samuel Dauda',phone:'+2348055556666',email:'sam@jimeta.ng',source:'Agent Referral',referralCode:'AG-104',status:'New Lead',estimatedValue:20000,assignedTo:'Tunde Okafor',nextAction:'Call to qualify',nextActionDue:'2026-11-09',consent:ok()},
 {id:'LD-003',businessName:'Bright Pharmacy',contactPerson:'Dr. Ngozi Eze',phone:'+2348077778888',source:'Online Campaign',status:'Quote Sent',estimatedValue:75000,assignedTo:'Amina Bello',nextAction:'Follow up on deposit',nextActionDue:'2026-11-08',consent:ok()}],
accounts:[{id:'AC-001',name:'Sunrise Bakery',leadId:'',sector:'Food & Beverage',cac:'RC 1234567',phone:'+2348012340000',website:'sunrisebakery.ng',address:'12 Atiku Abubakar Way, Yola',assignedTo:'Tunde Okafor'},
 {id:'AC-002',name:'Bright Pharmacy',leadId:'LD-003',sector:'Health',phone:'+2348077778888',address:'Jimeta, Yola',assignedTo:'Amina Bello'}],
contacts:[{id:'CT-001',name:'Ada Obi',accountId:'AC-001',title:'Owner',phone:'+2348012340000',email:'ada@sunrisebakery.ng',assignedTo:'Tunde Okafor',consent:ok()},
 {id:'CT-002',name:'Dr. Ngozi Eze',accountId:'AC-002',title:'Managing Pharmacist',phone:'+2348077778888',assignedTo:'Amina Bello',consent:{whatsapp:'2026-11-02T09:00:00Z'}}],
jobs:[{id:'JB-001',accountId:'AC-001',package:'Business',contractValue:45000,amountPaid:25000,status:'In Production',health:'On Track',startDate:'2026-10-28',targetDate:'2026-11-12',productionOwner:'Grace Adamu',csOwner:'Ibrahim Musa'},
 {id:'JB-002',accountId:'AC-002',package:'Growth',contractValue:75000,amountPaid:75000,status:'Awaiting Brief',health:'Blocked',blockerNote:'Client has not sent logo or product photos.',startDate:'2026-11-02',targetDate:'2026-11-20',productionOwner:'Grace Adamu',csOwner:'Ibrahim Musa'}]}
const load=(e:Entity):Rec[]=>{const s=localStorage.getItem('lift:'+e);if(s)return JSON.parse(s);localStorage.setItem('lift:'+e,JSON.stringify(seed[e]));return seed[e]}
const put=(e:Entity,rows:Rec[])=>localStorage.setItem('lift:'+e,JSON.stringify(rows))
const json={'Content-Type':'application/json'}
export const api={
 async all(){const o={} as Record<Entity,Rec[]>;for(const e of ENT)o[e]=BASE?await(await fetch(`${BASE}/${e}`)).json():load(e);return o},
 async save(e:Entity,r:Rec){
  if(BASE){const x=await fetch(`${BASE}/${e}${r.id?'/'+r.id:''}`,{method:r.id?'PUT':'POST',headers:json,body:JSON.stringify(r)});return (await x.json()) as Rec}
  const rows=load(e)
  if(r.id){put(e,rows.map(x=>x.id===r.id?r:x));return r}
  const n=Math.max(0,...rows.map(x=>+x.id.split('-')[1]))+1
  const nr={...r,id:`${SCHEMAS[e].prefix}-${String(n).padStart(3,'0')}`};put(e,[nr,...rows]);return nr},
 async remove(e:Entity,id:string){if(BASE){await fetch(`${BASE}/${e}/${id}`,{method:'DELETE'});return}put(e,load(e).filter(x=>x.id!==id))}}
