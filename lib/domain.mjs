export const employees = [
  {id:'svetlana',name:'Svetlana de Monte Carlo',role:'manager'},
  {id:'richard',name:'Richard Darling',role:'sales'},
  {id:'anastasia',name:'Anastasia Ferrari',role:'sales'},
  {id:'jean',name:'Jean-Claude Bērziņš',role:'sales'},
  {id:'kevin',name:'Kevin von Whatever',role:'expense'}
];
export const salespeople = employees.filter(e=>e.role==='sales');
export const initialState = () => ({transactions:[],links:[],chats:[],jobs:[],updates:[],nextRow:{sale:2,expense:2}});
export function assert(value,message){if(!value) throw new Error(message);}
export function employee(id){const e=employees.find(x=>x.id===id);assert(e,'Select a valid demonstration role.');return e;}
export const money = cents => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(cents/100);
export function amount(value){
  const s=String(value??'').trim();
  assert(/^\d+(\.\d{1,2})?$/.test(s),'Enter a positive amount with at most two decimal places.');
  const [whole,part='']=s.split('.'); const n=Number(whole)*100+Number(part.padEnd(2,'0'));
  assert(Number.isSafeInteger(n)&&n>0&&n<=100000000000,'Amount must be greater than zero and at most €1 billion.');return n;
}
export function split(values){
  assert(Array.isArray(values)&&values.length===3,'Enter all three commission percentages.');
  const v=values.map(x=>{assert(/^\d+(\.\d{1,2})?$/.test(String(x).trim()),'Percentages require numbers with at most two decimals.');return Math.round(Number(x)*100);});
  assert(v.every(x=>x>=0&&x<=10000)&&v.reduce((a,b)=>a+b,0)===10000,'Commission shares must each be 0–100% and total 100%.');return v;
}
export function commission(cents,shares){
  const pool=Math.round(cents/10); const earned=shares.map(x=>Math.round(pool*x/10000));
  const largest=shares.indexOf(Math.max(...shares));earned[largest]+=pool-earned.reduce((a,b)=>a+b,0);return {pool,earned};
}
function required(value,label){assert(typeof value==='string'&&value.trim().length>0,`${label} is required.`);assert(value.trim().length<=500,`${label} is too long.`);return value.trim();}
function allocation(v){assert(['A','B','Company overhead'].includes(v),'Select A, B or Company overhead.');return v;}
export function linkedChat(s,id){return s.links.find(l=>l.employee===id)?.chat??null;}
function queue(s,job){if(!s.jobs.some(j=>j.id===job.id))s.jobs.push({...job,status:'pending',attempts:0,error:null});}
export function submit(s,actor,input,origin={source:'website'},now=new Date().toISOString()){
  const who=employee(actor);const kind=input.kind;
  assert((kind==='sale'&&who.role==='sales')||(kind==='expense'&&who.role==='expense'),'Your selected role cannot submit this transaction type.');
  const ref=required(input.ref,'Reference').toUpperCase();assert(/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(ref),'Use letters, numbers, underscores or hyphens in the reference.');
  assert(!s.transactions.some(t=>t.ref===ref),'This reference already exists. Use a unique reference.');
  const t={ref,kind,submitter:actor,description:required(input.description,'Description'),amount:amount(input.amount),createdAt:now,source:origin.source,
    chat:origin.source==='telegram'?String(origin.chat):linkedChat(s,actor),telegramUser:origin.user??null,version:1,sheetRow:s.nextRow[kind],sync:'pending'};
  if(kind==='sale') Object.assign(t,{customer:required(input.customer,'Customer'),project:allocation(input.project),proposedSplit:split(input.split),approvedSplit:null,earned:[0,0,0],pool:0,status:'Pending approval'});
  else Object.assign(t,{category:required(input.category,'Category'),proposedAllocation:allocation(input.allocation),finalAllocation:input.allocation==='Company overhead'?'Company overhead':null,status:input.allocation==='Company overhead'?'Allocated':'Awaiting allocation'});
  assert(kind!=='sale'||['A','B'].includes(t.project),'Sales must belong to project A or B.');
  assert(kind!=='expense'||['Materials','Travel','Other'].includes(t.category),'Select Materials, Travel or Other.');
  s.nextRow[kind]++;s.transactions.push(t);
  if(t.chat)queue(s,{id:`${ref}:submission`,ref,channel:'telegram',chat:t.chat,text:`Recorded ${ref}: ${money(t.amount)}. ${t.project||t.proposedAllocation}. ${t.status}.`});
  return t;
}
export function approve(s,actor,ref,decision,now=new Date().toISOString()){
  assert(employee(actor).role==='manager','Only Svetlana can approve transactions.');
  const t=s.transactions.find(x=>x.ref===ref);assert(t,'Transaction not found.');
  if(['Approved','Allocated'].includes(t.status))return t;
  if(t.kind==='sale'){
    const final=split(decision.split);Object.assign(t,{approvedSplit:final,...commission(t.amount,final),status:'Approved'});
  }else Object.assign(t,{finalAllocation:allocation(decision.allocation),status:'Allocated'});
  Object.assign(t,{approvedBy:actor,approvedAt:now,version:t.version+1,sync:'pending'});
  // Bot destinations are immutable. A website entry with no original recipient may use a later link.
  const chat=t.chat||(t.source==='website'?linkedChat(s,t.submitter):null);
  t.decisionChat=chat;
  if(chat)queue(s,{id:`${ref}:decision`,ref,channel:'telegram',chat,text:decisionMessage(t)});
  return t;
}
export function decisionMessage(t){
  if(t.kind==='expense')return `Expense ${t.ref} — allocation ${t.proposedAllocation===t.finalAllocation?'confirmed':'changed'}. ${money(t.amount)}: ${t.description}. Proposed: ${t.proposedAllocation}. Approved: ${t.finalAllocation}.`;
  const changed=t.proposedSplit.some((x,i)=>x!==t.approvedSplit[i]);
  return `Sale ${t.ref} approved — commission split ${changed?'changed':'unchanged'}. Sale ${money(t.amount)}; total commission ${money(t.pool)}. `+salespeople.map((p,i)=>`${p.name}: ${t.proposedSplit[i]/100}% → ${t.approvedSplit[i]/100}% (${money(t.earned[i])}).`).join(' ');
}
export function link(s,actor,{user,employee:emp}){
  assert(employee(actor).role==='manager','Only Svetlana can link Telegram accounts.');employee(emp);
  assert(/^\d+$/.test(String(user)),'Enter the numeric Telegram user ID shown by /start.');
  const chat=s.chats.find(c=>c.user===String(user));assert(chat,'That user must first send /start to this bot in a private chat.');
  s.links=s.links.filter(l=>l.user!==String(user)&&l.employee!==emp);s.links.push({user:String(user),chat:chat.chat,employee:emp});
}
export function totals(transactions){
  const result={A:{income:0,commissions:0,expenses:0,result:0},B:{income:0,commissions:0,expenses:0,result:0},income:0,commissions:0,expenses:0,overhead:0,awaiting:0,pendingSales:0,result:0,earned:[0,0,0]};
  for(const t of transactions){
    if(t.kind==='sale'){
      if(t.status!=='Approved'){result.pendingSales+=t.amount;continue;}
      result.income+=t.amount;result.commissions+=t.pool;result[t.project].income+=t.amount;result[t.project].commissions+=t.pool;t.earned.forEach((n,i)=>result.earned[i]+=n);
    }else {result.expenses+=t.amount;if(!t.finalAllocation)result.awaiting+=t.amount;else if(t.finalAllocation==='Company overhead')result.overhead+=t.amount;else result[t.finalAllocation].expenses+=t.amount;}
  }
  for(const p of ['A','B']) result[p].result=result[p].income-result[p].commissions-result[p].expenses;
  result.result=result.income-result.commissions-result.expenses;return result;
}
export function view(s,actor){
  const manager=employee(actor).role==='manager';const records=s.transactions.filter(t=>manager||t.submitter===actor);
  return {employees,transactions:records.map(t=>({...t,notifications:s.jobs.filter(j=>j.ref===t.ref).map(({id,status,error,attempts})=>({id,status,error,attempts})),recipient:t.decisionChat||t.chat?'Linked':'No Telegram recipient linked'})),
    totals:manager?totals(s.transactions):null,links:manager?s.links:undefined,chats:manager?s.chats:undefined};
}
export function parseCommand(text){
  const parts=text.split('|').map(x=>x.trim());const command=parts.shift()?.toLowerCase();
  if(command==='/sale'){assert(parts.length===7,'Use /sale | reference | customer | A or B | description | amount | Richard% | Anastasia%/Jean% (see /help).');
    const [ref,customer,project,description,amount,r,others]=parts;const tail=others.split('/').map(x=>x.trim());assert(tail.length===2,'Last field must be Anastasia%/Jean-Claude%.');return {kind:'sale',ref,customer,project,description,amount,split:[r,...tail]};}
  if(command==='/expense'){assert(parts.length===5,'Use /expense | reference | description | amount | Materials/Travel/Other | A/B/Company overhead');const [ref,description,amount,category,allocation]=parts;return {kind:'expense',ref,description,amount,category,allocation};}
  throw new Error('Unknown command. Send /help for examples.');
}
