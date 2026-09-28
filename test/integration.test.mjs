import test from 'node:test';
import a from 'node:assert/strict';
import {initialState,submit,approve,totals} from '../lib/domain.mjs';
import {syncReference} from '../lib/integrations.mjs';
import {mutate} from '../lib/store.mjs';
import {sales} from './fixtures.mjs';
import app from '../api/app.js';
import bot from '../api/telegram.js';
import {generateKeyPairSync} from 'node:crypto';
process.env.SUPABASE_URL='https://database.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';process.env.SESSION_SECRET='test-secret-that-is-over-32-characters';process.env.TELEGRAM_WEBHOOK_SECRET='test-webhook';
let db;const originalFetch=globalThis.fetch;
function reset(){db={revision:0,data:initialState()};globalThis.fetch=async(url,options={})=>{
  if(String(url).includes('/rest/v1/finance_state'))return Response.json([structuredClone(db)]);
  if(String(url).includes('/rest/v1/rpc/finance_commit')){const b=JSON.parse(options.body);if(b.expected_revision!==db.revision)return Response.json(false);db={revision:db.revision+1,data:b.new_data};return Response.json(true);}
  throw Error('Simulated external delivery failure');
};}
function response(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(b){this.body=b;return this;}};}
async function login(who){const res=response();await app({method:'POST',headers:{'x-fi-request':'1'},body:{action:'role',actor:who}},res);return res.headers['Set-Cookie'].split(';')[0];}
test.after(()=>globalThis.fetch=originalFetch);
test('Interrupted Sheets sync retains record, retry writes same row and does not change totals',async()=>{reset();await mutate(s=>submit(s,'richard',sales[0]));const before=totals(db.data.transactions);await syncReference('S01',{sheet:async()=>{throw Error('Simulated interruption');}});a.equal(db.data.transactions[0].sync,'failed');a.equal(db.data.transactions.length,1);const rows=[];await syncReference('S01',{sheet:async t=>rows.push(t.sheetRow)});a.deepEqual(rows,[2]);a.equal(db.data.transactions[0].sync,'synced');a.deepEqual(totals(db.data.transactions),before);});
test('Failed notification retains approved decision and is never marked sent until retry succeeds',async()=>{reset();await mutate(s=>submit(s,'richard',sales[0],{source:'telegram',chat:'100'}));await mutate(s=>approve(s,'svetlana','S01',{split:[50,30,20]}));await syncReference('S01',{sheet:async()=>{},send:async()=>{throw Error('Blocked');}});a.equal(db.data.transactions[0].status,'Approved');a.equal(db.data.jobs.find(j=>j.id==='S01:decision').status,'failed');const before=totals(db.data.transactions);await syncReference('S01',{send:async()=>{}});a.ok(db.data.jobs.every(j=>j.status==='sent'));a.deepEqual(totals(db.data.transactions),before);});
test('Concurrent transactions use compare-and-swap without lost updates',async()=>{reset();await Promise.all(sales.map(t=>mutate(s=>submit(s,t.actor,t))));a.equal(db.data.transactions.length,5);a.equal(new Set(db.data.transactions.map(t=>t.sheetRow)).size,5);});
test('Decision during Sheets write leaves new version pending until retry writes it',async()=>{reset();await mutate(s=>submit(s,'richard',sales[0]));await syncReference('S01',{sheet:async()=>{await mutate(s=>approve(s,'svetlana','S01',{split:[50,30,20]}));}});a.equal(db.data.transactions[0].sync,'pending');let status;await syncReference('S01',{sheet:async t=>status=t.status});a.equal(status,'Approved');a.equal(db.data.transactions[0].sync,'synced');});
test('HTTP processing layer ignores forged actor in request and restricts reads',async()=>{reset();await mutate(s=>submit(s,'richard',sales[0]));const cookie=await login('richard'),res=response();await app({method:'POST',headers:{cookie,'x-fi-request':'1'},body:{action:'approve',actor:'svetlana',ref:'S01',decision:{split:[50,30,20]}}},res);a.equal(res.statusCode,400);a.match(res.body.error,/Only Svetlana/);a.equal(db.data.transactions[0].status,'Pending approval');const kevin=await login('kevin'),read=response();await app({method:'GET',headers:{cookie:kevin}},read);a.equal(read.body.transactions.length,0);a.equal(read.body.totals,null);});
test('Real webhook handler rejects unlinked users and deduplicates Telegram update IDs',async()=>{reset();process.env.TELEGRAM_BOT_TOKEN='fake';const req={method:'POST',headers:{'x-telegram-bot-api-secret-token':'test-webhook'},body:{update_id:1,message:{from:{id:123},chat:{id:456,type:'private'},text:'/sale | S01 | Olivia Rose | A | Relatives | 1000 | 50 | 30/20'}}};await bot(req,response());a.equal(db.data.transactions.length,0);a.match(db.data.updates[0].reply,/not linked/);db.data.links.push({user:'123',chat:'456',employee:'richard'});req.body.update_id=2;await bot(req,response());await bot(req,response());a.equal(db.data.transactions.length,1);a.equal(db.data.transactions[0].source,'telegram');a.equal(db.data.transactions[0].chat,'456');});
test('Google adapter signs authorization, formats euros and overwrites the same row after approval',async()=>{
  reset();const databaseFetch=globalThis.fetch;const writes=[],formats=[];
  process.env.GOOGLE_PRIVATE_KEY=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.test';process.env.GOOGLE_SHEET_ID='test-sheet';
  globalThis.fetch=async(url,options)=>{
    if(String(url).startsWith('https://database.test'))return databaseFetch(url,options);
    if(String(url).includes('oauth2.googleapis.com'))return Response.json({access_token:'test-access',expires_in:3600});
    if(String(url).includes('?fields='))return Response.json({sheets:[{properties:{title:'Sales',sheetId:0}},{properties:{title:'Expenses',sheetId:1}}]});
    if(String(url).endsWith('/values:batchUpdate')){writes.push(JSON.parse(options.body));return Response.json({});}
    if(String(url).endsWith(':batchUpdate')){formats.push(JSON.parse(options.body));return Response.json({});}
    throw Error('Unexpected external request');
  };
  await mutate(s=>submit(s,'richard',sales[0]));await syncReference('S01');await mutate(s=>approve(s,'svetlana','S01',{split:[20,40,40]}));await syncReference('S01');
  a.equal(writes.length,2);a.equal(writes[0].valueInputOption,'RAW');a.equal(writes[0].data[1].range,"'Sales'!A2:R2");a.equal(writes[1].data[1].range,writes[0].data[1].range);a.equal(writes[1].data[1].values[0][17],'Approved');a.equal(formats.length,1);a.equal(db.data.transactions[0].sync,'synced');
});
