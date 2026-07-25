-- ==========================================
-- IA MAKE - Esquema de Base de Datos para Supabase
-- ==========================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 0. LIMPIEZA DE TABLAS Y TIPOS ANTERIORES (Para evitar conflictos de enums)
-- ==========================================
DROP TABLE IF EXISTS public.certificados CASCADE;
DROP TABLE IF EXISTS public.examenes_solicitudes CASCADE;
DROP TABLE IF EXISTS public.horarios_clases CASCADE;
DROP TABLE IF EXISTS public.configuracion_dojo CASCADE;
DROP TABLE IF EXISTS public.asistencias_karate CASCADE;
DROP TABLE IF EXISTS public.karatekas CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.video_categorias CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS belt_level CASCADE;

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('sensei', 'sempai', 'tutor', 'karateka');
CREATE TYPE belt_level AS ENUM (
  'blanco',        -- Nivel 1: Scratch STEM
  'amarillo',      -- Nivel 2: Arduino Maker
  'naranja',       -- Nivel 3: ESP32 IoT
  'verde',         -- Nivel 4: Raspberry Pi
  'azul',          -- Nivel 5: Python Code
  'marron',        -- Nivel 6: AI & Machine Learning
  'negro'          -- Nivel 7: Competidor Master
);

-- ==========================================
-- 2. TABLAS DE LA BASE DE DATOS
-- ==========================================

