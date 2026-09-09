// Firearms, ported from Lost Signal.
//
// This is the catalogue and the tuning from `src/weapons.js` in
// ab19902020/Lost-signal-, brought across whole rather than retyped: the
// recoil profiles, rates of fire, spreads and audio voices are the numbers
// that were already tuned there, and re-entering twenty-six of them by hand
// would only introduce transcription errors. What is added here is `model`,
// naming the mesh each weapon uses, and the range's own resupply behaviour.
//
// The models are the Quaternius Ultimate Guns Pack (CC0 1.0), re-exported with
// an orientation marker and front/rear sight nodes; the firing and handling
// recordings were supplied by the repository owner. See
// dist/assets/lost-signal/guns/SOURCES.txt.

// The armoury's twenty-five supplied models, as things you can actually pick
// up and shoot.
//
// This file is deliberately data only — no THREE, no WebAudio — so the whole
// catalogue is verifiable from `npm run qa:unit` without a browser. The scene
// code reads `view` to hang a model off the camera, the shooting code reads
// the ballistics, and the audio code renders `audio` with oscillators and
// filtered noise. Nothing here streams a sample: the shelter ships no audio
// assets, and twenty-two distinct voices are cheaper to synthesise than to
// download.

// One reload is a sequence of mechanical transients. Each step is a short
// band-passed noise burst at `hz`, optionally with a tonal click, placed `at`
// seconds into the animation — which is what makes a revolver's cylinder read
// differently from a rifle's magazine even though both are "a reload".
const step = (at, hz, level = 0.5, decay = 0.05, q = 2.2, tone = 0) =>
  ({ at, hz, level, decay, q, tone });

// Magazine-fed: catch, magazine out, magazine seated, bolt released.
const magazineReload = (pitch = 1, length = 2.1) => [
  step(0.00, 1500 * pitch, 0.34, 0.035, 3.0, 900 * pitch),
  step(0.22 * length, 620 * pitch, 0.30, 0.10, 1.4),
  step(0.55 * length, 900 * pitch, 0.52, 0.09, 1.8, 320 * pitch),
  step(0.84 * length, 2200 * pitch, 0.46, 0.05, 3.4, 1400 * pitch),
];

// Shell-by-shell, then the action is worked closed.
const pumpReload = (pitch = 1, shells = 4, length = 3.0) => {
  const sequence = [];
  for (let i = 0; i < shells; i++) {
    sequence.push(step((0.06 + (i * 0.62) / shells) * length, 780 * pitch,
      0.34, 0.07, 1.9, 260 * pitch));
  }
  sequence.push(step(0.80 * length, 1250 * pitch, 0.5, 0.07, 2.2, 420 * pitch));
  sequence.push(step(0.92 * length, 1650 * pitch, 0.54, 0.06, 2.6, 300 * pitch));
  return sequence;
};

// Bolt up, bolt back, charger, bolt forward, bolt down.
const boltReload = (pitch = 1, length = 2.8) => [
  step(0.00, 1750 * pitch, 0.40, 0.045, 3.2, 780 * pitch),
  step(0.16 * length, 1100 * pitch, 0.34, 0.09, 1.6),
  step(0.42 * length, 700 * pitch, 0.30, 0.11, 1.5, 240 * pitch),
  step(0.72 * length, 1200 * pitch, 0.40, 0.08, 1.8),
  step(0.90 * length, 1950 * pitch, 0.46, 0.05, 3.4, 860 * pitch),
];

// Latch, crane out, ejector rod, rounds dropped in, crane shut.
const cylinderReload = (pitch = 1, length = 2.6) => [
  step(0.00, 2100 * pitch, 0.32, 0.035, 3.6, 1150 * pitch),
  step(0.14 * length, 520 * pitch, 0.26, 0.13, 1.2),
  step(0.34 * length, 1400 * pitch, 0.38, 0.07, 2.4, 640 * pitch),
  step(0.56 * length, 860 * pitch, 0.30, 0.10, 1.7),
  step(0.72 * length, 980 * pitch, 0.32, 0.09, 1.9),
  step(0.90 * length, 1750 * pitch, 0.50, 0.05, 3.0, 520 * pitch),
];

// The blade is not reloaded; the sound of it is the sheath.
const sheathReload = () => [
  step(0.00, 3200, 0.26, 0.14, 1.1),
  step(0.30, 2400, 0.22, 0.10, 1.3),
];

