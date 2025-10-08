-- Migration: Arşiv tabloları oluştur
-- Bu script archived_todos ve archived_notes tablolarını oluşturur

-- ========== ARCHIVED_TODOS TABLOsu ==========
CREATE TABLE IF NOT EXISTS public.archived_todos (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    priority TEXT DEFAULT 'medium',
    datetime TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_metadata JSONB,
    recurrence JSONB,
    parent_id UUID,
    reminders JSONB
);

-- ========== ARCHIVED_NOTES TABLOsu ==========
CREATE TABLE IF NOT EXISTS public.archived_notes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========== İNDEXLER ==========
-- Performans için önemli indexler
CREATE INDEX IF NOT EXISTS idx_archived_todos_user_id ON public.archived_todos (user_id);
CREATE INDEX IF NOT EXISTS idx_archived_todos_archived_at ON public.archived_todos (archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_todos_user_archived ON public.archived_todos (user_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_archived_notes_user_id ON public.archived_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_archived_notes_archived_at ON public.archived_notes (archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_notes_user_archived ON public.archived_notes (user_id, archived_at);

-- Text arama için indexler
CREATE INDEX IF NOT EXISTS idx_archived_todos_text_search ON public.archived_todos USING gin(to_tsvector('turkish', text));
CREATE INDEX IF NOT EXISTS idx_archived_notes_text_search ON public.archived_notes USING gin(to_tsvector('turkish', text));

-- ========== RLS POLİTİKALARI ==========

-- ARCHIVED_TODOS için RLS
ALTER TABLE public.archived_todos ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi arşivlerini görebilir
CREATE POLICY "Users can view own archived todos"
ON public.archived_todos
FOR SELECT
TO public
USING (
    user_id = COALESCE(auth.uid()::text, 'guest')::uuid OR
    user_id::text = COALESCE(auth.uid()::text, 'guest')
);

-- Kullanıcılar kendi arşivlerine ekleme yapabilir
CREATE POLICY "Users can insert own archived todos"
ON public.archived_todos
FOR INSERT
TO public
WITH CHECK (
    user_id = COALESCE(auth.uid()::text, 'guest')::uuid OR
    user_id::text = COALESCE(auth.uid()::text, 'guest')
);

-- ARCHIVED_NOTES için RLS
ALTER TABLE public.archived_notes ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi arşivlerini görebilir
CREATE POLICY "Users can view own archived notes"
ON public.archived_notes
FOR SELECT
TO public
USING (
    user_id = COALESCE(auth.uid()::text, 'guest')::uuid OR
    user_id::text = COALESCE(auth.uid()::text, 'guest')
);

-- Kullanıcılar kendi arşivlerine ekleme yapabilir
CREATE POLICY "Users can insert own archived notes"
ON public.archived_notes
FOR INSERT
TO public
WITH CHECK (
    user_id = COALESCE(auth.uid()::text, 'guest')::uuid OR
    user_id::text = COALESCE(auth.uid()::text, 'guest')
);

-- ========== İZİNLER ==========
GRANT ALL ON public.archived_todos TO anon;
GRANT ALL ON public.archived_todos TO authenticated;
GRANT ALL ON public.archived_notes TO anon;
GRANT ALL ON public.archived_notes TO authenticated;

-- ========== YORUMLAR ==========
COMMENT ON TABLE public.archived_todos IS 'Arşivlenmiş görevler - tamamlanan veya silinen görevlerin geçmişi';
COMMENT ON TABLE public.archived_notes IS 'Arşivlenmiş notlar - silinen notların geçmişi';

COMMENT ON COLUMN public.archived_todos.archived_at IS 'Görevin arşivlendiği tarih ve saat';
COMMENT ON COLUMN public.archived_notes.archived_at IS 'Notun arşivlendiği tarih ve saat';

-- ========== TEST SORGUSU ==========
-- Tabloların oluşturulduğunu test etmek için
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archived_todos') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archived_notes') THEN
        RAISE NOTICE '✅ Arşiv tabloları başarıyla oluşturuldu!';
    ELSE
        RAISE NOTICE '❌ Arşiv tabloları oluşturulamadı!';
    END IF;
END $$;