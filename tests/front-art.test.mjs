import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceHash, selectFrontpage } from "../scripts/frontpage.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { loadIllustrationAssets } from "../scripts/front-art.mjs";
const date = "2026-10-06", url = "/2026/10/06/", raw = "Verified report https://example.org/story";
const illustration = {kind:"editorial-illustration",
 src:"/images/editorial/cover.webp",
 sha256:"a".repeat(64),
 width:1600,height:1000,
 alt:"Original editorial illustration of a wheelchair wheel and access mat.",
 credit:"The Austin Bulletin",
 rightsPath:"/images/editorial/LICENSE.txt",
 storyKey:"acl-accessibility",
 editionDate:date};
const lead={key:"acl-accessibility",record:url,sourceHash:sourceHash(raw),title:"Wheelchair users struggled in ACL’s mud",summary:"KUT reports the difficulties; C3 describes its response.",asOf:"October 6",sources:[{name:"KUT",url:"https://example.org/story"}],action:{label:"Read KUT",url:"https://example.org/story"},illustration};
const bundle={date,reviewedAt:date+"T12:00:00Z",lead,developments:[]};
const assets={[illustration.src]:{sha256:illustration.sha256,
 width:1600,height:1000,
 rightsPath:illustration.rightsPath}};
const select=(curation=bundle, illustrationAssets=assets, today=date, records={[url]:{raw}})=>
 selectFrontpage({curation,illustrationAssets,today,records,
 editionDate:date,editionUrl:url,editionHTML:""});
test("original editorial art renders only with its verified story/date/asset/rights binding",()=>{
 assert.deepEqual(select().lead.illustration,illustration);
 for(const change of [{src:{toString:null}},{rightsPath:{toString:null}},{sha256:[]},{storyKey:"another-story"},{editionDate:"2026-10-05"},{sha256:"b".repeat(64)},{rightsPath:"/missing.txt"},{src:"https://news.example/photo.jpg"},{src:"/images/editorial/../photo.webp"},{width:0},{height:Infinity}]){
  const front=select({...bundle,lead:{...lead,illustration:{...illustration,...change}}});
  assert.equal(front.lead.key,lead.key);
 assert.equal(front.lead.illustration,undefined);
 }
});
test("missing or mismatched original art removes only art, never valid source copy",()=>{
 for(const a of [{},{[illustration.src]:{...assets[illustration.src],
 width:1200}},{[illustration.src]:{...assets[illustration.src],
 rightsPath:"/different.txt"}}]){
  const front=select(bundle,a);
 assert.equal(front.lead.title,lead.title);
 assert.equal(front.lead.illustration,undefined);
 }
});
test("source or expiry failure cannot smuggle art through neutral/freshness fallback",()=>{
 assert.equal(select(bundle,assets,date,{[url]:{raw:raw+" Revised"}}).lead.illustration,undefined);
 assert.equal(select({...bundle,lead:{...lead,expiresOn:date}},assets,
 "2026-10-07").lead.illustration,undefined);
 assert.equal(select(null,assets).lead.illustration,undefined);
});
test("new illustration field never bypasses the existing historical photo/image guards",()=>{
 const front=select({...bundle,lead:{...lead,image:"/unverified-news-photo.jpg",
 imageAlt:"News photo"}});
 assert.notEqual(front.lead.key,lead.key);
 assert.equal(front.lead.illustration,undefined);
});

test("physical asset validation omits missing, altered, unlicensed and escaping assets",
 async () => {
 const root=mkdtempSync(join(tmpdir(),"bulletin-art-"));
 const dir=join(root,"images/editorial"); mkdirSync(dir,{recursive:true});
 const bytes=await sharp({create:{width:2,height:1,channels:3,background:"#16332b"}})
 .png().toBuffer();
 const art={...illustration,
 src:"/images/editorial/cover.png",
 sha256:sourceHash(bytes),
 width:2,height:1};
 const packet={...bundle,lead:{...lead,illustration:art}};
 const selected=async()=>select(packet,await loadIllustrationAssets([packet],root))
 .lead.illustration;
 try {
  const malformed={...packet,lead:{...lead,illustration:{kind:"editorial-illustration",
   src:{toString:null}}}};
  assert.deepEqual(await loadIllustrationAssets([malformed],root),{});
  assert.equal(await selected(),undefined);
  writeFileSync(join(dir,"cover.png"),bytes);
  assert.equal(await selected(),undefined);
  writeFileSync(join(dir,"LICENSE.txt"),"Original editorial illustration; reviewed provenance.");
  assert.deepEqual(await selected(),art);
  writeFileSync(join(dir,"cover.png"),"not a raster");
 assert.equal(await selected(),undefined);
  writeFileSync(join(dir,"cover.png"),bytes); writeFileSync(join(dir,"LICENSE.txt"),"");
  assert.equal(await selected(),undefined);
  rmSync(join(dir,"LICENSE.txt")); writeFileSync(join(root,"outside.txt"),"rights");
  symlinkSync(join(root,"outside.txt"),join(dir,"LICENSE.txt"));
 assert.equal(await selected(),undefined);
 } finally {rmSync(root,{recursive:true,force:true});}
});
