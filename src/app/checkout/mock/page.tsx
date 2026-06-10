"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import styles from "./checkout.module.css";
import { CreditCard, Calendar, Lock, User, Check, AlertCircle, ShieldCheck, HelpCircle } from "lucide-react";

const PLANS = [
  { id: "0", name: "Mensualidad Regular", price: 1000, desc: "Ideal para entrenamiento constante y monitoreo automatizado." },
  { id: "1", name: "Trimestre Raion Kai", price: 1400, desc: "Ahorra pagando un trimestre completo de preparación marcial." },
  { id: "2", name: "Semestre Shito-Ryu", price: 2700, desc: "Compromiso absoluto en el tatami para aspirantes a cinta negra." },
];

export default function CheckoutMockPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; api_error?: string }>;
}) {
  const router = useRouter();
  const params = use(searchParams);
  const planId = params.plan || "0";
  const apiError = params.api_error;

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];

  // Card Inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [email, setEmail] = useState("");

  // Simulator controls
  const [simStatus, setSimStatus] = useState<"success" | "failure" | "pending">("success");
  
  // Payment states
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "done">("idle");
  const [stateMessage, setStateMessage] = useState("");

  // Fill dummy values for convenience
  const handleFillDummyData = () => {
    setCardNumber("4557 8812 3456 7890");
    setCardName("MATEO GARCIA LOPEZ");
    setCardExpiry("12/30");
    setCardCvv("123");
    setEmail("alumno.prueba@dojoia.com");
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4);
    }
    setCardExpiry(value.substring(0, 5));
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv || !email) {
      alert("Por favor completa todos los campos de pago.");
      return;
    }

    setPaymentState("loading");
    setStateMessage("Procesando pago en los servidores de Mercado Pago...");

    setTimeout(() => {
      setStateMessage("Validando fondos y credenciales de seguridad...");
      setTimeout(() => {
        setPaymentState("done");
        
        let redirectUrl = "";
        const appUrl = ""; // empty forces relative navigation
        
        if (simStatus === "success") {
          redirectUrl = `/register?payment=success&plan=${plan.id}`;
        } else if (simStatus === "failure") {
          redirectUrl = `/register?payment=failure`;
        } else {
          redirectUrl = `/register?payment=pending&plan=${plan.id}`;
        }

        setTimeout(() => {
          router.push(redirectUrl);
        }, 1200);
      }, 1200);
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.checkoutCard}>
        <div className={styles.logoRow}>
          <div className={styles.mpLogo}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#009AF0"/>
              <path d="M10 20C10 14.4772 14.4772 10 20 10C25.5228 10 30 14.4772 30 20C30 25.5228 25.5228 30 20 30C14.4772 30 10 25.5228 10 20Z" fill="white" fillOpacity="0.2"/>
              <path d="M15 25V15L20 20L25 15V25" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
              mercado <span style={{ color: '#009af0' }}>pago</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {apiError && <span className={styles.sandboxBadge} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>API Fallback</span>}
            <span className={styles.sandboxBadge}>Sandbox / Pruebas</span>
          </div>
        </div>

        <div className={styles.planSummary}>
          <div className={styles.planInfo}>
            <h3>{plan.name}</h3>
            <p>{plan.desc}</p>
          </div>
          <div className={styles.price}>
            ${plan.price.toLocaleString()} MXN
          </div>
        </div>

        {/* Dynamic Credit Card Visual */}
        <div className={styles.cardPreview}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className={styles.cardChip}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
              VISA / MASTERCARD
            </span>
          </div>
          
          <div className={styles.cardNumber}>
            {cardNumber || "•••• •••• •••• ••••"}
          </div>

          <div className={styles.cardBottom}>
            <div className={styles.cardHolder}>
              <span className={styles.cardLabel}>Titular</span>
              <span className={styles.cardVal}>{cardName || "Nombre Completo"}</span>
            </div>
            <div className={styles.cardExpiry}>
              <span className={styles.cardLabel}>Vence</span>
              <span className={styles.cardVal}>{cardExpiry || "MM/AA"}</span>
            </div>
          </div>
        </div>

        {paymentState === "idle" && (
          <form onSubmit={handlePay} className={styles.form}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-0.5rem' }}>
              <span className={styles.simTitle}>Detalles de la Tarjeta</span>
              <button 
                type="button" 
                onClick={handleFillDummyData}
                style={{ background: 'transparent', border: 'none', color: '#009af0', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Auto-completar datos de prueba
              </button>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email">Correo Electrónico del Comprador</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  id="email" 
                  className={styles.input} 
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="cardNumber">Número de Tarjeta</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  id="cardNumber" 
                  className={styles.input} 
                  placeholder="4557 8812 3456 7890"
                  maxLength={19}
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  style={{ width: '100%' }}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="cardName">Nombre Impreso en la Tarjeta</label>
              <input 
                type="text" 
                id="cardName" 
                className={styles.input} 
                placeholder="MATEO GARCIA LOPEZ"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="cardExpiry">Vencimiento (MM/AA)</label>
                <input 
                  type="text" 
                  id="cardExpiry" 
                  className={styles.input} 
                  placeholder="12/30"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="cardCvv">CVC / Código Seguridad</label>
                <input 
                  type="password" 
                  id="cardCvv" 
                  className={styles.input} 
                  placeholder="123"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                />
              </div>
            </div>

            <div>
              <div className={styles.simTitle}>Simulador: Resultado del Pago</div>
              <div className={styles.simOptions}>
                <button 
                  type="button" 
                  className={`${styles.simBtn} ${simStatus === "success" ? styles.simBtnActiveSuccess : ""}`}
                  onClick={() => setSimStatus("success")}
                >
                  ✓ Pago Exitoso
                </button>
                <button 
                  type="button" 
                  className={`${styles.simBtn} ${simStatus === "failure" ? styles.simBtnActiveFailure : ""}`}
                  onClick={() => setSimStatus("failure")}
                >
                  ✗ Pago Rechazado
                </button>
                <button 
                  type="button" 
                  className={`${styles.simBtn} ${simStatus === "pending" ? styles.simBtnActivePending : ""}`}
                  onClick={() => setSimStatus("pending")}
                >
                  ? Pago Pendiente
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              <Lock size={18} /> Pagar ${plan.price.toLocaleString()} MXN
            </button>
          </form>
        )}

        {paymentState === "loading" && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1.5rem' }}>
            <div className={styles.spinner}></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center' }}>
              {stateMessage}
            </p>
          </div>
        )}

        {paymentState === "done" && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1.5rem', textAlign: 'center' }}>
            {simStatus === "success" && (
              <>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                  <Check size={36} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>¡Pago Aprobado!</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Suscripción activada con éxito. Redirigiendo al registro de la academia...
                  </p>
                </div>
              </>
            )}
            {simStatus === "failure" && (
              <>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}>
                  <AlertCircle size={36} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Pago Rechazado</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Tu tarjeta fue declinada. Redirigiendo para intentar con otro método...
                  </p>
                </div>
              </>
            )}
            {simStatus === "pending" && (
              <>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>
                  <HelpCircle size={36} />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Pago Pendiente</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    El pago se encuentra en proceso de validación. Redirigiendo al registro...
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.securityFooter}>
          <ShieldCheck size={16} color="#64748b" />
          <span>Pagos protegidos con encriptación SSL de 256 bits</span>
        </div>
      </div>
    </div>
  );
}
