-- ==========================================
-- DOJOIA ACCESS - Esquema de Base de Datos para Dojo Shito-Ryu
-- ==========================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS (Tipos de datos de Karate)
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('sensei', 'sempai', 'tutor', 'karateka');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'belt_level') THEN
        CREATE TYPE belt_level AS ENUM (
          'blanco',        -- 10 Kyu y 9 Kyu
          'amarillo',      -- 8 Kyu
          'naranja',       -- 7 Kyu
          'verde',         -- 6 Kyu
          'azul',          -- 5 Kyu
          'marron',        -- 4 Kyu a 1 Kyu
          'negro'          -- 1 Dan en adelante
        );
    END IF;
END$$;

-- ==========================================
-- 2. TABLAS PRINCIPALES
-- ==========================================

-- TABLA DE VIDEOS (Entrenamiento e Inicio)
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'entrenamiento', -- 'inicio' (Página de Inicio), 'entrenamiento' (Portal del Alumno)
    instructor TEXT DEFAULT 'Sensei Carlos Martínez',
    nivel VARCHAR(30) DEFAULT 'Todos los niveles',
    duracion VARCHAR(10) DEFAULT '05:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para videos
DROP POLICY IF EXISTS "Lectura pública de videos" ON public.videos;
CREATE POLICY "Lectura pública de videos" ON public.videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar videos" ON public.videos;
CREATE POLICY "Senseis pueden gestionar videos" ON public.videos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- PERFILES DE USUARIOS DEL SISTEMA (Sensei, Sempai, etc.)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'tutor',
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REPOSITORIO DE KARATEKAS (Alumnos de la academia)
CREATE TABLE IF NOT EXISTS public.karatekas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    cinturon belt_level NOT NULL DEFAULT 'blanco',
    grado VARCHAR(30) NOT NULL DEFAULT '10° Kyu', -- e.g. "10° Kyu", "6° Kyu", "1° Dan"
    tutor TEXT NOT NULL,
    telefono VARCHAR(20) NOT NULL, -- Número de celular del tutor para enviar WhatsApp
    foto_url TEXT, -- Almacenamiento de fotografía
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REGISTRO DE ASISTENCIAS (Entradas y Salidas con QR)
CREATE TABLE IF NOT EXISTS public.asistencias_karate (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    karateka_id UUID REFERENCES public.karatekas(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    dispositivo TEXT, -- Información del dispositivo que escaneó
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_status TEXT DEFAULT 'pending', -- pending, sent, error, simulated
    whatsapp_error TEXT,
    escaneado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONFIGURACIÓN DEL DOJO Y WHATSAPP
CREATE TABLE IF NOT EXISTS public.configuracion_dojo (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dojo_name TEXT NOT NULL DEFAULT 'Dojo Dojoia Shito-Ryu',
    sensei_principal TEXT NOT NULL DEFAULT 'Sensei Carlos Martínez',
    estilo VARCHAR(50) NOT NULL DEFAULT 'Shito-Ryu',
    whatsapp_provider VARCHAR(20) NOT NULL DEFAULT 'mock', -- mock, meta, twilio
    whatsapp_token TEXT,
    whatsapp_phone_number_id TEXT,
    template_entrada TEXT NOT NULL DEFAULT '🥋 *{dojo_name}*\n\nHola *{tutor}*,\n\nLe informamos que el karateka:\n👦 *{nombre}* ({cinturon} - {grado})\n\n✅ *ENTRÓ* a entrenar.\n\n🕒 Hora: {hora}\n📅 Fecha: {fecha}\n\n🥋 ¡Oss!',
    template_salida TEXT NOT NULL DEFAULT '🥋 *{dojo_name}*\n\nHola *{tutor}*,\n\nLe informamos que el karateka:\n👦 *{nombre}* ({cinturon} - {grado})\n\n✅ *SALIÓ* del Dojo.\n\n🕒 Hora: {hora}\n📅 Fecha: {fecha}\n\n🥋 ¡Oss!',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROGRAMA TÉCNICO Y CLASES (Opcional - Estructura Dojo)
CREATE TABLE IF NOT EXISTS public.horarios_clases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_clase TEXT NOT NULL, -- e.g. "Infantil Principiantes", "Avanzados Kata", "Kumite Adultos"
    dia_semana VARCHAR(15) NOT NULL, -- e.g. "Lunes", "Martes"
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    sensei_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. TRIGGERS Y FUNCIONES DE SEGURIDAD
-- ==========================================

-- Trigger para auto-actualizar timestamp 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_karatekas_updated_at ON public.karatekas;
CREATE TRIGGER update_karatekas_updated_at BEFORE UPDATE ON public.karatekas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracion_dojo_updated_at ON public.configuracion_dojo;
CREATE TRIGGER update_configuracion_dojo_updated_at BEFORE UPDATE ON public.configuracion_dojo FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Función para insertar perfil automático al crear cuenta en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sensei Invitado'),
    NEW.email,
    'sensei'::user_role
  );
  RETURN NEW;
END;
$$;

-- Vincular trigger a auth.users (si ya existía, lo actualiza)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 4. SEGURIDAD (RLS - Row Level Security)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karatekas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias_karate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_dojo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_clases ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Permitir lectura general de perfiles" ON public.profiles;
CREATE POLICY "Permitir lectura general de perfiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualizar propio perfil" ON public.profiles;
CREATE POLICY "Permitir actualizar propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Senseis y Sempais pueden gestionar karatekas" ON public.karatekas;
CREATE POLICY "Senseis y Sempais pueden gestionar karatekas" ON public.karatekas 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('sensei', 'sempai')
        )
    );

