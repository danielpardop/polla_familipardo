grant select, insert, update, delete on public.user_roles to authenticated;

drop policy if exists "user_roles_insert_admin" on public.user_roles;
drop policy if exists "user_roles_update_admin" on public.user_roles;
drop policy if exists "user_roles_delete_admin" on public.user_roles;

create policy "user_roles_insert_admin"
on public.user_roles
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_update_admin"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_delete_admin"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

notify pgrst, 'reload schema';
