-- New contact details and the WSL Realty name, applied to content already stored in the database.
-- The site merges database content over its built-in defaults, so without this the live site
-- would keep showing the old phone number and email even after the code is updated.
-- Safe to run more than once.

-- 1. Contact details (address is left as it is)
insert into public.website_content (section, content)
values (
  'contact',
  jsonb_build_object(
    'phone', '08028081047',
    'email', 'Warosynergylimited@gmail.com',
    'address', 'Abuja, Nigeria',
    'whatsapp', '2348028081047'
  )
)
on conflict (section) do update
set content = case
  when jsonb_typeof(public.website_content.content) = 'object'
    then public.website_content.content || jsonb_build_object(
      'phone', '08028081047',
      'email', 'Warosynergylimited@gmail.com',
      'whatsapp', '2348028081047'
    )
  else excluded.content
end;

-- 2. Brand name in saved page text
update public.website_content
set content = replace(content::text, 'WSL Properties', 'WSL Realty')::jsonb
where content::text like '%WSL Properties%';

-- 3. Brand name in listing and update text
update public.properties set title = replace(title, 'WSL Properties', 'WSL Realty'), description = replace(description, 'WSL Properties', 'WSL Realty')
where title like '%WSL Properties%' or description like '%WSL Properties%';

update public.furniture set title = replace(title, 'WSL Properties', 'WSL Realty'), description = replace(description, 'WSL Properties', 'WSL Realty')
where title like '%WSL Properties%' or description like '%WSL Properties%';

update public.projects set summary = replace(summary, 'WSL Properties', 'WSL Realty')
where summary like '%WSL Properties%';

update public.project_updates set title = replace(title, 'WSL Properties', 'WSL Realty'), body = replace(body, 'WSL Properties', 'WSL Realty')
where title like '%WSL Properties%' or body like '%WSL Properties%';

update public.project_stages set note = replace(note, 'WSL Properties', 'WSL Realty')
where note like '%WSL Properties%';