/**
 * A firing voice: a low body sweep for the muzzle blast, a band-passed crack
 * for the report, and a lowpassed tail for the room. Every weapon gets its own
 * numbers, so no two of them sound the same when you stand in the same corridor
 * and fire them one after another.
 */
// A shot is five sounds, not one. `snap` is the two-millisecond transient that
// makes the ear read an explosion rather than a tone; `body` is the muzzle
// blast; `super` is the round going past, which only supersonic rounds have;
// `tail` is the blast rolling away; `action` is the mechanism cycling behind
// it. Everything but the body and tail defaults off, so a voice that does not
// set them is simply the older, quieter gun it always was.
const voice = ({ level, bodyHz, bodyEndHz, bodyDecay, crackHz, crackQ, crackDecay,
  tailHz, tailDecay, tailLevel,
  snapHz = 1500, snapLevel = 1.0,
  superHz = 0, superLevel = 0, superAt = 0.008,
  actionHz = 0, actionLevel = 0, actionAt = 0.05, actionSpread = 0.03 }) => ({
  level, bodyHz, bodyEndHz, bodyDecay, crackHz, crackQ, crackDecay,
  tailHz, tailDecay, tailLevel,
  snapHz, snapLevel, superHz, superLevel, superAt,
  actionHz, actionLevel, actionAt, actionSpread,
});

const RIFLE_VOICE = (pitch = 1, level = 0.5) => voice({
  level,
  bodyHz: 210 * pitch, bodyEndHz: 52 * pitch, bodyDecay: 0.13,
  crackHz: 2600 * pitch, crackQ: 1.0, crackDecay: 0.075,
  tailHz: 1100 * pitch, tailDecay: 0.34, tailLevel: 0.30,
  snapHz: 1600 * pitch, snapLevel: 1.25,
  superHz: 5200 * pitch, superLevel: 0.40,
  actionHz: 1900 * pitch, actionLevel: 0.20, actionAt: 0.045,
});

const SMG_VOICE = (pitch = 1, level = 0.4) => voice({
  level,
  bodyHz: 260 * pitch, bodyEndHz: 84 * pitch, bodyDecay: 0.07,
  crackHz: 3200 * pitch, crackQ: 1.5, crackDecay: 0.045,
  tailHz: 1500 * pitch, tailDecay: 0.18, tailLevel: 0.20,
  snapHz: 2000 * pitch, snapLevel: 1.0,
  superHz: 5600 * pitch, superLevel: 0.24,
  actionHz: 2400 * pitch, actionLevel: 0.28, actionAt: 0.030, actionSpread: 0.022,
});

// No supersonic crack: buckshot leaves the barrel below the speed of sound,
// which is exactly why a shotgun is a boom and a rifle is a whipcrack.
const SHOTGUN_VOICE = (pitch = 1, level = 0.62) => voice({
  level,
  bodyHz: 150 * pitch, bodyEndHz: 34 * pitch, bodyDecay: 0.22,
  crackHz: 1500 * pitch, crackQ: 0.6, crackDecay: 0.14,
  tailHz: 700 * pitch, tailDecay: 0.55, tailLevel: 0.42,
  snapHz: 820 * pitch, snapLevel: 1.4,
  actionHz: 1150 * pitch, actionLevel: 0.34, actionAt: 0.20, actionSpread: 0.10,
});

const SNIPER_VOICE = (pitch = 1, level = 0.7) => voice({
  level,
  bodyHz: 175 * pitch, bodyEndHz: 40 * pitch, bodyDecay: 0.18,
  crackHz: 3600 * pitch, crackQ: 0.8, crackDecay: 0.10,
  tailHz: 820 * pitch, tailDecay: 0.85, tailLevel: 0.5,
  snapHz: 1250 * pitch, snapLevel: 1.5,
  superHz: 4700 * pitch, superLevel: 0.55, superAt: 0.011,
  // The bolt is worked after the shot, not with it.
  actionHz: 1450 * pitch, actionLevel: 0.20, actionAt: 0.30, actionSpread: 0.14,
});

const PISTOL_VOICE = (pitch = 1, level = 0.44) => voice({
  level,
  bodyHz: 300 * pitch, bodyEndHz: 96 * pitch, bodyDecay: 0.08,
  crackHz: 2900 * pitch, crackQ: 1.3, crackDecay: 0.055,
  tailHz: 1300 * pitch, tailDecay: 0.24, tailLevel: 0.24,
  snapHz: 1900 * pitch, snapLevel: 1.1,
  superHz: 5000 * pitch, superLevel: 0.18,
  actionHz: 2600 * pitch, actionLevel: 0.32, actionAt: 0.035, actionSpread: 0.026,
});

