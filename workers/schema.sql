-- D1 Schema for rhps.live AI Foundation

-- 1. Casts & Venues Directory
CREATE TABLE IF NOT EXISTS casts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  schedule_frequency TEXT,
  schedule_details TEXT,
  schedule_showtime TEXT,
  website_url TEXT,
  tickets_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  bio TEXT,
  featured BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  last_verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sponsorship Inventory & Active Campaigns
CREATE TABLE IF NOT EXISTS sponsorships (
  id TEXT PRIMARY KEY,
  advertiser_name TEXT NOT NULL,
  advertiser_email TEXT NOT NULL,
  slot_type TEXT NOT NULL, -- 'navbar_spotlight', 'geo_pin', 'feed_card'
  target_geo_state TEXT,   -- optional geo-targeting (e.g., 'CA', 'NY', or NULL for global)
  target_cast_id TEXT,     -- optional link to a specific shadowcast venue
  headline TEXT NOT NULL,
  subtext TEXT,
  target_url TEXT NOT NULL,
  image_r2_key TEXT,
  status TEXT DEFAULT 'pending_review', -- 'pending_review', 'active', 'expired', 'rejected'
  ai_moderation_notes TEXT,
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  amount_cents INTEGER NOT NULL,
  starts_at DATETIME,
  expires_at DATETIME,
  impression_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_cast_id) REFERENCES casts(id)
);

-- 3. Community Support / Inquiries
CREATE TABLE IF NOT EXISTS support_conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_identifier TEXT,
  category TEXT, -- 'show_finder', 'cast_update', 'prop_rules', 'sponsorship_inquiry', 'general'
  summary TEXT,
  resolved BOOLEAN DEFAULT 0,
  flagged_for_human BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit & Reliability Logs (Automated site audits & link checks)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  audit_type TEXT NOT NULL, -- 'link_health_check', 'cast_verification', 'ad_moderation', 'ad_expiration'
  entity_id TEXT,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error'
  message TEXT NOT NULL,
  details_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_casts_country_state ON casts(country, state);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status_dates ON sponsorships(status, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(audit_type, created_at);
