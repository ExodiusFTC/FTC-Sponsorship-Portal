ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS community_interest_text text,
ADD COLUMN IF NOT EXISTS seed_funding_goals_cents bigint DEFAULT 0;