// A revolver has no slide and no bolt: after the shot there is nothing but the
// room. It is the one firearm in the collection with no action noise at all.
const REVOLVER_VOICE = (pitch = 1, level = 0.6) => voice({
  level,
  bodyHz: 190 * pitch, bodyEndHz: 46 * pitch, bodyDecay: 0.16,
  crackHz: 2100 * pitch, crackQ: 0.8, crackDecay: 0.11,
  tailHz: 900 * pitch, tailDecay: 0.62, tailLevel: 0.44,
  snapHz: 1350 * pitch, snapLevel: 1.25,
  superHz: 4200 * pitch, superLevel: 0.22,
});

const BLADE_VOICE = () => voice({
  level: 0.3,
  bodyHz: 520, bodyEndHz: 180, bodyDecay: 0.05,
  crackHz: 4200, crackQ: 2.6, crackDecay: 0.09,
  tailHz: 2600, tailDecay: 0.16, tailLevel: 0.14,
  snapHz: 3200, snapLevel: 0.45,
});

// --- Recoil -----------------------------------------------------------------
// One number per weapon was never going to be enough. What separates an AKM
// from a carbine is not how far the sight moves, it is the shape of the move:
// how much of it is climb and how much is sideways, whether the sideways is
// random or a consistent pull, how much the fifth round of a burst adds to the
// first, and how much of it the weapon takes back on its own.
//
//   rise      degrees of muzzle climb per round
//   swing     random horizontal, either way
//   bias      consistent horizontal pull; sign is the direction
//   climb     how much each round in a burst compounds the last
//   settle    the share the weapon returns by itself; the rest is the player's
//   recover   how fast that share comes back
//   braced    what shouldering it is worth
//   punch     how hard the weapon itself is thrown back in the hands
//   shove     camera roll, which is what a big cartridge does to a shooter
const recoil = ({ rise, swing, bias = 0, climb = .11, settle = .74, recover = 7.5,
  braced = .62, punch = 1, shove = .5, cap = 9 }) =>
  ({ rise, swing, bias, climb, settle, recover, braced, punch, shove, cap });

// Families. A weapon that does not name its own recoil gets its family's.
const RIFLE_KICK = (scale = 1, bias = 0) => recoil({
  rise: .0058 * scale, swing: .0021 * scale, bias: .0007 * bias,
  climb: .13, settle: .76, recover: 7.8, punch: 1.0, shove: .45,
});
const SMG_KICK = (scale = 1, bias = 0) => recoil({
  rise: .0034 * scale, swing: .0026 * scale, bias: .0005 * bias,
  climb: .16, settle: .82, recover: 9.5, punch: .7, shove: .3, cap: 12,
});
const SHOTGUN_KICK = (scale = 1) => recoil({
  rise: .0175 * scale, swing: .0042 * scale, bias: 0,
  climb: .04, settle: .60, recover: 5.0, braced: .70, punch: 2.1, shove: 1.4, cap: 3,
});
const SNIPER_KICK = (scale = 1) => recoil({
  rise: .0205 * scale, swing: .0030 * scale, bias: 0,
  climb: .03, settle: .55, recover: 4.2, braced: .74, punch: 2.4, shove: 1.6, cap: 2,
});
const PISTOL_KICK = (scale = 1) => recoil({
  rise: .0068 * scale, swing: .0030 * scale, bias: 0,
  climb: .09, settle: .80, recover: 9.0, braced: .70, punch: .9, shove: .35, cap: 5,
});
const REVOLVER_KICK = (scale = 1) => recoil({
  rise: .0138 * scale, swing: .0034 * scale, bias: 0,
  climb: .05, settle: .64, recover: 5.6, braced: .72, punch: 1.7, shove: 1.0, cap: 3,
});
const BLADE_KICK = () => recoil({
  rise: .0018, swing: .0016, climb: 0, settle: .95, recover: 12, punch: .5, shove: .1, cap: 2,
});

// `view` is how the model hangs off the camera: scale, then a small local
// offset. The scene code measures which way each model lies and turns its long
// axis onto the firing line; `flip` is for the handful that then point the
// wrong way down it.
const view = (scale, x = 0, y = 0, z = 0, flip = false) =>
  ({ scale, offset: [x, y, z], flip });

