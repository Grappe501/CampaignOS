-- Optional dev data (runs with `supabase db reset` / seed when enabled in config.toml).
-- Uncomment after migrations are applied and you want a deterministic test voter row.
-- Do not load real PII from production into seed files.

-- INSERT INTO public.raw_vr (
--     voter_id,
--     name_last,
--     name_first,
--     date_of_birth,
--     county,
--     registrant_status,
--     res_city,
--     res_state,
--     res_zip5,
--     precinct_name,
--     congressional_district,
--     state_senate_district,
--     state_representative_district
-- )
-- VALUES (
--     'DEV-VR-0001',
--     'Sample',
--     'Volunteer',
--     '1995-06-15',
--     'Pulaski',
--     'active',
--     'Little Rock',
--     'AR',
--     '72201',
--     'Sample Precinct',
--     '2',
--     '34',
--     '89'
-- );

SELECT 1;

-- ---------------------------------------------------------------------------
-- Public campaign branding + knowledge seed (Chris Jones for Congress homepage)
-- Safe/public only — no voter PII.
-- Requires migration: 20260420194000_campaign_brand_and_knowledge_ingestion.sql
-- ---------------------------------------------------------------------------

INSERT INTO public.campaign_brand_tokens (campaign_slug, token_key, token_value, category, source_url)
VALUES
  ('chris-jones-for-congress', 'color.primary', '#2B3984', 'color', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'),
  ('chris-jones-for-congress', 'color.secondary', '#4F69B2', 'color', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'),
  ('chris-jones-for-congress', 'color.accent', '#EDA356', 'color', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'),
  ('chris-jones-for-congress', 'color.ink', '#010323', 'color', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'),
  ('chris-jones-for-congress', 'color.paper', '#F7F0E4', 'color', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'),
  ('chris-jones-for-congress', 'color.soft', '#ECEFF9', 'color', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398'),
  ('chris-jones-for-congress', 'font.ui', 'Manrope (Google Fonts) + system sans fallback', 'font', 'https://chrisjonesforcongress.com/wp-content/uploads/elementor/css/post-96.css?ver=1775512398')
ON CONFLICT (campaign_slug, token_key) DO UPDATE SET
  token_value = EXCLUDED.token_value,
  category = EXCLUDED.category,
  source_url = EXCLUDED.source_url;

INSERT INTO public.campaign_brand_assets (campaign_slug, asset_key, asset_kind, url, alt_text, source_url)
VALUES
  ('chris-jones-for-congress', 'logo.primary', 'logo', 'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Jones-Logo-H-Orange-White.svg', 'Chris Jones for Congress logo', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'logo.alt', 'logo', 'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Jones-Logo-V-Blue-Orange.svg', 'Chris Jones for Congress logo (alt)', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'image.headshot', 'image', 'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/jones-headshot-2-scaled.png', 'Chris Jones headshot', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'image.hero.mobile', 'image', 'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Mobile-Hero-Image.png', 'Homepage hero image', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'image.og', 'image', 'https://chrisjonesforcongress.com/wp-content/uploads/2025/09/Jones_SocialShare_OG.png', 'Social share image', 'https://chrisjonesforcongress.com/')
ON CONFLICT (campaign_slug, asset_key) DO UPDATE SET
  url = EXCLUDED.url,
  alt_text = EXCLUDED.alt_text,
  source_url = EXCLUDED.source_url;

INSERT INTO public.campaign_messages (campaign_slug, message_kind, message_text, sort_order, source_url)
SELECT 'chris-jones-for-congress', x.kind, x.txt, x.sort_order, 'https://chrisjonesforcongress.com/'
FROM (
  VALUES
    ('slogan', 'A Bigger Table. A Brighter Future.', 0),
    ('hero', 'I’m a bridge builder, a fighter for us, and a visionary for the future of Arkansas.', 0),
    ('hero', 'Our campaign is about expanding opportunity, strengthening our communities, and proving that when Arkansans come together, we can fly.', 1)
) AS x(kind, txt, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaign_messages m
  WHERE m.campaign_slug = 'chris-jones-for-congress'
    AND m.message_kind = x.kind
    AND m.message_text = x.txt
);

INSERT INTO public.campaign_bio_facts (campaign_slug, fact_text, sort_order, source_url)
SELECT 'chris-jones-for-congress', x.txt, x.sort_order, 'https://chrisjonesforcongress.com/'
FROM (
  VALUES
    ('Grew up in Pine Bluff as the son of a minister.', 0),
    ('Values of service and community.', 1),
    ('Path led to science while staying rooted in Arkansas.', 2),
    ('Bridge-building narrative: faith and science, rural and urban, young and old; respecting tradition while bringing new ideas.', 3)
) AS x(txt, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaign_bio_facts b
  WHERE b.campaign_slug = 'chris-jones-for-congress'
    AND b.fact_text = x.txt
);

INSERT INTO public.campaign_issue_positions (campaign_slug, pillar_key, pillar_title, summary_text, source_url)
VALUES
  ('chris-jones-for-congress', 'jobs_local_economy', 'Jobs & Local Economy', 'We can build an economy that lifts every community. Good jobs, fair wages, small business growth, high-quality internet access, and hospitals that stay open in rural towns.', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'families_health', 'Families & Health', 'Every family deserves the chance to thrive. Stronger schools, a full range of comprehensive maternal health support, addiction support and recovery, and food security must be part of the foundation for healthy communities.', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'schools_innovation', 'Schools & Innovation', 'Our government should invest in our people. Early childhood education, hands-on apprenticeships, and training in both technology and the trades will prepare our children and our workforce for tomorrow.', 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'democracy_for_people', 'Democracy for the People', 'Democracy belongs to all of us. Fair maps, secure and accessible elections, a government you can trust, and leaders who listen are the guardrails that protect our voice and our future.', 'https://chrisjonesforcongress.com/')
ON CONFLICT (campaign_slug, pillar_key) DO UPDATE SET
  pillar_title = EXCLUDED.pillar_title,
  summary_text = EXCLUDED.summary_text,
  source_url = EXCLUDED.source_url;

INSERT INTO public.campaign_ctas (campaign_slug, cta_key, label, url, cta_kind, sort_order, source_url)
VALUES
  ('chris-jones-for-congress', 'get_to_know_me', 'Get to Know Me', 'https://chrisjonesforcongress.com/about/', 'learn_more', 0, 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'volunteer', 'Volunteer', 'https://chrisjonesforcongress.com/volunteer/', 'volunteer', 1, 'https://chrisjonesforcongress.com/'),
  ('chris-jones-for-congress', 'donate', 'Donate', 'https://chrisjonesforcongress.com/donate/', 'donate', 2, 'https://chrisjonesforcongress.com/')
ON CONFLICT (campaign_slug, cta_key) DO UPDATE SET
  label = EXCLUDED.label,
  url = EXCLUDED.url,
  cta_kind = EXCLUDED.cta_kind,
  sort_order = EXCLUDED.sort_order,
  source_url = EXCLUDED.source_url;

INSERT INTO public.campaign_contact_points (campaign_slug, kind, label, value, url, source_url)
SELECT 'chris-jones-for-congress', 'mailing_address', 'Mailing address', 'P.O. Box 21803, Little Rock, AR 72221', 'https://chrisjonesforcongress.com/contact-us/', 'https://chrisjonesforcongress.com/'
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaign_contact_points c
  WHERE c.campaign_slug = 'chris-jones-for-congress'
    AND c.kind = 'mailing_address'
    AND c.value = 'P.O. Box 21803, Little Rock, AR 72221'
);

INSERT INTO public.campaign_social_links (campaign_slug, platform, label, url, handle, source_url)
SELECT 'chris-jones-for-congress', x.platform, x.label, x.url, x.handle, 'https://chrisjonesforcongress.com/'
FROM (
  VALUES
    ('facebook', 'Facebook', 'https://chrisjonesforcongress.com/facebook/', NULL),
    ('x', 'X', 'https://chrisjonesforcongress.com/x/', '@jonesforAR'),
    ('instagram', 'Instagram', 'https://chrisjonesforcongress.com/instagram/', NULL)
) AS x(platform, label, url, handle)
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaign_social_links s
  WHERE s.campaign_slug = 'chris-jones-for-congress'
    AND s.platform = x.platform
    AND s.url = x.url
);

INSERT INTO public.campaign_knowledge_documents (campaign_slug, source_url, title, content_text, content_json, fetched_at)
VALUES (
  'chris-jones-for-congress',
  'https://chrisjonesforcongress.com/',
  'Homepage',
  NULL,
  jsonb_build_object(
    'slogan', 'A Bigger Table. A Brighter Future.',
    'navigationLabels', jsonb_build_array('Home', 'Meet Chris', 'Store'),
    'issuePillars', jsonb_build_array(
      jsonb_build_object('title','Jobs & Local Economy'),
      jsonb_build_object('title','Families & Health'),
      jsonb_build_object('title','Schools & Innovation'),
      jsonb_build_object('title','Democracy for the People')
    ),
    'ctas', jsonb_build_array(
      jsonb_build_object('label','Get to Know Me','url','https://chrisjonesforcongress.com/about/'),
      jsonb_build_object('label','Volunteer','url','https://chrisjonesforcongress.com/volunteer/'),
      jsonb_build_object('label','Donate','url','https://chrisjonesforcongress.com/donate/')
    )
  ),
  now()
)
ON CONFLICT (campaign_slug, source_url) DO UPDATE SET
  title = EXCLUDED.title,
  content_json = EXCLUDED.content_json,
  fetched_at = EXCLUDED.fetched_at;

-- ---------------------------------------------------------------------------
-- Knowledge chunks + tags (granular; retrieval-ready)
-- ---------------------------------------------------------------------------

WITH doc AS (
  SELECT id
  FROM public.campaign_knowledge_documents
  WHERE campaign_slug = 'chris-jones-for-congress'
    AND source_url = 'https://chrisjonesforcongress.com/'
  LIMIT 1
),
ins AS (
  INSERT INTO public.campaign_knowledge_chunks (campaign_slug, document_id, chunk_index, content_text, tags)
  SELECT
    'chris-jones-for-congress',
    doc.id,
    x.chunk_index,
    x.content_text,
    x.tags
  FROM doc
  CROSS JOIN (
    VALUES
      (0, 'A Bigger Table. A Brighter Future.', ARRAY['slogan','hero','branding']::text[]),
      (1, 'I’m a bridge builder, a fighter for us, and a visionary for the future of Arkansas.', ARRAY['hero','messaging']::text[]),
      (2, 'Our campaign is about expanding opportunity, strengthening our communities, and proving that when Arkansans come together, we can fly.', ARRAY['hero','messaging']::text[]),
      (3, 'Grew up in Pine Bluff as the son of a minister. Values of service and community. Path led to science while staying rooted in Arkansas. Bridge-building narrative: faith and science, rural and urban, young and old; respecting tradition while bringing new ideas.', ARRAY['bio','meet-chris']::text[]),
      (4, 'Jobs & Local Economy: We can build an economy that lifts every community. Good jobs, fair wages, small business growth, high-quality internet access, and hospitals that stay open in rural towns.', ARRAY['issues','jobs','economy','jobs___local_economy']::text[]),
      (5, 'Families & Health: Every family deserves the chance to thrive. Stronger schools, a full range of comprehensive maternal health support, addiction support and recovery, and food security must be part of the foundation for healthy communities.', ARRAY['issues','families','health','families___health']::text[]),
      (6, 'Schools & Innovation: Our government should invest in our people. Early childhood education, hands-on apprenticeships, and training in both technology and the trades will prepare our children and our workforce for tomorrow.', ARRAY['issues','schools','innovation','schools___innovation']::text[]),
      (7, 'Democracy for the People: Democracy belongs to all of us. Fair maps, secure and accessible elections, a government you can trust, and leaders who listen are the guardrails that protect our voice and our future.', ARRAY['issues','democracy','democracy_for_the_people']::text[]),
      (8, 'Get to Know Me — https://chrisjonesforcongress.com/about/', ARRAY['cta','learn_more','bio']::text[]),
      (9, 'Volunteer — https://chrisjonesforcongress.com/volunteer/', ARRAY['cta','volunteer']::text[]),
      (10, 'Donate — https://chrisjonesforcongress.com/donate/', ARRAY['cta','donate']::text[]),
      (11, 'Mailing address: P.O. Box 21803, Little Rock, AR 72221 (https://chrisjonesforcongress.com/contact-us/)', ARRAY['contact','mailing_address']::text[]),
      (12, 'Facebook: https://chrisjonesforcongress.com/facebook/', ARRAY['social','facebook']::text[]),
      (13, 'X: https://chrisjonesforcongress.com/x/', ARRAY['social','x']::text[]),
      (14, 'Instagram: https://chrisjonesforcongress.com/instagram/', ARRAY['social','instagram']::text[])
  ) AS x(chunk_index, content_text, tags)
  ON CONFLICT (document_id, chunk_index) DO UPDATE SET
    content_text = EXCLUDED.content_text,
    tags = EXCLUDED.tags
  RETURNING tags
)
INSERT INTO public.campaign_knowledge_tags (campaign_slug, tag)
SELECT DISTINCT 'chris-jones-for-congress', t
FROM ins
CROSS JOIN LATERAL unnest(ins.tags) t
ON CONFLICT (campaign_slug, tag) DO NOTHING;

