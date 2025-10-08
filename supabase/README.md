Supabase chat setup

1) Environment variables
- Copy .env.example to .env.local
- Fill these values from Supabase > Settings > API
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...

2) Apply database schema & policies
- Open Supabase Dashboard > SQL Editor
- Paste and run the file supabase/migrations/001_chat.sql
- This creates tables: profiles, conversations, participants, messages
- It also adds Row Level Security (RLS) policies and storage policies for the attachments bucket

3) Create storage bucket for attachments
- Go to Storage > Create new bucket
  Name: attachments
  Public: OFF (keep private)
- No further CORS changes are needed for the app; the client uses authenticated download/upload

4) Enable Realtime for messages
- Go to Database > Replication > (or Table editor > messages) and enable Realtime for the messages table
  Alternatively (if supported) run: ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

5) Profiles table auto-fill
- The app auto-upserts the current user's profile on first entry to the Messages page
- Other users must have registered and signed in at least once so their profile exists (or you can insert profiles manually)

6) Usage in the app
- Build and run the app (npm run dev) with .env.local configured
- Go to the Mesajlar page ("/messages")
- Enter recipient's email and start a conversation
- Send text or files (default size limits apply to your Storage configuration)

Notes
- Storage object path is conversation-scoped: <conversation_id>/<file_name>
- RLS for Storage allows only participants of that conversation to upload/download
- If uploads fail, check: bucket name (attachments), Storage policies, file size limits
