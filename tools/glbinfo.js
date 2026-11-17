const fs=require("fs"),path=require("path");
function readGlb(f){const b=fs.readFileSync(f);if(b.readUInt32LE(0)!==0x46546C67)throw new Error("not glb");let o=12,json,bin;
 while(o<b.length){const len=b.readUInt32LE(o),type=b.readUInt32LE(o+4);const d=b.subarray(o+8,o+8+len);if(type===0x4E4F534A)json=JSON.parse(d.toString("utf8"));else if(type===0x004E4942)bin=d;o+=8+len;}return{json,bin};}
for(const f of fs.readdirSync(process.argv[2])){const {json:j}=readGlb(path.join(process.argv[2],f));
 const acc=j.accessors||[];let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9],tris=0;
 for(const m of j.meshes||[])for(const p of m.primitives){const a=acc[p.attributes.POSITION];if(a.min)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],a.min[i]);hi[i]=Math.max(hi[i],a.max[i]);}tris+=(p.indices!==undefined?acc[p.indices].count:a.count)/3;}
 const xf=(j.nodes||[]).filter(n=>n.matrix||n.translation||n.rotation||n.scale).length;
 console.log(f.padEnd(34),"meshes",(j.meshes||[]).length,"nodes",(j.nodes||[]).length,"xf",xf,"tris",Math.round(tris),"ext",(j.extensionsUsed||[]).join(",")||"-","lo",lo.map(v=>v.toFixed(2)).join(","),"hi",hi.map(v=>v.toFixed(2)).join(","));}
