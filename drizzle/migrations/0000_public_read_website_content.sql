GRANT SELECT ON public.website_content TO anon;
CREATE POLICY "Public can view website content" ON public.website_content FOR SELECT TO anon USING (true);