const keys=['summary','problem','materials','questions','steps','quoteScope','response'];
export function parseAI(raw){
 let b;
 try{b=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));}catch{}
 if(!valid(b)){
  b={};const re=/\*\*(Summary|Problem|Materials|Questions|Steps|Quote Scope|Response):?\*\*:?\s*/gi;const hits=[...raw.matchAll(re)];
  for(let i=0;i<hits.length;i++){const k=hits[i][1].toLowerCase()==='quote scope'?'quoteScope':hits[i][1].toLowerCase();const value=raw.slice(hits[i].index+hits[i][0].length,hits[i+1]?.index??raw.length).trim();b[k]=['materials','questions','steps'].includes(k)?value.split('\n').map(x=>x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean):value;}
 }
 return valid(b)?Object.fromEntries(keys.map(k=>[k,b[k]])):null;
}
function valid(b){return b&&['summary','problem','quoteScope','response'].every(k=>typeof b[k]==='string'&&b[k].trim()&&b[k].length<=5000)&&['materials','questions','steps'].every(k=>Array.isArray(b[k])&&b[k].length>0&&b[k].length<=15&&b[k].every(v=>typeof v==='string'&&v.length<=2000));}
