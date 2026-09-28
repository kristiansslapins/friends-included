import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {employee,assert} from './domain.mjs';
function secret(){assert(process.env.SESSION_SECRET?.length>=32,'Set SESSION_SECRET to at least 32 random characters.');return process.env.SESSION_SECRET;}
function sign(data){return createHmac('sha256',secret()).update(data).digest('base64url');}
export function session(res,actor){employee(actor);const payload=Buffer.from(JSON.stringify({actor,expires:Date.now()+86400000,nonce:randomBytes(12).toString('hex')})).toString('base64url');
  res.setHeader('Set-Cookie',`fi_session=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.VERCEL?'; Secure':''}`);
}
export function actor(req){
  const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('fi_session='))?.slice(11);
  assert(cookie,'Select a demonstration role first.');const [payload,signature]=cookie.split('.');const expected=sign(payload);
  assert(signature&&signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected)),'Invalid session. Select your role again.');
  const data=JSON.parse(Buffer.from(payload,'base64url').toString());assert(data.expires>Date.now(),'Your session expired. Select your role again.');employee(data.actor);return data.actor;
}
export function sameOrigin(req){
  assert(req.headers['x-fi-request']==='1','Missing application request header.');
  const origin=req.headers.origin;if(origin)assert(new URL(origin).host===req.headers.host,'Cross-site requests are not allowed.');
}