/**
 * The catalogue. `calibre` is the width of the mark the weapon leaves on what
 * it hits — buckshot punches a scatter of small pits, a .50 leaves a crater —
 * and `pellets` decides how many of them there are.
 *
 * `key` matches the asset key in assets.js and the rack slot in
 * armory.js, so a weapon added in one place is impossible to forget in the
 * others — qa/unit.mjs cross-checks all three lists.
 */
export const WEAPONS = {
  // --- Assault rifles ------------------------------------------------------
  armoryAssault01: {
    model: 'assault_rifle_01',
    name: 'SERVICE RIFLE', family: 'rifle', calibre: 0.095, kind: 'firearm', automatic: true,
    magazine: 30, reserve: 90, damage: 34, headshot: 2.6, rpm: 700,
    reloadTime: 2.1, spread: 0.011, adsSpread: 0.0035, range: 90, recoil: 0.18,
    view: view(0.16, -0.04, -0.08, 0),
    kick: RIFLE_KICK(1.00, 0.4),
    audio: { fire: RIFLE_VOICE(1.00), reload: magazineReload(1.00, 2.1) },
  },
  armoryAssault02: {
    model: 'assault_rifle_02',
    name: 'CARBINE MK2', family: 'rifle', calibre: 0.085, kind: 'firearm', automatic: true,
    magazine: 30, reserve: 120, damage: 29, headshot: 2.6, rpm: 820,
    reloadTime: 1.95, spread: 0.013, adsSpread: 0.004, range: 80, recoil: 0.15,
    view: view(0.155, -0.03, -0.075, 0),
    kick: RIFLE_KICK(0.86, 0.3),
    audio: { fire: RIFLE_VOICE(1.14, 0.46), reload: magazineReload(1.12, 1.95) },
  },
  armoryAssault03: {
    model: 'assault_rifle_03',
    name: 'HEAVY RIFLE', family: 'rifle', calibre: 0.125, kind: 'firearm', automatic: true,
    magazine: 20, reserve: 80, damage: 44, headshot: 2.5, rpm: 580,
    reloadTime: 2.45, spread: 0.014, adsSpread: 0.0045, range: 100, recoil: 0.26,
    view: view(0.17, -0.05, -0.085, 0),
    kick: RIFLE_KICK(1.46, -0.5),
    audio: { fire: RIFLE_VOICE(0.82, 0.58), reload: magazineReload(0.86, 2.45) },
  },
  armoryBullpup: {
    model: 'bullpup_rifle',
    name: 'BULLPUP RIFLE', family: 'rifle', calibre: 0.09, kind: 'firearm', automatic: true,
    magazine: 32, reserve: 128, damage: 31, headshot: 2.6, rpm: 780,
    reloadTime: 1.85, spread: 0.010, adsSpread: 0.003, range: 88, recoil: 0.16,
    view: view(0.16, -0.02, -0.08, 0),
    kick: RIFLE_KICK(0.92, 0.2),
    audio: { fire: RIFLE_VOICE(1.07, 0.48), reload: magazineReload(1.22, 1.85) },
  },

  armoryAkm: {
    model: 'akm',
    name: 'AKM', family: 'rifle', calibre: 0.125, kind: 'firearm', automatic: true,
    magazine: 30, reserve: 120, damage: 38, headshot: 2.5, rpm: 600,
    reloadTime: 2.3, spread: 0.016, adsSpread: 0.0055, range: 85, recoil: 0.24,
    view: view(0.155, -0.03, -0.08, 0),
    kick: RIFLE_KICK(1.38, 1.6),
    audio: { fire: RIFLE_VOICE(0.90, 0.56), reload: magazineReload(0.94, 2.3) },
  },

  // --- Shotguns ------------------------------------------------------------
  armoryShotgun01: {
    model: 'shotgun_01',
    name: 'COMBAT SHOTGUN', family: 'shotgun', calibre: 0.042, kind: 'firearm', automatic: false,
    magazine: 8, reserve: 32, damage: 17, headshot: 1.5, rpm: 95, pellets: 8,
    reloadTime: 3.0, spread: 0.055, adsSpread: 0.038, range: 34, recoil: 0.42,
    view: view(0.165, -0.04, -0.085, 0),
    kick: SHOTGUN_KICK(1.00),
    audio: { fire: SHOTGUN_VOICE(1.00), reload: pumpReload(1.00, 4, 3.0) },
  },
  armoryShotgun02: {
    model: 'shotgun_02',
    name: 'RIOT SHOTGUN', family: 'shotgun', calibre: 0.04, kind: 'firearm', automatic: false,
    magazine: 6, reserve: 30, damage: 16, headshot: 1.5, rpm: 80, pellets: 9,
    reloadTime: 2.8, spread: 0.062, adsSpread: 0.044, range: 30, recoil: 0.45,
    view: view(0.165, -0.04, -0.085, 0),
    kick: SHOTGUN_KICK(1.08),
    audio: { fire: SHOTGUN_VOICE(0.92, 0.66), reload: pumpReload(0.9, 3, 2.8) },
  },
  armoryShotgunShort: {
    model: 'shotgun_short_stock',
    name: 'SHORT-STOCK SHOTGUN', family: 'shotgun', calibre: 0.044, kind: 'firearm', automatic: false,
    magazine: 5, reserve: 25, damage: 18, headshot: 1.5, rpm: 105, pellets: 9,
    reloadTime: 2.6, spread: 0.070, adsSpread: 0.052, range: 26, recoil: 0.48,
    view: view(0.175, -0.02, -0.08, 0),
    kick: SHOTGUN_KICK(1.22),
    audio: { fire: SHOTGUN_VOICE(1.10, 0.60), reload: pumpReload(1.15, 3, 2.6) },
  },
  armoryShotgunSawed: {
    model: 'shotgun_sawed_off',
    name: 'SAWED-OFF SHOTGUN', family: 'shotgun', calibre: 0.038, kind: 'firearm', automatic: false,
    magazine: 2, reserve: 20, damage: 15, headshot: 1.4, rpm: 160, pellets: 12,
    reloadTime: 2.2, spread: 0.098, adsSpread: 0.080, range: 18, recoil: 0.55,
    view: view(0.20, 0.02, -0.07, 0),
    kick: SHOTGUN_KICK(1.62),
    audio: { fire: SHOTGUN_VOICE(1.22, 0.68), reload: pumpReload(1.3, 2, 2.2) },
  },

  armoryMossberg: {
    model: 'mossberg_590a1',
    name: 'MOSSBERG 590A1', family: 'shotgun', calibre: 0.042, kind: 'firearm', automatic: false,
    magazine: 9, reserve: 36, damage: 17, headshot: 1.5, rpm: 88, pellets: 8,
    reloadTime: 3.2, spread: 0.058, adsSpread: 0.040, range: 32, recoil: 0.44,
    view: view(0.15, -0.03, -0.08, 0),
    kick: SHOTGUN_KICK(1.12),
    audio: { fire: SHOTGUN_VOICE(0.86, 0.70), reload: pumpReload(0.82, 5, 3.2) },
  },

  // --- Precision rifles ----------------------------------------------------
  armorySniper01: {
    model: 'sniper_rifle_01',
    name: 'MARKSMAN RIFLE', family: 'sniper', calibre: 0.135, kind: 'firearm', automatic: false,
    magazine: 10, reserve: 40, damage: 72, headshot: 3.0, rpm: 210,
    reloadTime: 2.5, spread: 0.010, adsSpread: 0.0012, range: 160, recoil: 0.34,
    zoom: 48, scope: '4x', magnification: 4, view: view(0.16, -0.05, -0.085, 0),
    kick: SNIPER_KICK(0.92),
    audio: { fire: SNIPER_VOICE(1.00), reload: magazineReload(0.9, 2.5) },
  },
  armorySniper02: {
    model: 'sniper_rifle_02',
    name: 'BOLT-ACTION RIFLE', family: 'sniper', calibre: 0.165, kind: 'firearm', automatic: false,
    magazine: 5, reserve: 30, damage: 115, headshot: 3.2, rpm: 45,
    reloadTime: 2.9, spread: 0.012, adsSpread: 0.0009, range: 190, recoil: 0.5,
    zoom: 48, scope: '6x', magnification: 6, view: view(0.165, -0.05, -0.09, 0),
    kick: SNIPER_KICK(1.10),
    audio: { fire: SNIPER_VOICE(0.86, 0.76), reload: boltReload(0.9, 2.9) },
  },
  armorySniper03: {
    model: 'sniper_rifle_03',
    name: 'SCOUT RIFLE', family: 'sniper', calibre: 0.14, kind: 'firearm', automatic: false,
    magazine: 8, reserve: 32, damage: 80, headshot: 3.0, rpm: 180,
    reloadTime: 2.4, spread: 0.011, adsSpread: 0.0014, range: 150, recoil: 0.36,
    zoom: 48, scope: '5x', magnification: 5, view: view(0.16, -0.04, -0.085, 0),
    kick: SNIPER_KICK(1.00),
    audio: { fire: SNIPER_VOICE(1.12, 0.68), reload: magazineReload(1.05, 2.4) },
  },
  armorySniper04: {
    model: 'sniper_rifle_04',
    name: 'ANTI-MATERIEL RIFLE', family: 'sniper', calibre: 0.26, kind: 'firearm', automatic: false,
    magazine: 5, reserve: 20, damage: 165, headshot: 2.6, rpm: 38,
    reloadTime: 3.4, spread: 0.014, adsSpread: 0.0011, range: 220, recoil: 0.7,
    zoom: 48, scope: '8x', magnification: 10, view: view(0.175, -0.06, -0.095, 0),
    kick: SNIPER_KICK(1.85),
    audio: { fire: SNIPER_VOICE(0.66, 0.84), reload: boltReload(0.72, 3.4) },
  },

  // --- Submachine guns -----------------------------------------------------
  armorySmg01: {
    model: 'smg_01',
    name: 'COMPACT SMG', family: 'smg', calibre: 0.07, kind: 'firearm', automatic: true,
    magazine: 32, reserve: 160, damage: 21, headshot: 2.2, rpm: 900,
    reloadTime: 1.7, spread: 0.017, adsSpread: 0.007, range: 55, recoil: 0.11,
    view: view(0.18, -0.01, -0.075, 0),
    kick: SMG_KICK(1.00, 0.6),
    audio: { fire: SMG_VOICE(1.00), reload: magazineReload(1.25, 1.7) },
  },
  armorySmg02: {
    model: 'smg_02',
    name: 'SUPPRESSED SMG', family: 'smg', calibre: 0.068, kind: 'firearm', automatic: true,
    magazine: 30, reserve: 150, damage: 19, headshot: 2.2, rpm: 950,
    reloadTime: 1.75, spread: 0.015, adsSpread: 0.006, range: 50, recoil: 0.09,
    quiet: true, view: view(0.18, -0.02, -0.075, 0),
    kick: SMG_KICK(0.62, 0.2),
    audio: {
      // A can does not silence a gun, it removes the crack and shortens the
      // room. The mechanism is then the loudest part of the shot.
      fire: voice({
        level: 0.26,
        bodyHz: 340, bodyEndHz: 130, bodyDecay: 0.05,
        crackHz: 1200, crackQ: 2.4, crackDecay: 0.035,
        tailHz: 620, tailDecay: 0.10, tailLevel: 0.12,
        snapHz: 900, snapLevel: 0.42,
        // No crack past the muzzle, and the bolt is now the loudest thing
        // about it — which is exactly what a can does to a gun.
        actionHz: 2500, actionLevel: 0.62, actionAt: 0.026, actionSpread: 0.02,
      }),
      reload: magazineReload(1.32, 1.75),
    },
  },

  // --- Sidearms ------------------------------------------------------------
  armoryPistol01: {
    model: 'pistol_01',
    name: 'SIDEARM 9MM', family: 'pistol', calibre: 0.072, kind: 'firearm', automatic: false,
    magazine: 15, reserve: 60, damage: 26, headshot: 2.4, rpm: 380,
    reloadTime: 1.55, spread: 0.016, adsSpread: 0.006, range: 45, recoil: 0.14,
    view: view(0.19, 0.02, -0.05, 0),
    kick: PISTOL_KICK(1.00),
    audio: { fire: PISTOL_VOICE(1.00), reload: magazineReload(1.4, 1.55) },
  },
  armoryPistol02: {
    model: 'pistol_02',
    name: 'COMPACT PISTOL', family: 'pistol', calibre: 0.068, kind: 'firearm', automatic: false,
    magazine: 12, reserve: 48, damage: 24, headshot: 2.4, rpm: 420,
    reloadTime: 1.45, spread: 0.019, adsSpread: 0.008, range: 38, recoil: 0.13,
    view: view(0.20, 0.03, -0.05, 0),
    kick: PISTOL_KICK(0.88),
    audio: { fire: PISTOL_VOICE(1.16, 0.40), reload: magazineReload(1.52, 1.45) },
  },
  armoryPistol03: {
    model: 'pistol_03',
    name: 'SERVICE PISTOL', family: 'pistol', calibre: 0.074, kind: 'firearm', automatic: false,
    magazine: 17, reserve: 68, damage: 27, headshot: 2.4, rpm: 360,
    reloadTime: 1.6, spread: 0.015, adsSpread: 0.0055, range: 48, recoil: 0.15,
    view: view(0.19, 0.02, -0.05, 0),
    kick: PISTOL_KICK(1.06),
    audio: { fire: PISTOL_VOICE(0.92, 0.46), reload: magazineReload(1.3, 1.6) },
  },
  armoryPistol04: {
    model: 'pistol_04',
    name: 'HEAVY PISTOL', family: 'pistol', calibre: 0.13, kind: 'firearm', automatic: false,
    magazine: 8, reserve: 40, damage: 48, headshot: 2.5, rpm: 260,
    reloadTime: 1.8, spread: 0.021, adsSpread: 0.008, range: 52, recoil: 0.3,
    view: view(0.20, 0.02, -0.05, 0),
    kick: PISTOL_KICK(1.42),
    audio: { fire: PISTOL_VOICE(0.74, 0.56), reload: magazineReload(1.1, 1.8) },
  },

  armoryGlock: {
    model: 'glock_19',
    name: 'GLOCK 19', family: 'pistol', calibre: 0.07, kind: 'firearm', automatic: false,
    magazine: 15, reserve: 75, damage: 25, headshot: 2.4, rpm: 440,
    reloadTime: 1.4, spread: 0.017, adsSpread: 0.0058, range: 42, recoil: 0.12,
    view: view(0.205, 0.02, -0.05, 0),
    kick: PISTOL_KICK(0.94),
    audio: { fire: PISTOL_VOICE(1.08, 0.42), reload: magazineReload(1.46, 1.4) },
  },

  // --- Revolvers -----------------------------------------------------------
  armoryRevolver01: {
    model: 'revolver_01',
    name: '.357 REVOLVER', family: 'revolver', calibre: 0.14, kind: 'firearm', automatic: false,
    magazine: 6, reserve: 36, damage: 60, headshot: 2.6, rpm: 200,
    reloadTime: 2.6, spread: 0.018, adsSpread: 0.006, range: 60, recoil: 0.34,
    view: view(0.20, 0.02, -0.05, 0),
    kick: REVOLVER_KICK(1.00),
    audio: { fire: REVOLVER_VOICE(1.00), reload: cylinderReload(1.00, 2.6) },
  },
  armoryRevolver02: {
    model: 'revolver_02',
    name: 'SNUB REVOLVER', family: 'revolver', calibre: 0.13, kind: 'firearm', automatic: false,
    magazine: 5, reserve: 30, damage: 52, headshot: 2.6, rpm: 230,
    reloadTime: 2.4, spread: 0.025, adsSpread: 0.010, range: 34, recoil: 0.32,
    view: view(0.21, 0.03, -0.05, 0),
    kick: REVOLVER_KICK(0.86),
    audio: { fire: REVOLVER_VOICE(1.18, 0.54), reload: cylinderReload(1.2, 2.4) },
  },
  armoryRevolver03: {
    model: 'revolver_03',
    name: '.44 REVOLVER', family: 'revolver', calibre: 0.16, kind: 'firearm', automatic: false,
    magazine: 6, reserve: 30, damage: 76, headshot: 2.7, rpm: 165,
    reloadTime: 2.8, spread: 0.020, adsSpread: 0.0065, range: 68, recoil: 0.44,
    view: view(0.205, 0.02, -0.052, 0),
    kick: REVOLVER_KICK(1.55),
    audio: { fire: REVOLVER_VOICE(0.82, 0.66), reload: cylinderReload(0.86, 2.8) },
  },

  // --- Blade ---------------------------------------------------------------
  armoryBayonet: {
    model: 'bayonet',
    name: 'BAYONET', family: 'blade', calibre: 0.075, kind: 'melee',
    automatic: false, magazine: 0, reserve: 0, damage: 68, headshot: 1.8,
    rpm: 140, reloadTime: 0.45, reach: 2.05, recoil: 0.12,
    view: view(0.30, 0.06, -0.10, 0.06),
    kick: BLADE_KICK(),
    audio: { fire: BLADE_VOICE(), reload: sheathReload() },
  },

  armoryCombatKnife: {
    model: 'combat_knife',
    name: 'COMBAT KNIFE', family: 'blade', calibre: 0.08, kind: 'melee',
    automatic: false, magazine: 0, reserve: 0, damage: 74, headshot: 1.9,
    rpm: 165, reloadTime: 0.4, reach: 2.2, recoil: 0.14,
    view: view(0.30, 0.05, -0.09, 0.05),
    kick: BLADE_KICK(),
    audio: {
      fire: voice({
        level: 0.32,
        bodyHz: 460, bodyEndHz: 150, bodyDecay: 0.055,
        crackHz: 3700, crackQ: 2.2, crackDecay: 0.10,
        tailHz: 2300, tailDecay: 0.19, tailLevel: 0.16,
      }),
      reload: [step(0.00, 2900, 0.28, 0.15, 1.2), step(0.26, 2100, 0.24, 0.11, 1.4)],
    },
  },

  // --- Bench attachments ---------------------------------------------------
  // Racked with the rest of the collection and worth reading the plate on, but
  // there is nothing to fire: taking one would leave the player holding a
  // tripod in a firefight.
  armoryScope: { name: 'RIFLE OPTIC', family: 'attachment', kind: 'attachment' },
  armoryBipod: { name: 'BIPOD', family: 'attachment', kind: 'attachment' },
  armoryTripod: { name: 'TRIPOD MOUNT', family: 'attachment', kind: 'attachment' },
};

