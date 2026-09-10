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
level-matched within each surface.

The water recordings needed more than that. Every other file in the pack is one
clean footfall; default_water_footstep is two to two and a half seconds of
somebody wading continuously, half a dozen splashes run together with no
silence between them. Trimming the head of that file gave a take whose loudest
moment was 450 ms in behind a 400 ms fade-up — a footstep with no attack, which
is the one thing a footstep is made of, and the reason walking through the void
basin sounded like nothing was happening underfoot. So the splashes were cut
out of it individually instead: a 0.46 s window opening 20 ms before each
transient, with a 4 ms attack and a 160 ms tail fade, peak-normalised, and any
window holding a second splash discarded. Four takes came out of three files.

`soft`, the covered floors, is additionally low-passed at 2.2 kHz: unfiltered,
the grass recordings put 46 per cent of their energy above 5 kHz, which is a
rustle, and a rug does not rustle. No other processing.

WAV rather than a compressed format is deliberate: every codec pads the start
of a file, and on a 280 ms footstep that padding smears the transient that
carries the material.

Which recording sits under which surface is recorded in manifest.json.
