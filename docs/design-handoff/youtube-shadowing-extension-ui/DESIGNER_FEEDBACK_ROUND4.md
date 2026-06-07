# Designer Feedback Round 4: Bottom Transcript Ribbon Direction

## Overall Assessment

This direction is now the preferred candidate for the next prototype.

The full screenshot makes the layout much clearer than the earlier crop. The bottom transcript ribbon is visible and solves a real product problem: the learner can keep phrase context under the video while the right side is reserved for dictionary lookup.

This is not a final visual design yet, but it is a good structural direction.

## What To Keep

### 1. Video Left, Dictionary Right

This split is strong:

- the video remains visually important,
- the dictionary has enough vertical space,
- lookup does not compete with the transcript,
- review actions can stay fixed at the bottom of the dictionary panel.

Keep the right panel as a dedicated dictionary/account/lookup surface.

### 2. Bottom Transcript Ribbon

The transcript ribbon under the video is the strongest part of this pass.

Keep:

- previous phrases above,
- current phrase highlighted,
- next phrases below,
- timestamps on the left,
- clicked word highlighted inside the current phrase,
- translation under the source phrase when enabled.

The current phrase should feel anchored on a stable focus line. It should not jump away when the phrase stops.

### 3. Phrase Control Bar

The bottom controls now feel practical:

- `Prev Phrase`,
- `Replay Active`,
- `Next Phrase`,
- `Auto-Pause`.

This is close to the desired shadowing control model.

Keep `Replay` as the dominant action. It should remain visually stronger than previous/next.

### 4. Dictionary Card

The dictionary card is useful and readable:

- headword,
- pronunciation,
- part of speech,
- definition,
- English translation,
- current context,
- corpus examples,
- tags,
- memory grading.

This is a good card anatomy for 2000NL lookup.

## Main Missing Piece

### 2000NL Account / Sign-In State

The current mockup does not show where the user is signed in.

This must be added before implementation because lookup, review actions, saved words, and progress are user-specific.

The designer should add account states to the right panel:

1. **Signed out**
   - visible `Sign in to 2000NL` action,
   - short explanation that lookup/progress require the 2000NL account,
   - phrase replay and transcript navigation remain usable.

2. **Signed in**
   - compact user identity in the dictionary panel header,
   - small status such as `2000NL connected`,
   - review buttons enabled.

3. **Expired/disconnected**
   - visible `Reconnect` action,
   - lookup/review disabled with a clear message.

This should not become a full app header or sidebar. Account state should be compact and live in the right panel.

## Design Corrections

### 1. Use A Real YouTube Player Shape

The concept image currently looks like a standalone learning app or video canvas.

For the extension MVP, show the actual YouTube player area:

- real video rectangle,
- YouTube-like player controls can remain inside the player,
- no decorative laptop frame,
- no separate product-shell title bar unless it is clearly extension chrome.

The extension can style the learning areas, but the video itself should still feel like YouTube.

### 2. Right Panel Header Needs Product Context

Current header:

```text
Dictionary
Contextual Lookup
```

This is good, but it needs one compact account/status layer:

```text
Dictionary
Contextual Lookup · 2000NL connected
```

or:

```text
Dictionary
Sign in to 2000NL
```

Do not add large branding. Keep `AudioFilms` and `2000NL` subtle.

### 3. Clarify Transcript Modes

Show at least three ribbon states:

- shadowing: source hidden or partially masked,
- reading: source visible and words clickable,
- translation-first: translation visible, source hidden until reveal.

The current screen shows a reading/lookup state. We still need to see the default shadowing state.

### 4. Multi-Match Lookup Still Needed

The screenshot shows one dictionary entry. The designer should also show multiple matches:

- selected expanded card,
- compact alternatives below,
- review buttons only on the expanded/selected card,
- secondary actions under a three-dot menu.

### 5. Control Bar Needs Tight Keyboard Mapping

The controls should communicate the actual keyboard behavior:

```text
Prev Phrase      Replay Active      Next Phrase      Auto-Pause
←                Space              →                on/off
```

Keyboard hints can be small, but the mapping should be visible somewhere.

## Implementation Candidate

This layout is implementable in stages.

### Prototype Step 1

- Hide/cover YouTube recommendations.
- Add a fixed right dictionary panel with signed-out placeholder state.
- Add bottom transcript ribbon using current phrase data.
- Keep existing phrase playback logic.
- Keep lookup mocked or empty.

### Prototype Step 2

- Make ribbon words clickable.
- Show selected word in the right panel.
- Add loading, empty, and one-match lookup states.
- Wire lookup to the 2000NL platform endpoint.

### Prototype Step 3

- Add 2000NL sign-in/reconnect state.
- Enable authenticated lookup.
- Add explicit review actions only after sign-in.

## Next Designer Request

Ask for one cleaned-up pass based on this exact layout:

1. **Signed-out Shadowing**
   - YouTube video left,
   - bottom transcript ribbon,
   - right panel asks user to sign in to 2000NL,
   - phrase controls usable.

2. **Signed-in Reading / Lookup**
   - word selected in current phrase,
   - right panel shows expanded dictionary card,
   - account state compact in header,
   - review buttons enabled.

3. **Multi-Match Lookup**
   - one expanded card,
   - compact alternative cards,
   - secondary actions hidden behind a three-dot menu.

4. **Translation-First Mode**
   - current phrase source hidden,
   - translation visible,
   - replay controls unchanged.

## Decision

Proceed with this direction as the primary UI candidate.

Do not implement the full visual polish yet. First implementation should prove:

- bottom transcript ribbon can track phrase navigation,
- current phrase stays visually stable when playback pauses,
- words in the ribbon can become clickable,
- right panel can host account, lookup, and review states.
