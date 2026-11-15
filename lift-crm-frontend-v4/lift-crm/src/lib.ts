export type Entity='leads'|'accounts'|'contacts'|'jobs'
export type Rec=Record<string,any>
export type Field={key:string;label:string;type:'text'|'tel'|'email'|'number'|'date'|'select'|'ref'|'textarea'|'consent';options?:string[];ref?:Entity;req?:boolean|((r:Rec)=>boolean);wide?:boolean;show?:(r:Rec)=>boolean}
export type Schema={title:string;one:string;prefix:string;fields:Field[];cols:string[];badge:string;money?:string;kpi:(rows:Rec[])=>[string,string|number][]}
export const naira=(n:any)=>'₦'+Number(n||0).toLocaleString('en-NG')
export const STAFF=['Amina Bello','Tunde Okafor','Grace Adamu','Ibrahim Musa']
export const STAGES=['New Lead','Qualified','Discovery','Quote Sent','Paid / Won','Production','QA Review','Accepted / Live','Lost']
const SOURCES=['Agent Referral','Field Visit','Online Campaign','Customer Referral','Partnership','Direct']
const LOST=['Price','No response','Competitor','Not ready','Wrong fit','Other']
const SECTORS=['Retail','Food & Beverage','Health','Fashion','Education','Professional Services','Other']
const PACKAGES=['Starter','Business','Growth','ERP System','WhatShop','Custom Combo']
const isRef=(r:Rec)=>['Agent Referral','Customer Referral'].includes(r.source)
const overdue=(r:Rec)=>r.status!=='Lost'&&r.nextActionDue&&new Date(r.nextActionDue)<new Date(new Date().toDateString())
const sum=(rows:Rec[],k:string)=>rows.reduce((a,r)=>a+Number(r[k]||0),0)
const t=(key:string,label:string,o:Partial<Field>={}):Field=>({key,label,type:'text',...o})
export const SCHEMAS:Record<Entity,Schema>={
leads:{title:'Leads',one:'lead',prefix:'LD',badge:'status',money:'estimatedValue',cols:['businessName','status','assignedTo','estimatedValue','nextActionDue'],
 kpi:r=>[['Leads',r.length],['Pipeline value',naira(sum(r,'estimatedValue'))],['Overdue next actions',r.filter(overdue).length]],
 fields:[t('businessName','Business name',{req:true}),t('contactPerson','Contact person',{req:true}),t('phone','Phone (WhatsApp / call)',{type:'tel',req:true}),t('email','Email',{type:'email'}),
 t('source','Lead source',{type:'select',options:SOURCES,req:true}),t('referralCode','Agent / referral code',{show:isRef,req:isRef}),
 t('status','Lead status',{type:'select',options:STAGES,req:true}),t('lostReason','Lost reason',{type:'select',options:LOST,show:r=>r.status==='Lost',req:r=>r.status==='Lost'}),
 t('estimatedValue','Estimated value (₦)',{type:'number'}),t('assignedTo','Assigned staff',{type:'select',options:STAFF,req:true}),
 t('nextAction','Next action',{req:true}),t('nextActionDue','Next action due',{type:'date',req:true}),t('consent','Customer consent',{type:'consent',req:true,wide:true})]},
accounts:{title:'Accounts',one:'account',prefix:'AC',badge:'sector',cols:['name','sector','phone','assignedTo'],
 kpi:r=>[['Accounts',r.length],['With a website',r.filter(x=>x.website).length]],
 fields:[t('name','Business / account name',{req:true}),t('leadId','Originating lead',{type:'ref',ref:'leads'}),t('sector','Sector',{type:'select',options:SECTORS}),t('cac','CAC number'),
 t('phone','Phone',{type:'tel'}),t('website','Current website'),t('address','Address',{wide:true}),t('assignedTo','Assigned staff',{type:'select',options:STAFF,req:true})]},
contacts:{title:'Contacts',one:'contact',prefix:'CT',badge:'title',cols:['name','accountId','title','phone','assignedTo'],
 kpi:r=>[['Contacts',r.length],['Consent fully recorded',r.filter(x=>x.consent?.whatsapp&&x.consent?.email&&x.consent?.terms).length]],
 fields:[t('name','Full name',{req:true}),t('accountId','Account',{type:'ref',ref:'accounts',req:true}),t('title','Role / title'),t('phone','Phone',{type:'tel'}),t('email','Email',{type:'email'}),
 t('assignedTo','Assigned staff',{type:'select',options:STAFF,req:true}),t('consent','Consent status',{type:'consent',wide:true})]},
jobs:{title:'Jobs',one:'job',prefix:'JB',badge:'status',money:'contractValue',cols:['accountId','package','status','health','balance','targetDate'],
 kpi:r=>[['Active jobs',r.filter(x=>!['Accepted / Live','Cancelled'].includes(x.status)).length],['Contract value',naira(sum(r,'contractValue'))],['At risk or blocked',r.filter(x=>x.health&&x.health!=='On Track').length]],
 fields:[t('accountId','Account',{type:'ref',ref:'accounts',req:true}),t('package','Package',{type:'select',options:PACKAGES,req:true}),t('contractValue','Contract value (₦)',{type:'number',req:true}),t('amountPaid','Amount paid (₦)',{type:'number'}),
 t('status','Job status',{type:'select',options:['Awaiting Brief','In Production','In QA','Awaiting Client Approval','Accepted / Live','On Hold','Cancelled'],req:true}),
 t('health','Health',{type:'select',options:['On Track','At Risk','Blocked'],req:true}),t('blockerNote','Blocker note',{type:'textarea',wide:true,show:r=>r.health==='At Risk'||r.health==='Blocked',req:r=>r.health==='At Risk'||r.health==='Blocked'}),
 t('startDate','Start date',{type:'date'}),t('targetDate','Target delivery date',{type:'date',req:true}),t('productionOwner','Production owner',{type:'select',options:STAFF,req:true}),t('csOwner','Customer success owner',{type:'select',options:STAFF,req:true})]}}
export function validate(e:Entity,r:Rec,db:Record<Entity,Rec[]>){
 const out:Record<string,string>={}
 for(const f of SCHEMAS[e].fields){ if(f.show&&!f.show(r)) continue
  const v=r[f.key], req=typeof f.req==='function'?f.req(r):f.req
  if(f.type==='consent'){ if(req&&!['whatsapp','email','terms'].every(k=>v?.[k])) out[f.key]='Record all three consents before saving'; continue }
  if(req&&(v===undefined||v===null||v==='')){out[f.key]='Required';continue}
  if(f.type==='email'&&v&&!/^\S+@\S+\.\S+$/.test(v)) out[f.key]='Enter a valid email address'}
 if(e==='leads'&&r.phone&&db.leads.some(l=>l.id!==r.id&&l.phone===r.phone)) out.phone='This phone number already exists in Leads'
 if(e==='jobs'&&Number(r.amountPaid)>Number(r.contractValue)) out.amountPaid='Cannot be more than the contract value'
 return out}
