---
name: design-pixel-minimal
description: Concrete visual style for a pixel-minimal aesthetic with monochrome-neutral surfaces, monospace typography, sharp corners, and sparse pixel-art accents. Always load the design skill alongside this one; this skill assumes the design skill's color roles and principles and only adds concrete values.
---

# Design: Pixel-minimal

Extends `design`. Load `design` first for the color role taxonomy, restraint principles, and accessibility rules - this skill only fills in the concrete values for those roles and adds everything visual that `design` deliberately leaves out: fonts, shapes, icon treatment, spacing.

Reference: bygideon.com - a personal portfolio site that defines this look. Flat neutral canvas, monospace-driven, pixel-art used as rare, deliberate accents rather than a running theme.

## Palette

Values below marked sampled were pixel-picked directly from the bygideon.com reference screenshots. Values marked default don't appear in the reference and are reasonable placeholders - override per project rather than treating them as canon.

Surface is the one role in this style that's deliberately not a single fixed value - see the callout right below the table before you implement it.

| Role | Value | Source | Notes |
|---|---|---|---|
| Background | `#E6E6E6` | sampled | Flat neutral gray. One value across the whole surface - no section-to-section shifts, no gradient. |
| Surface | `#F3F3F5` (light) · `#1A1A1A` (dark) · `#F2EFE9` (cream) | sampled | Picked per element, not once per project - see callout below. |
| Text - primary | `#121212` | sampled | Near-black, not pure black. Used for both the display heading and body copy. |
| Border | `#000000` | sampled | True black, 1px, solid. Every bordered element in this style uses this exact value - no color variation, no soft grays. |
| Content-accent | Content's own real colors - e.g. `#FF7B42` (a project's brand orange), a platform's actual brand color | sampled example | This is where all visible saturated color lives. Chrome (background, borders, nav) never borrows from here. Don't invent accent colors - pull them from the actual content/brand being shown. |
| Primary | Undefined | - | This style has no built-in brand color. Define one per project only if the project genuinely needs a signature color; otherwise leave it out. |
| Secondary | Undefined | - | Same as Primary - don't invent one just to fill the slot. |
| Text - muted | `#6B6B68` | default | Not present in the reference. Reasonable default for captions/meta - revisit if a real project needs a better match. |
| Semantic (success/warning/danger/info) | Flat, standard hues, no gradients | default | Untested territory. If a project needs one, pick a flat hue consistent with the rest of the palette and sanity-check contrast before shipping it. |

> Surface color is chosen per element, on purpose - this is part of the look, not an inconsistency to fix. A light card, a dark card, and a cream card sitting side by side is exactly what makes this style read as pixel-minimal rather than flat and repetitive. The failure mode under time pressure is defaulting to one surface color everywhere because it's simpler - resist that; picking per element based on what that element is showing is the rule, not a suggestion.

## Typography

- Display: one pixel/bitmap font, used exactly once per page or screen - the identity moment. Never used for body text or repeated throughout.
- Everything else: a single monospace font - body copy, labels, navigation, captions. Left-aligned, moderate line length.
- No serif or standard sans body face anywhere. Two typefaces total: the one pixel display face, and the one monospace workhorse.
- Flat type scale. Don't build an elaborate hierarchy of sizes - body text, labels, and section text sit close in size to each other.

## Shape

- Border-radius: 0 everywhere by default - cards, buttons, containers, inputs. Sharp corners are the default state of this style.
- One exception: small icon-scale elements (badges, avatar-sized icons) may take a small radius. Nothing larger than icon-scale gets rounded.
- Borders are always the thin 1px black line from the palette above - never colored, never soft-gray, never absent on a bounded element.
- No shadows, no gradients on chrome. Flat fills only.

## Icon & illustration treatment

- Pixel-art accents are rare and specific, never decorative filler and never a repeated background pattern.
- One consistent small mascot/character motif is allowed if the project wants a signature touch - reused at small scale, not redrawn differently each time it appears.
- Utility/social icons are small pixel-styled badges, consistent size across the set. These are the one place Content-accent colors are expected to show up directly in UI chrome.
- Never use pixel-art as a hero graphic, full-bleed background, or repeated pattern.

## Spacing & density

- Generous whitespace. Err toward more space, not less.
- Single-column bias. Avoid multi-column layouts unless the content genuinely needs a grid.
- Wide margins around the content column.
- Vertical stacking over sectioned/boxed pages. Content flows top to bottom like a long note, not a landing page broken into visually distinct colored sections.
- No navigation bar or hero graphic by default. Content starts immediately.

## Texture

- At most one subtle non-flat texture per page or screen. Used once, in one place, never repeated as a general pattern.

## Handing this off to a build skill

This file is a spec, not code. It has no framework opinions. When implementing, pass this file's concrete values to whatever build skill matches the medium, which is responsible for translating each rule into that medium's actual syntax.
