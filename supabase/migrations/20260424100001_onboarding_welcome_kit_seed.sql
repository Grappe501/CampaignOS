-- Seed structured onboarding for Chris Jones for Congress.
-- Canonical sources: Volunteer Welcome Kit + Volunteer Organization Outline (see campaign_onboarding_documents).
-- Re-run safe: inserts only when rows missing.

INSERT INTO public.campaign_onboarding_documents (campaign_slug, document_key, title, storage_path, source_kind, notes)
VALUES
    ('chris-jones-for-congress', 'volunteer_welcome_kit', 'Volunteer Welcome Kit', 'content/onboarding-source/Volunteer Welcome Kit.md', 'markdown', 'Place file in repo; update sections via SQL or ingestion script when text changes.'),
    ('chris-jones-for-congress', 'volunteer_org_outline', 'Volunteer Organization Outline', 'content/onboarding-source/Vol organization (2).pptx', 'pptx', 'Place file in repo; refine lane objectives from slides.')
ON CONFLICT (campaign_slug, document_key) DO NOTHING;

INSERT INTO public.campaign_onboarding_modules (campaign_slug, module_key, title, summary, sort_order, source_document)
VALUES
    ('chris-jones-for-congress', 'welcome_purpose', 'Welcome & purpose', 'Why you are here and what this campaign asks of volunteers.', 1, 'welcome_kit'),
    ('chris-jones-for-congress', 'how_we_work_together', 'How we work together', 'Culture: people-powered leadership and alignment.', 2, 'welcome_kit'),
    ('chris-jones-for-congress', 'how_we_grow', 'How we grow', 'Start with five; depth over sprawl; pick what you can sustain.', 3, 'welcome_kit'),
    ('chris-jones-for-congress', 'pick_your_lane', 'Pick your lane', 'Choose the operational lane that matches your strengths and capacity.', 4, 'org_outline'),
    ('chris-jones-for-congress', 'first_actions', 'First actions', 'Concrete next steps once you have picked a lane.', 5, 'org_outline'),
    ('chris-jones-for-congress', 'messaging_show_up', 'Messaging & how we show up', 'Simple talk tracks and boundaries for every volunteer.', 6, 'welcome_kit'),
    ('chris-jones-for-congress', 'escalation_when_unsure', 'When you are unsure', 'Escalate early; do not guess on compliance or sensitive voter data.', 7, 'welcome_kit')
ON CONFLICT (campaign_slug, module_key) DO NOTHING;

-- Sections (idempotent)
INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'why_youre_here', 'Why you are here',
    E'You are joining a **people-powered** congressional campaign. Your work helps neighbors participate in democracy—not to chase drama online.\n\nThis workspace orients you to **lanes** (how you will help) and **first actions** (what to do this week). When in doubt, ask your captain or HQ before improvising.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'welcome_purpose'
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_onboarding_sections s
    WHERE s.module_id = m.id AND s.section_key = 'why_youre_here');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'people_powered_values', 'People-powered campaign values',
    E'We win by **trust and consistency**: clear asks, honest timelines, and respect for every volunteer hour. We treat voters and each other with dignity.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'how_we_work_together'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'people_powered_values');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'leaders_empowered', 'People are empowered to lead',
    E'Captains and leads are **coaches**, not gatekeepers. If you see a gap, propose a plan and a timeline; your coordinator will help align resources.', 2
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'how_we_work_together'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'leaders_empowered');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'alignment_over_control', 'Alignment over control',
    E'We prefer **shared playbooks** over one-off heroics. When tactics shift, we update the team so volunteers are not caught mid-stream.', 3
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'how_we_work_together'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'alignment_over_control');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'start_with_five', 'Start with five',
    E'Growth runs through **small, reliable circles**—typically five committed volunteers who each invite and support others. Depth beats a burst of one-time signups.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'how_we_grow'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'start_with_five');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'start_here_pick_one_or_two', 'Start here — pick 1–2',
    E'Choose **one or two** lanes you can sustain for the next few weeks. You can add capacity later; under-commit and over-deliver is better than the reverse.', 2
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'how_we_grow'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'start_here_pick_one_or_two');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'lanes_overview', 'Operational lanes',
    E'Lanes match **real campaign work**: voter registration leadership, Power of 5 evangelism, fundraising, ambassadors, and events. Pick the lane that fits your skills and schedule.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'pick_your_lane'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'lanes_overview');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'first_actions_intro', 'Your first week',
    E'Complete roster verification if you are Arkansas-filed, meet your captain, and finish the **first actions** listed for your lane. Report blockers within one business day.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'first_actions'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'first_actions_intro');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'simple_messaging', 'Simple messaging',
    E'Stay positive, factual, and local. Lead with **why this race matters to your community**; avoid trashing opponents or sharing unverified claims.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'messaging_show_up'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'simple_messaging');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'talk_about_candidate', 'How to talk about Chris',
    E'Use approved **bios, issues, and slogans** from the campaign site. If you need a one-liner, pull from HQ materials—do not invent policy positions.', 2
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'messaging_show_up'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'talk_about_candidate');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'how_we_show_up', 'How we show up',
    E'**On time, prepared, kind.** Wear campaign identifiers when assigned; follow check-in and safety briefings for every shift.', 3
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'messaging_show_up'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'how_we_show_up');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'what_we_dont_do', 'What we do not do',
    E'No intimidation at the polls, no mishandling of voter data, no impersonation of officials. When unsure, **pause and escalate**.', 4
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'messaging_show_up'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'what_we_dont_do');

