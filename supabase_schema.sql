-- ==========================================
-- DOJOIA - Esquema de Base de Datos para Supabase
-- ==========================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS (Tipos de datos personalizados)
-- ==========================================
CREATE TYPE user_role AS ENUM ('admin', 'school_admin', 'teacher', 'parent', 'student');
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'plus', 'school', 'premium');
CREATE TYPE belt_level AS ENUM ('white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black');
CREATE TYPE mission_type AS ENUM ('daily', 'weekly', 'monthly', 'special');
CREATE TYPE mission_status AS ENUM ('pending', 'in_progress', 'completed');

-- ==========================================
-- 2. TABLAS PRINCIPALES
-- ==========================================

-- PERFILES (Extensión de auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'parent',
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ESCUELAS (Para clientes B2B)
CREATE TABLE public.schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    subscription_status subscription_tier DEFAULT 'school',
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RELACIÓN ESCUELA-USUARIO (Para maestros y admins de escuela)
CREATE TABLE public.school_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL CHECK (role IN ('school_admin', 'teacher')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(school_id, user_id)
);

-- ESTUDIANTES (Perfil específico del alumno con gamificación)
CREATE TABLE public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Si el alumno tiene su propio login
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Padre responsable
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL, -- Null si es usuario B2C (familia)
    username TEXT UNIQUE NOT NULL,
    dojocoins INTEGER DEFAULT 0,
    current_belt belt_level DEFAULT 'white',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MÓDULOS EDUCATIVOS (Math, English, Code, etc.)
CREATE TABLE public.modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color_hex TEXT,
    icon_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROGRESO POR MÓDULO (El avance de un alumno en una materia específica)
CREATE TABLE public.student_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    belt belt_level DEFAULT 'white',
    score INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, module_id)
);

-- MISIONES (Catálogo de retos)
CREATE TABLE public.missions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type mission_type DEFAULT 'daily',
    points_reward INTEGER NOT NULL DEFAULT 10,
    dojocoin_reward INTEGER NOT NULL DEFAULT 5,
    required_belt belt_level DEFAULT 'white',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MISIONES DEL ESTUDIANTE (Tracking de misiones asignadas y completadas)
CREATE TABLE public.student_missions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
    status mission_status DEFAULT 'pending',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, mission_id, assigned_at)
);

-- INTERACCIONES AI COACH (Historial de tutoría)
CREATE TABLE public.ai_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
    topic TEXT,
    student_prompt TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    sentiment_score NUMERIC, -- Para analizar frustración o alegría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PAGOS Y SUSCRIPCIONES B2C (Padres)
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    tier subscription_tier DEFAULT 'free',
    status TEXT NOT NULL, -- active, past_due, canceled
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. TRIGGERS Y FUNCIONES
-- ==========================================

-- Función para actualizar el timestamp 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger de update_updated_at a las tablas principales
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Función para crear automáticamente un perfil cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Dojoia'),
    NEW.email,
    'parent'::user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 4. SEGURIDAD (Row Level Security - RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Ejemplos iniciales)

-- PROFILES: Un usuario puede leer y actualizar su propio perfil
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- STUDENTS: Padres pueden ver a sus propios hijos
CREATE POLICY "Parents can view their children" ON public.students FOR SELECT USING (
    auth.uid() = parent_id OR auth.uid() = user_id
);

-- STUDENTS: Maestros pueden ver a los estudiantes de su escuela
CREATE POLICY "Teachers can view students in their school" ON public.students FOR SELECT USING (
    school_id IN (SELECT school_id FROM public.school_members WHERE user_id = auth.uid())
);

-- MODULES: Son públicos para lectura
CREATE POLICY "Modules are viewable by everyone" ON public.modules FOR SELECT USING (true);

-- ==========================================
-- 5. DATOS SEMILLA (Opcional - Insertar módulos por defecto)
-- ==========================================
INSERT INTO public.modules (name, slug, description, color_hex, icon_name) VALUES
('DOJO ENGLISH', 'dojo-english', 'Inglés práctico con speaking IA.', '#00F0FF', 'message-square'),
('DOJO CODE', 'dojo-code', 'Programación desde Scratch hasta Python.', '#10B981', 'code'),
('DOJO ROBOTICS', 'dojo-robotics', 'Robótica con simuladores y kits.', '#FFB800', 'cpu'),
('DOJO KARATE', 'dojo-karate', 'Valores, disciplina y defensa personal.', '#FF3366', 'gamepad')
ON CONFLICT (slug) DO NOTHING;

-- Eliminar módulos antiguos si ya existían en la base de datos
DELETE FROM public.modules
WHERE slug IN ('dojo-math', 'dojo-read', 'dojo-write');
