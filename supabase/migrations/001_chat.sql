-- Supabase Chat Schema and Policies
-- Run these statements in your Supabase SQL editor or via CLI migrations

-- Extensions
create extension if not exists pgcrypto;

-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Allow authenticated users to read profiles
create policy if not exists "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Allow users to insert their own profile
create policy if not exists "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Allow users to update their own profile
create policy if not exists "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;

-- Only participants can select a conversation
create policy if not exists "conversations_select_participants"
  on public.conversations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.conversation_id = conversations.id
        and p.user_id = auth.uid()
    )
  );

-- Creator can insert a new conversation
create policy if not exists "conversations_insert_creator"
  on public.conversations
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- Participants table
create table if not exists public.participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

alter table public.participants enable row level security;

-- Only users who are part of a conversation can see its participants
create policy if not exists "participants_select_in_conversation"
  on public.participants
  for select
  to authenticated
  using (
    exists (
      select 1 from public.participants self
      where self.conversation_id = participants.conversation_id
        and self.user_id = auth.uid()
    )
  );

-- The creator of a conversation can add participants (including others)
create policy if not exists "participants_insert_by_conversation_creator"
  on public.participants
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = participants.conversation_id
        and c.created_by = auth.uid()
    )
  );

-- Users can insert themselves into a conversation they are already part of (idempotency)
create policy if not exists "participants_insert_self_if_member"
  on public.participants
  for insert
  to authenticated
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.participants p
      where p.conversation_id = participants.conversation_id
        and p.user_id = auth.uid()
    )
  );

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  type text not null default 'text' check (type in ('text','file')),
  body text,
  attachment_path text,
  mime_type text,
  size int,
  created_at timestamptz default now(),
  edited_at timestamptz
);

create index if not exists idx_messages_conversation_id_created_at
  on public.messages(conversation_id, created_at);

alter table public.messages enable row level security;

-- Only participants can read messages
create policy if not exists "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.conversation_id = messages.conversation_id
        and p.user_id = auth.uid()
    )
  );

-- Only participants can send messages, and they must be the sender
create policy if not exists "messages_insert_sender_is_participant"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.participants p
      where p.conversation_id = messages.conversation_id
        and p.user_id = auth.uid()
    )
  );

-- Storage policies for attachments bucket
-- Create a private bucket named "attachments" in the dashboard before applying policies
-- Objects are stored under path: <conversation_id>/<file_name>
-- Policy: allow read/write only to authenticated users who are participants of the conversation parsed from the object path

-- READ policy
create policy if not exists "attachments_read_participants"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.participants p
      where p.user_id = auth.uid()
        and p.conversation_id::text = split_part(name, '/', 1)
    )
  );

-- INSERT/UPLOAD policy
create policy if not exists "attachments_insert_participants"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.participants p
      where p.user_id = auth.uid()
        and p.conversation_id::text = split_part(name, '/', 1)
    )
  );

-- Optional: DELETE policy (only allow the sender to delete their own uploads)
create policy if not exists "attachments_delete_sender_or_creator"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from public.messages m
      where m.attachment_path = name
        and m.sender_id = auth.uid()
    )
  );
