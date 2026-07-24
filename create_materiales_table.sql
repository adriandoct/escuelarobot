-- ==========================================================
-- DOJOIA - Tabla de Materiales Didácticos y Bucket de Storage
-- ==========================================================

-- 1. Crear tabla de materiales por nivel
CREATE TABLE IF NOT EXISTS public.materiales_nivel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nivel belt_level NOT NULL UNIQUE,
    carta_descriptiva_url TEXT,
    manual_instructor_url TEXT,
    manual_participante_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.materiales_nivel ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para materiales_nivel
DROP POLICY IF EXISTS "Lectura pública de materiales" ON public.materiales_nivel;
CREATE POLICY "Lectura pública de materiales" ON public.materiales_nivel FOR SELECT USING (true);

DROP POLICY IF EXISTS "Docentes pueden gestionar materiales" ON public.materiales_nivel;
CREATE POLICY "Docentes pueden gestionar materiales" ON public.materiales_nivel FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('sensei', 'sempai')
    )
);

-- 2. Crear el bucket 'materiales' de Storage si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materiales', 'materiales', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS de Storage para el bucket 'materiales' (Abiertas para soportar subidas desde el bypass local)
DROP POLICY IF EXISTS "Acceso público de lectura de materiales" ON storage.objects;
CREATE POLICY "Acceso público de lectura de materiales" ON storage.objects
    FOR SELECT USING (bucket_id = 'materiales');

DROP POLICY IF EXISTS "Permitir subida a cualquiera en materiales" ON storage.objects;
CREATE POLICY "Permitir subida a cualquiera en materiales" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'materiales');

DROP POLICY IF EXISTS "Permitir actualización a cualquiera en materiales" ON storage.objects;
CREATE POLICY "Permitir actualización a cualquiera en materiales" ON storage.objects
    FOR UPDATE USING (bucket_id = 'materiales');

DROP POLICY IF EXISTS "Permitir borrar a cualquiera en materiales" ON storage.objects;
CREATE POLICY "Permitir borrar a cualquiera en materiales" ON storage.objects
    FOR DELETE USING (bucket_id = 'materiales');
