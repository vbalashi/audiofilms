# Slice 1 Header And Account IA Evidence

Captured: June 22, 2026.

## Files

- `opbouwen-header-account.png`: Chrome screenshot after reloading the unpacked
  extension and opening `opbouwen`.
- `opbouwen-header-account-dom.json`: DOM snapshot for the ready `opbouwen`
  dictionary panel.
- `account-popover-dom.json`: DOM snapshot after clicking the compact account
  icon.

## Verification

Passed checks:

- dictionary header title is `opbouwen`;
- dictionary header subtitle is `3 cards found`;
- account control renders as an icon button;
- full email is not visible in the header button;
- account aria-label still names the connected account;
- close control renders as an icon-only button with `Close dictionary panel`
  aria-label;
- account popover opens from the icon;
- account popover still includes `vbalashi@gmail.com` and a connect/disconnect
  action.

## Notes

This slice intentionally leaves the selected-word recap, context block, body
card-count preface, card titles, chips, details, translations, and progress
rows untouched. Those belong to later slices.
