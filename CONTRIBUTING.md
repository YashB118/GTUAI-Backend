# Contributing to GTU ExamAI

Thanks for your interest. This project moves fast — one feature branch per day, daily PRs — so contribution flow is intentionally lightweight.

## Ground rules

- Be kind. Engineering students use this. Don't ship anything that mocks them.
- Match existing code style. Frontend: 2-space, double quotes, no semicolons at end of imports list. Backend: 4-space, PEP-8, type hints on public functions.
- Keep PRs small. One concern per PR. If a refactor touches 30 files, split it.
- Tests aren't mandatory yet, but if you touch `services/answer_engine.py`, `services/prediction_engine.py`, or `services/chat_engine.py`, add at least one happy-path test under `backend/tests/`.

## Setup

See **[README — Quick start](./README.md#quick-start)**.

## Branching

```
main                ← protected, deployed
daily/NNN-slug      ← daily growth tasks (see DAILY.md)
feat/<short-name>   ← longer-form features
fix/<short-name>    ← bug fixes
docs/<short-name>   ← README / doc-only changes
```

## Commits

Conventional Commits with subject ≤ 60 chars:

```
feat(predict): add recency weighting to bayesian score
fix(chat): handle empty session gracefully
docs: clarify supabase env vars in README
refactor(answer-engine): split prompt builder into module
```

## Pull request flow

1. Fork (or branch if you have push access).
2. Create branch from `main`.
3. Push, open PR using the template — fill in **Summary**, **Why**, **Test plan**.
4. CI must pass (when CI exists). Manual smoke at minimum.
5. Self-merge if you have rights and PR was reviewed by yourself end-to-end. Otherwise tag for review.

## What we want help on

Look for issues labelled:

- `good first issue` — bite-sized, well-scoped
- `help wanted` — needs an extra pair of eyes
- `ai-quality` — items from [AI_IMPROVEMENT_PLAN.md](./AI_IMPROVEMENT_PLAN.md)
- `growth` — items from [DAILY.md](./DAILY.md)

Big areas where contributions are especially welcome:

- More GTU subject test data + verified topper answers (for the few-shot prompt)
- Better diagram engine fallbacks (LaTeX → TikZ → PNG)
- Mobile UX polish
- Translations (Gujarati / Hindi UI strings)
- Accessibility audits

## Reporting bugs / requesting features

Use the issue templates under `.github/ISSUE_TEMPLATE/`. They're short — fill in what applies.

## Security

If you find a security issue (auth bypass, secret leak, RLS hole, prompt-injection that crosses tenants), please **do not** open a public issue. Instead email the maintainer at the address in the commit log, or open a private security advisory on GitHub.

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
