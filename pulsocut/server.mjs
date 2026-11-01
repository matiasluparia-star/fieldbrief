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
app.get('/health', (_req,res)=>res.json({ok:true}));

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

    const interval = Math.min(8, Math.max(1.5, Number(req.body.interval || 3)));
    const musicVolumePercent = Math.min(25, Math.max(0, Number(req.body.musicVolume || 10)));
    const musicGain = musicVolumePercent / 100;
    const duration = await probeDuration(voice.path);
    const totalSlots = Math.ceil(duration / interval);
    const segmentFiles = [];

    for(let i=0;i<totalSlots;i++){
      const asset = visuals[i % visuals.length];
      const start = i * interval;
      const segDur = Math.min(interval, duration - start);
      const out = path.join(work, `seg-${String(i).padStart(3,'0')}.mp4`);
      const common = ['-t', String(segDur), '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p', '-an','-c:v','libx264','-preset','veryfast','-crf','23','-movflags','+faststart',out];
      const isImage = asset.mimetype?.startsWith('image/');
      const args = isImage ? ['-y','-loop','1','-i',asset.path, ...common] : ['-y','-stream_loop','-1','-i',asset.path, ...common];
      await runFfmpeg(args);
      segmentFiles.push(out);
    }

    const concatList = segmentFiles.map(f=>`file '${f.replaceAll("'", "'\\''")}'`).join('\n');
    const listPath = path.join(work,'concat.txt');
    await writeFile(listPath, concatList);
    const visualsOut = path.join(work,'visuals.mp4');
    await runFfmpeg(['-y','-f','concat','-safe','0','-i',listPath,'-c','copy',visualsOut]);

    const finalPath = path.join(work,'PulsoCut-output.mp4');
    if (music) {
      await runFfmpeg([
        '-y','-i',visualsOut,'-i',voice.path,'-stream_loop','-1','-i',music.path,
        '-filter_complex', `[2:a]volume=${musicGain.toFixed(3)}[musiclow];[musiclow][1:a]sidechaincompress=threshold=0.015:ratio=10:attack=20:release=300[ducked];[1:a][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
        '-t', String(duration), '-map','0:v:0','-map','[aout]', '-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart', finalPath
      ]);
    } else {
      await runFfmpeg(['-y','-i',visualsOut,'-i',voice.path,'-t', String(duration),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart', finalPath]);
    }

    const finalDuration = await probeDuration(finalPath);
    if(Math.abs(finalDuration - duration) > 0.35) throw new Error(`Verificación fallida: audio ${duration.toFixed(2)} s, vídeo ${finalDuration.toFixed(2)} s.`);
    const info = await stat(finalPath);
    res.setHeader('Content-Type','video/mp4');
    res.setHeader('Content-Length', String(info.size));
    res.setHeader('Content-Disposition', `attachment; filename="PulsoCut-${crypto.randomUUID().slice(0,8)}.mp4"`);
    res.sendFile(finalPath, async ()=>{ await rm(work,{recursive:true,force:true}); });
  } catch(err){
    console.error(err);
    await rm(work,{recursive:true,force:true});
    res.status(500).json({error:err.message || 'No se pudo generar el vídeo.'});
  } finally {
    await Promise.all(incoming.map(f=>rm(f.path,{force:true}).catch(()=>{})));
  }
});

app.listen(port, ()=>console.log(`PulsoCut running on :${port}`));
