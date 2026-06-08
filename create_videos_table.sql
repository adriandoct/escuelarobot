-- ==========================================================
-- DOJOIA - Tabla de Videos, Categorías y Configuración de Storage
-- ==========================================================

-- 1. Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla de categorías si no existe
CREATE TABLE IF NOT EXISTS public.video_categorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para categorías
ALTER TABLE public.video_categorias ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para categorías (Abiertas para soportar el bypass de administrador local)
DROP POLICY IF EXISTS "Lectura pública de categorias" ON public.video_categorias;
CREATE POLICY "Lectura pública de categorias" ON public.video_categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar categorias" ON public.video_categorias;
CREATE POLICY "Senseis pueden gestionar categorias" ON public.video_categorias FOR ALL USING (true);

-- 3. Crear tabla de videos si no existe
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'entrenamiento', -- 'inicio' (Página de Inicio), 'entrenamiento' (Portal del Alumno)
    instructor TEXT DEFAULT 'Sensei Carlos Martínez',
    nivel VARCHAR(30) DEFAULT 'Todos los niveles',
    duracion VARCHAR(10) DEFAULT '05:00',
    thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que las columnas categoria_id y thumbnail existen en public.videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.video_categorias(id) ON DELETE SET NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- Habilitar Row Level Security (RLS) para videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para videos (Abiertas para soportar el bypass de administrador local)
DROP POLICY IF EXISTS "Lectura pública de videos" ON public.videos;
CREATE POLICY "Lectura pública de videos" ON public.videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar videos" ON public.videos;
CREATE POLICY "Senseis pueden gestionar videos" ON public.videos FOR ALL USING (true);

-- 4. Semilla de Categorías por Defecto
INSERT INTO public.video_categorias (id, nombre, descripcion) VALUES
('1a1a1a1a-1111-1111-1111-111111111111', 'Katas', 'Formas y secuencias de movimientos técnicos del estilo Shito-Ryu'),
('2b2b2b2b-2222-2222-2222-222222222222', 'Kihon', 'Técnicas fundamentales de golpes, bloqueos y posiciones básicas'),
('3c3c3c3c-3333-3333-3333-333333333333', 'Kumite', 'Combate deportivo y aplicación táctica de defensa personal'),
('4d4d4d4d-4444-4444-4444-444444444444', 'Bunkai', 'Análisis práctico y explicaciones del significado de los katas'),
('5e5e5e5e-5555-5555-5555-555555555555', 'Acondicionamiento', 'Ejercicios de fortalecimiento físico, elasticidad y velocidad')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Crear el bucket 'videos' de Storage si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de RLS de Storage para el bucket 'videos' (Abiertas para soportar subidas desde el bypass administrador local)
-- Permitir lectura pública de archivos en el bucket 'videos'
DROP POLICY IF EXISTS "Acceso público de lectura de videos" ON storage.objects;
CREATE POLICY "Acceso público de lectura de videos" ON storage.objects
    FOR SELECT USING (bucket_id = 'videos');

-- Permitir subida/inserción a cualquiera en el bucket 'videos'
DROP POLICY IF EXISTS "Permitir subida a senseis" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida a cualquiera" ON storage.objects;
CREATE POLICY "Permitir subida a cualquiera" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'videos');

-- Permitir actualización a cualquiera en el bucket 'videos'
DROP POLICY IF EXISTS "Permitir actualización a senseis" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización a cualquiera" ON storage.objects;
CREATE POLICY "Permitir actualización a cualquiera" ON storage.objects
    FOR UPDATE USING (bucket_id = 'videos');

-- Permitir eliminación a cualquiera en el bucket 'videos'
DROP POLICY IF EXISTS "Permitir borrar a senseis" ON storage.objects;
DROP POLICY IF EXISTS "Permitir borrar a cualquiera" ON storage.objects;
CREATE POLICY "Permitir borrar a cualquiera" ON storage.objects
    FOR DELETE USING (bucket_id = 'videos');


