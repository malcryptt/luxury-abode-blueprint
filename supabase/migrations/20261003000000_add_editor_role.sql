-- The 'editor' value must be committed before anything can use it, so it lives in its own migration.
alter type public.app_role add value if not exists 'editor';
