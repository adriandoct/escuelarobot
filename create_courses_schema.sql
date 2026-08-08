-- ==========================================
-- IA MAKE - Esquema para Creador de Cursos (Estilo Udemy)
-- ==========================================

-- 1. TABLAS PRINCIPALES
-- ==========================================

-- Tabla de Cursos (Cabecera)
CREATE TABLE IF NOT EXISTS public.cursos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_intro_url TEXT,
    thumbnail_url TEXT,
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado')),
    nivel VARCHAR(50) DEFAULT 'Todos los niveles',
    sensei_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Secciones (Módulos del curso)
CREATE TABLE IF NOT EXISTS public.curso_secciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Lecciones (Temas dentro de una sección)
CREATE TABLE IF NOT EXISTS public.curso_lecciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seccion_id UUID REFERENCES public.curso_secciones(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_url TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Recursos (Archivos adjuntos a una lección)
CREATE TABLE IF NOT EXISTS public.curso_recursos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leccion_id UUID REFERENCES public.curso_lecciones(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    archivo_url TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'enlace' CHECK (tipo IN ('pdf', 'video', 'enlace', 'codigo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. SEGURIDAD (RLS - Row Level Security)
-- ==========================================

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_lecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_recursos ENABLE ROW LEVEL SECURITY;

-- Políticas para cursos
DROP POLICY IF EXISTS "Lectura de cursos" ON public.cursos;
CREATE POLICY "Lectura de cursos" ON public.cursos FOR SELECT USING (
    estado = 'publicado' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('sensei', 'sempai', 'tutor', 'admin'))
);

DROP POLICY IF EXISTS "Gestión de cursos para Senseis" ON public.cursos;
CREATE POLICY "Gestión de cursos para Senseis" ON public.cursos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('sensei', 'admin'))
);

-- Políticas para secciones
DROP POLICY IF EXISTS "Lectura de secciones" ON public.curso_secciones;
CREATE POLICY "Lectura de secciones" ON public.curso_secciones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de secciones para Senseis" ON public.curso_secciones;
CREATE POLICY "Gestión de secciones para Senseis" ON public.curso_secciones FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('sensei', 'admin'))
);

-- Políticas para lecciones
DROP POLICY IF EXISTS "Lectura de lecciones" ON public.curso_lecciones;
CREATE POLICY "Lectura de lecciones" ON public.curso_lecciones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de lecciones para Senseis" ON public.curso_lecciones;
CREATE POLICY "Gestión de lecciones para Senseis" ON public.curso_lecciones FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('sensei', 'admin'))
);

-- Políticas para recursos
DROP POLICY IF EXISTS "Lectura de recursos" ON public.curso_recursos;
CREATE POLICY "Lectura de recursos" ON public.curso_recursos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de recursos para Senseis" ON public.curso_recursos;
CREATE POLICY "Gestión de recursos para Senseis" ON public.curso_recursos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('sensei', 'admin'))
);


-- ==========================================
-- 3. TRIGGERS Y FUNCIONES
-- ==========================================
-- Reutilizamos la función update_updated_at_column si ya existe
DROP TRIGGER IF EXISTS update_cursos_updated_at ON public.cursos;
CREATE TRIGGER update_cursos_updated_at BEFORE UPDATE ON public.cursos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ==========================================
-- 4. BUCKET DE STORAGE PARA RECURSOS
-- ==========================================
-- Crear el bucket 'cursos_recursos' si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cursos_recursos', 'cursos_recursos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS de Storage para lectura pública
DROP POLICY IF EXISTS "Acceso público recursos cursos" ON storage.objects;
CREATE POLICY "Acceso público recursos cursos" ON storage.objects
    FOR SELECT USING (bucket_id = 'cursos_recursos');

-- Políticas de RLS de Storage para subida de recursos (Senseis)
DROP POLICY IF EXISTS "Subida de recursos cursos para Senseis" ON storage.objects;
CREATE POLICY "Subida de recursos cursos para Senseis" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'cursos_recursos' 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('sensei', 'admin')
        )
    );
