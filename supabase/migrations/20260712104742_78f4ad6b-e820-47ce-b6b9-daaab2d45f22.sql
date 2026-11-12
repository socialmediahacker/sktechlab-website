
DROP POLICY IF EXISTS "tickets own read" ON storage.objects;
CREATE POLICY "tickets own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "tickets own write" ON storage.objects;
CREATE POLICY "tickets own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "tickets own delete" ON storage.objects;
CREATE POLICY "tickets own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
