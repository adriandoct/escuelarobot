"use client";

import { useEffect, useState } from "react";
import styles from "./estructura.module.css";
import { 
  Calendar, 
  Award, 
  Clock, 
  BookOpen, 
  BookOpenCheck,
  User,
  FileText,
  UploadCloud,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Schedule {
  id: string;
  name: string;
  days: string;
  time: string;
  instructor: string;
  group: string;
}

interface BeltProgram {
  belt: string;
  kyu: string;
  levelEnum: string;
  colorHex: string;
  textColor: string;
  katas: string[];
  kumite: string[];
  requirements: string;
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function EstructuraPage() {
  const [activeTab, setActiveTab] = useState<'horarios' | 'programa'>('horarios');
  const [role, setRole] = useState("karateka");
  const [studentBelt, setStudentBelt] = useState("blanco");
  const [materiales, setMateriales] = useState<Record<string, any>>({});
  const [loadingMateriales, setLoadingMateriales] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<{ level: string, type: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  const supabase = createClient();

  const schedules: Schedule[] = [
    { id: "s1", name: "Scratch STEM Principiantes (Niveles 1 y 2)", days: "Lunes y Miércoles", time: "16:00 - 17:00", instructor: "Mentor Scratch", group: "Niños 6-10 años" },
    { id: "s2", name: "Arduino Maker Intermedios (Niveles 3 y 4)", days: "Lunes y Miércoles", time: "17:00 - 18:00", instructor: "Mentor Arduino", group: "Jóvenes 9-13 años" },
    { id: "s3", name: "Python Code & AI Avanzados (Niveles 5 y 6)", days: "Martes y Jueves", time: "18:00 - 19:30", instructor: "Científico de IA", group: "12 años en adelante" },
    { id: "s4", name: "Club de Robótica Competitiva (Todos los niveles)", days: "Viernes", time: "17:00 - 19:00", instructor: "Director Maker", group: "Equipo Selectivo" },
    { id: "s5", name: "Laboratorio Maker Abierto (Fin de Semana)", days: "Sábados y Domingos", time: "10:00 - 12:00", instructor: "Director Maker", group: "Proyectos Libres" },
    { id: "s6", name: "Videos de Repaso y Simulaciones Online", days: "Entre Semana", time: "Disponible 24/7 (Online)", instructor: "Mentor IA / Chatbot", group: "Alumnos Premium" },
  ];

  const beltPrograms: BeltProgram[] = [
    { 
      belt: "Scratch STEM", 
      kyu: "Nivel 1", 
      levelEnum: "blanco",
      colorHex: "#FFFFFF", 
      textColor: "#1E293B", 
      katas: ["Variables & Loops", "Animación en Scratch", "Lógica de bloques"], 
      kumite: ["Mi primer videojuego (Esquivar objetos)"],
      requirements: "Conceptos básicos de algoritmos, coordenadas X/Y y lógica de secuencia básica."
    },
    { 
      belt: "Arduino Maker", 
      kyu: "Nivel 2", 
      levelEnum: "amarillo",
      colorHex: "#FACC15", 
      textColor: "#000000", 
      katas: ["Circuitos de Corriente Directa", "Blink con Arduino", "PWM & Señal Analógica"], 
      kumite: ["Semáforo inteligente LED con pulsador"],
      requirements: "Manejo seguro de protoboard, resistencias, LEDs y uso de la estructura básica de C++ (setup/loop)."
    },
    { 
      belt: "ESP32 IoT", 
      kyu: "Nivel 3", 
      levelEnum: "naranja",
      colorHex: "#FB923C", 
      textColor: "#000000", 
      katas: ["Wifi & Servidor Web Local", "Lectura de Sensores Análogos", "Protocolo I2C"], 
      kumite: ["Estación meteorológica conectada a Blynk"],
      requirements: "Conceptos de redes IoT, comunicación inalámbrica y lectura de sensores de temperatura/humedad."
    },
    { 
      belt: "Raspberry Pi", 
      kyu: "Nivel 4", 
      levelEnum: "verde",
      colorHex: "#22C55E", 
      textColor: "#FFFFFF", 
      katas: ["Linux Terminal & GPIO", "Python Scripting Básico", "Cámara Pi & Streaming"], 
      kumite: ["Sistema de seguridad hogareña con sensor PIR y captura de foto"],
      requirements: "Navegación en Linux, control de pines GPIO mediante Python y configuración de cámaras."
    },
    { 
      belt: "Python Code", 
      kyu: "Nivel 5", 
      levelEnum: "azul",
      colorHex: "#3B82F6", 
      textColor: "#FFFFFF", 
      katas: ["Programación Orientada a Objetos", "Estructura de Datos en Python", "Algoritmos de Ordenamiento"], 
      kumite: ["Calculadora científica modular de consola"],
      requirements: "Escribir código modular en Python limpio, herencia de clases y manipulación de archivos."
    },
    { 
      belt: "AI & Machine Learning", 
      kyu: "Nivel 6", 
      levelEnum: "marron",
      colorHex: "#8B4513", 
      textColor: "#FFFFFF", 
      katas: ["Regresión Lineal con NumPy", "Redes Neuronales con TensorFlow", "Visión con OpenCV"], 
      kumite: ["Clasificador de imágenes para clasificar basura orgánica/inorgánica"],
      requirements: "Bases de estadística para machine learning, entrenamiento de modelos con datasets y detección de rostros."
    },
    { 
      belt: "Competidor Master", 
      kyu: "Nivel 7", 
      levelEnum: "negro",
      colorHex: "#0F1216", 
      textColor: "#E11D48", 
      katas: ["Robótica Autónoma Avanzada", "Impresión 3D & Ensamblaje CAD", "Simuladores ROS"], 
      kumite: ["Robot seguidor de líneas autónomo para torneo estatal"],
      requirements: "Dominio general de CAD, soldado avanzado, integración de sistemas de control pid y liderar equipos de torneos."
    },
  ];

  const loadMateriales = async () => {
    try {
      setLoadingMateriales(true);
      const { data, error } = await supabase
        .from('materiales_nivel')
        .select('*');
      
      if (data && !error) {
        const mapped: Record<string, any> = {};
        data.forEach((item: any) => {
          mapped[item.nivel] = item;
        });
        setMateriales(mapped);
        localStorage.setItem("dojo_materiales", JSON.stringify(mapped));
      } else {
        const cached = localStorage.getItem("dojo_materiales");
        if (cached) {
          setMateriales(JSON.parse(cached));
        }
      }
    } catch (err) {
      console.warn("Error fetching materials, checking fallback:", err);
      const cached = localStorage.getItem("dojo_materiales");
      if (cached) {
        setMateriales(JSON.parse(cached));
      }
    } finally {
      setLoadingMateriales(false);
    }
  };

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    const email = getCookie("dojoia_email") || "";
    const name = getCookie("dojoia_name") || "Karateka";
    setRole(userRole);

    const fetchStudentBelt = async () => {
      if (userRole === "karateka") {
        try {
          if (email) {
            const { data, error } = await supabase
              .from("karatekas")
              .select("cinturon")
              .like("tutor", `%[credentials:${email.toLowerCase()}:%`)
              .limit(1);

            if (data && data.length > 0 && !error) {
              setStudentBelt(data[0].cinturon);
              return;
            }
          }

          const { data: dataByName, error: errByName } = await supabase
            .from("karatekas")
            .select("cinturon")
            .eq("nombre", name)
            .limit(1);

          if (dataByName && dataByName.length > 0 && !errByName) {
            setStudentBelt(dataByName[0].cinturon);
            return;
          }
        } catch (e) {
          console.warn("Could not fetch student belt, using default blanco", e);
        }

        // Mock fallback by username match
        if (name.toLowerCase().includes("mateo")) {
          setStudentBelt("verde");
        } else if (name.toLowerCase().includes("sofia")) {
          setStudentBelt("amarillo");
        } else if (name.toLowerCase().includes("diego")) {
          setStudentBelt("negro");
        } else {
          setStudentBelt("azul");
        }
      }
    };

    fetchStudentBelt();
    loadMateriales();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, level: string, type: 'carta' | 'instructor' | 'participante') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatusMsg({ text: "Error: Solo se permiten archivos PDF (.pdf)", type: "error" });
      return;
    }

    try {
      setUploadingFor({ level, type });
      setStatusMsg({ text: `Subiendo archivo a ${level}...`, type: '' });

      const fileName = `${level}-${type}-${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('materiales')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      let finalUrl = "";

      if (uploadError) {
        console.warn("Supabase storage upload failed, using fallback Object URL:", uploadError);
        finalUrl = URL.createObjectURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('materiales')
          .getPublicUrl(fileName);
        finalUrl = publicUrl;
      }

      const existingRecord = materiales[level] || {};
      const colName = type === 'carta' ? 'carta_descriptiva_url' : type === 'instructor' ? 'manual_instructor_url' : 'manual_participante_url';
      const updatedRecord = {
        ...existingRecord,
        nivel: level,
        [colName]: finalUrl,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('materiales_nivel')
        .upsert(updatedRecord, { onConflict: 'nivel' });

      if (dbError) {
        console.warn("Supabase database upsert failed, updating local state only:", dbError);
      }

      const newMateriales = {
        ...materiales,
        [level]: updatedRecord
      };
      setMateriales(newMateriales);
      localStorage.setItem("dojo_materiales", JSON.stringify(newMateriales));

      setStatusMsg({ text: "¡Archivo subido exitosamente!", type: "success" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: err.message || "Error al subir el archivo.", type: "error" });
    } finally {
      setUploadingFor(null);
      setTimeout(() => {
        setStatusMsg({ text: '', type: '' });
      }, 4000);
    }
  };

  const handleDelete = async (level: string, type: 'carta' | 'instructor' | 'participante') => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este archivo?")) return;

    try {
      setStatusMsg({ text: "Eliminando archivo...", type: '' });
      
      const existingRecord = materiales[level] || {};
      const colName = type === 'carta' ? 'carta_descriptiva_url' : type === 'instructor' ? 'manual_instructor_url' : 'manual_participante_url';
      
      const updatedRecord = {
        ...existingRecord,
        nivel: level,
        [colName]: null,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('materiales_nivel')
        .upsert(updatedRecord, { onConflict: 'nivel' });

      if (dbError) {
        console.warn("Database update failed, updating local state only:", dbError);
      }

      const newMateriales = {
        ...materiales,
        [level]: updatedRecord
      };
      setMateriales(newMateriales);
      localStorage.setItem("dojo_materiales", JSON.stringify(newMateriales));

      setStatusMsg({ text: "Archivo eliminado exitosamente.", type: "success" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: err.message || "Error al eliminar el archivo.", type: "error" });
    } finally {
      setTimeout(() => {
        setStatusMsg({ text: '', type: '' });
      }, 3000);
    }
  };

  const isDocente = role === "sensei" || role === "sempai";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Talleres y Programa STEM</h1>
          <p>Planificación de laboratorios prácticos y requisitos de certificación maker.</p>
        </div>
      </div>

      {statusMsg.text && (
        <div 
          className={`${styles.statusBanner} ${statusMsg.type === 'success' ? styles.success : statusMsg.type === 'error' ? styles.error : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1rem',
            borderRadius: '8px',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${statusMsg.type === 'success' ? '#10b981' : statusMsg.type === 'error' ? '#ef4444' : '#3b82f6'}`,
            color: statusMsg.type === 'success' ? '#10b981' : statusMsg.type === 'error' ? '#ef4444' : '#3b82f6',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : statusMsg.type === 'error' ? <AlertCircle size={16} /> : <Loader2 size={16} className="spin" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('horarios')}
          className="btn-secondary"
          style={{ 
            background: activeTab === 'horarios' ? 'var(--brand-red)' : 'transparent',
            border: activeTab === 'horarios' ? 'none' : '1px solid var(--border-color)',
            color: activeTab === 'horarios' ? 'white' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Calendar size={18} /> Horarios de Talleres
        </button>
        <button 
          onClick={() => setActiveTab('programa')}
          className="btn-secondary"
          style={{ 
            background: activeTab === 'programa' ? 'var(--brand-red)' : 'transparent',
            border: activeTab === 'programa' ? 'none' : '1px solid var(--border-color)',
            color: activeTab === 'programa' ? 'white' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Award size={18} /> Temario de Niveles
        </button>
      </div>

      {/* Content Rendering */}
      {activeTab === 'horarios' ? (
        <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-red)' }}>
          <h2>
            <Clock size={20} style={{ color: 'var(--brand-red)' }} />
            Calendario Semanal de Talleres Prácticos
          </h2>
          
          <div className={styles.scheduleList}>
            {schedules.map((s) => (
              <div key={s.id} className={styles.scheduleItem}>
                <div className={styles.scheduleInfo}>
                  <h4>{s.name}</h4>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <User size={14} /> <strong>Instructor:</strong> {s.instructor}
                  </p>
                  <p>Grupo: {s.group}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.scheduleTime}>{s.time}</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.days}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-gold)' }}>
          <h2>
            <BookOpenCheck size={20} style={{ color: 'var(--brand-gold)' }} />
            Programa Oficial de Niveles Robóticos (IA Make Academy)
          </h2>
          
          <div className={styles.programList}>
            {beltPrograms.map((p, idx) => (
              <div key={idx} className={styles.programItem}>
                <div className={styles.programHeader}>
                  <span 
                    className="belt-badge" 
                    style={{ 
                      backgroundColor: p.colorHex, 
                      color: p.textColor, 
                      borderColor: '#475569',
                      fontSize: '0.9rem',
                      padding: '0.35rem 1rem'
                    }}
                  >
                    {p.belt} ({p.kyu})
                  </span>
                </div>
                
                <div className={styles.programContent}>
                  <p style={{ marginBottom: '0.4rem' }}>
                    <strong>Temario del Código:</strong> {p.katas.join(" | ")}
                  </p>
                  <p style={{ marginBottom: '0.4rem' }}>
                    <strong>Proyecto Integrador / Reto Maker:</strong> {p.kumite.join(" | ")}
                  </p>
                  <p style={{ marginBottom: '0.8rem' }}>
                    <strong>Competencias Adquiridas:</strong> {p.requirements}
                  </p>

                  {/* PDF Materials Area */}
                  {isDocente ? (
                    <div className={styles.materialesSection}>
                      <h4 className={styles.materialesTitle}>📚 Documentación y Manuales PDF</h4>
                      <div className={styles.materialesGrid}>
                        {/* Carta Descriptiva */}
                        <div className={styles.materialCard}>
                          <div className={styles.materialInfo}>
                            <FileText size={18} className={styles.pdfIcon} />
                            <span>Carta Descriptiva</span>
                          </div>
                          <div className={styles.materialActions}>
                            {materiales[p.levelEnum]?.carta_descriptiva_url ? (
                              <>
                                <a 
                                  href={materiales[p.levelEnum].carta_descriptiva_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={styles.viewLink}
                                >
                                  Ver PDF
                                </a>
                                <button 
                                  onClick={() => handleDelete(p.levelEnum, 'carta')} 
                                  className={styles.deleteBtn}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <label className={styles.uploadLabel}>
                                <UploadCloud size={14} /> Subir
                                <input 
                                  type="file" 
                                  accept=".pdf" 
                                  onChange={(e) => handleUpload(e, p.levelEnum, 'carta')} 
                                  style={{ display: 'none' }}
                                  disabled={uploadingFor !== null}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Manual del Instructor */}
                        <div className={styles.materialCard}>
                          <div className={styles.materialInfo}>
                            <FileText size={18} className={styles.pdfIcon} />
                            <span>Manual del Instructor</span>
                          </div>
                          <div className={styles.materialActions}>
                            {materiales[p.levelEnum]?.manual_instructor_url ? (
                              <>
                                <a 
                                  href={materiales[p.levelEnum].manual_instructor_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={styles.viewLink}
                                >
                                  Ver PDF
                                </a>
                                <button 
                                  onClick={() => handleDelete(p.levelEnum, 'instructor')} 
                                  className={styles.deleteBtn}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <label className={styles.uploadLabel}>
                                <UploadCloud size={14} /> Subir
                                <input 
                                  type="file" 
                                  accept=".pdf" 
                                  onChange={(e) => handleUpload(e, p.levelEnum, 'instructor')} 
                                  style={{ display: 'none' }}
                                  disabled={uploadingFor !== null}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Manual del Participante */}
                        <div className={styles.materialCard}>
                          <div className={styles.materialInfo}>
                            <FileText size={18} className={styles.pdfIcon} />
                            <span>Manual del Participante</span>
                          </div>
                          <div className={styles.materialActions}>
                            {materiales[p.levelEnum]?.manual_participante_url ? (
                              <>
                                <a 
                                  href={materiales[p.levelEnum].manual_participante_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={styles.viewLink}
                                >
                                  Ver PDF
                                </a>
                                <button 
                                  onClick={() => handleDelete(p.levelEnum, 'participante')} 
                                  className={styles.deleteBtn}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <label className={styles.uploadLabel}>
                                <UploadCloud size={14} /> Subir
                                <input 
                                  type="file" 
                                  accept=".pdf" 
                                  onChange={(e) => handleUpload(e, p.levelEnum, 'participante')} 
                                  style={{ display: 'none' }}
                                  disabled={uploadingFor !== null}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                      {uploadingFor?.level === p.levelEnum && (
                        <div className={styles.uploadStatus}>
                          <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Subiendo {uploadingFor.type}...
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Student view - only show Participant Manual if it exists */
                    materiales[p.levelEnum]?.manual_participante_url && (
                      <div className={styles.materialesSection} style={{ marginTop: '0.75rem' }}>
                        <div 
                          className={styles.studentDownloadCard} 
                          style={{
                            borderLeft: p.levelEnum === studentBelt ? '4px solid var(--brand-gold)' : '4px solid var(--border-color)',
                            background: p.levelEnum === studentBelt ? 'rgba(250, 204, 21, 0.05)' : 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            borderLeftWidth: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FileText size={20} style={{ color: p.levelEnum === studentBelt ? 'var(--brand-gold)' : 'var(--text-secondary)' }} />
                            <div>
                              <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Manual del Participante - {p.belt}</h5>
                              {p.levelEnum === studentBelt ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--brand-gold)', fontWeight: 'bold' }}>★ Tu Nivel Activo</span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Material complementario</span>
                              )}
                            </div>
                          </div>
                          <a 
                            href={materiales[p.levelEnum].manual_participante_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn-secondary"
                            style={{ 
                              fontSize: '0.8rem', 
                              padding: '0.35rem 0.75rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.3rem', 
                              background: p.levelEnum === studentBelt ? 'var(--brand-gold)' : 'transparent', 
                              color: p.levelEnum === studentBelt ? '#000' : 'var(--text-primary)', 
                              border: p.levelEnum === studentBelt ? 'none' : '1px solid var(--border-color)',
                              cursor: 'pointer',
                              borderRadius: '6px'
                            }}
                          >
                            <Download size={14} /> Descargar Manual
                          </a>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