-- PERFILES DE USUARIOS DEL SISTEMA (Maestros, Administradores, etc.)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'tutor',
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Categorías de Videos (Módulos Académicos)
CREATE TABLE public.video_categorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABLA DE VIDEOS (Cursos e Inicio)
CREATE TABLE public.videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'entrenamiento', -- 'inicio' (Página de Inicio), 'entrenamiento' (Portal del Alumno)
    instructor TEXT DEFAULT 'Mentor IA Make',
    nivel VARCHAR(30) DEFAULT 'Todos los niveles',
    duracion VARCHAR(10) DEFAULT '05:00',
    categoria_id UUID REFERENCES public.video_categorias(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REPOSITORIO DE ALUMNOS (Estudiantes de la academia)
CREATE TABLE public.karatekas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    cinturon belt_level NOT NULL DEFAULT 'blanco',
    grado VARCHAR(30) NOT NULL DEFAULT '10° Kyu', -- Mapped to Specialty e.g. "Scratch", "Arduino", "AI"
    tutor TEXT NOT NULL,
    telefono VARCHAR(20) NOT NULL, -- Número de celular del tutor para enviar WhatsApp
    foto_url TEXT, -- Almacenamiento de fotografía
    puntos INTEGER DEFAULT 100,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REGISTRO DE ASISTENCIAS (Entradas y Salidas con QR)
CREATE TABLE public.asistencias_karate (
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

-- CONFIGURACIÓN DE LA ACADEMIA Y WHATSAPP
CREATE TABLE public.configuracion_dojo (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dojo_name TEXT NOT NULL DEFAULT 'IA Make Academy',
    sensei_principal TEXT NOT NULL DEFAULT 'Director Maker',
    estilo VARCHAR(50) NOT NULL DEFAULT 'Robótica & IA',
    whatsapp_provider VARCHAR(20) NOT NULL DEFAULT 'mock', -- mock, meta, twilio
    whatsapp_token TEXT,
    whatsapp_phone_number_id TEXT,
    template_entrada TEXT NOT NULL DEFAULT '🤖 *{dojo_name}*\n\nHola *{tutor}*,\n\nLe informamos que el alumno:\n👦 *{nombre}* ({cinturon} - {grado})\n\n✅ *ENTRÓ* al Laboratorio de Robótica.\n\n🕒 Hora: {hora}\n📅 Fecha: {fecha}\n\n🤖 ¡A crear!',
    template_salida TEXT NOT NULL DEFAULT '🤖 *{dojo_name}*\n\nHola *{tutor}*,\n\nLe informamos que el alumno:\n👦 *{nombre}* ({cinturon} - {grado})\n\n✅ *SALIÓ* de la Academia.\n\n🕒 Hora: {hora}\n📅 Fecha: {fecha}\n\n🤖 ¡Nos vemos en el próximo proyecto!',
    kata_semana TEXT DEFAULT 'Arduino IoT',
    video_semana_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    recordatorio_sabado TEXT DEFAULT '🤖 *Taller Especial Maker*\n\nHola *{tutor}*,\n\nTe recordamos que este sábado tenemos sesión práctica de laboratorios en la academia.\n\n📖 *Proyecto de la semana:* {kata_semana}\n🎥 *Video de repaso:* {video_url}\n\nPor favor, asegúrate de que *{nombre}* estudie el video de preparación antes del sábado para aprovechar los componentes en clase. ¡A crear!',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HORARIOS DE TALLERES
CREATE TABLE public.horarios_clases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_clase TEXT NOT NULL, -- e.g. "Robótica Scratch", "Arduino Maker", "Python & AI"
    dia_semana VARCHAR(15) NOT NULL, -- e.g. "Lunes", "Martes"
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    sensei_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Solicitudes de Examen y Evidencia en Video (Evaluaciones de Proyectos)
CREATE TABLE public.examenes_solicitudes (
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
CREATE TABLE public.certificados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES public.examenes_solicitudes(id) ON DELETE CASCADE,
    karateka_id UUID REFERENCES public.karatekas(id) ON DELETE CASCADE NOT NULL,
    codigo_certificado VARCHAR(50) UNIQUE NOT NULL,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. HABILITAR SEGURIDAD (RLS - Row Level Security)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karatekas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias_karate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_dojo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examenes_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. POLÍTICAS DE RLS (Creadas con todas las tablas ya existentes)
-- ==========================================

-- Políticas para profiles
DROP POLICY IF EXISTS "Permitir lectura general de perfiles" ON public.profiles;
CREATE POLICY "Permitir lectura general de perfiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualizar propio perfil" ON public.profiles;
CREATE POLICY "Permitir actualizar propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para video_categorias
DROP POLICY IF EXISTS "Lectura pública de categorias" ON public.video_categorias;
CREATE POLICY "Lectura pública de categorias" ON public.video_categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar categorias" ON public.video_categorias;
CREATE POLICY "Senseis pueden gestionar categorias" ON public.video_categorias FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Políticas para videos
DROP POLICY IF EXISTS "Lectura pública de videos" ON public.videos;
CREATE POLICY "Lectura pública de videos" ON public.videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar videos" ON public.videos;
CREATE POLICY "Senseis pueden gestionar videos" ON public.videos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Políticas para karatekas
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

-- Políticas para asistencias_karate
DROP POLICY IF EXISTS "Lectura y escritura general de asistencias" ON public.asistencias_karate;
CREATE POLICY "Lectura y escritura general de asistencias" ON public.asistencias_karate FOR ALL USING (true);

-- Políticas para configuracion_dojo
DROP POLICY IF EXISTS "Lectura pública de configuración dojo" ON public.configuracion_dojo;
CREATE POLICY "Lectura pública de configuración dojo" ON public.configuracion_dojo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo Sensei puede modificar configuración" ON public.configuracion_dojo;
CREATE POLICY "Solo Sensei puede modificar configuración" ON public.configuracion_dojo FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Políticas para horarios_clases
DROP POLICY IF EXISTS "Lectura de clases para todos" ON public.horarios_clases;
CREATE POLICY "Lectura de clases para todos" ON public.horarios_clases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión de clases para Sensei" ON public.horarios_clases;
CREATE POLICY "Gestión de clases para Sensei" ON public.horarios_clases FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);

-- Políticas para examenes_solicitudes
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

-- Políticas para certificados
DROP POLICY IF EXISTS "Lectura pública de certificados" ON public.certificados;
CREATE POLICY "Lectura pública de certificados" ON public.certificados FOR SELECT USING (true);

DROP POLICY IF EXISTS "Senseis pueden gestionar certificados" ON public.certificados;
CREATE POLICY "Senseis pueden gestionar certificados" ON public.certificados FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sensei')
);


-- ==========================================
-- 5. TRIGGERS Y FUNCIONES DE SEGURIDAD
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
DECLARE
  v_role user_role;
  v_fullName TEXT;
  v_matricula VARCHAR(50);
  v_random_num INTEGER;
BEGIN
  -- 1. Determinar el rol
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'karateka')::user_role;
  v_fullName := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Alumno Nuevo');

  -- 2. Insertar en perfiles
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id, 
    v_fullName,
    NEW.email,
    v_role
  );

  -- 3. Si es alumno (karateka), insertar en la tabla de karatekas
  IF v_role = 'karateka' THEN
    -- Generar matrícula aleatoria
    v_random_num := floor(random() * 900 + 100)::integer;
    v_matricula := 'KA-2026-' || v_random_num;

    INSERT INTO public.karatekas (matricula, nombre, cinturon, grado, tutor, telefono, foto_url, activo)
    VALUES (
      v_matricula,
      v_fullName,
      'blanco',
      '10° Kyu',
      v_fullName || ' [credentials:' || NEW.email || ':123456]', -- Contraseña dummy de referencia
      '+5215500000000',
      'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200',
      true
    )
    ON CONFLICT (matricula) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Vincular trigger a auth.users (si ya existía, lo actualiza)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 6. SEMILLA DE DATOS (Configuración y Demo Inicial)
-- ==========================================

