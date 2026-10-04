# Fixtures

`kitchen-sink.formsgen.json` is created in phase 2 and grows with every
phase: every element type, validation rule, condition, and container pattern
implemented so far appears in it at least once. Tests and export snapshots
import it; manual QA loads it in the builder.

If a feature isn't in the kitchen sink, it isn't done.
