# Architecture Decision Records

Decisions that outlive one phase get a numbered record here:
`NNNN-short-title.md` with sections **Context / Decision / Alternatives
considered / Consequences** — half a page max.

Changing the FormSchema format after phase 2 requires an ADR. An additive,
optional, default-preserving field is logged in ADR-0002 and keeps
`formsgen/v2`; anything else needs a schema version bump and a migration
note.
