"use client";

import { useEffect, useState } from "react";
import styles from "./progreso.module.css";
import { 
  Award, 
  Calendar, 
  Video, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Users,
  Brain,
  ShieldCheck
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { createClient } from "@/utils/supabase/client";

interface Karateka {
  id: string;
  nombre: string;
  matricula: string;
  cinturon: string;
  grado: string;
  tutor: string;
  telefono: string;
  foto_url: string;
  activo: boolean;
  puntos?: number;
}

interface RequirementItem {
  name: string;
  completed: boolean;
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function ProgresoPage() {
  const [role, setRole] = useState("karateka");
  const [currentStudent, setCurrentStudent] = useState<Karateka | null>(null);
  const [students, setStudents] = useState<Karateka[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats mock
  const [attendanceRate, setAttendanceRate] = useState(94);
  const [videosWatched, setVideosWatched] = useState(82);

  const supabase = createClient();

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    const userName = getCookie("dojoia_name") || "Karateka";
    setRole(userRole);
    loadData(userRole, userName);
  }, []);

  const loadData = async (userRole: string, userName: string) => {
    try {
      setLoading(true);
      
      // Load all students
      let studentList: Karateka[] = [];
      const { data, error } = await supabase
        .from("karatekas")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (data && data.length > 0) {
        studentList = data;
      } else {
        const cached = localStorage.getItem("local_karatekas");
        if (cached) {
          studentList = JSON.parse(cached);
        } else {
          studentList = [
            { id: "1", matricula: "KA-2026-001", nombre: "Mateo García López", cinturon: "verde", grado: "6° Kyu", tutor: "Adriana López", telefono: "+5215512345678", foto_url: "https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "2", matricula: "KA-2026-002", nombre: "Sofía Martínez Ruiz", cinturon: "amarillo", grado: "8° Kyu", tutor: "Carlos Martínez", telefono: "+5215587654321", foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "3", matricula: "KA-2026-003", nombre: "Diego Fernández Silva", cinturon: "negro", grado: "1° Dan", tutor: "Juan Fernández", telefono: "+5215545678901", foto_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "4", matricula: "KA-2026-004", nombre: "Valentina Ruiz Castro", cinturon: "azul", grado: "5° Kyu", tutor: "Patricia Castro", telefono: "+5215598765432", foto_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "5", matricula: "KA-2026-005", nombre: "Lucas Torres Mendoza", cinturon: "marron", grado: "2° Kyu", tutor: "Fernando Torres", telefono: "+5215565432109", foto_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200", activo: true }
          ];
        }
      }
      setStudents(studentList);

      // Select target student
      if (userRole === "sensei") {
        setCurrentStudent(studentList[0] || null);
      } else {
        // Find by name matching cookie
        const match = studentList.find(s => s.nombre.toLowerCase().includes(userName.toLowerCase())) || studentList[3] || studentList[0];
        setCurrentStudent(match);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getBeltPercentage = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return 15;
      case "amarillo": return 30;
      case "naranja": return 45;
      case "verde": return 60;
      case "azul": return 75;
      case "marron": return 90;
      case "negro": return 100;
      default: return 0;
    }
  };

  const getRoboticsLevelName = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return "Nivel 1: Scratch STEM";
      case "amarillo": return "Nivel 2: Arduino Maker";
      case "naranja": return "Nivel 3: ESP32 IoT";
      case "verde": return "Nivel 4: Raspberry Pi";
      case "azul": return "Nivel 5: Python Code";
      case "marron": return "Nivel 6: AI & ML";
      case "negro": return "Nivel 7: Competidor Master";
      default: return belt;
    }
  };

  // Generate dynamic requirements list
  const getRequirementsList = (belt: string): RequirementItem[] => {
    const defaultReqs = [
      { name: "Lógica de programación por bloques", completed: true },
      { name: "Uso seguro de corriente en protoboard", completed: true },
      { name: "Variables, condicionales y bucles loops", completed: true }
    ];

    switch (belt?.toLowerCase()) {
      case "blanco":
        return [
          ...defaultReqs,
          { name: "Reto Maker: Proyecto interactivo Scratch", completed: false },
          { name: "Concepto de coordenadas X e Y en canvas", completed: false },
        ];
      case "amarillo":
        return [
          ...defaultReqs,
          { name: "Conexión de sensores de luz (LDR)", completed: true },
          { name: "Escritura de código básico en IDE C++", completed: true },
          { name: "Reto Maker: Semáforo con pulsador", completed: false },
          { name: "Uso del puerto serial para depuración", completed: false }
        ];
      case "naranja":
        return [
          ...defaultReqs,
          { name: "Conexión a red WiFi local", completed: true },
          { name: "Uso de protocolos de red I2C y SPI", completed: true },
          { name: "Reto Maker: Estación del clima IoT", completed: false },
          { name: "Conexión con dashboards móviles", completed: false }
        ];
      case "verde":
        return [
          { name: "Comandos básicos de consola Linux", completed: true },
          { name: "Reto Maker: Script en Python para GPIO", completed: false },
          { name: "Captura de fotos con módulo de cámara", completed: true },
          { name: "Servicios IoT de streaming web", completed: false },
          { name: "Conceptos de sistemas operativos embebidos", completed: true }
        ];
      case "azul":
        return [
          { name: "Programación Orientada a Objetos", completed: true },
          { name: "Reto Maker: Sistema de archivos dinámico", completed: false },
          { name: "Uso de APIs y formato JSON en Python", completed: true },
          { name: "Algoritmos avanzados de datos", completed: false },
          { name: "Control modular con clases personalizadas", completed: true }
        ];
      case "marron":
        return [
          { name: "Análisis de datos con NumPy y Pandas", completed: true },
          { name: "Modelos predictivos de regresión lineal", completed: false },
          { name: "Reto Maker: Detección facial con OpenCV", completed: true },
          { name: "Entrenamiento de redes neuronales simples", completed: true },
          { name: "Manipulación de tensores y matrices", completed: false }
        ];
      case "negro":
        return [
          { name: "Modelado 3D CAD e impresión física", completed: true },
          { name: "Reto Maker: Seguidor de líneas autónomo", completed: true },
          { name: "Integración de control PID", completed: true },
          { name: "Arquitectura ROS y simuladores de física", completed: true },
          { name: "Pruebas de campo en pista de torneo", completed: true }
        ];
      default:
        return defaultReqs;
    }
  };

  const chartData = [
    { month: 'Ene', asistencia: 85, videos: 40 },
    { month: 'Feb', asistencia: 90, videos: 60 },
    { month: 'Mar', asistencia: 92, videos: 75 },
    { month: 'Abr', asistencia: 95, videos: 80 },
    { month: 'May', asistencia: 94, videos: 82 },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando datos de progreso...</p>
      </div>
    );
  }

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

  const currentBeltPct = currentStudent ? getBeltPercentage(currentStudent.cinturon) : 0;
  const currentReqs = currentStudent ? getRequirementsList(currentStudent.cinturon) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {role === "sensei" ? "Seguimiento de Alumnos" : "Mi Progreso en Robótica & IA"}
          </h1>
          <p>
            {role === "sensei" 
              ? "Revisa la progresión y cumplimiento técnico de tu nómina de alumnos." 
              : "Revisa tu asistencia, avance de proyectos y preparación para tu próxima certificación."}
          </p>
        </div>

        {/* Sensei Student Selector */}
        {role === "sensei" && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '8.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}><Users size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Alumno:</span>
            <select 
              className={styles.selectInput}
              style={{ width: '220px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem' }}
              value={currentStudent?.id || ""}
              onChange={(e) => {
                const match = students.find(s => s.id === e.target.value);
                if (match) setCurrentStudent(match);
              }}
            >
              {students.map(st => (
                <option key={st.id} value={st.id}>{st.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {currentStudent ? (
        <div className={styles.grid}>
          {/* Card 1: Belt Profile */}
          <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-red)' }}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Avance de Certificación</span>
              <Award size={20} style={{ color: 'var(--brand-red)' }} />
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', margin: '0.5rem 0' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden' }}>
                {currentStudent.foto_url ? (
                  <img src={currentStudent.foto_url} alt={currentStudent.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  "🤖"
                )}
              </div>
              <div>
                <h3 style={{ textTransform: 'capitalize' }}>{getRoboticsLevelName(currentStudent.cinturon)}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Especialidad: {currentStudent.grado}</p>
                <span className={`belt-badge ${getBeltColorClass(currentStudent.cinturon)}`} style={{ marginTop: '0.4rem' }}>
                  {currentStudent.cinturon}
                </span>
              </div>
            </div>

            <div className={styles.progressContainer}>
              <div className={styles.progressText}>
                <span>Camino a Competidor Master</span>
                <span>{currentBeltPct}%</span>
              </div>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: `${currentBeltPct}%` }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--brand-red-light)', color: 'var(--brand-red)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>
              <ShieldCheck size={16} />
              <span>Nivel acreditado por el Comité Académico de IA Make</span>
            </div>
          </div>

          {/* Card 2: Quick Metrics */}
          <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-gold)' }}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Estadísticas Clave</span>
              <TrendingUp size={20} style={{ color: 'var(--brand-gold)' }} />
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{attendanceRate}%</span>
                <span className={styles.statLabel}>Asistencia</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{videosWatched}%</span>
                <span className={styles.statLabel}>Videos Vistos</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', marginTop: 'auto' }}>
              <Calendar size={18} style={{ color: 'var(--brand-gold)' }} />
              <div style={{ fontSize: '0.8rem' }}>
                <p style={{ fontWeight: 600 }}>Próxima Clase Presencial</p>
                <p style={{ color: 'var(--text-secondary)' }}>Sábado 10:00 AM - Fin de semana</p>
              </div>
            </div>
          </div>

          {/* Card 3: Requirements Checkbox */}
          <div className={styles.card} style={{ gridColumn: 'span 2' }}>
            <div className={styles.cardHeader} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span className={styles.cardTitle}>Requisitos Pendientes para Certificación de Nivel</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Basado en {getRoboticsLevelName(currentStudent.cinturon)}</span>
            </div>

            <div className={styles.checklist}>
              {currentReqs.map((req, idx) => (
                <div key={idx} className={`${styles.checkItem} ${req.completed ? styles.checked : styles.unchecked}`}>
                  {req.completed ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
                  <span style={{ textDecoration: req.completed ? 'line-through' : 'none' }}>
                    {req.name}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, color: req.completed ? 'var(--success)' : 'var(--text-tertiary)' }}>
                    {req.completed ? "Aprobado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Attendance Chart */}
          <div className={`${styles.card} ${styles.chartCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Constancia de Entrenamiento</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Evaluación últimos 5 meses</span>
            </div>
            
            <div style={{ height: '260px', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAsistencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-red)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--brand-red)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-gold)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--brand-gold)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)'}} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" name="Asistencia %" dataKey="asistencia" stroke="var(--brand-red)" strokeWidth={3} fillOpacity={1} fill="url(#colorAsistencia)" />
                  <Area type="monotone" name="Videos %" dataKey="videos" stroke="var(--brand-gold)" strokeWidth={3} fillOpacity={1} fill="url(#colorVideos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
          No hay alumnos seleccionados.
        </p>
      )}
    </div>
  );
}
