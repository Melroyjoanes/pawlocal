-- Allow authenticated users (admins) to see all providers regardless of status
CREATE POLICY "authenticated users can read all providers" ON providers
  FOR SELECT USING (auth.role() = 'authenticated');
