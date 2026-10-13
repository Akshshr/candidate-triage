# Design system

Derived from aac-clyde.space on 2026-10-08. Values come from the live computed styles on the home page, the Space Products & Components page, a news article (Sedna-1) and the careers page. They are not from a brand PDF. The tokens live at the top of `public/styles.css`; this file explains them.

The tool is internal, so it borrows the site's look without its logo or imagery.

## What the site does

- **One ink colour.** A deep aubergine navy, `#2B2340`, carries every heading, nav link, button and dark band (footer, sign-up panels).
- **Warm grey body text.** `#575756`, weight 300, at 16 to 17.6px.
- **Coral is a garnish.** `#F56163` appears only as the 1px underline under uppercase "Find out more" links, the bottom border of the Submit button, required-field asterisks and one sign-up panel. It is never used for text.
- **Teal `#65A8A4`** appears once on the home page. It is a secondary accent.
- **Square everything.** `border-radius: 0` on buttons, inputs and cards. The only round shapes are carousel arrows.
- **Cards have no border.** They are white with one soft, diffuse shadow: `0 0 44px rgba(0,0,0,.16)`.
- **Uppercase bold headings.** DIN 2014 700, uppercase, normal tracking: 44px page titles, 28 to 36px section titles, 21px card titles.
- **Inputs have a 2px bottom rule only**, in navy.
- **Buttons are 13px, weight 600, uppercase**: either navy text with a coral underline, or a solid fill.

## Typeface

The site uses **DIN 2014**, which is licensed through Adobe Fonts. We can't load it, so the tool uses **Barlow** from Google Fonts. Barlow is a low-contrast grotesk drawn from the same road-sign lineage as DIN and has the same 300/400/600/700 weights. Fallback stack: `"Barlow", "DIN 2014", "Helvetica Neue", Arial, sans-serif`.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--ink` | `#2B2340` | Headings, primary buttons, header band, input rules |
| `--text` | `#575756` | Body copy |
| `--muted` | `#6B6772` | Meta lines and captions (5.5:1 on white) |
| `--coral` | `#F56163` | Underlines, focus ring, active stripe. Never text (3.1:1). |
| `--teal` | `#65A8A4` | Secondary accent stripe |
| `--fill` | `#EFEFEF` | Chips, ghost button, quiet fills |
| `--line` | `#E4E2E8` | Hairlines in dense lists (navy-tinted) |
| `--canvas` | `#F5F4F7` | App background behind panels (navy-tinted) |
| `--surface` | `#FFFFFF` | Panels, cards, dialog |
| `--shadow` | `0 0 44px rgba(43,35,64,.12)` | Panels and dialog (the site's card shadow, tinted navy) |
| `--shadow-sm` | `0 0 16px rgba(43,35,64,.10)` | Card hover |

### Decision colours

These are semantic and kept separate from the brand accents. Coral is not "reject": it stays the brand's highlight.

| Decision | Stripe | Text and badge fill | Contrast with white |
|---|---|---|---|
| Meet | `#65A8A4` (brand teal) | `#2E6B67` | 6.2:1 |
| Consider | `#D99A2B` | `#8A5A00` | 5.9:1 |
| Reject | `#9A95A3` | `#5E5968` | 6.8:1 |

A rejection is a pile, not an alarm, so it is a quiet slate rather than red.

## Type scale

The site is a marketing page at 16 to 44px. The tool is a dense board, so it uses the same faces and casing one step down.

| Role | Size / line height | Weight | Case |
|---|---|---|---|
| Page title | 28 / 32 | 700 | Uppercase |
| Section and column title | 15 / 20 | 700 | Uppercase, 0.04em |
| Card name | 15 / 20 | 600 | Sentence |
| Body | 14 / 22 | 400 | Sentence |
| Long-form (cover letter) | 15 / 24 | 300 | Sentence |
| Label, eyebrow, button | 12 to 13 / 1 | 600 | Uppercase, 0.06em |
| Numbers (scores, counts) | inherit | 600 | `tabular-nums` |

Body copy at 14px uses weight 400, not the site's 300, which is too thin below 16px.

## Components

- **Header band.** A full-width `--ink` band with white text: a coral-underlined uppercase eyebrow, then the page title. It echoes the site's dark footer and sign-up panels.
- **Primary button.** `--ink` fill, white 13px/600 uppercase text, square, `12px 22px`. On hover a 2px coral bottom border.
- **Text button.** Uppercase 13px/600 in `--ink` with a 1px coral underline: the site's "Find out more".
- **Select.** White, square, no box border, a 2px `--ink` bottom rule: the site's form fields.
- **Panel.** `--surface`, square, `--shadow`, no border.
- **Applicant card.** `--surface`, square, 1px `--line` border, `--shadow-sm` on hover. The name is set in `--ink` and the meta line in `--muted`.
- **Chip.** `--fill` background, `--ink` 11px/600 uppercase text, square.
- **Decision column.** A panel with a 4px top stripe in the decision colour and an uppercase title with a count.
- **Score badge.** A square badge in the decision's dark fill with white tabular numerals.
- **Focus.** A 2px coral outline with a 2px offset on every interactive element.

## Don'ts

- No rounded corners, gradients or pill buttons. The site has none.
- No coral text, and no coral fills larger than a stripe.
- Never use the AAC Clyde Space logo or site imagery in the tool.
- No em dashes in copy.
