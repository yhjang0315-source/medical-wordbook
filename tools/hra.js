const fs=require("fs");
const MAP={brain:["brain-female"],eye:["eye-female-left","eye-female-right"],nose:["larynx-female","palatine-tonsil-female-left","palatine-tonsil-female-right"],
 lung:["lung-female","trachea-female","main-bronchus-female"],heart:["heart-female"],liver:["liver-female"],spleen:["spleen-female"],pancreas:["pancreas-female"],
 kidney:["kidney-female-left","kidney-female-right","renal-pelvis-female-left","renal-pelvis-female-right","ureter-female-left","ureter-female-right"],
 colon:["large-intestine-female"],bowel:["small-intestine-female"],bladder:["urinary-bladder-female"],uterus:["uterus-female"],
 ovary:["ovary-female-left","ovary-female-right","fallopian-tube-female-left","fallopian-tube-female-right"],breast:["mammary-gland-female-left","mammary-gland-female-right"],
 cord:["spinal-cord-female"],vessel:["blood-vasculature-female"],surf:["skin-female"]};
(async()=>{const out=[];
 for(const [g,names] of Object.entries(MAP))for(const n of names){
  await new Promise(r=>setTimeout(r,400));
  try{const r=await fetch("https://lod.humanatlas.io/ref-organ/"+n+"/latest",{headers:{Accept:"application/json"},redirect:"follow"});const t=await r.text();
   const urls=[...new Set(t.match(/https:\/\/cdn\.humanatlas\.io\/[^"\s]+\.glb/g)||[])];
   let size="?";if(urls[0]){const h=await fetch(urls[0],{method:"HEAD"});size=h.headers.get("content-length");}
   out.push([g,n,urls[0]||"",size]);console.log(g,n,urls[0]?urls[0].split("/").slice(-4).join("/"):"NO GLB (status "+r.status+")",size);
  }catch(e){console.log("ERR",n,String(e).slice(0,80));}}
 fs.writeFileSync("hra-picks.tsv",out.filter(o=>o[2]).map(o=>o.join("\t")).join("\n")+"\n");
 console.log("total MB",(out.reduce((a,o)=>a+(+o[3]||0),0)/1e6).toFixed(0));})();
