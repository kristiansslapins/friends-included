const {APP_URL,TELEGRAM_BOT_TOKEN,TELEGRAM_WEBHOOK_SECRET}=process.env;
function fail(message){console.error(message);process.exit(1);}
if(!APP_URL?.startsWith('https://')||!TELEGRAM_BOT_TOKEN||!TELEGRAM_WEBHOOK_SECRET)fail('Missing APP_URL, TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET.');
if(!/^[A-Za-z0-9_-]{1,256}$/.test(TELEGRAM_WEBHOOK_SECRET))fail('TELEGRAM_WEBHOOK_SECRET contains unsupported characters. Use only letters, numbers, underscores or hyphens; maximum 256 characters.');
if(!/^\d+:[A-Za-z0-9_-]+$/.test(TELEGRAM_BOT_TOKEN))fail('TELEGRAM_BOT_TOKEN format is invalid. Copy only the token from BotFather, without spaces.');
try {
 const r=await fetch('https://api.telegram.org/bot'+TELEGRAM_BOT_TOKEN+'/setWebhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:APP_URL.replace(/\/$/,'')+'/api/telegram',secret_token:TELEGRAM_WEBHOOK_SECRET,allowed_updates:['message']})});
 const body=await r.json();
 if(!body.ok){
  const reason=String(body.description||'').toLowerCase();
  if(reason.includes('secret'))fail('Telegram rejected TELEGRAM_WEBHOOK_SECRET. Use only letters, numbers, underscores or hyphens.');
  if(reason.includes('resolve'))fail('Telegram could not resolve the APP_URL hostname.');
  if(reason.includes('url')||reason.includes('https'))fail('Telegram rejected the webhook URL. Check APP_URL.');
  if(r.status===401||r.status===404)fail('Telegram rejected the bot token. Check TELEGRAM_BOT_TOKEN.');
  fail('Webhook setup failed (HTTP '+r.status+'). Check Telegram configuration.');
 }
 console.log('Telegram webhook connected. Send /start to the bot.');
}catch{fail('Telegram setup network request failed. Retry deployment.');}
