import test from 'node:test';
import a from 'node:assert/strict';
import {initialState,submit,approve,link,totals,view,commission,split,parseCommand,decisionMessage} from '../lib/domain.mjs';
import {sheetRow} from '../lib/integrations.mjs';
import {sales,expenses} from './fixtures.mjs';
function first(){const s=initialState();for(const t of sales.slice(0,2))submit(s,t.actor,t);for(const t of expenses.slice(0,3))submit(s,'kevin',t);return s;}
function decideFirst(s){approve(s,'svetlana','S01',{split:[50,30,20]});approve(s,'svetlana','S02',{split:[20,40,40]});approve(s,'svetlana','E01',{allocation:'A'});approve(s,'svetlana','E02',{allocation:'A'});return s;}
test('Test 1 before decisions includes all paid expenses, no pending sales',()=>{const n=totals(first().transactions);a.equal(n.result,-30000);a.equal(n.A.result,0);a.equal(n.B.result,0);a.equal(n.income,0);a.equal(n.commissions,0);a.equal(n.awaiting,20000);a.equal(n.overhead,10000);});
test('Test 1 final results and original proposals',()=>{const s=decideFirst(first()),n=totals(s.transactions);a.equal(n.A.result,70000);a.equal(n.B.result,180000);a.equal(n.result,240000);a.deepEqual(n.earned,[9000,11000,10000]);a.deepEqual(s.transactions[1].proposedSplit,[0,5000,5000]);a.equal(s.transactions.find(t=>t.ref==='E02').proposedAllocation,'B');});
test('Both tests cumulative results and pending records',()=>{
  const s=decideFirst(first());for(const t of sales.slice(2))submit(s,t.actor,t);for(const t of expenses.slice(3))submit(s,'kevin',t);
  approve(s,'svetlana','S03',{split:[20,30,50]});approve(s,'svetlana','S04',{split:[25,25,50]});approve(s,'svetlana','E04',{allocation:'B'});approve(s,'svetlana','E05',{allocation:'B'});
  const n=totals(s.transactions);a.deepEqual(n.A,{income:250000,commissions:25000,expenses:20000,result:205000});a.deepEqual(n.B,{income:280000,commissions:28000,expenses:34000,result:218000});
  a.equal(n.result,393000);a.equal(n.income,530000);a.equal(n.commissions,53000);a.equal(n.expenses,84000);a.equal(n.overhead,16000);a.equal(n.awaiting,14000);a.equal(n.pendingSales,60000);a.deepEqual(n.earned,[14000,17500,21500]);
  a.equal(n.A.result+n.B.result-n.overhead-n.awaiting,n.result);
  a.match(decisionMessage(s.transactions.find(t=>t.ref==='S03')),/split changed/);a.match(decisionMessage(s.transactions.find(t=>t.ref==='E05')),/Proposed: A. Approved: B/);
  a.equal(s.jobs.filter(j=>['S05:decision','E07:decision'].includes(j.id)).length,0);
});
test('Processing layer denies invalid shares, roles, values and duplicate references without changing totals',()=>{
  const s=first();const before=structuredClone(s);
  for(const f of [()=>submit(s,'richard',{...sales[0],ref:'BAD',split:[60,30,20]}),()=>approve(s,'richard','S01',{split:[50,30,20]}),()=>submit(s,'kevin',{...sales[0],ref:'BAD'}),()=>submit(s,'kevin',{...expenses[0],ref:'BAD',amount:''}),()=>submit(s,'kevin',{...expenses[0],ref:'BAD',amount:0}),()=>submit(s,'richard',sales[0]),()=>submit(s,'richard',{...sales[0],ref:'BAD',customer:''})])a.throws(f);
  a.deepEqual(s,before);
});
test('Repeated approvals are no-ops, including queue entries',()=>{const s=first();s.transactions[0].chat='123';decideFirst(s);const before=structuredClone(s);approve(s,'svetlana','S01',{split:[100,0,0]});approve(s,'svetlana','E01',{allocation:'B'});a.deepEqual(s,before);});
test('Role views expose only own records and no company totals or account links',()=>{const s=first();const v=view(s,'richard');a.equal(v.transactions.length,1);a.equal(v.totals,null);a.equal(v.links,undefined);a.equal(v.chats,undefined);a.equal(view(s,'svetlana').transactions.length,5);});
test('Bot ownership and chat destination survive account relinking',()=>{const s=initialState();s.chats.push({user:'123',chat:'456'});link(s,'svetlana',{user:'123',employee:'richard'});submit(s,'richard',sales[0],{source:'telegram',user:'123',chat:'456'});link(s,'svetlana',{user:'123',employee:'kevin'});approve(s,'svetlana','S01',{split:[50,30,20]});a.equal(s.transactions[0].submitter,'richard');a.equal(s.transactions[0].chat,'456');a.equal(s.jobs.find(j=>j.id==='S01:decision').chat,'456');a.throws(()=>link(s,'kevin',{user:'123',employee:'richard'}));a.throws(()=>link(s,'svetlana',{user:'999',employee:'jean'}));});
test('Website recipient can be linked before decision, missing recipient is explicit',()=>{const s=initialState();submit(s,'jean',sales[2]);a.equal(view(s,'jean').transactions[0].recipient,'No Telegram recipient linked');s.chats.push({user:'123',chat:'456'});link(s,'svetlana',{user:'123',employee:'jean'});approve(s,'svetlana','S03',{split:[20,30,50]});a.equal(s.jobs[0].chat,'456');});
test('Cent rounding preserves pool and uses deterministic largest-share tie order',()=>{a.deepEqual(commission(5,[5000,5000,0]),{pool:1,earned:[0,1,0]});a.deepEqual(commission(101,[4000,3000,3000]),{pool:10,earned:[4,3,3]});for(let cents=1;cents<1000;cents++){const c=commission(cents,[3334,3333,3333]);a.equal(c.earned.reduce((a,b)=>a+b,0),c.pool);}a.throws(()=>split(['',50,50]));});
test('Telegram parsing and sheet columns preserve all original and approved values',()=>{const input=parseCommand('/sale | S01 | Olivia Rose | A | Relatives | 1000 | 50 | 30/20');a.deepEqual(input.split,['50','30','20']);const s=initialState();const t=submit(s,'richard',input);a.deepEqual(sheetRow(t).slice(10,13),['','','']);a.deepEqual(sheetRow(t).slice(13,17),[0,0,0,0]);approve(s,'svetlana','S01',{split:[20,40,40]});a.deepEqual(sheetRow(t).slice(7,13),[50,30,20,20,40,40]);});
