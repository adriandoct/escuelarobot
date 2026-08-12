import Link from "next/link";
import { login } from "./actions";
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
