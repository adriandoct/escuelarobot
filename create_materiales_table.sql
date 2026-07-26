-- ==========================================================
-- ESCUELA ROBOT - Tabla de Materiales Didácticos y Bucket de Storage
-- Ejecuta este script COMPLETO en Supabase → SQL Editor → New Query → Run
-- ==========================================================

-- 1. Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar tabla anterior si existía (para recrearla limpiamente)
DROP TABLE IF EXISTS public.materiales_nivel CASCADE;

-- 3. Crear tabla de materiales usando TEXT para 'nivel' (más flexible que enum)
CREATE TABLE public.materiales_nivel (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nivel TEXT NOT NULL UNIQUE,  -- Valores: blanco, amarillo, naranja, verde, azul, marron, negro
    carta_descriptiva_url TEXT,
    manual_instructor_url TEXT,
    manual_participante_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar RLS
ALTER TABLE public.materiales_nivel ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS — abiertas para permitir lectura/escritura pública (bypass de autenticación cookie)
DROP POLICY IF EXISTS "Lectura pública de materiales" ON public.materiales_nivel;
CREATE POLICY "Lectura pública de materiales" ON public.materiales_nivel FOR SELECT USING (true);

DROP POLICY IF EXISTS "Docentes pueden gestionar materiales" ON public.materiales_nivel;
CREATE POLICY "Docentes pueden gestionar materiales" ON public.materiales_nivel FOR ALL USING (true);

-- 6. Crear el bucket 'materiales' de Storage si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materiales', 'materiales', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 7. Políticas de Storage para el bucket 'materiales'
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
