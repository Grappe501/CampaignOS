-- Demo mission tasks for local QA (optional — run manually after migrations).
-- Replace profile UUIDs with real campaign_profiles.id values from your project.
--
-- Example: enqueue mixed statuses for two volunteers
-- SELECT volunteer_enqueue_from_template('<profile-a>'::uuid, 'onboarding_first_action', NULL);
-- SELECT volunteer_enqueue_from_template('<profile-b>'::uuid, 'power5_identify_five', NULL);
--
-- Example: grant supervisor visibility (supervisor sees assignee via shared power5 team)
-- INSERT INTO volunteer_supervisor_teams (supervisor_profile_id, team_id)
-- VALUES ('<supervisor-profile>'::uuid, '<power5_team_id>'::uuid)
-- ON CONFLICT DO NOTHING;

SELECT 1;
