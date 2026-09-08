// Metres throughout. The public production references do not contain a complete
// surveyed plan. Only 144 numbered levels is treated as an exact dimension.
export const TAU = Math.PI * 2;
export const SILO = Object.freeze({
  levels: 144, levelHeight: 10, bottomY: 80,
  wellRadius: 18, deckOuter: 25.6, shellRadius: 56,
  stairColumn: 3.1, stairRadius: 7.3, stairTurns: 1, stairSteps: 72, stairLandingSteps: 8,
  landingHalf: 1.8, roomDepth: 24, roomHalf: 10, roomHeight: 5.8,
});
export const levelY = level => SILO.bottomY + (SILO.levels - level) * SILO.levelHeight;
export const stairStepY = index => Math.max(0,Math.min(1,(index+1-SILO.stairLandingSteps)/(SILO.stairSteps-2*SILO.stairLandingSteps)))*SILO.levelHeight;
export const levelAt = y => Math.max(1, Math.min(144, Math.round((levelY(1) - y) / SILO.levelHeight) + 1));
export const zoneFor = n => n < 50 ? 'UP TOP' : n <= 100 ? 'THE MIDS' : 'DOWN DEEP';

export const SOURCES = [
  {title:'Apple TV · Silo cast and crew',url:'https://www.apple.com/tv-pr/originals/silo/cast-crew/',note:'Character names and cast identification for the added Silo 18 ensemble.'},
  {title:'Apple TV · episode production stills',url:'https://www.apple.com/tv-pr/originals/silo/episodes-images/',note:'Season 1 and 2 costume and character references; the new game models are original approximations.'},
  {title:'Charlotte Morris · Silo costume design',url:'https://charlotte-morris.com/portfolio/silo-copy-1',note:'Workwear, repaired clothing, fabrics and the visual differences between the silo’s social levels.'},
  {title:'Sally Crees · Silo market set photographs',url:'https://www.sallycreescostumedesign.co.uk/home/silo-apple-tv-seasons-1-and-2',note:'TV market alleys, concrete shopfronts, red food lamps, conduits and festival dressing. The bazaar level number is unconfirmed.'},
  {title:'Arnaud Valette · Alleyway’s Markets',url:'https://arnaudvalette.artstation.com/projects/Dvb9q0',note:'Credited street-mood concept work with production designer Gavin Bocquet.'},
  {title:'Charles E J Downman · Silo apartment concepts',url:'https://www.artstation.com/artwork/oby0Dk',note:'Rounded kitchen portal, worn domestic finishes and household furnishings; concept art can differ from the filmed set.'},
  {title:'Poly Haven · photographic materials',url:'https://polyhaven.com/license',note:'CC0 concrete, painted metal, brown tiles and dry rock, with their original normal and roughness maps.'},
  { title: 'Silo Wiki · Silo 18', url: 'https://silo.fandom.com/wiki/Silo_18', note: 'Requested reference. Indexed department and translated wiki entries informed the corrected television floor schedule; the main English page blocks automated fetching.' },
  { title: 'Silo Wiki · television floor index', url: 'https://silo.fandom.com/de/wiki/Silo_18', note: 'Numbered locations including janitorial on 20, Medical on 62, recycling on 126, and the electronics workshop on 144.' },
  { title: 'Silo Wiki · Level 1 cafeteria', url: 'https://silo.fandom.com/wiki/Level_1_Cafeteria', note: 'The outside screen and access through the cafeteria to the sheriff’s station.' },
  { title: 'Lux Machina · Silo production', url:'https://www.luxmc.com/silo', note:'Curved outside LED wall, dust and panel treatment in the practical cafeteria set.' },
  { title:'Apple TV trailer · ramp reference', url:'https://www.this-is-cool.co.uk/official-trailer-for-silo-a-new-sci-fi-series-coming-to-apple-tv/', note:'Reference frames: ribbed ramp, chamfered tunnel walls and cyan lighting.' },
  { title: 'VFX Voice · production interview', url: 'https://vfxvoice.com/unraveling-the-mysteries-of-silo/', note: '144 levels, apartments, farms, cafeteria screen and central shaft.' },
  { title: 'Outpost VFX · generator & excavator', url: 'https://www.outpost-vfx.com/en/news/silo-s1-modelling-the-machines-of-an-underground-city/', note: 'Six generator panels; excavator tower, radial arms, cranes and cutting heads.' },
  { title: 'Arnaud Valette · shaft concept design', url: 'https://arnaudvalette.artstation.com/projects/39xAqA', note: 'Credited production concept art for the central shaft.' },
  { title: 'British Cinematographer · Silo lighting', url: 'https://britishcinematographer.co.uk/lightbridge-silo/', note: 'Cafeteria screen and the lighting of the practical sets.' },
  { title: 'Silo Wiki · TV locations', url: 'https://silo.telepedia.net/wiki/Silo-18', note: 'Secondary episode-indexed source: recycling on 20; water filtration on 55.' },
  { title: 'Silo Wiki · IT department', url: 'https://silo.telepedia.net/wiki/IT_Department', note: 'Secondary source: TV IT on 19, as opposed to 34 in the novels.' },
];

