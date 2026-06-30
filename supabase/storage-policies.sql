-- Политики доступа к бакету receipts (выполнить в Supabase SQL Editor).
-- Пересоздаём начисто и разрешаем всем ролям (public) — доступ к самим
-- поездкам всё равно ограничен неугадываемым UUID в ссылке.

drop policy if exists "anon read receipts"     on storage.objects;
drop policy if exists "anon upload receipts"   on storage.objects;
drop policy if exists "anon delete receipts"   on storage.objects;
drop policy if exists "receipts public read"   on storage.objects;
drop policy if exists "receipts public insert" on storage.objects;
drop policy if exists "receipts public update" on storage.objects;
drop policy if exists "receipts public delete" on storage.objects;

create policy "receipts public read"   on storage.objects for select using (bucket_id = 'receipts');
create policy "receipts public insert" on storage.objects for insert with check (bucket_id = 'receipts');
create policy "receipts public update" on storage.objects for update using (bucket_id = 'receipts') with check (bucket_id = 'receipts');
create policy "receipts public delete" on storage.objects for delete using (bucket_id = 'receipts');
