# Vaultora Accessibility

Accessibility is a release-quality requirement, especially because password managers are used under time pressure and in high-consequence workflows.

## Current design commitments

- Semantic `button`, `input`, `select`, `textarea`, `label`, `nav`, `main`, `section` and heading elements where appropriate.
- Visible `:focus-visible` treatment for interactive controls.
- Touch-friendly control sizes and spacing.
- Responsive desktop/narrow-window layouts.
- Text alternatives or `aria-hidden` treatment for decorative icons.
- `role="alert"` / `role="status"` for important asynchronous feedback.
- Reduced animation when `prefers-reduced-motion: reduce` is enabled.
- Theme-aware contrast using shared design tokens.
- Protected values remain selectable/readable when explicitly revealed.

## Keyboard expectations

Every core flow should be possible without a mouse:

1. create or unlock the vault;
2. move through primary navigation;
3. search/filter/select an entry;
4. open edit/create controls;
5. reveal/copy a protected value;
6. review password history without exposing it by default;
7. run the generator and security audit;
8. change settings and back up the vault;
9. lock the vault.

Interactive card rows must be real buttons/links, not generic `div` click targets.

## Focus behavior

Modal/dialog work should:

- move focus into the dialog when opened;
- provide a clear close/cancel control;
- close on Escape when safe;
- prevent keyboard focus from becoming lost behind the overlay;
- restore focus to a sensible triggering control after close where practical.

This is an active hardening area until automated/manual dialog checks cover the editor and any future confirmation dialogs.

## Secret accessibility

Accessibility APIs may expose rendered text to assistive technology with user permission. Vaultora therefore keeps protected values masked until an explicit reveal and avoids putting raw secrets in `aria-label`, `title`, data attributes or hidden descriptive text.

Copy buttons should announce copy status without repeating the secret.

## Color and contrast

Information must not rely on color alone. Audit severity uses both text labels and visual styling. Selected entries use surface/border changes plus normal text structure.

Before stable release, check representative screens against WCAG 2.2 AA contrast guidance for normal/large text and focus indicators in light and dark themes.

## Motion

Animations/transitions are short and decorative. The global reduced-motion media query reduces animation and transition duration to near-zero when the user requests reduced motion.

No security-critical state should depend on an animation completing.

## Zoom and narrow windows

The UI must remain usable at narrow desktop widths and increased browser/WebView text scaling without hiding the lock action or destructive controls. The smallest supported layout is not a substitute for testing OS display scaling.

## Screen-reader manual test outline

Use at least one major screen reader per release cycle where practical (for example the platform-default tool):

- confirm application and navigation landmarks;
- confirm form labels and validation messages;
- confirm entry list/button names;
- confirm selected-detail headings;
- confirm secret reveal/copy controls do not announce the secret while masked;
- confirm audit severity and messages are understandable without color;
- confirm settings group headings and statuses;
- confirm modal/editor reading/focus order.

Use fictional vault data.

## Automated checks

Frontend unit/component tests should cover semantic roles, labels and keyboard state where practical. A future browser-level accessibility job may use an automated checker, but automated rules cannot replace manual screen-reader/keyboard testing.

## Reporting accessibility bugs

Use the normal bug template and clearly state the assistive technology, OS, scaling/zoom and exact workflow. Never include private vault data in screenshots or recordings.
