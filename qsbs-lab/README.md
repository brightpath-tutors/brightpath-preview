# BrightPath QSBS & Business Strategy Lab
## Architecture Documentation Package

### Contents

**docs/**
- `01_architecture_base.html` — Base architecture, 18 modules, all build prompts (Sections 1–11)
- `02_architecture_addendum.html` — Refinement pass: 35 engines/modules, BI1, DJ1, audit trail standard
- `03_principal_engineer_review.html` — Pre-implementation design review, 13 findings, 5 priority fixes

**db/**
- `DATABASE_SCHEMA.sql` — Complete Supabase schema. Run once in SQL Editor.
- `SUPABASE_SETUP.md` — Step-by-step Supabase + GitHub Pages setup guide

**legal/**
- `LEGAL_AND_MODELING_ASSUMPTIONS.md` — All legal sources, disclaimers, methodology

**Root**
- `SAMPLE_SCENARIOS.json` — 12 fictional planning scenarios for import

### Build Order
1. Fix P1–P5 from the design review (shared contracts, error handling, test strategy)
2. Build M0 (Foundation) using prompt from base architecture docs
3. Continue through modules in the sequence defined in Section 5

### GitHub Repo for Preview Site
Push docs/ to: https://github.com/brightpath-tutors/brightpath-preview
