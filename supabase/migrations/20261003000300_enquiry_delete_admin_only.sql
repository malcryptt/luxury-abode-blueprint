-- Only admins may delete enquiries (editors can read and update them), matching the admin screen.
drop policy if exists "Staff delete enquiries" on public.enquiries;
drop policy if exists "Admins delete enquiries" on public.enquiries;
create policy "Admins delete enquiries" on public.enquiries for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
