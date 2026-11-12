CREATE POLICY "media_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "media_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'site-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "media_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'site-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "media_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));