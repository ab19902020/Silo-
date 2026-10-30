# The directory book on a short screen

Turn a phone sideways, open the directory, and there was no directory in it.

## What was wrong

The book panel is a flex column of fixed furniture — head, context bar, tabs,
search field, landmark shortcuts, result count, footer — with the level list as
the one flexible child. Measured at a landscape phone viewport, that furniture
comes to 507px. The panel is `94dvh`, which on an 844×390 screen is 366px.

The list was the child that should have absorbed the difference, and it could
not: it carried `min-height:80px`. So the layout simply ran past the bottom of
the panel, and `overflow:hidden` threw away everything below it — the whole
list, and the footer after it.

```
844 × 390, before
  panel   bottom edge at 378
  list    laid out at 382 → 462      entirely below the panel
  footer  laid out at 462 → 527      entirely below the panel
```

Nothing scrolled, because the clipping happened on the panel and not inside the
list. The player got a search box, four shortcut buttons, and no levels.

## The fix

A landscape screen is short but wide, so the fix is to stop stacking. Under
`(max-height:560px) and (min-width:560px)` the panel becomes a two-column grid
and the book opens into two pages: the apparatus you use down the left, the
levels down the right at the panel's full height. That is what the width is
for, and it is what a book looks like anyway — which is the panel this already
was, green board and stitched spine.

The result count moved to the left page with the search box that produces it.
It was the only thing left in the right-hand column above the list, and it was
holding a grid row open to the height of the context bar opposite it: 45px of
nothing above the first level. It is a `role="status"` live region, so where it
has to come out of a very short layout it is clipped rather than hidden, and
still announces.

Two narrower regimes sit under that one:

- **Shorter than 365px** — the result count comes off the left page too and the
  remaining rows tighten. Without this, a 320px-tall screen is short of fitting
  its own footer.
- **Narrower than two pages, or shorter than 300px** — there is no layout left
  to find, so the book collapses to a single column that scrolls as one
  document. The head scrolls away with it, which is a real cost, but everything
  in the book stays reachable, and that was the part that was broken.

## What it measures now

Every viewport checked in a browser, with the real panel and 144 real levels:

| viewport | list height | scrolls | footer reachable |
|---|---|---|---|
| 390 × 844 phone portrait | 339 | yes | yes |
| 844 × 390 phone landscape | **305** (was 0) | yes | yes |
| 740 × 360 small landscape | 276 | yes | yes |
| 568 × 320 older landscape | 237 | yes | yes |
| 932 × 430 tall landscape | 344 | yes | yes |
| 1400 × 520 short desktop | 433 | yes | yes |
| 1024 × 768 tablet | 279 | yes | yes |
| 900 × 299 below the floor | whole panel scrolls | yes | yes |

A landscape phone now gets more of the list than a 1024×768 tablet does,
because the tablet is still stacking and the phone is not.

Then swept properly: 14 widths from 560 to 1920 against every height from 280
to 600 in fives — 910 viewports, nothing clipped, and the smallest list any
two-page layout produced was 217px at 560 × 300.

That sweep is what caught the last one. The eyebrow — `SILO 18 · RESIDENT'S
HANDBOOK` — wrapped to a second line once the left page got below about 270px,
which made the head 68px on one phone and 86px on another and left the whole
budget guessing; three viewports around 370px tall clipped by two pixels
because of it. It is not drawn in the two-page layout at all now, so the head
is a constant, and the board, the spine and the footer still say what the panel
is. Fourteen pixels came off the frame as well: on a short screen the board is
5px rather than 8 and the spine 12 rather than 18, which is the cheapest space
on the screen.

## The second scroll fault

Live probing turned up one the layout was hiding. `renderDirectory` rebuilds
the list but left its scroll position alone, so searching for *mechanical* with
the list a thousand pixels down gave four results, all of them above where you
were looking — an empty book with the answer in it.

Every caller of `renderDirectory` is the player changing what the list shows:
opening the book, switching tabs, typing in the search field. So the reset
belongs in the render, and the two call sites that had hand-rolled their own
have given them up. One owner, for the same reason `world.storyInteractions`
has one.

## Checks

`tests/directory-scrolling.test.mjs` walks the stylesheet's own cascade at each
viewport above rather than trusting a comment: it resolves `min-height` on the
list and `display`/`overflow` on the panel the way a browser would, and asserts
that on a short screen the list is never floored above the space it has, and
the panel either re-lays out or scrolls but never simply clips. It also asserts
the tall-screen defaults are unchanged, so the fix cannot leak onto a screen
that did not need it.

The cascade walk only models `min-`/`max-width` and `min-`/`max-height`, so the
first test in the file refuses to let the book be styled inside any query it
cannot read — otherwise it would skip such a block and quietly report the wrong
answer.

Both failing assertions were confirmed against the pre-fix stylesheet before
the fix was kept.
