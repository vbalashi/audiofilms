(function audioFilmsUiIcons() {
  const ICON_PATHS = {
    prev: [
      '<path d="m15 18-6-6 6-6"/>',
      '<path d="M20 12H9"/>',
    ],
    next: [
      '<path d="m9 18 6-6-6-6"/>',
      '<path d="M4 12h11"/>',
    ],
    replay: [
      '<path d="M3 12a9 9 0 1 0 3-6.7"/>',
      '<path d="M3 3v6h6"/>',
      '<path d="M12 8v4l3 2"/>',
    ],
    account: [
      '<path d="M20 21a8 8 0 0 0-16 0"/>',
      '<circle cx="12" cy="7" r="4"/>',
    ],
    "account-connected": [
      '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>',
      '<circle cx="9.5" cy="7" r="4"/>',
      '<path d="m16 11 2 2 4-4"/>',
    ],
    close: [
      '<path d="M18 6 6 18"/>',
      '<path d="m6 6 12 12"/>',
    ],
    expand: [
      '<path d="m6 9 6 6 6-6"/>',
    ],
    collapse: [
      '<path d="m18 15-6-6-6 6"/>',
    ],
    translate: [
      '<path d="m5 8 6 6"/>',
      '<path d="m4 14 6-6 2-3"/>',
      '<path d="M2 5h12"/>',
      '<path d="M7 2h1"/>',
      '<path d="m22 22-5-10-5 10"/>',
      '<path d="M14 18h6"/>',
    ],
    audio: [
      '<path d="M11 5 6 9H3v6h3l5 4V5z"/>',
      '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
      '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    ],
    more: [
      '<circle cx="12" cy="12" r="1"/>',
      '<circle cx="19" cy="12" r="1"/>',
      '<circle cx="5" cy="12" r="1"/>',
    ],
    eye: [
      '<path d="M2.06 12.35a1 1 0 0 1 0-.7C3.52 7.34 7.6 4 12 4s8.48 3.34 9.94 7.65a1 1 0 0 1 0 .7C20.48 16.66 16.4 20 12 20s-8.48-3.34-9.94-7.65z"/>',
      '<circle cx="12" cy="12" r="3"/>',
    ],
    "eye-off": [
      '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.4 0 8.48 3.34 9.94 7.65a1 1 0 0 1-.08.86 12.08 12.08 0 0 1-2.04 2.7"/>',
      '<path d="M6.61 6.61A12.34 12.34 0 0 0 2.06 11.65a1 1 0 0 0 0 .7C3.52 16.66 7.6 20 12 20a10.64 10.64 0 0 0 5.39-1.61"/>',
      '<path d="M2 2l20 20"/>',
      '<path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>',
    ],
    theme: [
      '<circle cx="12" cy="12" r="4"/>',
      '<path d="M12 2v2"/>',
      '<path d="M12 20v2"/>',
      '<path d="m4.93 4.93 1.41 1.41"/>',
      '<path d="m17.66 17.66 1.41 1.41"/>',
      '<path d="M2 12h2"/>',
      '<path d="M20 12h2"/>',
      '<path d="m6.34 17.66-1.41 1.41"/>',
      '<path d="m19.07 4.93-1.41 1.41"/>',
    ],
    settings: [
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.52a2 2 0 0 1-1 1.72l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.52a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>',
      '<circle cx="12" cy="12" r="3"/>',
    ],
    help: [
      '<circle cx="12" cy="12" r="10"/>',
      '<path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/>',
      '<path d="M12 17h.01"/>',
    ],
  };

  function bugIconSvg() {
    return svg([
      '<path d="M8 2l2 2"/>',
      '<path d="M16 2l-2 2"/>',
      '<path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
      '<path d="M12 21a6 6 0 0 1-6-6v-4a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4a6 6 0 0 1-6 6Z"/>',
      '<path d="M12 11v10"/>',
      '<path d="M6 13H3"/>',
      '<path d="M21 13h-3"/>',
      '<path d="M6.7 17.2 4.4 19.5"/>',
      '<path d="m17.3 17.2 2.3 2.3"/>',
    ]);
  }

  function iconSvg(kind) {
    return svg(ICON_PATHS[kind] || []);
  }

  function svg(paths) {
    return [
      '<svg class="af-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      ...paths,
      '</svg>',
    ].join("");
  }

  window.__afShadowingUiIcons = {
    bugIconSvg,
    iconSvg,
  };
})();