/**
 * Where the weapon sits while the player is aiming down it. A rifle comes back
 * into the shoulder; a handgun is pushed out to arm's length in front of the
 * face. One pose for every weapon put the revolver low and off to the right
 * with the sights nowhere near the crosshair.
 */
const AIM_POSE = {
  rifle: [0.03, -0.13, -0.64],
  smg: [0.03, -0.12, -0.60],
  shotgun: [0.03, -0.14, -0.66],
  sniper: [0.02, -0.12, -0.62],
  pistol: [0.01, -0.16, -0.50],
  revolver: [0.01, -0.16, -0.52],
  blade: [0.18, -0.28, -0.58],
};

export const aimPose = (weapon) => AIM_POSE[weapon?.family] || AIM_POSE.rifle;

/**
 * Where the weapon rests when it is not being aimed. A rifle hangs low across
 * the body; a handgun is carried much higher and closer, and parking one at
 * rifle height left it — and the hands on it — under the bottom of the frame.
 */
const HIP_POSE = {
  rifle: [0.32, -0.38, -0.72],
  smg: [0.30, -0.35, -0.68],
  shotgun: [0.32, -0.38, -0.72],
  sniper: [0.32, -0.38, -0.74],
  pistol: [0.24, -0.18, -0.56],
  revolver: [0.24, -0.18, -0.58],
  blade: [0.26, -0.13, -0.46],
};

