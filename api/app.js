import {actor,session,sameOrigin} from '../lib/auth.mjs';
import {approve,assert,employee,link,submit,view} from '../lib/domain.mjs';
import {read,mutate} from '../lib/store.mjs';
import {syncReference} from '../lib/integrations.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method==='GET'){
      const who=actor(req);const state=(await read()).data;
      return res.status(200).json({...view(state,who),actor:who,config:{student:process.env.PUBLIC_STUDENT_NAME||'Kristiāns Šlāpins',bot:process.env.PUBLIC_BOT_USERNAME||'',github:process.env.PUBLIC_GITHUB_URL||'',sheet:process.env.GOOGLE_SHEET_ID||''}});
    }
    assert(req.method==='POST','Method not allowed.');sameOrigin(req);const body=typeof req.body==='string'?JSON.parse(req.body):req.body;assert(body,'Request body is required.');
    if(body.action==='role'){session(res,body.actor);return res.status(200).json({ok:true});}
    const who=actor(req);let ref;
    if(body.action==='submit')ref=(await mutate(s=>submit(s,who,body.transaction))).ref;
    else if(body.action==='approve')ref=(await mutate(s=>approve(s,who,body.ref,body.decision))).ref;
    else if(body.action==='link')await mutate(s=>link(s,who,body.link));
    else if(body.action==='retry'){
      const t=(await read()).data.transactions.find(t=>t.ref===body.ref);assert(t,'Transaction not found.');assert(employee(who).role==='manager'||t.submitter===who,'You cannot retry another employee’s record.');ref=t.ref;
    }else throw new Error('Unknown action.');
    // External failures never undo a committed transaction or manager decision.
    let warning=null;if(ref)try{await syncReference(ref);}catch{warning='Saved. Delivery is pending; use Retry on the record.';}
    return res.status(200).json({ok:true,ref,warning});
  }catch(e){return res.status(400).json({error:e.message});}
}