INSERT INTO public.campaign_onboarding_sections (campaign_slug, module_id, section_key, title, body_md, sort_order)
SELECT 'chris-jones-for-congress', m.id, 'if_unsure_escalate', 'If you are unsure, ask first',
    E'Contact your **county captain or HQ** before answering legal/compliance questions, before sharing data exports, or before speaking for the candidate in sensitive situations.', 1
FROM public.campaign_onboarding_modules m
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'escalation_when_unsure'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_sections s WHERE s.module_id = m.id AND s.section_key = 'if_unsure_escalate');

-- Campaign values (granular culture bullets)
INSERT INTO public.campaign_values (campaign_slug, value_key, title, body_md, sort_order, source_document)
VALUES
    ('chris-jones-for-congress', 'people_powered', 'People-powered', E'Power comes from organized neighbors, not from noise online.', 1, 'welcome_kit'),
    ('chris-jones-for-congress', 'empowered_leaders', 'Empowered to lead', E'Volunteers who step up get coaching, tools, and clear lanes—not micromanagement.', 2, 'welcome_kit'),
    ('chris-jones-for-congress', 'alignment', 'Alignment over control', E'We synchronize on message, timing, and compliance before we scale a tactic.', 3, 'welcome_kit')
ON CONFLICT (campaign_slug, value_key) DO NOTHING;

-- Talk tracks
INSERT INTO public.volunteer_talk_tracks (campaign_slug, track_key, title, body_md, sort_order, source_document)
VALUES
    ('chris-jones-for-congress', 'elevator_pitch', '30-second introduction', E'Introduce yourself, name the race, share one local reason you support Chris, invite them to take a concrete action (sign up, event, register).', 1, 'welcome_kit'),
    ('chris-jones-for-congress', 'neighbor_tone', 'Neighbor tone', E'Listen first. Ask what issues touch their family. Connect Chris’s priorities to those stories—no lectures.', 2, 'welcome_kit'),
    ('chris-jones-for-congress', 'boundaries', 'Stay in bounds', E'Do not promise jobs, benefits, or policy outcomes. Defer detailed policy to HQ-approved materials.', 3, 'welcome_kit')
ON CONFLICT (campaign_slug, track_key) DO NOTHING;

-- Accountability rules
INSERT INTO public.volunteer_accountability_rules (campaign_slug, rule_key, title, body_md, severity, sort_order)
VALUES
    ('chris-jones-for-congress', 'report_no_shows', 'Report no-shows quickly', E'If you commit to a shift and cannot make it, notify your captain **as soon as you know** so coverage can adjust.', 'important', 1),
    ('chris-jones-for-congress', 'data_handling', 'Protect voter data', E'Use only approved apps and lists. Never export sensitive data to personal devices or group chats.', 'critical', 2),
    ('chris-jones-for-congress', 'honest_metrics', 'Honest metrics', E'Log contacts and outcomes accurately—HQ uses them to allocate scarce resources.', 'normal', 3)
ON CONFLICT (campaign_slug, rule_key) DO NOTHING;