DROP POLICY IF EXISTS "Lectura pública de karatekas" ON public.karatekas;
CREATE POLICY "Lectura pública de karatekas" ON public.karatekas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura y escritura general de asistencias" ON public.asistencias_karate;
CREATE POLICY "Lectura y escritura general de asistencias" ON public.asistencias_karate FOR ALL USING (true);

DROP POLICY IF EXISTS "Lectura pública de configuración dojo" ON public.configuracion_dojo;
CREATE POLICY "Lectura pública de configuración dojo" ON public.configuracion_dojo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo Sensei puede modificar configuración" ON public.configuracion_dojo;
CREATE POLICY "Solo Sensei puede modificar configuración" ON public.configuracion_dojo FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

DROP POLICY IF EXISTS "Lectura de clases para todos" ON public.horarios_clases;
CREATE POLICY "Lectura de clases para todos" ON public.horarios_clases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de clases para Sensei" ON public.horarios_clases;
CREATE POLICY "Gestión de clases para Sensei" ON public.horarios_clases FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- ==========================================
-- 5. SEMILLA DE DATOS (Configuración y Demo Inicial)
-- ==========================================
INSERT INTO public.configuracion_dojo (dojo_name, sensei_principal, estilo) 
VALUES ('Dojo Dojoia Shito-Ryu', 'Sensei Carlos Martínez', 'Shito-Ryu')
ON CONFLICT DO NOTHING;

