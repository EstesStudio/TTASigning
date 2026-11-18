# Design

How SignuDoc's interface is meant to look and behave. Read it before you
change a screen. The tokens live in `src/app/globals.css`, the shared
components in `src/components/ui/`.

## Principles

Premium comes from simplicity, smooth movement and a little delight in the
right places, not from decoration.

**Reveal things as they become relevant.** Each screen has one job and one
primary action. Everything else appears when it is needed: on hover or
selection, in a "More" menu, behind a disclosure or in a tray. Show where
things stand in words ("Waiting for Riley, sent 2 hours ago"), not codes or
IDs. Those belong in detail views.

**Move things instead of swapping them.** A row's thumbnail becomes the
detail page's thumbnail. Segmented controls and tabs slide in the direction
you moved. A label that changes meaning morphs (Send, Sending…, Sent) rather
than being replaced.

**Keep delight for rare moments.** Daily surfaces (Documents, the builder,
lists) are calm and fast. The moments a person causes and doesn't repeat
often get more: the first send, a signer finishing, a document completing,
setup finishing. One such moment per screen at most.

## Visual system

| Thing    | Rule                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Page     | `--page`, Bond `#F3F2EE` in light mode. No grain or texture.                                                                                    |
| Surfaces | White cards with no border lines, soft elevation (`--shadow-card`). Radius 20px for cards, 28px for trays, 14px for inner wells.                |
| Type     | Geist. Page title 28px/600 (24px on phones), section title 16px/600, body 15px, UI 14px/500. Geist Mono only for IDs, hashes and codes.         |
| Colour   | Carbon text. The accent (Ink violet, or the install's brand colour) for the primary action and selection only. Tab yellow only for "sign here". |
| Buttons  | Pill radius, 40px tall (36 compact, 48 for a phone's primary). Primary in the accent, secondary white with a soft ring, ghost text only.        |
| Inputs   | 44px, radius 14px, a 1px ring at 10%, an accent focus ring. 16px text on touch screens so iOS does not zoom. Labels sit above, sentence case.   |
| Status   | A soft pill: tint, dot, one word (Draft, Waiting, Completed, Declined, Voided, Expired).                                                        |
| Spacing  | 8px grid. Page padding 40px on desktop, 20px on phones.                                                                                         |

Every colour is a token with a light and a dark value. Use the token
(`bg-(--paper)`, `text-(--secondary)`), never a hex value in a component.

## Motion

Before animating, ask how often it is seen, what it is for (continuity,
state, feedback) and which curve and duration it takes from the tables.
Anything used a hundred times a day, or started from the keyboard (shortcuts,
the command menu, Escape), does not animate.

| Token           | Curve                          | Use                                                |
| --------------- | ------------------------------ | -------------------------------------------------- |
| `--ease-out`    | `cubic-bezier(.23,1,.32,1)`    | The default: anything arriving, opening, settling. |
| `--ease-spring` | `cubic-bezier(.24,1.34,.38,1)` | Small things that may overshoot once.              |
| `--ease-in-out` | `cubic-bezier(.77,0,.175,1)`   | On-screen moves and morphs.                        |
| `--ease-exit`   | `cubic-bezier(.4,0,1,1)`       | Exits only.                                        |
| `--ease-drawer` | `cubic-bezier(.32,.72,0,1)`    | Sheets and phone trays.                            |

| Token         | ms  | Use                              |
| ------------- | --- | -------------------------------- |
| `--dur-press` | 120 | Press down, colour on hover.     |
| `--dur-hover` | 160 | Hover, toggles.                  |
| `--dur-move`  | 220 | Anything moving position.        |
| `--dur-open`  | 260 | Menus, popovers, page entrances. |
| `--dur-morph` | 420 | One object becoming another.     |

- Press: `scale(.97)` on buttons, `.985` on large cards.
- Enter from `opacity: 0` with a small offset, never from `scale(0)`.
  Exits take about 60% of the entrance time.
- Popovers grow from their trigger. Dialogs stay centred.
- Hover effects only for fine pointers (`pointer-fine:`).
- Animate `transform` and `opacity`. Never `transition: all`.
- Under reduced motion, keep the change of state and drop the travel. Read
  the preference in a hydration-safe way (see `src/components/ui/text-morph.tsx`).

## Components

Use the kit before writing a control by hand. Each part of it covers the
full set of states: rest, hover, press, focus-visible, disabled, and loading
or invalid where they apply.

- **Tray**: one task per tray, with a close (or back) button in its header.
  Centred on desktop, a bottom sheet on phones. Danger trays tint the icon
  and the primary button, nothing more.
- **Segmented**: one choice out of a few, as a radio group, with a paper
  thumb that springs to the selection.
- **List rows** instead of heavy tables: a 40px thumbnail or icon tile, a
  title, a plain-language second line, and a chevron on hover.
- **Empty states**: an icon tile, one sentence, one button.
- **Objects** (`src/components/objects/`): the envelope, the document stack
  and the paper sheet are built from one geometry (width, height, radius,
  hinge), so their parts line up at every size and pose. They are
  `aria-hidden` art inside a real button or link that carries the name.

## Accessibility

- Every control has a name. The e2e suite finds elements by role and name,
  so a rename is a test change.
- Focus is always visible (`--focus-ring`). Trays and dialogs trap focus and
  return it to what opened them.
- Status that changes on its own is announced (`aria-live="polite"`).
- Targets are at least 40px, and 44px on touch screens.