-- Growth paths
INSERT INTO public.volunteer_growth_paths (campaign_slug, path_key, title, body_md, sort_order)
VALUES
    ('chris-jones-for-congress', 'power_of_five_loop', 'Power of 5 loop', E'Each volunteer aims to **bring five** reliable teammates into meaningful work—not infinite shallow signups.', 1),
    ('chris-jones-for-congress', 'depth_first', 'Depth first', E'We celebrate teams that finish follow-ups and trainings, not just raw headcount.', 2)
ON CONFLICT (campaign_slug, path_key) DO NOTHING;

-- Lanes (initial five)
INSERT INTO public.volunteer_lanes (campaign_slug, lane_key, title, summary, objectives_md, accountability_expectations_md, support_structure_note_md, goal_challenge_mechanics_md, sort_order, related_onboarding_branch_hints)
VALUES
    ('chris-jones-for-congress', 'voter_registration_county_captain', 'Voter registration · county captain',
        'Lead county-wide registration goals, partner with clerks where appropriate, and coach pods hitting doors and tabling.',
        E'- Increase net registrations before deadlines\n- Ensure every shift has trained registrars\n- Track county-level KPIs weekly',
        E'Check in with HQ twice weekly; escalate legal questions immediately; no solo decisions on sensitive voter assistance.',
        E'Report to state voter protection lead; coordinate with field director for turf.',
        E'County goals ladder to statewide targets; celebrate counties that clear weekly benchmarks.',
        1, ARRAY['registered_arkansas_voter', 'eligible_not_registered']::text[]),
    ('chris-jones-for-congress', 'power_of_five_evangelist', 'Power of 5 evangelist',
        'Recruit and coach circles of five; keep messaging tight and onboarding warm.',
        E'- Maintain active circles with clear asks\n- Run repeatable invite → train → act loops\n- Surface stories HQ can amplify',
        E'Log recruitment honestly; do not over-promise roles or perks.',
        E'Dotted line to organizing director; templates from digital team.',
        E'Leaderboards emphasize **sustained participation**, not one-night spikes.',
        2, ARRAY['registered_arkansas_voter', 'out_of_state_supporter']::text[]),
    ('chris-jones-for-congress', 'fundraising_hero', 'Fundraising hero',
        'Host house parties, call time, and small-dollar drives with compliance in mind.',
        E'- Hit personal and team raise plans\n- Follow finance-approved scripts and disclosures\n- Thank donors within 48 hours',
        E'All solicitations go through approved tools; escalate matching or employer-compliance questions.',
        E'Finance director + compliance buddy system.',
        E'Milestone badges for teams clearing weekly call-time goals.',
        3, ARRAY['registered_arkansas_voter', 'staff_admin_direct_placement']::text[]),
    ('chris-jones-for-congress', 'campaign_ambassador', 'Campaign ambassador',
        'Represent the campaign at community events, fairs, and partner meetings.',
        E'- Schedule visibility with captains\n- Carry accurate lit and QR codes\n- Capture interest with compliant sign-up flows',
        E'Never speak on behalf of the candidate without clearance for sensitive topics.',
        E'Comms + field share weekly talking points.',
        E'Ambassador pods compete on quality interactions (logged) vs raw swag handouts.',
        4, ARRAY['registered_arkansas_voter', 'under_18_youth']::text[]),
    ('chris-jones-for-congress', 'event_management', 'Event management',
        'Plan and execute rallies, town halls, and volunteer HQ nights.',
        E'- Safe venues, permits, run-of-show, volunteer roles\n- Rapid debrief with metrics\n- Zero surprises on AV or accessibility',
        E'Run budgets and vendors through HQ; document incidents immediately.',
        E'Ops lead + volunteer coordinator pair for each major event.',
        E'Event scorecard: attendance, signups, press hits, volunteer satisfaction.',
        5, ARRAY['staff_admin_direct_placement', 'registered_arkansas_voter']::text[])
ON CONFLICT (campaign_slug, lane_key) DO NOTHING;

-- First actions per lane (examples)
INSERT INTO public.volunteer_first_actions (lane_id, action_key, title, body_md, cta_url, sort_order)
SELECT l.id, 'meet_captain', 'Meet your county captain',
    E'Schedule a 15-minute intro this week; bring your availability and one idea for your turf.', 'https://chrisjonesforcongress.com/volunteer/', 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'voter_registration_county_captain'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_first_actions a WHERE a.lane_id = l.id AND a.action_key = 'meet_captain');

