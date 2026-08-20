create index if not exists semed_user_module_roles_managed_by_idx on public.semed_user_module_roles(managed_by) where managed_by is not null;
