-- Volunteer profile photo: public URL on profile + Supabase Storage bucket.

ALTER TABLE public.campaign_profiles
    ADD COLUMN IF NOT EXISTS profile_photo_url text;

COMMENT ON COLUMN public.campaign_profiles.profile_photo_url IS
    'Optional public URL (e.g. Supabase Storage) for the volunteer avatar on the dashboard.';

-- Bucket: objects at {auth.uid()}/{uuid}.{ext}; public read for simple img src.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-photos',
    'profile-photos',
    true,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "profile_photos_select_public" ON storage.objects;
CREATE POLICY "profile_photos_select_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "profile_photos_insert_own" ON storage.objects;
CREATE POLICY "profile_photos_insert_own"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

DROP POLICY IF EXISTS "profile_photos_update_own" ON storage.objects;
CREATE POLICY "profile_photos_update_own"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

DROP POLICY IF EXISTS "profile_photos_delete_own" ON storage.objects;
CREATE POLICY "profile_photos_delete_own"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );
