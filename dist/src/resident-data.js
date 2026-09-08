// The Silo 18 ensemble for the opening-era exploration. Locations without a
// published floor number are game placements, not claims about the set plan.
const person=(id,name,role,level,wing,appearance,extra={})=>({id,name,role,level,wing,height:1.75,appearance,...extra});
export const RESIDENT_CAST=Object.freeze([
  person('holston','Holston Becker','Sheriff',1,0,{skin:0x76503c,hair:0x211d19,outfit:'uniform',coat:0x655442,beard:.55},{height:1.78,story:'cleaner'}),
  person('allison','Allison Becker','IT systems',6,0,{skin:0xb88b70,hair:0x302921,outfit:'knit',coat:0xb1a58e,hairStyle:'fringe',female:true},{height:1.64,story:'outside'}),
  person('walker','Martha Walker','Electronics workshop',144,1,{skin:0xc39f87,hair:0x73776f,outfit:'cardigan',coat:0x4c5865,hairStyle:'braids',female:true,age:.9},{height:1.65,activity:'work'}),
  person('knox','Knox','Head of Mechanical',144,0,{skin:0xb18b74,hair:0x342b25,outfit:'work',coat:0x79796b,beard:.65,build:1.15,shortSleeves:true,tattoo:true},{height:1.89,activity:'work'}),
  person('shirley','Shirley Campbell','Mechanical engineer',144,0,{skin:0x865b44,hair:0x251e1b,outfit:'work',coat:0x646e67,hairStyle:'bun',female:true},{height:1.70,activity:'work'}),
  person('jahns','Ruth Jahns','Mayor',3,0,{skin:0xc19d85,hair:0xbbb9af,outfit:'robe',coat:0x414b49,hairStyle:'bun',female:true,age:.8,chain:true},{height:1.70,activity:'read',opening:true}),
  person('marnes','Sam Marnes','Chief deputy',1,0,{skin:0xb38d72,hair:0x938e7e,outfit:'uniform',coat:0x695945,moustache:true,age:.8},{height:1.78,top:[25,33],opening:true}),
  person('billings','Paul Billings','Deputy · Judicial administrator',1,0,{skin:0x714e39,hair:0x211d1a,outfit:'uniform',coat:0x665a45,beard:.35,hairStyle:'curls'},{height:1.80,top:[29,38]}),
  person('lukas','Lukas Kyle','IT systems analyst',19,2,{skin:0x947256,hair:0x25201d,outfit:'vest',coat:0x66767b,hairStyle:'waves',beard:.4},{height:1.78,activity:'read'}),
  person('camille','Camille Sims','Former raider · Sims family',15,0,{skin:0x865f47,hair:0x211a18,outfit:'knit',coat:0x8f7970,hairStyle:'longCurls',female:true},{height:1.72}),
  person('meadows','Judge Mary Meadows','Head of Judicial',14,1,{skin:0x845e49,hair:0x393531,outfit:'robe',coat:0xaa9c6c,hairStyle:'curls',female:true,chain:true,age:.4},{height:1.72,activity:'read'}),
  person('carla','Carla McLain','Head of Supply',126,2,{skin:0x835f49,hair:0x42433d,outfit:'work',coat:0x6b7470,hairStyle:'waves',female:true,age:.5},{height:1.68,activity:'work'}),
  person('patrick','Patrick Kennedy','Maintenance · relic trader',100,0,{skin:0xbb977f,hair:0x584b3b,outfit:'coat',coat:0x605c48,beard:.3,bald:true},{height:1.72}),
  person('pete','Dr. Pete Nichols','Medical physician',62,0,{skin:0xc19b82,hair:0x918b7f,outfit:'medical',coat:0xc2c4b4,age:.6},{height:1.84,activity:'work'}),
  person('gloria','Gloria Hildebrandt','Former fertility counsellor',62,0,{skin:0xbca18a,hair:0xb6b3a5,outfit:'cardigan',coat:0x927f76,hairStyle:'waves',female:true,age:1},{height:1.61,activity:'read'}),
  person('hank','Hank','Down Deep deputy',120,0,{skin:0xb38f78,hair:0x62523e,outfit:'uniform',coat:0x857b65,beard:.8,hairStyle:'waves'},{height:1.82}),
  person('cooper','Cooper','Mechanical apprentice',144,0,{skin:0xba947a,hair:0x574532,outfit:'work',coat:0x6d786e,hairStyle:'waves'},{height:1.74,activity:'work'}),
  person('teddy','Teddy','Mechanical worker',144,3,{skin:0x694932,hair:0x211b18,outfit:'work',coat:0x8c7b50},{height:1.79,activity:'work'}),
  person('amundsen','Amundsen','Judicial raider',14,0,{skin:0xb28e76,hair:0x38322b,outfit:'coat',coat:0x343d3a},{height:1.85}),
  person('george','George Wilkins','Computer repair · relic researcher',100,0,{skin:0xb48e75,hair:0x3c2d21,outfit:'shirt',coat:0x758079,beard:.65,hairStyle:'waves'},{height:1.78,story:'memory'}),
]);
export const CROWD_APPEARANCES=Object.freeze([
  {skin:0xc19a7c,hair:0x403124,coat:0x6e786d,outfit:'work'},
  {skin:0x71513e,hair:0x26201a,coat:0x797b65,outfit:'shirt',female:true,hairStyle:'bun'},
  {skin:0xa27858,hair:0x393026,coat:0x4f6870,outfit:'work',beard:.4},
  {skin:0xb8977d,hair:0x99948a,coat:0x7f7361,outfit:'cardigan',female:true,age:.8,hairStyle:'waves'},
  {skin:0x6c4a33,hair:0x302521,coat:0x766855,outfit:'coat',hairStyle:'curls'},
  {skin:0xcba586,hair:0x774f31,coat:0x6c7777,outfit:'shirt',female:true,hairStyle:'long'},
  {skin:0x96755c,hair:0x28231c,coat:0x898370,outfit:'uniform'},
  {skin:0xa98b71,hair:0x756a54,coat:0x687960,outfit:'work',build:1.1},
]);
