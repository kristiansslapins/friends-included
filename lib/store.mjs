import {assert} from './domain.mjs';
export async function db(path,options={}){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url&&key,'Supabase is not configured. Follow SETUP.md to connect the database.');
  const headers={'apikey':key,'Content-Type':'application/json',...options.headers};
  if(key.startsWith('eyJ'))headers.Authorization=`Bearer ${key}`;
  const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers,signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error(`Database request failed (${r.status}). Check the server configuration and schema.`);
  return r.status===204?null:r.json();
}
export async function read(){const rows=await db('finance_state?id=eq.1&select=revision,data');assert(rows.length===1,'Run supabase/schema.sql first.');return rows[0];}
export async function mutate(fn){
  for(let attempt=0;attempt<12;attempt++){
    const {revision,data}=await read();const result=fn(data);
    const ok=await db('rpc/finance_commit',{method:'POST',body:JSON.stringify({expected_revision:revision,new_data:data})});
    if(ok)return result;
  }
  throw new Error('Another update is in progress. Please retry.');
}
