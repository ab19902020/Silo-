// Metres throughout. The public production references do not contain a complete
// surveyed plan. Only 144 numbered levels is treated as an exact dimension.
export const TAU = Math.PI * 2;
export const SILO = Object.freeze({
  levels: 144, levelHeight: 10, bottomY: 80,
  wellRadius: 18, deckOuter: 25.6, shellRadius: 54,
  stairColumn: 3.1, stairRadius: 7.3, stairTurns: 1, stairSteps: 72, stairLandingSteps: 8,
  landingHalf: 1.8, roomDepth: 24, roomHalf: 10, roomHeight: 5.8,
});
export const levelY = level => SILO.bottomY + (SILO.levels - level) * SILO.levelHeight;
export const stairStepY = index => Math.max(0,Math.min(1,(index+1-SILO.stairLandingSteps)/(SILO.stairSteps-2*SILO.stairLandingSteps)))*SILO.levelHeight;
export const levelAt = y => Math.max(1, Math.min(144, Math.round((levelY(1) - y) / SILO.levelHeight) + 1));
export const zoneFor = n => n <= 48 ? 'UP TOP' : n <= 96 ? 'THE MIDS' : 'DOWN DEEP';

export const SOURCES = [
  { title: 'VFX Voice · production interview', url: 'https://vfxvoice.com/unraveling-the-mysteries-of-silo/', note: '144 levels, apartments, farms, cafeteria screen and central shaft.' },
  { title: 'Outpost VFX · generator & excavator', url: 'https://www.outpost-vfx.com/en/news/silo-s1-modelling-the-machines-of-an-underground-city/', note: 'Six generator panels; excavator tower, radial arms, cranes and cutting heads.' },
  { title: 'Arnaud Valette · shaft concept design', url: 'https://arnaudvalette.artstation.com/projects/39xAqA', note: 'Credited production concept art for the central shaft.' },
  { title: 'British Cinematographer · Silo lighting', url: 'https://britishcinematographer.co.uk/lightbridge-silo/', note: 'Cafeteria screen and the lighting of the practical sets.' },
  { title: 'Silo Wiki · TV locations', url: 'https://silo.telepedia.net/wiki/Silo-18', note: 'Secondary episode-indexed source: recycling on 20; water filtration on 55.' },
  { title: 'Silo Wiki · IT department', url: 'https://silo.telepedia.net/wiki/IT_Department', note: 'Secondary source: TV IT on 19, as opposed to 34 in the novels.' },
];

