# Shared Hub design kit

These CSS files are copied without modification from `adamrussell91-hash/hub-design-kit` on 12/10/26. The kit repository is the source of truth. `actions.css` imports the accompanying forms, filters, cards, chart, graph and progress sheets; all dependencies are included so the widget works under a GitHub Pages project path.

The generator selects `data-hub="teaching"`. Its product layout is in `hsc-practice.css`; the legacy teaching layouts use aliases to canonical tokens. This is a classroom widget, so hub rail and sign-in chrome are not introduced.

When updating these files, copy the complete import dependency set from the kit rather than editing the vendored component recipes here.
