-- Patch: add spend_brahmastra and spend_predict transaction types
-- Run in Supabase SQL Editor after streaks_coins_system.sql

ALTER TABLE coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE coin_transactions
  ADD CONSTRAINT coin_transactions_type_check CHECK (type IN (
    'login', 'challenge_correct', 'challenge_attempt',
    'brahmastra', 'admin_grant', 'coupon', 'spend_ai',
    'spend_freeze', 'streak_bonus',
    'spend_brahmastra', 'spend_predict'
  ));
