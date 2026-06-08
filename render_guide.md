# Guía de Despliegue en Render y Supabase - DOJOIA ACCESS

Esta guía detalla paso a paso cómo configurar la base de datos en Supabase y cómo desplegar la plataforma Next.js en Render.

---

## Parte 1: Configurar Supabase (Base de Datos)

1. **Crear Proyecto en Supabase**:
   - Inicia sesión en [Supabase](https://supabase.com/) y crea un nuevo proyecto.
   - Copia la contraseña de la base de datos y guárdala de forma segura.

2. **Ejecutar el Script SQL**:
   - Ve a la sección **SQL Editor** en el panel de control de Supabase.
   - Crea una nueva consulta (New Query).
   - Abre el archivo [supabase_karate_schema.sql](file:///c:/Users/Dell%20Latitude%20i7%208th/Documents/dojo-kia/dojonew/supabase_karate_schema.sql) de tu proyecto, copia todo su contenido y pégalo en el editor SQL de Supabase.
   - Haz clic en **Run** para ejecutar las instrucciones SQL. Esto creará:
     - Los enums de Karate (`user_role` y `belt_level`).
     - Las tablas: `profiles`, `karatekas`, `asistencias_karate`, `configuracion_dojo` y `horarios_clases`.
     - Los triggers y funciones para enlazar usuarios de Supabase Auth con los perfiles del dojo.
     - Las políticas de seguridad Row Level Security (RLS).
     - La semilla de datos inicial con 5 karatekas de ejemplo y la configuración base.

3. **Obtener las Claves de API**:
   - Ve a **Project Settings** > **API**.
   - Copia los siguientes valores:
     - **Project URL** (ejemplo: `https://xyzabc.supabase.co`)
     - **anon public** key (la clave pública anónima).

---

## Parte 2: Configurar y Desplegar en Render

1. **Subir los Cambios a GitHub**:
   - Asegúrate de que el código esté en tu repositorio: `https://github.com/adriandoct/dojonew.git`.
   *(Nota: Todos los cambios implementados ya se encuentran confirmados y subidos a la rama `main`)*.

2. **Crear un Servicio Web en Render**:
   - Inicia sesión en [Render](https://render.com/).
   - Haz clic en **New** > **Web Service**.
   - Conecta tu cuenta de GitHub y selecciona el repositorio `dojonew`.

3. **Configurar los Detalles del Despliegue**:
   - **Name**: `dojoia-access` (o el nombre que prefieras).
   - **Region**: Selecciona la más cercana a tus usuarios (ej. Oregon - `us-west` o Ohio - `us-east`).
   - **Branch**: `main`
   - **Root Directory**: Deja vacío o pon `./` (el directorio raíz del proyecto).
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: Selecciona el plan **Free** (Gratuito).

4. **Configurar Variables de Entorno (Environment Variables)**:
   - Haz clic en la pestaña **Environment** (o la sección de variables de entorno al crear el servicio).
   - Añade las siguientes variables con los datos de Supabase que copiaste en la Parte 1:
     - `NEXT_PUBLIC_SUPABASE_URL`: La URL de tu proyecto en Supabase.
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: La clave pública anónima `anon public`.
   - Adicionalmente, si vas a utilizar integraciones externas o WhatsApp (opcional en esta fase simulada):
     - `NEXT_PUBLIC_APP_URL`: La URL que te asigne Render (ejemplo: `https://dojoia-access.onrender.com`).

5. **Iniciar el Despliegue**:
   - Haz clic en **Create Web Service**.
   - Render comenzará a compilar la aplicación Next.js y a generar las páginas estáticas. Esto puede tomar entre 3 y 5 minutos.
   - Una vez finalizado, verás un indicador verde de **Live** y la URL pública para acceder a tu Dojo virtual.

---

## Estructura de Roles y Accesos de Prueba

Al ingresar a la URL pública, podrás probar ambos perfiles implementados:

1. **Sensei / Administrador**:
   - **Email**: `admin@admin.com`
   - **Contraseña**: `12345678Cecyte`
   - *Este rol tiene acceso completo a la importación de alumnos, visualización en tiempo real de asistencias, configuración del dojo y edición del simulador de WhatsApp.*

2. **Estudiante / Karateka**:
   - Puedes registrar una cuenta nueva en la sección de **Registrarse** seleccionando el rol de **Estudiante / Karateka**.
   - Al iniciar sesión con tu cuenta de Estudiante, el sistema te dirigirá al **Portal del Alumno** donde podrás ver tu código QR personal, estado de mensualidad de $500 MXN y el Chatbot de WhatsApp con sugerencias de entrenamiento.
