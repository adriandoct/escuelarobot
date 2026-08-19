"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ChevronRight, Flame, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { login, loginWithGoogleAccount, loginWithGmailInput } from "./actions";
import styles from "../auth.module.css";

interface LoginFormProps {
  initialError?: string;
}

export default function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLoadingEmail, setSelectedLoadingEmail] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleCard, setShowGoogleCard] = useState(true);
  const [errorMessage, setErrorMessage] = useState(initialError || "");

  // Lista de cuentas Google de acceso rápido (idéntico al diseño de la imagen)
  const quickAccounts = [
    {
      name: "Adrián Silva",
      email: "silva.adrian@sujv.mx",
      initial: "A",
      avatarClass: styles.avatarBlue,
      roleHint: "sensei",
    },
    {
      name: "Cuenta Google Personal",
      email: "adrian.taqueria@gmail.com",
      initial: "G",
      avatarClass: styles.avatarOrange,
      roleHint: "karateka",
    },
  ];

  const handleAccountClick = (email: string, name: string) => {
    if (isPending) return;
    setErrorMessage("");
    setSelectedLoadingEmail(email);

    startTransition(async () => {
      try {
        await loginWithGoogleAccount(email, name);
      } catch (err: any) {
        // En Next.js redirect lanza una excepción intencional que no debe capturarse como error si es NEXT_REDIRECT
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setErrorMessage(err?.message || "No fue posible iniciar sesión con esta cuenta");
        setSelectedLoadingEmail(null);
      }
    });
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || isPending) return;

    let targetEmail = customEmail.trim();
    if (!targetEmail.includes("@")) {
      targetEmail = `${targetEmail}@gmail.com`;
    }

    setErrorMessage("");
    setSelectedLoadingEmail(targetEmail);

    startTransition(async () => {
      try {
        await loginWithGoogleAccount(targetEmail);
      } catch (err: any) {
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setErrorMessage(err?.message || "Error al iniciar sesión con el correo ingresado");
        setSelectedLoadingEmail(null);
      }
    });
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBackground} />

      <div className={styles.authCard}>
        {/* ── ENCABEZADO SUPERIOR ── */}
        <div className={styles.headerRow}>
          <div className={styles.brandGroup}>
            <div className={styles.brandIconCircle}>
              <img
                src="/ia-make-logo.png"
                alt="IA Make Logo"
                style={{ width: "38px", height: "38px", objectFit: "contain" }}
              />
            </div>
            <div className={styles.brandTitles}>
              <div style={{ display: "flex", alignItems: "center", lineHeight: 1 }}>
                <span
                  className="logo-script"
                  style={{
                    fontSize: "2.35rem",
                    color: "var(--dojo-white, #ffffff)",
                    textTransform: "none",
                    lineHeight: 1,
                  }}
                >
                  IA <span style={{ color: "var(--brand-accent, #ff3366)" }}>Make</span>
                </span>
              </div>
              <span className={styles.subTitleBadge}>ACCESO AL SISTEMA</span>
            </div>
          </div>

          <Link href="/" className={styles.closeBtn} title="Volver al inicio">
            <X size={20} />
          </Link>
        </div>

        {/* ── MENSAJE DE ERROR ── */}
        {errorMessage && <div className={styles.errorBox}>{errorMessage}</div>}

        {/* ── TARJETA BLANCA DE GOOGLE ── */}
        {showGoogleCard && (
          <div className={styles.googleCard}>
            <div className={styles.googleCardHeader}>
              <div className={styles.googleTitleWrap}>
                {/* SVG Oficial Google G Multicolor */}
                <svg className={styles.googleIconSvg} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className={styles.googleCardTitle}>Selecciona una cuenta de Google</span>
              </div>
              <button
                type="button"
                className={styles.googleCloseTextBtn}
                onClick={() => setShowGoogleCard(false)}
              >
                Cerrar
              </button>
            </div>

            {/* Lista de cuentas rápidas */}
            <div className={styles.googleAccountsList}>
              {quickAccounts.map((account) => {
                const isLoadingThis = isPending && selectedLoadingEmail === account.email;
                return (
                  <button
                    key={account.email}
                    type="button"
                    className={styles.googleAccountItem}
                    onClick={() => handleAccountClick(account.email, account.name)}
                    disabled={isPending}
                  >
                    <div className={styles.accountLeft}>
                      <div className={`${styles.accountAvatar} ${account.avatarClass}`}>
                        {isLoadingThis ? <span className={styles.loadingSpinner} /> : account.initial}
                      </div>
                      <div className={styles.accountInfo}>
                        <span className={styles.accountName}>{account.name}</span>
                        <span className={styles.accountEmail}>{account.email}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className={styles.accountChevron} />
                  </button>
                );
              })}
            </div>

            {/* Input para ingresar otro correo @gmail.com */}
            <form onSubmit={handleCustomEmailSubmit} className={styles.googleInputForm}>
              <input
                type="text"
                className={styles.googleInput}
                placeholder="Escribe otro correo @gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                disabled={isPending}
              />
              <button
                type="submit"
                className={styles.googleSubmitBtn}
                disabled={isPending || !customEmail.trim()}
              >
                {isPending && selectedLoadingEmail && !quickAccounts.some((a) => a.email === selectedLoadingEmail) ? (
                  <span className={styles.loadingSpinner} />
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>
        )}

        {!showGoogleCard && (
          <button
            type="button"
            className={styles.togglePasswordBtn}
            style={{ marginBottom: "1.2rem", background: "#ffffff", color: "#202124" }}
            onClick={() => setShowGoogleCard(true)}
          >
            <svg className={styles.googleIconSvg} viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Seleccionar cuenta de Google
          </button>
        )}

        {/* ── SEPARADOR O CON CORREO ── */}
        <div className={styles.divider}>O CON CORREO Y CONTRASEÑA</div>

        {/* ── FORMULARIO EMAIL / PASSWORD ── */}
        {!showPasswordForm ? (
          <button
            type="button"
            className={styles.togglePasswordBtn}
            onClick={() => setShowPasswordForm(true)}
          >
            <Lock size={16} />
            Ingresar con Correo y Contraseña
          </button>
        ) : (
          <form action={login}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                Correo Electrónico
              </label>
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
              <label className={styles.label} htmlFor="password">
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className={styles.input}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  style={{ paddingRight: "2.8rem" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button className={styles.submitBtn} type="submit">
              Iniciar Sesión con Contraseña
            </button>
          </form>
        )}

        <div className={styles.linkText}>
          ¿Aún no tienes cuenta? <Link href="/register">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
}
