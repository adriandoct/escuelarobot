import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import styles from "../dashboard.module.css";
import {
  LayoutDashboard,
  Users,
  QrCode,
  Calendar,
  Settings,
  LogOut,
  Shield,
  Award,
  Video,
  PlaySquare,
  BarChart2,
  Trophy,
  FileText,
  CheckSquare,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  let user = null;

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (error) {
    console.warn("Supabase auth check failed. Using offline developer mode.", error);
  }

  // Read cookies for mock/local bypass roles
  const cookieStore = await cookies();
  const role = cookieStore.get("dojoia_role")?.value || "karateka";
  const name = cookieStore.get("dojoia_name")?.value || "Karateka";
  const email = cookieStore.get("dojoia_email")?.value || "";

  // Senior dev fallback: If Supabase env keys are missing, bypass login so the demo is fully functional
  if (!user && !email) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Allow fallback if no local session exists yet
      return redirect("/login");
    } else {
      return redirect("/login");
    }
  }

  const isSensei = role === "sensei";

  const isMockSupabase = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                         String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).includes("reemplázala") ||
                         !String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).startsWith("eyJ");

  return (
    <div className={styles.dashboardLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
          <img src="/ia-make-logo.png" alt="IA Make Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span className="logo-script" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', textTransform: 'none' }}>
            IA <span style={{ color: 'var(--brand-accent)' }}>Make</span>
          </span>
        </div>
        
        <nav className={styles.navMenu}>
          <div className={styles.navSectionTitle}>Principal</div>
          
          <Link href="/dashboard" className={styles.navItem}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          {isSensei ? (
            <>
              <div className={styles.navSectionTitle} style={{ marginTop: '1rem' }}>Gestión Academia</div>
              
              <Link href="/dashboard/alumnos" className={styles.navItem}>
                <Users size={20} />
                <span>Alumnos y Tutores</span>
              </Link>
              
              <Link href="/dashboard/asistencia" className={styles.navItem}>
                <QrCode size={20} />
                <span>Escáner QR</span>
              </Link>
              
              <Link href="/dashboard/estructura" className={styles.navItem}>
                <Award size={20} />
                <span>Talleres y Programa STEM</span>
              </Link>

              <Link href="/dashboard/videos" className={styles.navItem}>
                <Video size={20} />
                <span>Videos y Módulos</span>
              </Link>

              <Link href="/dashboard/examenes" className={styles.navItem}>
                <CheckSquare size={20} />
                <span>Evaluar Proyectos</span>
              </Link>

              <Link href="/dashboard/manuales" className={styles.navItem}>
                <BookOpen size={20} />
                <span>Manuales y Materiales</span>
              </Link>
              
              <div className={styles.navSectionTitle} style={{ marginTop: '1rem' }}>Ajustes</div>
              
              <Link href="/dashboard/settings" className={styles.navItem}>
                <Settings size={20} />
                <span>Configuración y WhatsApp</span>
              </Link>
            </>
          ) : (
            <>
              <div className={styles.navSectionTitle} style={{ marginTop: '1rem' }}>Portal Alumno</div>

              <Link href="/dashboard/progreso" className={styles.navItem}>
                <BarChart2 size={20} />
                <span>Mi Progreso</span>
              </Link>

              <Link href="/dashboard/videos" className={styles.navItem}>
                <Video size={20} />
                <span>Cursos y Clases</span>
              </Link>
              
              <Link href="/dashboard/estructura" className={styles.navItem}>
                <Calendar size={20} />
                <span>Talleres y Horarios</span>
              </Link>

              <Link href="/dashboard/examenes" className={styles.navItem}>
                <CheckSquare size={20} />
                <span>Proyectos y Evaluaciones</span>
              </Link>

              <Link href="/dashboard/certificados" className={styles.navItem}>
                <FileText size={20} />
                <span>Mis Certificados</span>
              </Link>

              <Link href="/dashboard/manuales" className={styles.navItem}>
                <BookOpen size={20} />
                <span>Manuales de Nivel</span>
              </Link>

              <Link href="/dashboard/ranking" className={styles.navItem}>
                <Trophy size={20} />
                <span>Ranking Maker</span>
              </Link>
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.avatar} style={{ background: isSensei ? 'var(--brand-red)' : 'var(--brand-gold)' }}>🤖</div>
            <div className={styles.userInfo}>
              <h4 style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                {name}
              </h4>
              <p>{isSensei ? "Director / Maestro" : "Estudiante Maker"}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post" style={{ marginTop: '1rem' }}>
            <button type="submit" className={styles.navItem} style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      <main className={styles.mainContent}>
        {/* Global Top-Right Cerrar Sesión Button */}
        <div className="no-print" style={{ position: 'absolute', top: '2.5rem', right: '3rem', zIndex: 100 }}>
          <form action="/auth/signout" method="post">
            <button 
              type="submit" 
              className={styles.logoutBtnTop}
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>

        {isMockSupabase && (
          <div style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '8px',
            padding: '1.25rem 1.75rem',
            marginBottom: '2rem',
            color: '#eab308',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            maxWidth: '1200px'
          }} className="no-print">
            <span style={{ fontSize: '1.8rem' }}>⚠️</span>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#f59e0b', fontSize: '1rem' }}>⚠️ Modo Simulado Activo</strong>
              Las credenciales de Supabase en tu entorno local o en Render son incorrectas (la clave pública actual empieza con <code>sb_publishable_</code> que pertenece a Stripe).
              Los alumnos que registres desde tu navegador <strong>solo existirán en la memoria de este navegador</strong> y no se sincronizarán con otros dispositivos o computadoras.
            </div>
          </div>
        )}
        
        {children}
      </main>
    </div>
  );
}
