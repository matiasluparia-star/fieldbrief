import express from 'express';
import multer from 'multer';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, writeFile, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const execFileP = promisify(execFile);
const app = express();
const port = process.env.PORT || 10000;
const publicDir = path.join(process.cwd(), 'public');

app.use(express.static(publicDir));
app.use(express.json({limit:'2mb'}));
app.get('/health', (_req,res)=>res.json({ok:true, version:'0.3.0'}));

const upload = multer({ dest: os.tmpdir(), limits: {fileSize: 120 * 1024 * 1024, files: 26} });

async function probeDuration(file){
  const {stdout} = await execFileP('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file]);
  const d = Number(stdout.trim());
  if(!Number.isFinite(d) || d <= 0) throw new Error('No pude leer la duración del audio.');
  return d;
}

async function runFfmpeg(args){
  try { await execFileP('ffmpeg', args, {maxBuffer: 20 * 1024 * 1024}); }
  catch (e) { throw new Error((e.stderr || e.message || 'FFmpeg error').slice(-5000)); }
}

async function downloadTo(url, dest){
  const response = await fetch(url, {redirect:'follow'});
  if(!response.ok) throw new Error(`No pude descargar un recurso remoto (${response.status}).`);
  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}

async function fitVoiceToDuration(input, work, targetDuration){
  if(!targetDuration) return input;
  const original = await probeDuration(input);
  const target = Number(targetDuration);
  if(!Number.isFinite(target) || target < 5 || target > 90) return input;
  const factor = original / target;
  if(factor < 0.5 || factor > 2) throw new Error('El ajuste de velocidad solicitado es demasiado grande.');
  const out = path.join(work,'voice-fitted.m4a');
  await runFfmpeg(['-y','-i',input,'-filter:a',`atempo=${factor.toFixed(5)}`,'-t',String(target),'-c:a','aac','-b:a','192k',out]);
  return out;
}

async function renderVideo({voicePath, musicPath=null, visualPaths, interval=3, musicVolume=10, targetDuration=null, work}){
  const voice = await fitVoiceToDuration(voicePath, work, targetDuration);
  const slotInterval = Math.min(8, Math.max(1.5, Number(interval || 3)));
  const musicVolumePercent = Math.min(25, Math.max(0, Number(musicVolume || 10)));
  const musicGain = musicVolumePercent / 100;
  const duration = await probeDuration(voice);
  const totalSlots = Math.ceil(duration / slotInterval);
  const segmentFiles = [];

  for(let i=0;i<totalSlots;i++){
    const asset = visualPaths[i % visualPaths.length];
    const start = i * slotInterval;
    const segDur = Math.min(slotInterval, duration - start);
    const out = path.join(work, `seg-${String(i).padStart(3,'0')}.mp4`);
    const ext = path.extname(asset).toLowerCase();
    const isImage = ['.jpg','.jpeg','.png','.webp','.gif'].includes(ext);
    const common = ['-t', String(segDur), '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p', '-an','-c:v','libx264','-preset','veryfast','-crf','23','-movflags','+faststart',out];
    const args = isImage ? ['-y','-loop','1','-i',asset, ...common] : ['-y','-stream_loop','-1','-i',asset, ...common];
    await runFfmpeg(args);
    segmentFiles.push(out);
  }

  const concatList = segmentFiles.map(f=>`file '${f.replaceAll("'", "'\\''")}'`).join('\n');
  const listPath = path.join(work,'concat.txt');
  await writeFile(listPath, concatList);
  const visualsOut = path.join(work,'visuals.mp4');
  await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c','copy',visualsOut]);

  const finalPath = path.join(work,'PulsoCut-output.mp4');
  if (musicPath) {
    await runFfmpeg([
      '-y','-i',visualsOut,'-i',voice,'-stream_loop','-1','-i',musicPath,
      '-filter_complex', `[2:a]volume=${musicGain.toFixed(3)}[musiclow];[musiclow][1:a]sidechaincompress=threshold=0.015:ratio=10:attack=20:release=300[ducked];[1:a][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
      '-t', String(duration), '-map','0:v:0','-map','[aout]', '-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart', finalPath
    ]);
  } else {
    await runFfmpeg(['-y','-i',visualsOut,'-i',voice,'-t', String(duration),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart', finalPath]);
  }

  const finalDuration = await probeDuration(finalPath);
  if(Math.abs(finalDuration - duration) > 0.35) throw new Error(`Verificación fallida: audio ${duration.toFixed(2)} s, vídeo ${finalDuration.toFixed(2)} s.`);
  return {finalPath, duration:finalDuration};
}

app.post('/render', upload.fields([
  {name:'voiceover', maxCount:1},
  {name:'music', maxCount:1},
  {name:'visuals', maxCount:24}
]), async (req,res)=>{
  const incoming = [...(req.files?.voiceover || []), ...(req.files?.music || []), ...(req.files?.visuals || [])];
  const work = await mkdtemp(path.join(os.tmpdir(),'pulsocut-'));
  try {
    const voice = req.files?.voiceover?.[0];
    const music = req.files?.music?.[0];
    const visuals = req.files?.visuals || [];
    if(!voice) return res.status(400).json({error:'Falta la narración.'});
    if(!visuals.length) return res.status(400).json({error:'Subí al menos una imagen o vídeo.'});
    const result = await renderVideo({
      voicePath:voice.path,
      musicPath:music?.path || null,
      visualPaths:visuals.map(v=>v.path),
      interval:req.body.interval,
      musicVolume:req.body.musicVolume,
      targetDuration:req.body.targetDuration,
      work
    });
    const info = await stat(result.finalPath);
    res.setHeader('Content-Type','video/mp4');
    res.setHeader('Content-Length', String(info.size));
    res.setHeader('Content-Disposition', `attachment; filename="PulsoCut-${crypto.randomUUID().slice(0,8)}.mp4"`);
    res.sendFile(result.finalPath, async ()=>{ await rm(work,{recursive:true,force:true}); });
  } catch(err){
    console.error(err);
    await rm(work,{recursive:true,force:true});
    res.status(500).json({error:err.message || 'No se pudo generar el vídeo.'});
  } finally {
    await Promise.all(incoming.map(f=>rm(f.path,{force:true}).catch(()=>{})));
  }
});

// Render directo desde URLs remotas. Pensado para Runway y otros assets alojados.
// GET permite abrir el resultado directamente desde Safari/iPhone.
app.get('/render-from-urls', async (req,res)=>{
  const work = await mkdtemp(path.join(os.tmpdir(),'pulsocut-url-'));
  try {
    const voiceUrl = String(req.query.voice || '');
    const visualUrls = ([]).concat(req.query.visual || []).map(String).filter(Boolean);
    if(!voiceUrl) return res.status(400).json({error:'Falta voice.'});
    if(!visualUrls.length) return res.status(400).json({error:'Falta al menos un visual.'});
    if(visualUrls.length > 24) return res.status(400).json({error:'Máximo 24 visuales.'});

    const voicePath = await downloadTo(voiceUrl, path.join(work,'voice.mp3'));
    const visualPaths = [];
    for(let i=0;i<visualUrls.length;i++){
      const p = path.join(work,`visual-${String(i).padStart(2,'0')}.mp4`);
      await downloadTo(visualUrls[i], p);
      visualPaths.push(p);
    }
    const result = await renderVideo({
      voicePath,
      visualPaths,
      interval:req.query.interval || 3,
      targetDuration:req.query.duration || null,
      work
    });
    const info = await stat(result.finalPath);
    res.setHeader('Content-Type','video/mp4');
    res.setHeader('Content-Length', String(info.size));
    res.setHeader('Content-Disposition', 'inline; filename="PulsoGlobal-final.mp4"');
    res.setHeader('X-PulsoCut-Duration', result.duration.toFixed(2));
    res.sendFile(result.finalPath, async ()=>{ await rm(work,{recursive:true,force:true}); });
  } catch(err){
    console.error(err);
    await rm(work,{recursive:true,force:true});
    res.status(500).json({error:err.message || 'No se pudo generar el vídeo.'});
  }
});

app.listen(port, ()=>console.log(`PulsoCut running on :${port}`));
