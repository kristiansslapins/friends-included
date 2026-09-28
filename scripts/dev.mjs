import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import app from '../api/app.js';
import telegram from '../api/telegram.js';
try{process.loadEnvFile('.env.local');}catch{}
const root=resolve('public');const server=http.createServer(async(req,res)=>{
  res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/app'||path==='/api/telegram'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>20000){res.status(413).json({error:'Request too large'});return;}}
    try{req.body=body?JSON.parse(body):null;await(path==='/api/app'?app:telegram)(req,res);}catch{res.status(400).json({error:'Invalid request'});}return;
  }
  try{const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\'))throw Error();const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end('Not found');}
});server.listen(3000,'127.0.0.1',()=>console.log('Friends Included: http://localhost:3000'));
