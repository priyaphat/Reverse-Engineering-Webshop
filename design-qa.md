# Design QA — Aniimo UID Top-Up Store

## Comparison Target

- Source visual truth: `.tmp/source-crystal-desktop.png` and `.tmp/source-mobile-final2.png`, captured from `https://www.aniimo.com/store/th/` with the Lumin Crystal tab selected, plus the user-provided four-step UID top-up reference `C:/Users/OTAMOS/AppData/Local/Temp/codex-clipboard-8c6382d9-e838-4bf2-bb1e-3c512fd2e619.png`.
- Rendered implementation: `.tmp/implementation-desktop-pass4.png` and `.tmp/implementation-mobile-pass4.png`, captured from `http://127.0.0.1:3000`.
- Combined comparison inputs: `.tmp/qa-comparison-desktop-pass4.png`, `.tmp/qa-comparison-mobile-pass4.png`, and focused product-card comparison `.tmp/qa-focus-cards-pass4.png`.
- Desktop viewport: 1440 × 1000 CSS px; source and implementation are each 1440 × 1000 pixels; deviceScaleFactor 1.
- Mobile viewport: 390 × 844 CSS px; source and implementation are each 390 × 844 pixels; deviceScaleFactor 1.
- Density normalization: none required; all captures are 1:1 CSS-to-image pixels.
- State: Thai storefront, Lumin Crystal category selected, unauthenticated/unverified header state.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- [P3] Decorative background treatment differs slightly.
  - Location: storefront canvas behind the banner and cards.
  - Evidence: the source has stronger diagonal texture and oversized soft character/gear motifs; the implementation uses a lighter geometric tile treatment.
  - Impact: low; hierarchy, contrast, and page identity remain consistent.
  - Follow-up: add the exact decorative background asset if it becomes available as a reusable source file.
- [P3] Thai glyph rendering varies slightly by the machine's system-font fallback.
  - Location: category tabs and small card labels.
  - Evidence: source text is marginally heavier at a few sizes; line breaks and component dimensions still match.
  - Impact: low and environment-dependent.
  - Follow-up: bundle the source typeface if redistribution rights and the original font files are available.

## Required Fidelity Surfaces

- Fonts and typography: hierarchy, weights, sizes, line height, wrapping, and truncation match the source closely. Minor system fallback variation is classified P3.
- Spacing and layout rhythm: header, utility row, 1080 px content frame, banner, tab spacing, four-column desktop grid, two-column mobile grid, card radii, and vertical rhythm match at both target viewports.
- Colors and visual tokens: navy, blue, white, pink-purple discount gradient, shadows, and selected states match. The background decorative texture difference is P3.
- Image quality and asset fidelity: official banner, Aniimo wordmark, product-card background, header textures, and all six crystal product images are local source assets. Crops, scale, transparency, and sharpness were checked in the focused comparison.
- Copy and content: Thai storefront labels follow the source. Login and THB-specific content are intentionally adapted to the requested UID verification, Taiwan region, TWD, and MyCard flow.

## Full-View Comparison Evidence

- Desktop: `.tmp/qa-comparison-desktop-pass4.png` confirms matching content width, major-region proportions, header alignment, banner crop, filter placement, grid density, and above-the-fold content.
- Mobile: `.tmp/qa-comparison-mobile-pass4.png` confirms the condensed header, responsive banner, wrapped tab row, two-column card grid, and card proportions at 390 × 844.

## Focused Region Evidence

- `.tmp/qa-focus-cards-pass4.png` compares the banner edge, tab row, discount badges, product artwork, first-purchase strip, amount/bonus text, and price pills at original density.
- Additional modal evidence: `.tmp/implementation-flow-finalqa.png` shows the successful MyCard session state with the storefront visible behind the modal.
- UID top-up widget comparison: `.tmp/qa-wizard-reference-comparison.png` places the supplied four-step reference and the implemented package-selection state in one comparison input.
- Widget captures: `.tmp/wizard-desktop-open.png`, `.tmp/wizard-mobile-open.png`, `.tmp/wizard-desktop-packages.png`, `.tmp/wizard-mobile-packages.png`, and `.tmp/wizard-success.png`.
- Embedded UID example comparison: `.tmp/qa-uid-demo-pass2.png` places the supplied infographic section beside the final implementation at normalized width.
- Embedded UID example captures: `.tmp/uid-demo-desktop-pass2.png`, `.tmp/uid-demo-mobile-pass2.png`, and `.tmp/uid-demo-success-pass2.png` cover the verified, responsive, and completed-order states.

## Browser and Interaction Verification

- Browser-rendered captures: Chrome headless via the Chrome DevTools Protocol.
- Primary storefront flow tested: click product → open UID verification → submit mock UID `10000001` / `TW1` → resolve `ArielTester` → create MyCard session → render success receipt.
- New four-step widget flow tested: open floating top-up launcher → enter UID → verify `ArielTester` → confirm character → select the 300-crystal pack → review order → create MyCard session → render success state.
- Final widget flow result: active step `4`, `successVisible: true`, session `abf2359b-0d6d-4c03-98a5-236430679198`, and no form error.
- Additional states implemented and manually exercised during capture: benefit center dialog, top-up guide dialog, category filters, UID dialog, checkout dialog, success dialog, Escape/backdrop close behavior.
- Console/runtime errors on final desktop, mobile, and full-flow captures: none.

## Comparison History

1. Initial comparison found a P1 collapsed product visual (inline container) and P1 layout drift: the local content frame/cards were too large and the price control did not match the source.
   - Fixes: made the visual container block-level, changed the desktop frame to 1080 px, matched banner/card geometry, switched card bodies to centered source-like stacking, and made price pills full-width.
   - Post-fix evidence: `.tmp/qa-comparison-desktop-final.png` and `.tmp/qa-comparison-mobile-final.png`.
