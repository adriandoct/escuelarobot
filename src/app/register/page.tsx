import Link from "next/link";
import { signup } from "../login/actions";
import styles from "../auth.module.css";
import { ArrowLeft } from "lucide-react";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; payment?: string; plan?: string }>;
}) {
  const { error, payment, plan } = await searchParams;

  // Map plan ID to readable name
  const getPlanName = (pId: string | undefined) => {
    switch (pId) {
      case "0": return "Alumno Básico ($99 MXN)";
      case "1": return "Alumno Premium ($299 MXN)";
      default: return "Alumno Básico ($99 MXN)";
    }
  };

  const getPlanShortName = (pId: string | undefined) => {
    switch (pId) {
      case "0": return "Alumno Básico";
      case "1": return "Alumno Premium";
      default: return "Alumno Básico";
    }
  };

  const planName = getPlanName(plan);
  const planShortName = getPlanShortName(plan);
  const paymentStatus = payment === "success" ? "pagado" : payment === "pending" ? "pendiente" : "no_pagado";

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBackground}></div>
      
      <div className={styles.authCard}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dojo-white-dim)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
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
        
        <h1 className={styles.title}>Comienza tu Camino Maker</h1>
        <p className={styles.subtitle}>Crea tu cuenta de acceso para ROBOTICA IA Academy.</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        {payment === "success" && (
          <div className={styles.errorBox} style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', color: '#10b981', marginBottom: '1.5rem' }}>
            <strong>✓ ¡Pago Exitoso!</strong> Se ha acreditado tu pago para el plan <strong>{planName}</strong>. Completa los datos a continuación para registrar tu cuenta de alumno.
          </div>
        )}

        {payment === "pending" && (
          <div className={styles.errorBox} style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', color: '#f59e0b', marginBottom: '1.5rem' }}>
            <strong>? Pago Pendiente:</strong> Tu transacción para el plan <strong>{planName}</strong> está en proceso. Registra tu cuenta ahora y se activará en cuanto se acredite.
          </div>
        )}

        {payment === "failure" && (
          <div className={styles.errorBox} style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '1.5rem' }}>
            <strong>⚠️ Falla en el Pago:</strong> No pudimos procesar tu tarjeta. Puedes registrarte de todos modos y liquidar tu pago directamente en el dojo presencial.
          </div>
        )}

        <form action={signup}>
          {/* Hidden fields to pass plan info to signup server action */}
          <input type="hidden" name="plan" value={planShortName} />
          <input type="hidden" name="paymentStatus" value={paymentStatus} />

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fullName">Nombre Completo</label>
            <input 
              className={styles.input}
              id="fullName" 
              name="fullName" 
              type="text" 
              placeholder="Ej. Mateo García López"
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="role">Rol en la Academia</label>
            <select 
              className={styles.input} 
              id="role" 
              name="role" 
              style={{ width: '100%', cursor: 'pointer', appearance: 'none', background: 'var(--bg-tertiary) url("data:image/svg+xml;utf8,<svg fill=\'%23a1a1aa\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 12px center' }}
              required
            >
              <option value="karateka">Alumno</option>
              <option value="tutor">Padre</option>
              <option value="sensei">Maestro / Administrador</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Correo Electrónico</label>
            <input 
              className={styles.input}
              id="email" 
              name="email" 
              type="email" 
              placeholder="tu@correo.com"
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">Contraseña (Mínimo 6 caracteres)</label>
            <input 
              className={styles.input}
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••"
              required 
              minLength={6}
            />
          </div>

          <button className={styles.submitBtn} type="submit" style={{ background: 'var(--brand-red)' }}>
            Registrarse y Comenzar
          </button>
        </form>

        <div className={styles.linkText}>
          ¿Ya tienes una cuenta? <Link href="/login">Inicia Sesión</Link>
        </div>
      </div>
    </div>
  );
}
