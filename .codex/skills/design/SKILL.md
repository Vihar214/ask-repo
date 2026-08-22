---
name: design
description: Core design language used on every project, regardless of medium - React, a CLI tool, a native app, anything with an interface. Covers the color role taxonomy, restraint and visual-hierarchy principles, and hard accessibility rules. Load this skill first for any UI/UX/design/branding work, before any style-specific skill.
---

# Design

This is the base design language. It applies to every project no matter what gets built - a website, a CLI tool, a native app, anything with an interface. It never mentions a font, a border-radius, a spacing value, or an icon. Those are concrete decisions that belong to a style-specific skill, which extends this one and fills in the specifics for a particular look.

Always consult this skill before any design/UI/UX/branding work. If a style-specific skill is also relevant, load both: this one for the roles and principles, the style skill for the concrete values.

## Color

Color is defined as roles, not values. A style skill fills each role with actual colors. The roles themselves never change project to project.

| Role | Purpose |
|---|---|
| Background | The base canvas the whole surface sits on. Usually one value, rarely varies by section. |
| Surface | Anything sitting on top of background - cards, panels, blocks, terminal boxes. May equal background or step slightly off it. |
| Primary | The one identity/brand color. Reserved for a single recurring signature element - not spread across many components. If a project has no real identity color yet, leave it undefined rather than picking one arbitrarily. |
| Secondary | A supporting color for less prominent accents. Used more sparingly than Primary, not as a second brand color. |
| Content-accent | Colors that belong to the content itself - a logo, a data category, a status a user set - not to the UI shell. This is where most of a design's visible color usually lives. |
| Text - primary | Main reading color for body content. |
| Text - muted | De-emphasized text: captions, metadata, secondary labels. |
| Border / line | Dividers, outlines, hairlines. |
| Semantic (success / warning / danger / info) | State colors. Needed even if not visible in a first design - every interactive project eventually needs these. |

Rules that apply regardless of what fills the roles:
- Content-accent colors never leak into chrome (nav, buttons, borders). Chrome stays in Background/Surface/Border unless a role is deliberately Primary or Secondary.
- Primary is spent in one place, deliberately, not scattered. If everything is "primary," nothing is.
- Never signal state (success/error/etc.) with color alone - pair it with an icon, label, or shape.

### When a brand color and a content color collide

Sometimes a project's real identity color is also something that shows up as content - e.g. the brand's own logo color, or a brand color that happens to match a category a user assigned. When that happens, the role is decided by what the pixel is doing, not by what the hex value is:

- The same hex used for the recurring identity mark (logo, nav accent, the one signature element) is Primary.
- That same hex showing up because it's literally the color of a piece of content (a swatch, a tag, a third-party logo badge) is Content-accent, even though it's numerically the same value.
- Don't let one collision talk you into merging the roles project-wide. A project can have Primary and Content-accent share a hex value in one specific case and still keep the roles conceptually separate everywhere else - the "don't scatter Primary" and "content-accent never leaks into chrome" rules still apply independently.

### Dark mode / theming

Roles are defined once, as a concept - a style skill's palette table is one instantiation of those roles, not the only one. If a project needs a second color-scheme (dark mode, a white-label variant, a seasonal theme), that's still the same role taxonomy with a second set of values, not a new set of roles. A style skill should be treated as extendable this way even if it only ships one palette; when a project needs a second scheme, fill the same roles again rather than inventing new ones or improvising ad hoc swaps mid-implementation.

## Restraint & hierarchy principles

These are judgment-call principles, applied by whoever builds the thing. They're not automatically checkable the way accessibility rules are - they require reading the brief and making a call.

- KISS. Don't add complexity unless it's necessary. If something can be understood in 5 seconds instead of 30, make it 5.
- Less is more. Remove things until only what's necessary remains. Fifteen buttons become five become one primary action.
- Form follows function. What the thing needs to do determines how it should look and feel - a banking flow needs clarity and trust, a game needs excitement, a developer tool needs information density. Don't force one aesthetic onto a brief it doesn't fit.
- Don't make me think. The interface should never require the user to figure out how it works. Name things by what they do ("Create account," not "Submit data").
- Progressive disclosure. Show what's important first, advanced options only when asked for. Don't front-load everything.
- Consistency. Similar things look and behave similarly. A primary action defined one way doesn't get redefined a different way elsewhere in the same project.
- Visual hierarchy. Not everything has equal weight. Establish what should be noticed first, second, third - using whatever mechanism the medium provides.
- Jakob's Law. Users spend most of their time elsewhere. Match the conventions of the medium you're building in rather than reinventing basics.
- Feedback. Every user action produces a response. A save produces "Saving..." then "Saved." Silence after an action is a bug.
- Design for the 80/20. Optimize hardest for what most people do most often. Rarely-used paths can be less polished.

## Accessibility

Unlike the principles above, these are pass/fail, not judgment calls. A build skill should treat them as non-negotiable, and a verification step should be able to check them mechanically rather than by feel.

- Text contrast ratio: >= 4.5:1 for body text, >= 3:1 for large text.
- Every interactive element has a visible focus state - never remove focus outlines without replacing them with something equally visible.
- Reduced motion is respected - anything animated has a reduced/no-motion fallback.
- Icon-only interactive elements have an accessible label (`aria-label` or medium equivalent) - never rely on the icon alone.
- Never use color as the only signal for state, error, or category - pair it with text, an icon, or a shape.
- Touch/click targets are large enough to hit reliably, roughly 44x44px minimum on touch surfaces.
- Keyboard navigation works end to end for anything a mouse/touch can do.

## Using this with a style skill

This skill defines what to think about. It doesn't define what anything looks like. For a concrete look - actual colors filling the roles above, typography, shape language, icon treatment, spacing rhythm - load the matching style skill, which is responsible for translating each rule into that medium's actual syntax.
