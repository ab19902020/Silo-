// Ported from Lost Signal's src/gun_samples.js. The recordings are the ones
// supplied to that repository; the only change here is where they are found.
const audio = (name) => new URL(`../assets/audio/guns/${name}.mp3`, import.meta.url).href;

/** Uploaded, weapon-authentic recordings. Kept separate from the synth fallback. */
export const GUN_SAMPLE_URLS = Object.freeze({
  fire308: audio('308-single'),
  fire20Gauge: audio('20-gauge-single'),
  fire9mm: audio('9mm-single'),
  mag9Out: audio('9mm-mag-out'),
  mag9In: audio('9mm-mag-in'),
  akOut: audio('ak-mag-out'),
  akIn: audio('ak-mag-in'),
  arOut: audio('ar-mag-out'),
  arIn: audio('ar-mag-in'),
  boltOut: audio('bolt-mag-out'),
  boltIn: audio('bolt-mag-in'),
  shotgunLoad: audio('shotgun-load'),
  pistolRack: audio('pistol-rack'),
  pistolReload1: audio('pistol-reload-1'),
  pistolReload2: audio('pistol-reload-2'),
  revolverOpen: audio('revolver-open'),
  revolverCock: audio('revolver-cock'),
  revolverClose: audio('revolver-close'),
});

/** Match only recordings that genuinely belong to the weapon family. */
export function fireSampleForWeapon(spec) {
  if (!spec || spec.kind === 'melee' || spec.quiet) return null;
  if (spec.family === 'shotgun') return 'fire20Gauge';
  if (spec.family === 'pistol' || spec.family === 'smg') return 'fire9mm';
  if (spec.family === 'rifle' || spec.family === 'sniper') return 'fire308';
  // The pack has no revolver report. Its tailored procedural .357/.44 sound
  // is more truthful than pretending a 9 mm or .308 recording is a revolver.
  return null;
}

const event = (key, at, gain = 0.62, rate = 1) => ({ key, at, gain, rate });

/** Schedule the matching magazine, shell and action recordings across a reload. */
export function reloadSamplesForWeapon(spec) {
  if (!spec || spec.kind === 'melee') return [];
  const duration = Math.max(0.8, spec.reloadTime || 1.8);
  if (spec.family === 'shotgun') {
    const shells = Math.min(5, Math.max(2, Math.round((spec.magazine || 4) / 2)));
    const spacing = Math.max(0.28, (duration - 0.48) / shells);
    return Array.from({ length: shells }, (_, index) =>
      event('shotgunLoad', 0.18 + index * spacing, 0.58, 0.96 + index * 0.012));
  }
  if (spec.family === 'revolver') {
    return [
      event('revolverOpen', 0.06, 0.62),
      event('revolverCock', duration * 0.48, 0.52),
      event('revolverClose', Math.max(0.42, duration - 0.42), 0.68),
    ];
  }
  if (spec.family === 'sniper') {
    return [event('boltOut', 0.10, 0.62), event('boltIn', duration * 0.55, 0.68)];
  }
  if (spec.family === 'rifle') {
    const ak = /AKM/i.test(spec.name || '');
    return [
      event(ak ? 'akOut' : 'arOut', 0.12, 0.62),
      event(ak ? 'akIn' : 'arIn', duration * 0.56, 0.70),
    ];
  }
  if (spec.family === 'pistol' || spec.family === 'smg') {
    const compact = duration < 1.5;
    return [
      event('mag9Out', 0.08, 0.58),
      event(compact ? 'pistolReload1' : 'pistolReload2', duration * 0.40, 0.48),
      event('mag9In', duration * 0.56, 0.66),
      event('pistolRack', Math.max(0.55, duration - 0.35), 0.52),
    ];
  }
  return [];
}
