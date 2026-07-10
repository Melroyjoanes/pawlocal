/**
 * Shared claymorphism shadow tokens — see ~/.claude/skills/claymorphism for
 * the full recipe/rules. Extracted from app/upgrade/UpgradeClient.tsx so every
 * page can reference the SAME shadow values instead of redefining slightly
 * different ones per file (which is how visual inconsistency crept in before
 * this session's audit — the "Sign in" and "See pricing" buttons that had to
 * be fixed were flat specifically because they never used these tokens).
 *
 * Each token is a 4-5 layer box-shadow string: an inset highlight (light,
 * top), an inset shadow (dark, bottom — gives the "clay" its underside curve),
 * and one or two outer drop shadows (hue-matched, never gray) that lift the
 * element off the page. Never reverse the inset order — that makes the
 * element look dented/pressed-in instead of inflated.
 */

// Cream/white cards (the default "raised card on cream background" surface)
export const CLAY_SHADOW_CREAM = [
  'inset 0 2px 0 rgba(255,255,255,0.95)',
  'inset 0 -3px 0 rgba(0,0,0,0.10)',
  '0 1px 0 rgba(0,0,0,0.06)',
  '0 8px 24px -4px rgba(10,47,53,0.14)',
  '0 32px 64px -12px rgba(10,47,53,0.10)',
].join(', ')

// Dark teal cards (e.g. the "you're on Pro" celebration card, feature panels)
export const CLAY_SHADOW_TEAL = [
  'inset 0 2px 0 rgba(255,255,255,0.18)',
  'inset 0 -4px 0 rgba(0,0,0,0.28)',
  '0 1px 0 rgba(0,0,0,0.12)',
  '0 12px 32px -4px rgba(10,47,53,0.40)',
  '0 40px 80px -16px rgba(10,47,53,0.30)',
].join(', ')

// Orange CTA buttons (the primary action color across the site)
export const CLAY_SHADOW_ORANGE = [
  'inset 0 2px 0 rgba(255,200,120,0.60)',
  'inset 0 -3px 0 rgba(180,60,0,0.25)',
  '0 4px 14px rgba(255,140,82,0.45)',
  '0 12px 28px rgba(255,140,82,0.20)',
].join(', ')

// Smaller-scale version of the orange shadow for compact buttons/chips where
// the full CLAY_SHADOW_ORANGE blur radius would look oversized relative to
// the element (e.g. pill buttons in a tight nav bar or sticky bar).
export const CLAY_SHADOW_ORANGE_SM = [
  'inset 0 1.5px 0 rgba(255,200,120,0.55)',
  'inset 0 -2px 0 rgba(180,60,0,0.25)',
  '0 4px 12px rgba(255,140,82,0.32)',
].join(', ')

// Teal outline "secondary" clay surface (white/cream fill, teal border) — the
// pattern used for e.g. the sticky bar's "See pricing" button, secondary CTAs
// that shouldn't compete with a nearby orange primary action.
export const CLAY_SHADOW_TEAL_OUTLINE = [
  'inset 0 1.5px 0 rgba(255,255,255,0.9)',
  'inset 0 -2px 0 rgba(10,47,53,0.05)',
  '0 4px 12px rgba(10,47,53,0.10)',
].join(', ')

/**
 * Build a custom hue-matched clay shadow for a surface color not already
 * covered above (e.g. a green success banner, a red error state, a pastel
 * accent card). Pass the shadow-tint RGB (usually the surface's own hue,
 * darkened ~15%) — never pass gray/black, that's the #1 tell of a fake clay
 * effect. Returns a ready-to-use box-shadow string with the same 3-layer
 * shape (light inset top, dark inset bottom, one outer drop shadow).
 */
export function clayShadow(tintRgb: string, opts?: { outerOpacity?: number; insetOpacity?: number }): string {
  const outerOpacity = opts?.outerOpacity ?? 0.30
  const insetOpacity = opts?.insetOpacity ?? 0.22
  return [
    `0 12px 28px rgba(${tintRgb}, ${outerOpacity})`,
    `inset 0 4px 8px rgba(255,255,255,0.65)`,
    `inset 0 -4px 8px rgba(${tintRgb}, ${insetOpacity})`,
  ].join(', ')
}