-- Insertar Karatekas de Prueba
INSERT INTO public.karatekas (matricula, nombre, cinturon, grado, tutor, telefono, foto_url) VALUES
('KA-2026-001', 'Mateo García López', 'verde', '6° Kyu', 'Adriana López', '+5215512345678', 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200'),
('KA-2026-002', 'Sofía Martínez Ruiz', 'amarillo', '8° Kyu', 'Carlos Martínez', '+5215587654321', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
('KA-2026-003', 'Diego Fernández Silva', 'negro', '1° Dan', 'Juan Fernández', '+5215545678901', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
('KA-2026-004', 'Valentina Ruiz Castro', 'azul', '5° Kyu', 'Patricia Castro', '+5215598765432', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200'),
('KA-2026-005', 'Lucas Torres Mendoza', 'marron', '2° Kyu', 'Fernando Torres', '+5215565432109', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200')
ON CONFLICT (matricula) DO NOTHING;


-- ==========================================
-- 6. TABLAS ADICIONALES PARA ACADEMIA DIGITAL
-- ==========================================

-- Tabla de Categorías de Videos
CREATE TABLE IF NOT EXISTS public.video_categorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar relación de categoría a la tabla de videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.video_categorias(id) ON DELETE SET NULL;

-- Agregar columna de puntos a los Karatekas para el Ranking de Alumnos
ALTER TABLE public.karatekas ADD COLUMN IF NOT EXISTS puntos INTEGER DEFAULT 100;

-- Tabla de Solicitudes de Examen y Evidencia en Video
CREATE TABLE IF NOT EXISTS public.examenes_solicitudes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    karateka_id UUID REFERENCES public.karatekas(id) ON DELETE CASCADE NOT NULL,
    cinturon_solicitado belt_level NOT NULL,
    grado_solicitado VARCHAR(30) NOT NULL,
    video_evidencia_url TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    comentarios_sensei TEXT,
    calificacion NUMERIC,
    fecha_evaluacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Certificados Oficiales
CREATE TABLE IF NOT EXISTS public.certificados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.examenes_solicitudes(id) ON DELETE CASCADE,
    karateka_id UUID REFERENCES public.karatekas(id) ON DELETE CASCADE NOT NULL,
    codigo_certificado VARCHAR(50) UNIQUE NOT NULL,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Columnas premium en configuracion_dojo
ALTER TABLE public.configuracion_dojo ADD COLUMN IF NOT EXISTS kata_semana TEXT DEFAULT 'Pinan Shodan';
ALTER TABLE public.configuracion_dojo ADD COLUMN IF NOT EXISTS video_semana_id UUID REFERENCES public.videos(id) ON DELETE SET NULL;
ALTER TABLE public.configuracion_dojo ADD COLUMN IF NOT EXISTS recordatorio_sabado TEXT DEFAULT '🥋 *Entrenamiento Especial de Sábado*\n\nHola *{tutor}*,\n\nTe recordamos que este sábado tenemos clase presencial en el dojo.\n\n📖 *Kata de la semana:* {kata_semana}\n🎥 *Video de estudio:* {video_url}\n\nPor favor, asegúrate de que *{nombre}* repase el video técnico antes del sábado para aprovechar al máximo la clase práctica. ¡Oss!';

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.video_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examenes_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para video_categorias
DROP POLICY IF EXISTS "Lectura pública de categorias" ON public.video_categorias;
CREATE POLICY "Lectura pública de categorias" ON public.video_categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar categorias" ON public.video_categorias;
CREATE POLICY "Senseis pueden gestionar categorias" ON public.video_categorias FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Políticas de RLS para examenes_solicitudes
DROP POLICY IF EXISTS "Lectura general de solicitudes" ON public.examenes_solicitudes;
CREATE POLICY "Lectura general de solicitudes" ON public.examenes_solicitudes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Karatekas pueden insertar sus solicitudes" ON public.examenes_solicitudes;
CREATE POLICY "Karatekas pueden insertar sus solicitudes" ON public.examenes_solicitudes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Karatekas pueden actualizar sus solicitudes" ON public.examenes_solicitudes;
CREATE POLICY "Karatekas pueden actualizar sus solicitudes" ON public.examenes_solicitudes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar todas las solicitudes" ON public.examenes_solicitudes;
CREATE POLICY "Senseis pueden gestionar todas las solicitudes" ON public.examenes_solicitudes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Políticas de RLS para certificados
DROP POLICY IF EXISTS "Lectura pública de certificados" ON public.certificados;
CREATE POLICY "Lectura pública de certificados" ON public.certificados FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar certificados" ON public.certificados;
CREATE POLICY "Senseis pueden gestionar certificados" ON public.certificados FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Seed Categories
INSERT INTO public.video_categorias (id, nombre, descripcion) VALUES
('1a1a1a1a-1111-1111-1111-111111111111', 'Katas', 'Formas y secuencias de movimientos técnicos del estilo Shito-Ryu'),
('2b2b2b2b-2222-2222-2222-222222222222', 'Kihon', 'Técnicas fundamentales de golpes, bloqueos y posiciones básicas'),
('3c3c3c3c-3333-3333-3333-333333333333', 'Kumite', 'Combate deportivo y aplicación táctica de defensa personal'),
('4d4d4d4d-4444-4444-4444-444444444444', 'Bunkai', 'Análisis práctico y explicaciones del significado de los katas'),
('5e5e5e5e-5555-5555-5555-555555555555', 'Acondicionamiento', 'Ejercicios de fortalecimiento físico, elasticidad y velocidad')
ON CONFLICT (nombre) DO NOTHING;


-- ==========================================
-- 7. CONFIGURACIÓN DE STORAGE (Botes de Almacenamiento)
-- ==========================================

-- Crear el bucket 'videos' si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS de Storage para lectura pública de videos
DROP POLICY IF EXISTS "Acceso público de lectura de videos" ON storage.objects;
CREATE POLICY "Acceso público de lectura de videos" ON storage.objects
    FOR SELECT USING (bucket_id = 'videos');

-- Políticas de RLS de Storage para subida de videos (Senseis)
DROP POLICY IF EXISTS "Permitir subida a senseis" ON storage.objects;
CREATE POLICY "Permitir subida a senseis" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'videos' 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'sensei'
        )
    );

