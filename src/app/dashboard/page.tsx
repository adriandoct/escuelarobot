"use client";

import { useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  ShieldAlert,
  Bell,
  Search,
  Brain,
  MessageCircle,
  QrCode,
  DollarSign,
  Award,
  Video,
  ChevronRight,
  UserCheck,
  FileText,
  Download,
  AlertCircle
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion, Variants } from 'framer-motion';
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

interface Karateka {
  id: string;
  nombre: string;
  matricula: string;
  cinturon: string;
  grado: string;
}

interface Asistencia {
  id: string;
  tipo: string;
  hora: string;
  fecha: string;
  whatsapp_status: string;
  karatekas: {
    nombre: string;
    cinturon: string;
    grado: string;
  } | null;
}

// Client-side helper to read cookie
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function DashboardPage() {
  const [role, setRole] = useState("karateka");
  const [userName, setUserName] = useState("Karateka");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Sensei States
  const [karatekas, setKaratekas] = useState<Karateka[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [beltChartData, setBeltChartData] = useState<any[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    presentes: 0,
    retardos: 0,
    alertas: 0
  });

  // Student States
  const [studentMatricula, setStudentMatricula] = useState("KA-2026-004");
  const [studentBelt, setStudentBelt] = useState("azul");
  const [studentGrado, setStudentGrado] = useState("Python Code");
  const [studentPlan, setStudentPlan] = useState("Mensualidad Regular");
  const [paymentStatus, setPaymentStatus] = useState("pagado");
  const [activeManualUrl, setActiveManualUrl] = useState<string | null>(null);

  const supabase = createClient();

  const fetchActiveManual = async (belt: string) => {
    try {
      const { data, error } = await supabase
        .from("materiales_nivel")
        .select("manual_participante_url")
        .eq("nivel", belt)
        .limit(1);

      if (data && data.length > 0 && !error) {
        setActiveManualUrl(data[0].manual_participante_url);
        localStorage.setItem(`manual_${belt}`, data[0].manual_participante_url || "");
      } else {
        const cached = localStorage.getItem(`manual_${belt}`);
        if (cached) {
          setActiveManualUrl(cached);
        }
      }
    } catch (e) {
      console.warn("Could not fetch active manual, checking cache", e);
      const cached = localStorage.getItem(`manual_${belt}`);
      if (cached) {
        setActiveManualUrl(cached);
      }
    }
  };

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    const name = getCookie("dojoia_name") || "Karateka";
    const email = getCookie("dojoia_email") || "";
    const plan = getCookie("dojoia_plan") || "Mensualidad Regular";
    const status = getCookie("dojoia_payment_status") || "pagado";
    
    setRole(userRole);
    setUserName(name);
    setUserEmail(email);
    setStudentPlan(plan);
    setPaymentStatus(status);

    if (userRole === "sensei") {
      loadSenseiData();
    } else {
      // Fetch dynamic student details from database
      const fetchStudentData = async () => {
        try {
          if (email) {
            const { data, error } = await supabase
              .from("karatekas")
              .select("matricula, cinturon, grado")
              .like("tutor", `%[credentials:${email.toLowerCase()}:%`)
              .limit(1);

            if (data && data.length > 0 && !error) {
              setStudentMatricula(data[0].matricula);
              setStudentBelt(data[0].cinturon);
              setStudentGrado(data[0].grado);
              fetchActiveManual(data[0].cinturon);
              setLoading(false);
              return;
            }
          }

          // Fallback by name
          const { data: dataByName, error: errByName } = await supabase
            .from("karatekas")
            .select("matricula, cinturon, grado")
            .eq("nombre", name)
            .limit(1);

          if (dataByName && dataByName.length > 0 && !errByName) {
            setStudentMatricula(dataByName[0].matricula);
            setStudentBelt(dataByName[0].cinturon);
            setStudentGrado(dataByName[0].grado);
            fetchActiveManual(dataByName[0].cinturon);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Dynamic student data fetch skipped", e);
        }

        // Standard hardcoded mock fallbacks if database fetch fails or misses
        if (name.toLowerCase().includes("mateo")) {
          setStudentMatricula("KA-2026-001");
          setStudentBelt("verde");
          setStudentGrado("Raspberry Pi");
          fetchActiveManual("verde");
        } else if (name.toLowerCase().includes("sofia")) {
          setStudentMatricula("KA-2026-002");
          setStudentBelt("amarillo");
          setStudentGrado("Arduino Maker");
          fetchActiveManual("amarillo");
        } else if (name.toLowerCase().includes("diego")) {
          setStudentMatricula("KA-2026-003");
          setStudentBelt("negro");
          setStudentGrado("Competidor Master");
          fetchActiveManual("negro");
        } else {
          // Default fallback
          setStudentMatricula("KA-2026-004");
          setStudentBelt("azul");
          setStudentGrado("Python Code");
          fetchActiveManual("azul");
        }
        setLoading(false);
      };

      fetchStudentData();
    }
  }, []);

  const handleSignOutClient = async () => {
    try {
      document.cookie = "dojoia_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "dojoia_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "dojoia_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      
      await fetch("/auth/signout", { method: "POST" });
      window.location.href = "/";
    } catch (e) {
      console.error("Error signing out", e);
      window.location.href = "/";
    }
  };

  const loadSenseiData = async () => {
    try {
      setLoading(true);
      const { data: listKaratekas, error: kError } = await supabase
        .from("karatekas")
        .select("id, nombre, matricula, cinturon, grado")
        .eq("activo", true);

      const today = new Date().toISOString().split("T")[0];
      const { data: listAsistencias, error: aError } = await supabase
        .from("asistencias_karate")
        .select(`
          id, tipo, hora, fecha, whatsapp_status,
          karatekas(nombre, cinturon, grado)
        `)
        .order("created_at", { ascending: false });

      let finalKaratekas = listKaratekas || [];
      let finalAsistencias: any[] = listAsistencias || [];

      if ((!listKaratekas || listKaratekas.length === 0) || kError) {
        finalKaratekas = [
          { id: "1", nombre: "Mateo García López", matricula: "KA-2026-001", cinturon: "verde", grado: "Raspberry Pi" },
          { id: "2", nombre: "Sofía Martínez Ruiz", matricula: "KA-2026-002", cinturon: "amarillo", grado: "Arduino Maker" },
          { id: "3", nombre: "Diego Fernández Silva", matricula: "KA-2026-003", cinturon: "negro", grado: "Competidor Master" },
          { id: "4", nombre: "Valentina Ruiz Castro", matricula: "KA-2026-004", cinturon: "azul", grado: "Python Code" },
          { id: "5", nombre: "Lucas Torres Mendoza", matricula: "KA-2026-005", cinturon: "marron", grado: "AI & Machine Learning" }
        ];

        finalAsistencias = [
          {
            id: "a1",
            tipo: "entrada",
            hora: "17:12:00",
            fecha: today,
            whatsapp_status: "simulated",
            karatekas: { nombre: "Mateo García López", cinturon: "verde", grado: "Raspberry Pi" }
          },
          {
            id: "a2",
            tipo: "entrada",
            hora: "17:15:00",
            fecha: today,
            whatsapp_status: "simulated",
            karatekas: { nombre: "Sofía Martínez Ruiz", cinturon: "amarillo", grado: "Arduino Maker" }
          },
          {
            id: "a3",
            tipo: "entrada",
            hora: "17:35:00",
            fecha: today,
            whatsapp_status: "simulated",
            karatekas: { nombre: "Lucas Torres Mendoza", cinturon: "marron", grado: "AI & Machine Learning" }
          }
        ];
      }

      setKaratekas(finalKaratekas);
      setAsistencias(finalAsistencias);

      const total = finalKaratekas.length;
      const uniqueToday = new Set();
      let retardosCount = 0;
      let alertCount = 0;

      finalAsistencias.forEach(a => {
        if (a.fecha === today) {
          uniqueToday.add(a.karatekas?.nombre);
          if (a.tipo === "entrada") {
            const timeParts = a.hora.split(":");
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            if (hours > 17 || (hours === 17 && minutes > 15)) {
              retardosCount++;
            }
          }
        }
        if (a.whatsapp_status === "error") {
          alertCount++;
        }
      });

      setStats({
        total,
        presentes: uniqueToday.size,
        retardos: retardosCount,
        alertas: alertCount
      });

      const belts: Record<string, number> = {
        blanco: 0, amarillo: 0, naranja: 0, verde: 0, azul: 0, marron: 0, negro: 0
      };

      finalKaratekas.forEach((k: any) => {
        const b = (k.cinturon || '').toLowerCase();
        if (b in belts) belts[b]++;
      });

      setBeltChartData([
        { name: 'Scratch STEM', value: belts.blanco, fill: '#CBD5E1' },
        { name: 'Arduino Maker', value: belts.amarillo, fill: '#FACC15' },
        { name: 'ESP32 IoT', value: belts.naranja, fill: '#FB923C' },
        { name: 'Raspberry Pi', value: belts.verde, fill: '#22C55E' },
        { name: 'Python Code', value: belts.azul, fill: '#3B82F6' },
        { name: 'AI & ML', value: belts.marron, fill: '#8B4513' },
        { name: 'Comp. Master', value: belts.negro, fill: '#1E293B' },
      ]);

      setWeeklyChartData([
        { name: 'Lun', presentes: 12 },
        { name: 'Mar', presentes: 15 },
        { name: 'Mié', presentes: 11 },
        { name: 'Jue', presentes: 14 },
        { name: 'Vie', presentes: 18 },
      ]);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getBeltColorClass = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return "belt-blanco";
      case "amarillo": return "belt-amarillo";
      case "naranja": return "belt-naranja";
      case "verde": return "belt-verde";
      case "azul": return "belt-azul";
      case "marron": return "belt-marron";
      case "negro": return "belt-negro";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando portal...</p>
      </div>
    );
  }

  // RENDER STUDENT PORTAL
  if (role === "karateka") {
    const planPrices: Record<string, string> = {
      "Mensualidad Regular": "$1,000",
      "Trimestre Raion Kai": "$1,400",
      "Semestre Shito-Ryu": "$2,700"
    };
    const planPrice = planPrices[studentPlan] || "$1,000";

    const getRoboticsLevelName = (belt: string) => {
      switch (belt?.toLowerCase()) {
        case "blanco": return "Nivel 1: Scratch STEM";
        case "amarillo": return "Nivel 2: Arduino Maker";
        case "naranja": return "Nivel 3: ESP32 IoT";
        case "verde": return "Nivel 4: Raspberry Pi";
        case "azul": return "Nivel 5: Python Code";
        case "marron": return "Nivel 6: AI & Machine Learning";
        case "negro": return "Nivel 7: Competidor Master";
        default: return "Nivel Inicial";
      }
    };

    return (
      <motion.div 
        className="animate-fade-in"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}
      >
        <motion.div variants={itemVariants} className={styles.topbar}>
          <div className={styles.greeting}>
            <h1>¡Hola, {userName}!</h1>
            <p>Bienvenido al Portal del Alumno. Monitoreo técnico y credenciales.</p>
          </div>
          <div className={styles.topActions} style={{ marginRight: '8.5rem' }}>
            <div className={styles.actionBtn}>
              <Bell size={20} />
            </div>
          </div>
        </motion.div>

        {/* Student Quick Stats */}
        <motion.div variants={itemVariants} className={styles.metricsGrid}>
          <div className={styles.metricCard} style={{ borderLeft: '4px solid var(--brand-red)' }}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Mi Nivel de Robótica</span>
              <div className={`${styles.metricIcon} ${styles.blue}`}>
                <Award size={24} color="var(--brand-red)" />
              </div>
            </div>
            <div className={styles.metricValue} style={{ fontSize: '1.4rem', marginTop: '0.5rem', textTransform: 'capitalize' }}>
              {getRoboticsLevelName(studentBelt)}
            </div>
            <div className={`${styles.metricTrend} ${styles.up}`}>
              <span>Especialidad: {studentGrado}</span>
            </div>
          </div>

          <div className={styles.metricCard} style={{ borderLeft: '4px solid #10B981' }}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>{studentPlan}</span>
              <div className={`${styles.metricIcon} ${styles.green}`}>
                <DollarSign size={24} color="#10B981" />
              </div>
            </div>
            <div className={styles.metricValue}>{planPrice} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>MXN</span></div>
            <div 
              className={`${styles.metricTrend} ${styles.up}`} 
              style={{ 
                color: paymentStatus === "pagado" ? "#10B981" : paymentStatus === "pendiente" ? "#F59E0B" : "#EF4444", 
                fontWeight: 'bold' 
              }}
            >
              <span>
                {paymentStatus === "pagado" && "Estado: Pagado ✓"}
                {paymentStatus === "pendiente" && "Estado: Pendiente de Acreditación ?"}
                {paymentStatus === "no_pagado" && "Estado: Pendiente de Pago ✗"}
              </span>
            </div>
          </div>

          <div className={styles.metricCard} style={{ borderLeft: '4px solid var(--brand-accent)' }}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Asistencias del Mes</span>
              <div className={`${styles.metricIcon} ${styles.gold}`}>
                <UserCheck size={24} color="var(--brand-accent)" />
              </div>
            </div>
            <div className={styles.metricValue}>95%</div>
            <div className={`${styles.metricTrend} ${styles.up}`}>
              <span>Asistencia excelente (Maker)</span>
            </div>
          </div>
        </motion.div>

        {/* QR Access and Chatbot Feedback */}
        <motion.div variants={itemVariants} className={styles.panelsGrid}>
          {/* Card 1: My QR Credential */}
          <div className={styles.chartCard} style={{ alignItems: 'center', padding: '2rem', gap: '1rem' }}>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Mi Credencial de Acceso QR</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '280px' }}>
              Muestra este código al sensor Kamiza QR al entrar o salir del dojo.
            </p>
            <div style={{ background: 'white', padding: '0.75rem', borderRadius: '12px', width: '180px', height: '180px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=000&data=${studentMatricula}`} 
                alt="Mi QR" 
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem', color: 'var(--brand-red)' }}>
              ID: {studentMatricula}
            </span>
          </div>

          {/* Card 2: AI Chatbot Rendimiento */}
          <div className={styles.chartCard} style={{ borderLeft: '4px solid var(--brand-red)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Brain size={24} style={{ color: 'var(--brand-red)' }} />
              <h3 style={{ margin: 0 }}>Chatbot WhatsApp de Rendimiento</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              El chatbot inteligente de WhatsApp monitorea de forma autónoma tu constancia y tu progreso en talleres. 
              Aquí tienes tu último informe generado:
            </p>
            
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-red)', marginBottom: '0.25rem' }}>
                Mentor IA Chatbot dice:
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                "Hola, {userName}. Has asistido puntualmente a tus últimas 4 sesiones del laboratorio de Robótica. 
                Tu circuito con la placa <strong>Arduino Maker</strong> ha mejorado sustancialmente en la estabilidad de las conexiones del bus I2C. 
                Tu rendimiento actual está al 92% para tu próxima certificación de nivel. ¡Sigue creando y programando!"
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Notificaciones enviadas a tutor por WhatsApp</span>
              <span style={{ color: '#10B981', fontWeight: 'bold' }}>Chatbot Activo 💬</span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Mi Manual de Participante (Activo) */}
        <motion.div variants={itemVariants} className={styles.panelsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.chartCard} style={{ 
            borderLeft: '4px solid var(--brand-gold)', 
            padding: '1.5rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                background: 'rgba(250, 204, 21, 0.1)',
                padding: '0.75rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold)',
                flexShrink: 0
              }}>
                <FileText size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '1rem', color: 'var(--text-primary)' }}>Mi Manual del Participante</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '600px', lineHeight: '1.4' }}>
                  Material oficial de apoyo para tu nivel activo: <strong style={{ color: 'var(--brand-gold)', textTransform: 'capitalize' }}>{getRoboticsLevelName(studentBelt)}</strong>. Repasa los conceptos y completa tus desafíos maker en casa.
                </p>
              </div>
            </div>
            <div>
              {activeManualUrl ? (
                <a 
                  href={activeManualUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-secondary"
                  style={{
                    background: 'var(--brand-gold)',
                    color: '#000',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(250, 204, 21, 0.15)',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={16} /> Descargar Manual
                </a>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  background: 'var(--bg-tertiary)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <AlertCircle size={14} /> El manual estará disponible pronto
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Video Class Shortcuts */}
        <motion.div variants={itemVariants} className={styles.panelsGrid}>
          <div className={styles.aiExecutiveWidget} style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                <Video size={20} color="var(--brand-red)" />
                Sesiones Maker de Repaso (Videos Cortos)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Accede a nuestro contenido audiovisual de repaso exclusivo para alumnos registrados.
              </p>
            </div>
            <Link href="/dashboard/videos" className="btn-primary" style={{ background: 'var(--brand-red)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Ver Videos Cortos <ChevronRight size={18} />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // RENDER SENSEI/ADMIN PORTAL
  return (
    <motion.div 
      className="animate-fade-in"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className={styles.topbar}>
        <div className={styles.greeting}>
          <h1>Resumen del Laboratorio (Maestro)</h1>
          <p>Control de acceso escolar y estado de talleres en tiempo real.</p>
        </div>
        
        <div className={styles.topActions} style={{ marginRight: '8.5rem' }}>
          <div className={styles.actionBtn}>
            <Search size={20} />
          </div>
          <div className={styles.actionBtn}>
            <Bell size={20} />
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div variants={itemVariants} className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Alumnos Activos</span>
          <div className={`${styles.metricIcon} ${styles.blue}`}>
            <Users size={24} color="var(--brand-red)" />
          </div>
        </div>
        <div className={styles.metricValue}>{stats.total}</div>
        <div className={`${styles.metricTrend} ${styles.up}`}>
          <TrendingUp size={16} />
          <span>Nómina oficial de la Academia</span>
        </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>En Laboratorio Hoy</span>
          <div className={`${styles.metricIcon} ${styles.green}`}>
            <UserCheck size={24} color="#10B981" />
          </div>
        </div>
        <div className={styles.metricValue}>{stats.presentes}</div>
        <div className={`${styles.metricTrend} ${styles.up}`}>
          <TrendingUp size={16} />
          <span>Activos en talleres</span>
        </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Retardos Hoy</span>
            <div className={`${styles.metricIcon} ${styles.gold}`}>
              <Clock size={24} color="#FBBF24" />
            </div>
          </div>
          <div className={styles.metricValue}>{stats.retardos}</div>
        <div className={`${styles.metricTrend} ${styles.down}`}>
          <span>Ingresos después de la tolerancia</span>
        </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricTitle}>Alertas WhatsApp</span>
            <div className={`${styles.metricIcon} ${styles.red}`}>
              <ShieldAlert size={24} color="#EF4444" />
            </div>
          </div>
          <div className={styles.metricValue}>{stats.alertas}</div>
          <div className={`${styles.metricTrend} ${styles.down}`}>
            <span>Errores de red en envíos</span>
          </div>
        </div>
      </motion.div>

      {/* Charts Panels */}
      <motion.div variants={itemVariants} className={styles.panelsGrid}>
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h3>Asistencias de la Semana</h3>
          </div>
          <div className={styles.chartContainer} style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPresentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-red)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--brand-red)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="presentes" stroke="var(--brand-red)" strokeWidth={3} fillOpacity={1} fill="url(#colorPresentes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h3>Distribución de Niveles</h3>
          </div>
          <div className={styles.chartContainer} style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beltChartData.filter(d => d.value > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  cursor={{fill: 'var(--bg-tertiary)'}}
                />
                <Bar dataKey="value" name="Alumnos" radius={[4, 4, 0, 0]}>
                  {beltChartData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="#475569" strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* AI Assistant and Activity */}
      <motion.div variants={itemVariants} className={styles.panelsGrid}>
        <div className={styles.aiExecutiveWidget} style={{ borderLeft: '4px solid var(--brand-red)' }}>
          <div className={styles.aiWidgetHeader}>
            <Brain size={24} style={{ color: 'var(--brand-red)' }} />
            <span style={{ fontWeight: 600 }}>Mentor IA Maker</span>
          </div>
          <div className={styles.aiWidgetContent}>
            <p style={{ lineHeight: '1.5', fontSize: '0.95rem' }}>
              Hola, Maestro. Hoy la asistencia se mantiene alta en un 94%. He notado que el grupo del <strong>Nivel ESP32 IoT</strong> ha avanzado sustancialmente en sus reportes de soldado físico. Te sugiero habilitar los kits de sensores avanzados en la próxima sesión práctica.
            </p>
          </div>
          <button className={styles.aiWidgetBtn} style={{ background: 'var(--brand-red-light)', color: 'var(--brand-red)' }}>
            Ver Recomendaciones de Aula
          </button>
        </div>

        <div className={styles.chartCard} style={{ padding: '1.5rem' }}>
          <div className={styles.cardHeader}>
            <h3>Asistencias Recientes</h3>
          </div>
          <div className={styles.activityList}>
            {asistencias.slice(0, 3).map((a, i) => (
              <div key={a.id || i} className={styles.activityItem}>
                <div className={styles.activityIcon} style={{ 
                  background: a.tipo === 'entrada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  color: a.tipo === 'entrada' ? '#10B981' : '#EF4444' 
                }}>
                  <UserCheck size={20} />
                </div>
                <div className={styles.activityDetails}>
                  <h4>{a.karatekas?.nombre} ({a.karatekas?.grado})</h4>
                  <p>
                    {a.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada'} • {a.hora.substring(0, 5)} 
                    {a.whatsapp_status === 'sent' || a.whatsapp_status === 'simulated' ? (
                      <span style={{ color: '#10B981', marginLeft: '8px' }}>💬 WhatsApp enviado</span>
                    ) : a.whatsapp_status === 'error' ? (
                      <span style={{ color: '#EF4444', marginLeft: '8px' }}>⚠️ Falla WhatsApp</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>💬 Pendiente</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {asistencias.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No hay registros el día de hoy.</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
