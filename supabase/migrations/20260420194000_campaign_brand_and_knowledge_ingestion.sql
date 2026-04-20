-- Public campaign branding + knowledge ingestion tables (granular; query-ready).
-- Safe for authenticated read; no client write access by default.

-- ---------------------------------------------------------------------------
-- Brand tokens + assets (public)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_brand_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  token_key text NOT NULL,
  token_value text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_brand_tokens_category_check CHECK (
    category IN ('color', 'font', 'spacing', 'other')
  ),
  CONSTRAINT campaign_brand_tokens_unique UNIQUE (campaign_slug, token_key)
);

CREATE TABLE IF NOT EXISTS public.campaign_brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  asset_key text NOT NULL,
  asset_kind text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  alt_text text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_brand_assets_kind_check CHECK (
    asset_kind IN ('image', 'logo', 'icon', 'document')
  ),
  CONSTRAINT campaign_brand_assets_unique UNIQUE (campaign_slug, asset_key)
);

-- ---------------------------------------------------------------------------
-- Messages / bio / issues / CTAs / contacts / social (public)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  message_kind text NOT NULL DEFAULT 'other',
  message_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_messages_campaign_kind_idx
  ON public.campaign_messages (campaign_slug, message_kind, sort_order);

CREATE TABLE IF NOT EXISTS public.campaign_bio_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  fact_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_bio_facts_campaign_idx
  ON public.campaign_bio_facts (campaign_slug, sort_order);

CREATE TABLE IF NOT EXISTS public.campaign_issue_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  pillar_key text NOT NULL,
  pillar_title text NOT NULL,
  summary_text text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_issue_positions_unique UNIQUE (campaign_slug, pillar_key)
);

CREATE TABLE IF NOT EXISTS public.campaign_ctas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  cta_key text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  cta_kind text NOT NULL DEFAULT 'other',
  sort_order integer NOT NULL DEFAULT 0,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_ctas_kind_check CHECK (
    cta_kind IN ('primary', 'secondary', 'form', 'donate', 'volunteer', 'learn_more', 'other')
  ),
  CONSTRAINT campaign_ctas_unique UNIQUE (campaign_slug, cta_key)
);

CREATE TABLE IF NOT EXISTS public.campaign_contact_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  label text NOT NULL,
  value text NOT NULL,
  url text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  platform text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  handle text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_social_links_unique UNIQUE (campaign_slug, platform, url)
);

-- ---------------------------------------------------------------------------
-- Knowledge documents + chunks + tags (public)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  source_url text NOT NULL,
  title text,
  content_text text,
  content_json jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_knowledge_documents_unique UNIQUE (campaign_slug, source_url)
);

CREATE INDEX IF NOT EXISTS campaign_knowledge_documents_campaign_idx
  ON public.campaign_knowledge_documents (campaign_slug, fetched_at DESC);

CREATE TABLE IF NOT EXISTS public.campaign_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  document_id uuid NOT NULL REFERENCES public.campaign_knowledge_documents (id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content_text text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_knowledge_chunks_unique UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS campaign_knowledge_chunks_campaign_idx
  ON public.campaign_knowledge_chunks (campaign_slug, document_id);

CREATE TABLE IF NOT EXISTS public.campaign_knowledge_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_slug text NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_knowledge_tags_unique UNIQUE (campaign_slug, tag)
);

-- ---------------------------------------------------------------------------
-- RLS: authenticated can read public campaign data; no client writes
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_brand_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_bio_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_issue_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ctas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contact_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_knowledge_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_brand_tokens_read ON public.campaign_brand_tokens;
CREATE POLICY campaign_brand_tokens_read ON public.campaign_brand_tokens
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_brand_assets_read ON public.campaign_brand_assets;
CREATE POLICY campaign_brand_assets_read ON public.campaign_brand_assets
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_messages_read ON public.campaign_messages;
CREATE POLICY campaign_messages_read ON public.campaign_messages
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_bio_facts_read ON public.campaign_bio_facts;
CREATE POLICY campaign_bio_facts_read ON public.campaign_bio_facts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_issue_positions_read ON public.campaign_issue_positions;
CREATE POLICY campaign_issue_positions_read ON public.campaign_issue_positions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_ctas_read ON public.campaign_ctas;
CREATE POLICY campaign_ctas_read ON public.campaign_ctas
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_contact_points_read ON public.campaign_contact_points;
CREATE POLICY campaign_contact_points_read ON public.campaign_contact_points
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_social_links_read ON public.campaign_social_links;
CREATE POLICY campaign_social_links_read ON public.campaign_social_links
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_knowledge_documents_read ON public.campaign_knowledge_documents;
CREATE POLICY campaign_knowledge_documents_read ON public.campaign_knowledge_documents
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_knowledge_chunks_read ON public.campaign_knowledge_chunks;
CREATE POLICY campaign_knowledge_chunks_read ON public.campaign_knowledge_chunks
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campaign_knowledge_tags_read ON public.campaign_knowledge_tags;
CREATE POLICY campaign_knowledge_tags_read ON public.campaign_knowledge_tags
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.campaign_brand_tokens TO authenticated;
GRANT SELECT ON public.campaign_brand_assets TO authenticated;
GRANT SELECT ON public.campaign_messages TO authenticated;
GRANT SELECT ON public.campaign_bio_facts TO authenticated;
GRANT SELECT ON public.campaign_issue_positions TO authenticated;
GRANT SELECT ON public.campaign_ctas TO authenticated;
GRANT SELECT ON public.campaign_contact_points TO authenticated;
GRANT SELECT ON public.campaign_social_links TO authenticated;
GRANT SELECT ON public.campaign_knowledge_documents TO authenticated;
GRANT SELECT ON public.campaign_knowledge_chunks TO authenticated;
GRANT SELECT ON public.campaign_knowledge_tags TO authenticated;

