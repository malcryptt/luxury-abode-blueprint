-- Per-stage progress (0-100) so the team can show how far each build stage has got.
alter table public.project_stages
  add column if not exists progress int not null default 0 check (progress between 0 and 100);

-- Stages before the current one are complete; the current one starts at 0 until the team updates it.
update public.project_stages s
set progress = 100
from public.projects p
where p.slug = s.project_slug and s.stage < p.current_stage and s.progress = 0;
