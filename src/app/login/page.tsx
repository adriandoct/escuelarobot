import Link from "next/link";
import { login, signInWithGoogle } from "./actions";
import styles from "../auth.module.css";
import { ArrowLeft } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBackground}></div>
      
      <div className={styles.authCard}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dojo-white-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>

        <div className={styles.logoContainer}>
          <div className={styles.logo} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/ia-make-logo.png" alt="IA Make Logo" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
            <span className="logo-script" style={{ fontSize: '2.7rem', color: 'var(--dojo-white)', textTransform: 'none' }}>
              IA <span style={{ color: 'var(--brand-accent)' }}>Make</span>
            </span>
          </div>
        </div>
        
        <h1 className={styles.title}>Bienvenido a la Academia</h1>
        <p className={styles.subtitle}>Ingresa tus credenciales para acceder a tus laboratorios y proyectos.</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        {/* ── GOOGLE OAUTH — Solo Maestros y Administradores ── */}
        <form action={signInWithGoogle}>
          <button type="submit" className={styles.googleBtn} id="google-login-btn">
            <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>
        </form>

        <div className={styles.staffNote}>
          🎓 Solo para <strong>Maestros</strong> y <strong>Administradores</strong>
        </div>

        {/* ── DIVIDER ── */}
        <div className={styles.divider}>
          <span>O inicia sesión con contraseña</span>
        </div>

        {/* ── FORMULARIO EMAIL/PASSWORD ── */}
        <form action={login}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Correo Electrónico</label>
            <input 
              className={styles.input}
              id="email" 
              name="email" 
              type="email" 
              placeholder="correo@ejemplo.com"
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">Contraseña</label>
            <input 
              className={styles.input}
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••"
              required 
            />
          </div>

          <button className={styles.submitBtn} type="submit">
            Iniciar Sesión
          </button>
        </form>

        <div className={styles.linkText}>
          ¿Aún no tienes cuenta? <Link href="/register">Regístrate</Link>
        </div>
      </div>
    </div>
  );
}
