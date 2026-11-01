import express from 'express';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, writeFile, stat, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execFileP = promisify(execFile);
const app = express();
const port = process.env.PORT || 10000;
let job = {status:'idle'};
let outputPath = null;

async function exec(cmd,args){
  try{return await execFileP(cmd,args,{maxBuffer:20*1024*1024});}
  catch(e){throw new Error((e.stderr||e.message||'command failed').slice(-5000));}
}
async function duration(file){
  const {stdout}=await exec('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file]);
  const n=Number(stdout.trim()); if(!Number.isFinite(n)||n<=0) throw new Error('Duración inválida'); return n;
}
async function download(url,dest){
  const r=await fetch(url); if(!r.ok) throw new Error(`Descarga fallida ${r.status}`); await writeFile(dest,Buffer.from(await r.arrayBuffer()));
}
async function build(){
  if(job.status==='running') return;
  job={status:'running',startedAt:new Date().toISOString()};
  const work=await mkdtemp(path.join(os.tmpdir(),'hormuz-'));
  try{
    const req=['VOICE_URL','MAP_VIDEO_URL','TANKER_VIDEO_URL','MAP_STILL_URL','TANKER_STILL_URL','DOHA_URL','HOURS48_URL','END_URL'];
    const missing=req.filter(k=>!process.env[k]); if(missing.length) throw new Error('Faltan variables: '+missing.join(','));
    const voice=path.join(work,'voice.mp3');
    const music=process.env.MUSIC_URL?path.join(work,'music.mp3'):null;
    await download(process.env.VOICE_URL,voice);
    if(music) await download(process.env.MUSIC_URL,music);
    const defs=[
      ['map-video.mp4',process.env.MAP_VIDEO_URL,'video'],
      ['tanker-video.mp4',process.env.TANKER_VIDEO_URL,'video'],
      ['map-still.jpg',process.env.MAP_STILL_URL,'image'],
      ['tanker-still.jpg',process.env.TANKER_STILL_URL,'image'],
      ['doha.jpg',process.env.DOHA_URL,'image'],
      ['48h.jpg',process.env.HOURS48_URL,'image'],
      ['end.jpg',process.env.END_URL,'image']
    ];
    const visuals=[];
    for(const [name,url,type] of defs){const p=path.join(work,name);await download(url,p);visuals.push({p,type});}
    const d=await duration(voice); const interval=3; const slots=Math.ceil(d/interval); const segs=[];
    for(let i=0;i<slots;i++){
      const a=visuals[i%visuals.length]; const segDur=Math.min(interval,d-i*interval); const out=path.join(work,`s${String(i).padStart(2,'0')}.mp4`);
      const vf='scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p';
      const args=a.type==='image'?['-y','-loop','1','-i',a.p,'-t',String(segDur),'-vf',vf,'-an','-c:v','libx264','-preset','veryfast','-crf','23',out]:['-y','-stream_loop','-1','-i',a.p,'-t',String(segDur),'-vf',vf,'-an','-c:v','libx264','-preset','veryfast','-crf','23',out];
      await exec('ffmpeg',args); segs.push(out);
    }
    const list=path.join(work,'list.txt'); await writeFile(list,segs.map(f=>`file '${f}'`).join('\n'));
    const vis=path.join(work,'visuals.mp4'); await exec('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-c','copy',vis]);
    const final=path.join(work,'PulsoGlobal-Hormuz-PulsoCut.mp4');
    if(music){
      await exec('ffmpeg',['-y','-i',vis,'-i',voice,'-stream_loop','-1','-i',music,'-filter_complex','[2:a]volume=0.10[m];[m][1:a]sidechaincompress=threshold=0.015:ratio=10:attack=20:release=300[duck];[1:a][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]','-t',String(d),'-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',final]);
    } else {
      await exec('ffmpeg',['-y','-i',vis,'-i',voice,'-t',String(d),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',final]);
    }
    const fd=await duration(final); if(Math.abs(fd-d)>0.35) throw new Error(`Duración final incorrecta ${fd} vs ${d}`);
    outputPath=final; job={status:'done',duration:fd,finishedAt:new Date().toISOString(),download:'/download'};
  }catch(e){job={status:'error',error:e.message,finishedAt:new Date().toISOString()}; try{await rm(work,{recursive:true,force:true});}catch{}}
}
app.get('/health',(_q,r)=>r.json({ok:true,job:job.status}));
app.get('/start',async(_q,r)=>{build();r.json({ok:true,status:'running'});});
app.get('/status',(_q,r)=>r.json(job));
app.get('/download',async(_q,r)=>{if(job.status!=='done'||!outputPath)return r.status(404).json({error:'No listo'});const s=await stat(outputPath);r.setHeader('Content-Type','video/mp4');r.setHeader('Content-Length',String(s.size));r.setHeader('Content-Disposition','attachment; filename="PulsoGlobal-Hormuz-PulsoCut.mp4"');r.sendFile(outputPath);});
app.listen(port,()=>console.log('PulsoCut auto on',port));