-- Seed Categories (Módulos Académicos)
INSERT INTO public.video_categorias (id, nombre, descripcion) VALUES
('1a1a1a1a-1111-1111-1111-111111111111', 'Módulo Académico', 'Cursos, lecciones y fundamentos STEM de robótica y algoritmos'),
('2b2b2b2b-2222-2222-2222-222222222222', 'Módulo Maker', 'Circuitos físicos, Arduino, ESP32, sensores e impresión 3D'),
('3c3c3c3c-3333-3333-3333-333333333333', 'Módulo IA', 'Machine Learning, redes neuronales, visión artificial y chatbots'),
('4d4d4d4d-4444-4444-4444-444444444444', 'Módulo Competencias', 'Torneos de robótica, ranking, insignias y desarrollo en equipo'),
('5e5e5e5e-5555-5555-5555-555555555555', 'Acondicionamiento', 'Habilidades blandas, diseño centrado en el usuario y metodologías ágiles')
ON CONFLICT (nombre) DO NOTHING;

-- Seed Videos de Demo
INSERT INTO public.videos (id, titulo, descripcion, url, tipo, instructor, nivel, duracion, categoria_id) VALUES
('11111111-1111-1111-1111-111111111111', 'Introducción a Scratch: Tu primer juego STEM', 'Aprende las bases de la programación por bloques creando un videojuego interactivo de forma lógica.', 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4', 'entrenamiento', 'Mentor IA Make', 'Principiantes', '05:12', '1a1a1a1a-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'Arduino Básico: Controlando un LED RGB', 'Bases de electrónica física. Aprende a conectar tu placa Arduino y cambiar los colores de un LED por código.', 'https://vjs.zencdn.net/v/oceans.mp4', 'entrenamiento', 'Mentor Maker', 'Intermedios', '07:45', '2b2b2b2b-2222-2222-2222-222222222222'),
('33333333-3333-3333-3333-333333333333', 'Visión Artificial con Python y OpenCV', 'Proyecto práctico de IA. Configura tu cámara para detectar objetos y caras en tiempo real usando scripts de Python.', 'https://www.w3schools.com/html/movie.mp4', 'entrenamiento', 'Científico de IA', 'Avanzados', '04:30', '3c3c3c3c-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- Seed Configuración Principal
INSERT INTO public.configuracion_dojo (id, dojo_name, sensei_principal, estilo, kata_semana, video_semana_id) 
VALUES ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0', 'IA Make Academy', 'Director Maker', 'Robótica & IA', 'Arduino IoT', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insertar Alumnos de Prueba (temática de Robótica)
INSERT INTO public.karatekas (id, matricula, nombre, cinturon, grado, tutor, telefono, foto_url, puntos) VALUES
('1e1e1e1e-1111-1111-1111-111111111111', 'KA-2026-001', 'Mateo García López', 'verde', 'Raspberry Pi', 'Adriana López', '+5215512345678', 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=200', 380),
('2f2f2f2f-2222-2222-2222-222222222222', 'KA-2026-002', 'Sofía Martínez Ruiz', 'amarillo', 'Arduino Maker', 'Carlos Martínez', '+5215587654321', 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=200', 210),
('3a3a3a3a-3333-3333-3333-333333333333', 'KA-2026-003', 'Diego Fernández Silva', 'negro', 'Competidor Master', 'Juan Fernández', '+5215545678901', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=200', 350),
('4b4b4b4b-4444-4444-4444-444444444444', 'KA-2026-004', 'Valentina Ruiz Castro', 'azul', 'Python Code', 'Patricia Castro', '+5215598765432', 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&q=80&w=200', 280),
('5c5c5c5c-5555-5555-5555-555555555555', 'KA-2026-005', 'Lucas Torres Mendoza', 'marron', 'AI & Machine Learning', 'Fernando Torres', '+5215565432109', 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=200', 160)
ON CONFLICT (matricula) DO NOTHING;


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

-- Sincronizar usuarios existentes en auth.users que sean alumnos (karateka) y no estén en karatekas
INSERT INTO public.karatekas (matricula, nombre, cinturon, grado, tutor, telefono, foto_url, activo)
SELECT 
  'KA-2026-' || (100 + floor(random() * 900)::integer)::varchar,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Alumno Registrado'),
  'blanco',
  '10° Kyu',
  COALESCE(u.raw_user_meta_data->>'full_name', 'Alumno Registrado') || ' [credentials:' || u.email || ':123456]',
  '+5215500000000',
  'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200',
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE (u.raw_user_meta_data->>'role') = 'karateka'
  AND NOT EXISTS (
    SELECT 1 FROM public.karatekas k 
    WHERE k.tutor LIKE '%' || u.email || '%'
  )
ON CONFLICT DO NOTHING;