2. Second comparison found a P2 product-art scale mismatch and P2 mobile vertical-density mismatch.
   - Fixes: matched the 50 px mobile header, compact controls/tabs, 223 px mobile card height, 210 px desktop visual height, and enlarged the source product art.
   - Post-fix evidence: `.tmp/qa-comparison-desktop-finalqa.png` and `.tmp/qa-comparison-mobile-finalqa.png`.
3. Third comparison found a P2 product-art vertical offset.
   - Fixes: aligned the transparent product canvases lower in the visual region and tuned their scale independently for desktop/mobile.
   - Post-fix evidence: `.tmp/qa-comparison-desktop-pass4.png`, `.tmp/qa-comparison-mobile-pass4.png`, and `.tmp/qa-focus-cards-pass4.png`.
4. The supplied UID-flow reference introduced a new four-step interaction requirement rather than a storefront geometry change.
   - Implementation: added a floating green top-up launcher, persistent four-stage progress, UID validation, verified-character state, selectable package list, order summary, MyCard session creation, and success receipt.
   - Responsive evidence: `.tmp/wizard-desktop-open.png`, `.tmp/wizard-mobile-open.png`, `.tmp/wizard-desktop-packages.png`, and `.tmp/wizard-mobile-packages.png`.
   - Post-flow evidence: `.tmp/wizard-success.png`; browser console errors: none.
5. The latest request introduced an always-visible example section matching the four-column UID infographic.
   - Implementation: added an embedded four-card flow below the catalog with live UID verification, character lookup, package selection, order review, session creation, reset behavior, and a horizontal snap layout on mobile.
   - First QA iteration found the floating launcher overlapping the mobile section CTA. The section now toggles a scoped `demo-in-view` state that hides the launcher only while the embedded demo is visible.
   - Second refinement replaced the placeholder initial with a locally generated character portrait, preserving the reference's visual hierarchy without runtime hotlinking.
   - Final evidence: `.tmp/qa-uid-demo-pass2.png`, `.tmp/uid-demo-desktop-pass2.png`, `.tmp/uid-demo-mobile-pass2.png`, and `.tmp/uid-demo-success-pass2.png`; browser console errors: none.

## Implementation Checklist

- [x] Source assets stored locally; no runtime asset hotlinking.
- [x] Desktop and mobile responsive layouts verified.
- [x] UID verification and MyCard session flow verified end-to-end.
- [x] Four-step floating UID top-up widget verified end-to-end on desktop and mobile.
- [x] Embedded four-step UID example verified end-to-end on desktop and mobile.
- [x] Empty category states, dialogs, loading/error states, and close behavior implemented.
- [x] Browser console checked with no final errors.
- [x] Backend test suite passes 10/10.
- [x] Docker Compose service is healthy on port 3000.

## Follow-up Polish

- Replace the background tile with the exact oversized decorative source motif if its standalone asset is later available.
- Bundle the original Thai-capable typeface when licensing permits.

## Login Modal Addendum

- Source visual truth: `C:/Users/OTAMOS/AppData/Local/Temp/codex-clipboard-8cd722bf-8374-4698-99a0-175050d89573.png` (527 × 435 px). The modal region was normalized from source coordinates 24,7 at 480 × 418 px.
- Rendered implementation: `.tmp/login-desktop-pass3.png` (480 × 419 px element capture) and `.tmp/login-mobile-pass3.png` (374 × 427 px element capture from a 390 × 844 CSS viewport), both at deviceScaleFactor 1.
- State: login modal open, logged out, email and verification-code inputs empty, consent unchecked.
- Full-view normalized comparison: `.tmp/qa-login-pass3.png` places the source modal and implementation side by side at 480 px width.
- Focused interaction evidence: `.tmp/login-error-pass3.png` covers invalid OTP feedback; `.tmp/login-success-pass3.png` verifies the completed mock-login state and updated account header.
- Fonts and typography: Thai labels, placeholder hierarchy, centered CTA, and small divider copy closely match the reference. Minor system-font fallback weight variation remains P3.
- Spacing and layout rhythm: 480 px desktop frame, 20 px radius, form control dimensions, consent spacing, divider, and six-button social row match the normalized source. The mobile frame contracts safely without horizontal overflow.
- Colors and visual tokens: white modal, charcoal CTA, violet action links, pale field fills, borders, shadow, and dark blurred scrim match the reference closely.
- Image quality and asset fidelity: the local Aniimo wordmark is reused. Social and close icons are local Font Awesome library SVG assets rather than code-drawn substitutes. Google is rendered as a single-color brand mark rather than the source's multicolor mark; this is P3 at the displayed size.
- Copy and content: the reference Thai email/verification-code copy, terms/privacy links, CTA, and alternative-login label are present. The form deliberately avoids a password field and treats the six-digit code as a mock email OTP.
- Browser verification: account button opens the modal; backdrop, close button, and Escape close it; invalid email/OTP and missing consent show inline errors; request-code shows a mock countdown; valid mock submission closes the modal and updates the account header; social buttons report unavailable demo integrations. Final captures reported no console/runtime errors.
- Comparison history: pass 1 found a P2 focus ring on the close icon plus vertical alignment drift. Pass 2 aligned the logo, fields, consent, CTA, and divider; pass 3 moved initial focus to the dialog container, matched the circular consent control, and removed the unintended visible focus treatment. Post-fix evidence: `.tmp/qa-login-pass3.png`.

final result: passed
