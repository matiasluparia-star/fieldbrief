import express from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { stat, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import os from 'node:os';

const execFileP = promisify(execFile);
const app = express();
const port = process.env.PORT || 10000;

const VIDEO_URL = 'https://dnznrvs05pmza.cloudfront.net/kling-3-0-standard/946236883674219181/untitled.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOTVkZjkxNzY1NDU2Nzc5ZSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5Mzc5NDU1MH0.cmj68ydnfNvJhLzYEJQQ_kvD6dEU3AJ_olbD02NNQIQ';
const VOICE_URL = 'https://dnznrvs05pmza.cloudfront.net/text_to_speech/cbbccf12-af39-4273-bbfa-d119219146de/PulsoGlobal_Binance_20s_v2.mp3?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNzY5NTA4MjZiNjI0MDIxZSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5Mzc4MjQzOH0.uBj6jENzfe3OfGdjFhpX8obNt1AMcAdsFoLdo1K3PLg';
const work = path.join(os.tmpdir(), 'pulsocut-binance');
const videoPath = path.join(work, 'visual.mp4');
const voicePath = path.join(work, 'voice.mp3');
const finalPath = path.join(work, 'PulsoGlobal_Binance_FINAL.mp4');

async function ensureDir(){
  const { mkdir } = await import('node:fs/promises');
  await mkdir(work,{recursive:true});
}
async function download(url,dest){
  const r = await fetch(url,{redirect:'follow'});
  if(!r.ok) throw new Error(`Download ${r.status}`);
  await new Promise((resolve,reject)=>{
    const out=createWriteStream(dest);
    Readable.fromWeb(r.body).pipe(out);
    out.on('finish',resolve); out.on('error',reject);
  });
}
async function probe(file){
  const {stdout}=await execFileP('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file]);
  return Number(stdout.trim());
}
async function build(){
  await ensureDir();
  await Promise.all([download(VIDEO_URL,videoPath),download(VOICE_URL,voicePath)]);
  const voiceDuration=await probe(voicePath);
  await execFileP('ffmpeg',[
    '-y','-i',videoPath,'-i',voicePath,
    '-filter_complex','[0:v]tpad=stop_mode=clone:stop_duration=5,fps=30,format=yuv420p[v]',
    '-map','[v]','-map','1:a:0','-t',String(voiceDuration),
    '-c:v','libx264','-preset','veryfast','-crf','20',
    '-c:a','aac','-b:a','192k','-ar','48000','-ac','2',
    '-movflags','+faststart',finalPath
  ],{maxBuffer:20*1024*1024});
  const finalDuration=await probe(finalPath);
  const s=await stat(finalPath);
  return {voiceDuration,finalDuration,size:s.size};
}

app.get('/health',(_req,res)=>res.json({ok:true,version:'binance-1'}));
app.get('/build-binance',async(_req,res)=>{
  try { const result=await build(); res.json({ok:true,...result,download:'/binance-final'}); }
  catch(e){ console.error(e); res.status(500).json({ok:false,error:String(e.message||e)}); }
});
app.get('/binance-final',async(_req,res)=>{
  try { await stat(finalPath); }
  catch { try { await build(); } catch(e){ return res.status(500).json({ok:false,error:String(e.message||e)}); } }
  res.setHeader('Content-Type','video/mp4');
  res.setHeader('Content-Disposition','attachment; filename="PulsoGlobal_Binance_FINAL.mp4"');
  res.sendFile(finalPath);
});
app.get('/',(_req,res)=>res.type('html').send('<h1>PulsoCut</h1><p>Binance render endpoint activo.</p>'));
app.listen(port,()=>console.log(`PulsoCut Binance server on :${port}`));
