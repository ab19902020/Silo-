# Interface and resident follow-up

The three supplied UI references guide this pass: translucent dark green
panels, pale line icons, a quiet location label, a compact clue card, a clear
resident prompt and a cleaning playback bar. The existing excavator welcome
menu and its image are retained from upstream main `6d45811`.

The clue card can collapse. Its hint and inventory actions retain their existing
story behavior. Short screens separate notices from clues and keep the movement
stick clear. On portrait phones, an available interaction temporarily takes
priority over the clue card. Cleaning controls retain their timed fade and
inert hidden state; the new progress bar reflects the actual opening time.

Conversations sit to the side on wide screens and scroll on phones. The player’s
question remains above the reply; follow-ups restore keyboard focus and already
asked topics remain marked when returning to the question list. Current duties
appear beside the resident’s identity, and the daily-work question appears
first. Returning named characters retain individual voices. Story-specific
Billings and archive conversations keep their existing progression gates.

The upstream workday, shift and porter systems are included. Work stops now
consume their duration once per update, correcting a double countdown. Reading,
wiping, carrying and tool work have different restrained gestures, with pauses;
conversation gestures also settle between movements. Existing resident faces
are unchanged. Clothing and lead-arm changes are described in
`character-performance.md`.

UI layout and conversation navigation were checked in a browser using the real
markup, styles, shared UI module and extracted conversation functions, isolated
from the 3D renderer at 390×844, 844×390 and 1200×760. Temporary fixtures are not
shipped. Actual character surfaces and poses were inspected in offscreen GLES
renders. The managed browser cannot run the game’s WebGL renderer; these checks
do not establish mobile frame rate or replace an in-game device playtest.
