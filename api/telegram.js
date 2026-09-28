import {timingSafeEqual} from 'node:crypto';
import {mutate} from '../lib/store.mjs';
import {parseCommand,submit} from '../lib/domain.mjs';
import {telegram,syncReference} from '../lib/integrations.mjs';
const help=`Send one message using these formats (amounts in euros):\n/sale | S01 | Olivia Rose | A | One proud uncle and an emotional grandmother | 1000 | 50 | 30/20\n/expense | E01 | Rented suit and fake pearl necklace for the relatives | 120 | Materials | A\nSales splits are Richard | Anastasia/Jean-Claude. Only linked employees can submit. Ask Svetlana to link the user ID shown by /start.`;
export default async function handler(req,res){
  const expected=process.env.TELEGRAM_WEBHOOK_SECRET||'',given=req.headers['x-telegram-bot-api-secret-token']||'';
  if(req.method!=='POST'||!expected||given.length!==expected.length||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return res.status(403).json({error:'Forbidden'});
  const u=typeof req.body==='string'?JSON.parse(req.body):req.body;const m=u?.message;
  if(!m?.text||m.chat.type!=='private')return res.status(200).json({ok:true});
  try{
    const result=await mutate(s=>{
      const old=s.updates.find(x=>x.id===u.update_id);if(old)return old;
      const user=String(m.from.id),chat=String(m.chat.id);let result={id:u.update_id,ref:null,reply:null};
      if(m.text==='/start'||m.text==='/help'){
        s.chats=s.chats.filter(c=>c.user!==user);s.chats.push({user,chat});result.reply=`Your Telegram user ID: ${user}\n${help}`;
      }else try{
        const actor=s.links.find(l=>l.user===user)?.employee;if(!actor)throw new Error('Your Telegram account is not linked. Send /start, then ask Svetlana to link your user ID.');
        result.ref=submit(s,actor,parseCommand(m.text),{source:'telegram',chat,user}).ref;
      }catch(e){result.reply=`Not recorded: ${e.message}`;}
      s.updates.push(result);return result;
    });
    if(result.ref)await syncReference(result.ref);else if(result.reply)await telegram(String(m.chat.id),result.reply);
    return res.status(200).json({ok:true});
  }catch{ return res.status(503).json({error:'Temporary processing failure. Telegram may retry.'}); }
}
