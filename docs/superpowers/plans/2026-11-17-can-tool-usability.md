# CanBitTimingTool usability implementation

Approved scope: reverse calculation, selectable candidate diagrams, CAN FD paired summary, concrete no-solution suggestions.

- [x] Add and verify a pure reverse calculation function with integer bounds, finite input and SJW validation. Test known timing, invalid inputs and search round trips.
- [x] Return structured diagnostic examples without relaxing the user's active search. Preserve existing diagnostic text API.
- [x] Add accessible candidate selection, update metrics/diagram, and export a paired FD selection with the effective clock and target rates.
- [x] Add an independent reverse form in a collapsed panel with its own effective clock and actual timing counts.
- [x] Verify focused tests, Hexo build, generated module imports and browser interaction. No commit or publication requested in this turn.

Validation: forward/reverse, invalid counts, diagnostic examples and selected paired TSV export covered by focused tests. Hexo build succeeds. Browser verified phase selection, summary updates, reverse output, SJW rejection and unchanged no-solution inputs.

## Follow-up approved scope

- [x] Optional reverse targets: independently validate target bitrate and target sample point; display absolute bitrate deviation (%) and sample-point deviation (pp), while leaving blank targets uncomputed.
- [x] Candidate transfer: copy effective clock, actual counts and both targets from the chosen row into the reverse panel, expand and calculate immediately.
- [x] Result controls: sorting or count changes submit the current form automatically; normal parameter edits continue requiring manual calculation. Cancel obsolete workers as before.
- [x] Check focused comparisons, browser transfer and automatic reordering, then build. Keep local pending changes intact; no push requested.

## Existing behavior consistency fixes

- [x] Keep selected physical timing counts across sorting/count changes; explicitly notify when the selected candidate leaves the displayed list. Ordinary timing edits invalidate selection.
- [x] Reverse actions select their candidate and label the reverse result with phase and source row number; manual edits remove provenance.
- [x] Persist successfully restored shared settings before removing config from URL; retain other query/hash values and retain shared config when storage is unavailable.

Validation: 22 tests pass, Hexo build passes. Browser verified row numbers change while selected FD parameters remain identical, selection survives display-count change, shrinking 50 to 20 warns when row 50 is lost, reverse actions update selection and source, shared config is consumed and subsequent clock edit survives refresh. Console has no errors.


## Final existing-feature polish

- [x] Independent, explicitly named forward/reverse resets with scoped status messages.
- [x] Pure full-config validation and whitelisting before any DOM mutation; malformed settings, inactive phases, caches and FD rate relationship rejected atomically.
- [x] Exact TQ segment widths with external labels and an absolutely positioned sample marker.
- [x] Nonzero errors below display precision shown as a bound; exact zeros remain 0 and TSV stays numeric.
- [x] Per-button copy feedback timers restore text/accessible labels and successful copy clears previous fallback text; obsolete asynchronous responses ignored.

Verification: focused config/format/copy tests and existing tests pass. Browser confirmed resets are independent, invalid data-phase settings cannot partially change clock/mode, tiny reverse error is visible, diagram widths match counts, copy labels restore, and no console errors.

## Release review

Full review fixed numeric configuration strings that JavaScript accepts but HTML number inputs may sanitize (such as +80 or 500.). Restored numeric values are normalized before application, with a regression test.

Release verification: 27 tests pass; clean Hexo build produces 53 files; HTML has no duplicate IDs or nested forms; all nine versioned modules and their dependencies exist. Final browser smoke checks confirm FD calculation, paired selections preserved after reorder, reverse provenance and full paired copy; no console errors.