const landmark = (level, name, type, description, placement = 'Reconstructed placement') => ({ level, name, type, description, placement });
export const LANDMARKS = [
  landmark(1, 'Cafeteria & the outside screen', 'cafeteria', 'The great viewing screen, radial ceiling, communal tables and the upper landing.', 'Shown in the series'),
  landmark(2, 'Sheriff’s office & holding cells', 'sheriff', 'Investigation desks, dispatch radio, evidence shelves and barred holding cells.'),
  landmark(3, 'Mayor’s office', 'office', 'Austere civic offices, records and meeting space overlooking the shaft.'),
  landmark(14, 'Judicial', 'judicial', 'Stone corridors, the judge’s chamber and the hidden observation room.', 'TV location; interior plan reconstructed'),
  landmark(19, 'IT & the vault', 'it', 'Workstations, server aisles, Bernard’s office and the restricted vault.', 'TV location; interior plan reconstructed'),
  landmark(20, 'Recycling', 'recycling', 'Sorting tables, salvage cages, a conveyor and the refuse chute.', 'Episode-indexed location'),
  landmark(35, 'School & nursery', 'school', 'Classrooms, books, children’s desks and a communal nursery.'),
  landmark(50, 'Medical', 'medical', 'Clinical wards, an examination room, dispensary and operating theatre.', 'TV-associated level; room plan reconstructed'),
  landmark(55, 'Water filtration', 'water', 'Filter vessels, treatment tanks, pipework and a pump control station.', 'Episode-indexed location'),
  landmark(62, 'Residential quarter', 'residential', 'Furnished family homes with living rooms, kitchens, bedrooms and bathrooms.'),
  landmark(80, 'Orchard & grow rooms', 'farm', 'A broad agricultural hall with soil beds, irrigation and artificial sunlight.'),
  landmark(97, 'Agricultural terraces', 'farm', 'Crop rows, a propagation room and the boundary between the Mids and Down Deep.'),
  landmark(110, 'Supply', 'supply', 'Store rooms, textiles, repairable goods and porter collection points.'),
  landmark(120, 'Lower farms', 'farm', 'Food production close to the lower residential and engineering levels.'),
  landmark(126, 'Down Deep cafeteria', 'cafeteria', 'Worn communal furniture and the gathering place of the lower levels.'),
  landmark(130, 'Walker’s workshop', 'workshop', 'Workbenches, analogue instruments, spares and electrical repairs.'),
  landmark(140, 'Mechanical workshops', 'mechanical', 'Heavy engineering, pumps, stores and maintenance bays.'),
  landmark(144, 'Mechanical & generator', 'generator', 'The lowest numbered landing and the great six-panel turbine below it.', 'Lowest numbered level shown; chamber dimensions reconstructed'),
];
export const SPECIALS = [
  { id: 'airlock', name: 'Cleaning airlock', level: 1, type: 'airlock', description: 'Suit preparation and the double-door cleaning chamber.' },
  { id: 'mines', name: 'The mines', level: 144, type: 'mines', description: 'Supported rock tunnels, rail carts, drill faces and an ore working.' },
  { id: 'excavator', name: 'The excavator & flooded void', level: 144, type: 'excavator', description: 'The abandoned digging machine, its radial cutting arms and the water beneath the silo.' },
  { id: 'tunnel', name: 'The hidden tunnel', level: 144, type: 'tunnel', description: 'A lower maintenance passage and the sealed door beneath the waterline.' },
];
export const LEVELS = Array.from({ length: 144 }, (_, i) => {
  const level = i + 1;
  const known = LANDMARKS.find(x => x.level === level);
  const defaultType = level > 134 ? 'mechanical' : level % 16 === 0 ? 'farm' : level % 11 === 0 ? 'supply' : level % 9 === 0 ? 'workshop' : 'residential';
  return { level, zone: zoneFor(level), ...(known || { name: `${defaultType === 'residential' ? 'Residential' : defaultType[0].toUpperCase() + defaultType.slice(1)} · ${String(level).padStart(3, '0')}`, type: defaultType, description: 'A complete gallery with six furnished wings. Placement fills a gap in the published television layout.', placement: 'Reconstructed placement' }) };
});
export function roomType(level, wing) {
  if (wing === 0) return LEVELS[level - 1].type;
  if (level === 1 && wing === 1) return 'airlock';
  if (level === 14 && wing === 1) return 'surveillance';
  if (level === 19 && wing === 1) return 'vault';
  if (level === 144 && wing === 1) return 'workshop';
  if (wing === 5) return level > 130 ? 'supply' : 'utility';
  if (wing === 4 && level % 3 === 0) return 'workshop';
  return 'residential';
}
export const TYPE_NAMES = { cafeteria: 'CAFETERIA', sheriff: 'SHERIFF', office: 'ADMINISTRATION', judicial: 'JUDICIAL', it: 'INFORMATION TECHNOLOGY', recycling: 'RECYCLING', school: 'EDUCATION', medical: 'MEDICAL', water: 'WATER FILTRATION', residential: 'RESIDENCES', farm: 'AGRICULTURE', supply: 'SUPPLY', workshop: 'WORKSHOP', mechanical: 'MECHANICAL', generator: 'GENERATOR', airlock: 'CLEANING AIRLOCK', surveillance: 'OBSERVATION', vault: 'THE VAULT', utility: 'SERVICES' };
export const normalizeAngle = a => ((a % TAU) + TAU) % TAU;
export function stairHeight(x, z, nearY) {
  const angle = normalizeAngle(Math.atan2(z, x));
  const risePerTurn = SILO.levelHeight / SILO.stairTurns;
  const raw = SILO.bottomY + stairStepY(Math.floor(angle / TAU * SILO.stairSteps));
  const turn = Math.round((nearY - raw) / risePerTurn);
  const value = raw + turn * risePerTurn;
  return value >= SILO.bottomY - 0.02 && value <= levelY(1) + 0.02 ? value : null;
}