export const hipPose = (weapon) => HIP_POSE[weapon?.family] || HIP_POSE.rifle;

/** Everything you can actually hold and use. */
export const USABLE_WEAPON_KEYS = Object.keys(WEAPONS)
  .filter((key) => WEAPONS[key].kind !== 'attachment');

export const DEFAULT_WEAPON = 'armoryAssault01';

export const isUsable = (key) => !!WEAPONS[key] && WEAPONS[key].kind !== 'attachment';

/** Seconds between shots, from the catalogue's rounds per minute. */
export const shotInterval = (weapon) => 60 / Math.max(1, weapon?.rpm ?? 600);

/**
 * The per-weapon ammunition the player is carrying. Swapping to a revolver and
 * back must not silently refill the rifle, and every weapon has to remember the
 * rounds already spent out of it.
 */
export function createLoadout() {
  const state = new Map();
  return {
    /** The magazine/reserve pair for a weapon, created full on first sight. */
    for(key) {
      if (!state.has(key)) {
        const weapon = WEAPONS[key];
        state.set(key, {
          magazine: weapon?.magazine ?? 0,
          reserve: weapon?.reserve ?? 0,
        });
      }
      return state.get(key);
    },
    /** Refill everything — a fresh run, or the quartermaster resupplying. */
    resupply(key) {
      const weapon = WEAPONS[key];
      if (!weapon) return;
      state.set(key, { magazine: weapon.magazine ?? 0, reserve: weapon.reserve ?? 0 });
    },
    /** Persisted as a plain object so a run survives a reload. */
    snapshot() {
      return Object.fromEntries([...state].map(([key, ammo]) => [key, { ...ammo }]));
    },
    restore(data) {
      if (!data) return;
      for (const [key, ammo] of Object.entries(data)) {
        if (!WEAPONS[key] || !ammo) continue;
        state.set(key, {
          magazine: Math.max(0, Math.min(WEAPONS[key].magazine ?? 0, ammo.magazine | 0)),
          reserve: Math.max(0, ammo.reserve | 0),
        });
      }
    },
  };
}
