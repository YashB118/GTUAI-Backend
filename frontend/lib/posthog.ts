"use client";

import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") ph.debug(false);
    },
  });
  initialized = true;
}

interface IdentifyTraits {
  email?: string;
  role?: string;
  branch?: string;
  semester?: number;
  college?: string | null;
}

export function identifyUser(userId: string, traits: IdentifyTraits = {}) {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetUser() {
  if (!initialized) return;
  posthog.reset();
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function captureEvent(name: string, props: EventProps = {}) {
  if (!initialized) return;
  posthog.capture(name, props);
}

export { posthog };
