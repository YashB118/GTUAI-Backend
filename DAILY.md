# GTU ExamAI — Daily 10% Improvement Log

**Focus axis:** Growth + Virality (next 30 days)
**Format:** One feature branch per day → PR → self-merge
**Started:** 2026-05-19

---

## How this works

1. Each day pick the next un-checked task from the backlog (or the day's pinned task).
2. Branch: `daily/DDD-slug` (e.g. `daily/001-posthog-install`).
3. Ship it, open PR, merge. Tick the box. Append the commit SHA.
4. Time-box: 60–120 min. If task balloons, split it.
5. End of week (every Sunday): 5-min review — kill what flopped, double down on what landed.

**Definition of "shipped":** merged to main, deployed, smoke-tested on production URL.

---

## Today — Day 1 (2026-05-19)

### Task: Install PostHog analytics + identify users + 3 core events

**Why first:** Every other growth task is measured here. Shipping growth without analytics = flying blind.

**Definition of done:**
- [ ] PostHog SDK installed in `frontend` (`posthog-js`)
- [ ] `PostHogProvider` wraps `app/layout.tsx`
- [ ] `posthog.identify(user.id, { email, role, college? })` fires on login + signup
- [ ] 3 events captured: `user_signed_up`, `answer_generated`, `prediction_viewed`
- [ ] Env var `NEXT_PUBLIC_POSTHOG_KEY` documented in `.env.example`
- [ ] Verified: one test event visible in PostHog dashboard

**Branch:** `daily/001-posthog-install`
**Estimate:** 90 min
**Status:** ☐ pending
**Commit:** _(fill in after merge)_

---

## 30-Day Backlog

### Week 1 — Measurement + SEO foundation

- [ ] **D1** Install PostHog + identify + 3 core events ← *today*
- [ ] **D2** `robots.txt` + dynamic `sitemap.xml` (includes subjects, public pages)
- [ ] **D3** Per-route `generateMetadata()` helper — title/desc/OG per page
- [ ] **D4** Static OG image for landing via `@vercel/og` (1200×630)
- [ ] **D5** Twitter card meta + OG meta for existing `brahmastra/share` page
- [ ] **D6** Public crawlable `/subjects/[slug]` landing pages (auth-free, SEO-tuned)
- [ ] **D7** JSON-LD structured data: `FAQPage` on landing, `Course` per subject

### Week 2 — Share + virality

- [ ] **D8** Public answer share page (`/a/[id]`, no auth, branded preview)
- [ ] **D9** Dynamic per-answer OG image (question text rendered into 1200×630)
- [ ] **D10** WhatsApp share button (highest-impact channel for IN students)
- [ ] **D11** Twitter/X share with pre-filled witty caption + hashtags
- [ ] **D12** "Copy link" auto-appends UTM (`?utm_source=share&utm_medium=user`)
- [ ] **D13** "Share this prediction" CTA inside Brahmastra answer card
- [ ] **D14** Public `/predictions/[subject]` page — top predicted Qs (crawlable + shareable)

### Week 3 — Referral + funnel

- [ ] **D15** Referral codes (`?ref=CODE`) → both sides get coins/credits
- [ ] **D16** Referral leaderboard (public, top 10)
- [ ] **D17** Email waitlist capture on landing for non-signed-in
- [ ] **D18** Welcome email sequence via Resend (D0, D2, D5)
- [ ] **D19** First-time onboarding tooltips (3 steps: pick subject → predict → ask GPT)
- [ ] **D20** "Invite a friend" modal triggered after first answer generated
- [ ] **D21** Empty-state CTAs across Predict / Materials / Chat / Community

### Week 4 — Content + retention

- [ ] **D22** Subject-wise SEO blog template (`/blog/[subject]/[slug]`)
- [ ] **D23** Auto-publish "Previous year Q with AI answer" public pages (one per top pattern)
- [ ] **D24** Web push notification setup (service worker + opt-in prompt)
- [ ] **D25** Exam-day reminder push + email (T-7, T-1, T-0)
- [ ] **D26** Surface existing streak system on dashboard (already built, hidden)
- [ ] **D27** Weekly digest email — "your activity + top 3 predictions for you"
- [ ] **D28** Self-analytics dashboard (DAU, signup→generate funnel, retention cohorts)
- [ ] **D29** A/B test landing hero copy (2 variants via PostHog feature flag)
- [ ] **D30** Review — drop the flops, double down on the hits, write next 30 days

---

## Weekly Review Log

### Week 1 (2026-05-19 → 2026-05-25)
_(filled in next Sunday)_
