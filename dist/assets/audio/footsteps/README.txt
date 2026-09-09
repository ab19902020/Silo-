Recorded footsteps
==================

These are real recordings, one set per walking surface in the silo. They
replace the synthesised footsteps, which were modelled with a bank of damped
resonators — the right tool for a bell or a steel plate, and the wrong one for
a floor.

Source
------
Minetest Game (now Luanti), mods/default/sounds
https://github.com/luanti-org/minetest_game

Licence
-------
The media in that repository is published under CC BY-SA 3.0, CC BY 3.0 and
CC0 1.0. The licence file does not map individual files to individual
licences, so these recordings are treated as the most restrictive of the
three: Creative Commons Attribution-ShareAlike 3.0 Unported.

  https://creativecommons.org/licenses/by-sa/3.0/

The full licence text as published by that project is in LICENSE.txt beside
this file, including the list of contributors it credits.

ATTRIBUTION AND SHAREALIKE APPLY TO THESE AUDIO FILES.
Credit is given here and in the repository README. Because they have been
adapted (see Changes), the adapted recordings in this directory are themselves
distributed under CC BY-SA 3.0. This applies to the contents of this directory
only; the rest of the project is an independent work collected alongside them,
not a derivative of them.

Changes made
------------
Decoded from Ogg Vorbis to 16-bit PCM WAV, leading and trailing silence
trimmed so the attack is sample-accurate, capped in length per surface with a
50 ms fade where the original ran longer than a single footstep, and
level-matched within each surface. No other processing.

WAV rather than a compressed format is deliberate: every codec pads the start
of a file, and on a 280 ms footstep that padding smears the transient that
carries the material.

Which recording sits under which surface is recorded in manifest.json.
