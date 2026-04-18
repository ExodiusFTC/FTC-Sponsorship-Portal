-- 0009_portfolio_fields.sql

ALTER TABLE teams
ADD COLUMN technical_summary text,
ADD COLUMN outreach_summary text,
ADD COLUMN media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN youtube_url text,
ADD COLUMN budget_items jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN financial_ask_cents bigint NOT NULL DEFAULT 0 CHECK (financial_ask_cents >= 0);