INSERT INTO public.volunteer_first_actions (lane_id, action_key, title, body_md, cta_url, sort_order)
SELECT l.id, 'inventory_kits', 'Inventory registration kits',
    E'Confirm you have forms, clipboards, and training links before your first shift.', NULL, 2
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'voter_registration_county_captain'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_first_actions a WHERE a.lane_id = l.id AND a.action_key = 'inventory_kits');

INSERT INTO public.volunteer_first_actions (lane_id, action_key, title, body_md, cta_url, sort_order)
SELECT l.id, 'draft_circle_list', 'Draft your first five names',
    E'List five people you will personally invite this week; note follow-up dates.', NULL, 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'power_of_five_evangelist'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_first_actions a WHERE a.lane_id = l.id AND a.action_key = 'draft_circle_list');

INSERT INTO public.volunteer_first_actions (lane_id, action_key, title, body_md, cta_url, sort_order)
SELECT l.id, 'finance_training', 'Complete finance volunteer training',
    E'Finish the compliance module before hosting your first ask.', 'https://chrisjonesforcongress.com/donate/', 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'fundraising_hero'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_first_actions a WHERE a.lane_id = l.id AND a.action_key = 'finance_training');

INSERT INTO public.volunteer_first_actions (lane_id, action_key, title, body_md, cta_url, sort_order)
SELECT l.id, 'pick_event_window', 'Pick two visibility windows',
    E'Choose dates you can table or attend community events; log them in the volunteer portal.', NULL, 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'campaign_ambassador'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_first_actions a WHERE a.lane_id = l.id AND a.action_key = 'pick_event_window');

INSERT INTO public.volunteer_first_actions (lane_id, action_key, title, body_md, cta_url, sort_order)
SELECT l.id, 'run_of_show_template', 'Clone the run-of-show template',
    E'Duplicate the HQ template for your next event and fill in roles.', NULL, 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'event_management'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_first_actions a WHERE a.lane_id = l.id AND a.action_key = 'run_of_show_template');

-- Specialties (examples)
INSERT INTO public.volunteer_lane_specialties (lane_id, specialty_key, label, body_md, sort_order)
SELECT l.id, 'deputy_registrars', 'Deputy registrar coordination',
    E'Partner with training leads to certify deputies before high-traffic weekends.', 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'voter_registration_county_captain'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_lane_specialties x WHERE x.lane_id = l.id AND x.specialty_key = 'deputy_registrars');

INSERT INTO public.volunteer_lane_specialties (lane_id, specialty_key, label, body_md, sort_order)
SELECT l.id, 'digital_recruit', 'Digital recruitment funnels',
    E'Pair in-person circles with SMS and email follow-up using approved tools.', 1
FROM public.volunteer_lanes l
WHERE l.campaign_slug = 'chris-jones-for-congress' AND l.lane_key = 'power_of_five_evangelist'
  AND NOT EXISTS (SELECT 1 FROM public.volunteer_lane_specialties x WHERE x.lane_id = l.id AND x.specialty_key = 'digital_recruit');

-- Prompts (sample reflection chips for welcome section)
INSERT INTO public.campaign_onboarding_prompts (section_id, prompt_text, sort_order)
SELECT s.id, 'What local issue makes this race personal for you?', 1
FROM public.campaign_onboarding_sections s
JOIN public.campaign_onboarding_modules m ON m.id = s.module_id
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'welcome_purpose' AND s.section_key = 'why_youre_here'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_prompts p WHERE p.section_id = s.id AND p.prompt_text LIKE 'What local issue%');

INSERT INTO public.campaign_onboarding_prompts (section_id, prompt_text, sort_order)
SELECT s.id, 'Which lane fits your calendar for the next month?', 1
FROM public.campaign_onboarding_sections s
JOIN public.campaign_onboarding_modules m ON m.id = s.module_id
WHERE m.campaign_slug = 'chris-jones-for-congress' AND m.module_key = 'pick_your_lane' AND s.section_key = 'lanes_overview'
  AND NOT EXISTS (SELECT 1 FROM public.campaign_onboarding_prompts p WHERE p.section_id = s.id AND p.prompt_text LIKE 'Which lane fits%');
