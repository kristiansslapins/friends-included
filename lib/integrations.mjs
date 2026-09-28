import {createSign,randomUUID} from 'node:crypto';
import {mutate,read} from './store.mjs';
import {employees,assert} from './domain.mjs';
const leaseMs=120000;
let tokenCache;
let sheetReady=false;
async function googleToken(){
  if(tokenCache?.expires>Date.now()+60000)return tokenCache.value;
  assert(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_PRIVATE_KEY,'Google service account is not configured.');
  const now=Math.floor(Date.now()/1000);const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const data=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const signature=createSign('RSA-SHA256').update(data).sign(process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),'base64url');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:data+'.'+signature}),signal:AbortSignal.timeout(10000)});
  const body=await r.json();assert(r.ok&&body.access_token,`Google authorization failed (${r.status}). Check service-account credentials.`);
  tokenCache={value:body.access_token,expires:Date.now()+body.expires_in*1000};return tokenCache.value;
}
export const headers={sale:['Reference','Submission time','Salesperson','Customer','Project','Description','Amount EUR','Proposed Richard %','Proposed Anastasia %','Proposed Jean-Claude %','Approved Richard %','Approved Anastasia %','Approved Jean-Claude %','Richard earned EUR','Anastasia earned EUR','Jean-Claude earned EUR','Total commission EUR','Status'],expense:['Reference','Submission time','Reporter','Description','Category','Amount EUR','Proposed allocation','Final allocation','Status']};
export function sheetRow(t){const name=employees.find(e=>e.id===t.submitter).name;return t.kind==='sale'?[t.ref,t.createdAt,name,t.customer,t.project,t.description,t.amount/100,...t.proposedSplit.map(x=>x/100),...(t.approvedSplit?t.approvedSplit.map(x=>x/100):['','','']),...t.earned.map(x=>x/100),t.pool/100,t.status]:[t.ref,t.createdAt,name,t.description,t.category,t.amount/100,t.proposedAllocation,t.finalAllocation||'',t.status];}
async function writeSheet(t){
  assert(process.env.GOOGLE_SHEET_ID,'GOOGLE_SHEET_ID is not configured.');const token=await googleToken();
  const endpoint=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.GOOGLE_SHEET_ID)}`;
  if(!sheetReady){
    const meta=await fetch(endpoint+'?fields=sheets.properties',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    assert(meta.ok,`Google Sheets access failed (${meta.status}). Share the spreadsheet with the service-account email as Editor.`);
    const data=await meta.json();const requests=[];
    for(const name of ['Sales','Expenses']){
      const properties=data.sheets?.find(s=>s.properties.title===name)?.properties;
      assert(properties,`Create a tab named ${name} in your reporting spreadsheet.`);const sheetId=properties.sheetId;
      requests.push({updateSheetProperties:{properties:{sheetId,gridProperties:{frozenRowCount:1}},fields:'gridProperties.frozenRowCount'}});
      for(const [start,end] of name==='Sales'?[[6,7],[13,17]]:[[5,6]])requests.push({repeatCell:{range:{sheetId,startRowIndex:1,startColumnIndex:start,endColumnIndex:end},cell:{userEnteredFormat:{numberFormat:{type:'NUMBER',pattern:'"€"#,##0.00'}}},fields:'userEnteredFormat.numberFormat'}});
    }
    const format=await fetch(endpoint+':batchUpdate',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({requests}),signal:AbortSignal.timeout(10000)});
    assert(format.ok,`Google Sheets formatting failed (${format.status}). Check Editor access.`);sheetReady=true;
  }
  const tab=t.kind==='sale'?'Sales':'Expenses';const end=t.kind==='sale'?'R':'I';
  const body={valueInputOption:'RAW',data:[{range:`'${tab}'!A1:${end}1`,values:[headers[t.kind]]},{range:`'${tab}'!A${t.sheetRow}:${end}${t.sheetRow}`,values:[sheetRow(t)]}]};
  const r=await fetch(endpoint+'/values:batchUpdate',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  assert(r.ok,`Google Sheets update failed (${r.status}). Check sharing, the Sales and Expenses tabs, and API access.`);
}
export async function telegram(chat,text){
  assert(process.env.TELEGRAM_BOT_TOKEN,'Telegram bot token is not configured.');
  const r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text}),signal:AbortSignal.timeout(10000)});
  const body=await r.json();assert(r.ok&&body.ok,`Telegram delivery failed (${r.status}). The recipient must start the bot and must not block it.`);
}
// A stable row belongs to each reference. Claims prevent older concurrent writes
// from overwriting newer approvals. Changed versions remain pending for another pass.
export async function syncReference(ref,{sheet=writeSheet,send=telegram}={}){
  const claim=randomUUID();
  const t=await mutate(s=>{const x=s.transactions.find(t=>t.ref===ref);if(!x||x.sync==='synced'||(x.syncLease&&x.syncLease>Date.now()))return null;x.syncLease=Date.now()+leaseMs;x.syncClaim=claim;x.sync='pending';return structuredClone(x);});
  if(t){let error=null;try{await sheet(t);}catch(e){error=e.message;}
    await mutate(s=>{const x=s.transactions.find(t=>t.ref===ref);if(x.syncClaim===claim){x.syncLease=null;x.syncClaim=null;x.sync=x.version!==t.version?'pending':error?'failed':'synced';x.syncError=error;}});
  }
  const jobs=(await read()).data.jobs.filter(j=>j.ref===ref&&j.status!=='sent').map(j=>j.id);
  for(const id of jobs){
    const key=randomUUID();const job=await mutate(s=>{const j=s.jobs.find(j=>j.id===id);if(j.status==='sent'||j.lease>Date.now())return null;j.lease=Date.now()+leaseMs;j.claim=key;j.status='pending';j.attempts++;return structuredClone(j);});
    if(!job)continue;let error=null;try{await send(job.chat,job.text);}catch(e){error=e.message;}
    await mutate(s=>{const j=s.jobs.find(j=>j.id===id);if(j.claim===key){j.lease=null;j.status=error?'failed':'sent';j.error=error;j.sentAt=error?null:new Date().toISOString();}});
  }
}