const landmark = (level, name, type, description, placement = 'Reconstructed placement') => ({ level, name, type, description, placement });
export const LANDMARKS = [
  landmark(1, 'Cafeteria · sheriff · cleaning exit', 'cafeteria', 'Great viewing hall, sheriff’s station, Holding 3, preparation, airlock and the surface ramp.', 'Television location · connected rooms reconstructed'),
  landmark(3, 'Mayor’s office & civic records', 'office', 'Council desk, meeting room and civic archives.'),
  landmark(6, 'Holston & Allison’s residential level', 'residential', 'Apartments with kitchens, bedrooms and bathrooms.', 'Wiki-associated residence · interior reconstructed'),
  landmark(9, 'Marnes’s residential level', 'residential', 'Upper residential quarters.', 'Wiki-associated residence'),
  landmark(10, 'Porter dispatch', 'porter', 'Dispatch counter, pigeonholes, parcel cages and porter equipment.', 'Wiki-associated department'),
  landmark(14, 'Judicial', 'judicial', 'Administrative offices, interview space and records.', 'Television department · interior reconstructed'),
  landmark(15, 'Manager’s Row', 'residential', 'More spacious upper administrative residences.', 'Wiki-associated residences'),
  landmark(17, 'Upper residential quarter', 'residential', 'Residential level associated with Gloria and the Sims household.', 'Wiki-associated residences'),
  landmark(19, 'IT · vault · head of IT', 'it', 'Workstations, server aisles, office and restricted vault.', 'Television department · interior reconstructed'),
  landmark(20, 'Janitorial · Watcher Room · recycling', 'janitorial', 'A service entrance conceals the observation room; recycling occupies a separate wing.', 'Television locations · interior reconstructed'),
  landmark(22, 'Kennedy’s residential level', 'residential', 'Upper residential homes.', 'Wiki-associated residence'),
  landmark(26, 'The bar', 'bar', 'A worn communal bar with tables, booths and a store room.', 'Wiki-associated location'),
  landmark(30, 'Judicial checkpoint', 'judicial', 'Checkpoint, interview room and service offices.', 'Wiki-associated checkpoint'),
  landmark(35, 'School & nursery', 'school', 'Classrooms, library and education supplies.'),
  landmark(42, 'Upper residential homes', 'residential', 'A level associated with George Wilkins’s earlier residence.', 'Wiki-associated residence'),
  landmark(50, 'Upper Mids medical', 'medical', 'Clinic, ward, dispensary and examination spaces.', 'Wiki-associated department'),
  landmark(55, 'Water filtration', 'water', 'Treatment vessels, pumps and distribution pipework.', 'Episode-indexed department'),
  landmark(61, 'Mids recycling', 'recycling', 'Recovery, sorting and reuse.', 'Wiki-associated recycling station'),
  landmark(62, 'Mids Medical', 'medical', 'Medical ward, examination bays and theatre.', 'Wiki-associated department'),
  landmark(68, 'Mids residential homes', 'residential', 'A level associated with George Wilkins’s residence.', 'Wiki-associated residence'),
  landmark(72, 'School & residential quarter', 'school', 'Education and homes in the Mids.', 'School placement reconstructed'),
  landmark(80, 'Agricultural level', 'farm', 'Soil beds, irrigation, grow lights, propagation and orchard wing.', 'Wiki-associated agriculture'),
  landmark(90, 'Park & common rooms', 'park', 'An underground garden and communal space.', 'Park shown in series · level reconstructed'),
  landmark(100, 'Bazaar · market alleys', 'bazaar', 'Six enterable shops, food counters, repair stalls and the rear service gallery.', 'Television market design · floor and street plan inferred'),
  landmark(105, 'Down Deep deputy station', 'sheriff', 'Lower law-enforcement offices and holding rooms.', 'Wiki-associated deputy station'),
  landmark(110, 'Supply & textiles', 'supply', 'Stores, repairable goods and porter collections.'),
  landmark(124, 'Lower residential quarter', 'residential', 'Homes and shared domestic services.', 'Wiki-associated residences'),
  landmark(126, 'Recycling & IT signal relay', 'recycling', 'Lower recycling and the IT signal booster.', 'Wiki-associated departments'),
  landmark(140, 'Juliette’s residential level', 'residential', 'Lower homes close to Mechanical.', 'Wiki-associated residence'),
  landmark(144, 'Mechanical · Walker’s workshop', 'mechanical', 'The last numbered landing, electronics workshop, common room and access below to the generator.', 'Television locations · interior reconstructed'),
];
export const SPECIALS = [
  { id: 'airlock', name: 'Cleaning airlock & ramp', level: 1, type: 'airlock', description: 'Walk through the pressure doors and up the ramp.' },
  { id: 'surface', name: 'Surface & cleaning camera', level: 1, type: 'surface', description: 'Barren crater, dead tree, enclosing earth bank and cleanable camera.' },
  { id: 'generator', name: 'Generator hall · below 144', level: 144, type: 'generator', description: 'Turbine, six removable panels, overhead crane and maintenance gantry.' },
  { id: 'mines', name: 'The mines', level: 144, type: 'mines', description: 'Rock tunnels, ore carts, drill faces and salvage working.' },
  { id: 'excavator', name: 'Excavator & flooded void', level: 144, type: 'excavator', description: 'The abandoned digging machine beneath the silo.' },
  { id: 'tunnel', name: 'The hidden tunnel', level: 144, type: 'tunnel', description: 'Lower passage ending at the enormous sealed door.' },
];
export const LEVELS = Array.from({ length: 144 }, (_, i) => {
  const level = i + 1, known = LANDMARKS.find(x => x.level === level);
  const defaultType = level > 140 ? 'mechanical' : level % 16 === 0 ? 'farm' : level % 11 === 0 ? 'supply' : level % 9 === 0 ? 'workshop' : 'residential';
  return { level, zone: zoneFor(level), ...(known || { name: `${defaultType === 'residential' ? 'Residential' : defaultType[0].toUpperCase() + defaultType.slice(1)} · ${String(level).padStart(3, '0')}`, type: defaultType, description: 'Six furnished, enterable wings around a complete numbered gallery.', placement: 'Unseen level · reconstructed rooms' }) };
});
// Named rooms from the television wiki. Names identify environmental locations. Apartment numbers are retained where reported.
export const RESIDENCES = {
  '6:0':'HOLSTON & ALLISON', '9:0':'MARNES · 9129', '15:0':'MANAGER’S ROW',
  '17:0':'GLORIA · 1727', '17:1':'SIMS FAMILY', '22:0':'KENNEDY · 2215',
  '31:0':'TRUDEAU · 31325', '31:1':'REGINA JACKSON', '36:0':'TRUMBULL',
  '42:0':'WILKINS · 42311', '45:0':'BROWN · 4529', '52:0':'GANTRY · 52346',
  '63:0':'MELBY · 63324', '68:0':'WILKINS · 68328', '76:0':'WILKINS · 76213',
  '78:0':'WILKINS · 78329', '98:0':'RESIDENTIAL HOMES', '124:0':'MCLAIN',
  '125:0':'LOWER RESIDENCES', '140:0':'JULIETTE NICHOLS', '144:4':'WILKINS · 14413',
};
for(const key of Object.keys(RESIDENCES)){const [level,wing]=key.split(':').map(Number);if(wing===0&&!LANDMARKS.some(l=>l.level===level))Object.assign(LEVELS[level-1],{type:'residential',name:`Residential · ${RESIDENCES[key]}`,placement:'Wiki-associated residence · interior reconstructed'});}
export const RECYCLING_LEVELS = [8,20,32,44,56,61,73,85,97,109,126,138];
export function roomType(level, wing) {
  if(RESIDENCES[`${level}:${wing}`])return 'residential';
  if (wing === 0) return LEVELS[level - 1].type;
  if (level === 19 && wing === 1) return 'vault';
  if (level === 19 && wing === 2) return 'office';
  if (level === 20 && wing === 1) return 'recycling';
  if (level === 126 && wing === 1) return 'it';
  if (level === 144 && wing === 1) return 'workshop';
  if (level === 144 && wing === 2) return 'cafeteria';
  if (level === 144 && wing === 3) return 'supply';
  if (level === 80 && wing === 1) return 'park';
  if (wing === 5) return RECYCLING_LEVELS.includes(level) ? 'recycling' : level % 2 === 0 ? 'laundry' : 'utility';
  if (wing === 4 && level % 3 === 0) return 'workshop';
  return 'residential';
}
export const TYPE_NAMES = { bazaar:'BAZAAR', cafeteria: 'CAFETERIA', sheriff: 'SHERIFF', office: 'ADMINISTRATION', judicial: 'JUDICIAL', it: 'INFORMATION TECHNOLOGY', recycling: 'RECYCLING', school: 'EDUCATION', medical: 'MEDICAL', water: 'WATER FILTRATION', residential: 'RESIDENCES', farm: 'AGRICULTURE', supply: 'SUPPLY', workshop: 'WORKSHOP', mechanical: 'MECHANICAL', generator: 'GENERATOR', airlock: 'CLEANING AIRLOCK', surveillance: 'WATCHER ROOM', vault: 'THE VAULT', utility: 'SERVICES', janitorial:'JANITORIAL', porter:'PORTER DISPATCH', bar:'BAR', park:'PARK & ORCHARD', laundry:'LAUNDRY' };
export const roomsForLevel = level => Array.from({length:6},(_,wing)=>({id:`room:${level}:${wing}`,level,wing,type:roomType(level,wing),name:RESIDENCES[`${level}:${wing}`]||TYPE_NAMES[roomType(level,wing)]}));
export const normalizeAngle = a => ((a % TAU) + TAU) % TAU;
export function stairHeight(x, z, nearY) {
  const angle = normalizeAngle(Math.atan2(z, x));
  const risePerTurn = SILO.levelHeight / SILO.stairTurns;
  const raw = SILO.bottomY + stairStepY(Math.floor(angle / TAU * SILO.stairSteps));
  const turn = Math.round((nearY - raw) / risePerTurn);
  const value = raw + turn * risePerTurn;
  return value >= SILO.bottomY - 0.02 && value <= levelY(1) + 0.02 ? value : null;
}
