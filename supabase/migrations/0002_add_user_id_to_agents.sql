-- Add user_id column to agents and policy scaffold
alter table agents add column if not exists user_id uuid;
create index if not exists agents_user_id_idx on agents(user_id);

-- RLS policy: only owner can select/modify (will fail if duplicates exist without auth context)
create policy "Agents owner select" on agents for select using ( auth.uid() = user_id );
create policy "Agents owner insert" on agents for insert with check ( auth.uid() = user_id );
create policy "Agents owner update" on agents for update using ( auth.uid() = user_id );
create policy "Agents owner delete" on agents for delete using ( auth.uid() = user_id );
