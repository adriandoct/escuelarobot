"use client";

import { useEffect, useState } from "react";
import styles from "./manuales.module.css";
import { 
  FileText, 
  BookOpen, 
  UploadCloud, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Eye
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface BeltProgram {
  belt: string;
  kyu: string;
  levelEnum: string;
  colorHex: string;
  textColor: string;
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function ManualesPage() {
  const [role, setRole] = useState("karateka");
  const [userName, setUserName] = useState("Karateka");
  const [studentBelt, setStudentBelt] = useState("blanco");
  const [materiales, setMateriales] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState<{ level: string, type: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  const supabase = createClient();

  const beltPrograms: BeltProgram[] = [
    { belt: "Scratch STEM", kyu: "Nivel 1", levelEnum: "blanco", colorHex: "#FFFFFF", textColor: "#1E293B" },
    { belt: "Arduino Maker", kyu: "Nivel 2", levelEnum: "amarillo", colorHex: "#FACC15", textColor: "#000000" },
    { belt: "ESP32 IoT", kyu: "Nivel 3", levelEnum: "naranja", colorHex: "#FB923C", textColor: "#000000" },
    { belt: "Raspberry Pi", kyu: "Nivel 4", levelEnum: "verde", colorHex: "#22C55E", textColor: "#FFFFFF" },
    { belt: "Python Code", kyu: "Nivel 5", levelEnum: "azul", colorHex: "#3B82F6", textColor: "#FFFFFF" },
    { belt: "AI & Machine Learning", kyu: "Nivel 6", levelEnum: "marron", colorHex: "#8B4513", textColor: "#FFFFFF" },
    { belt: "Competidor Master", kyu: "Nivel 7", levelEnum: "negro", colorHex: "#0F1216", textColor: "#E11D48" },
  ];

  const loadMateriales = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    const name = getCookie("dojoia_name") || "Karateka";
    const email = getCookie("dojoia_email") || "";
    setRole(userRole);
    setUserName(name);

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

      let finalUrl = "";

      if (!supabase.storage) {
        console.warn("Supabase storage is not initialized (offline/mock mode). Falling back to Object URL.");
        finalUrl = URL.createObjectURL(file);
      } else {
        const fileName = `${level}-${type}-${Date.now()}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('materiales')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.warn("Supabase storage upload failed, using fallback Object URL:", uploadError);
          finalUrl = URL.createObjectURL(file);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('materiales')
            .getPublicUrl(fileName);
          finalUrl = publicUrl;
        }
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

  const getRoboticsLevelName = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return "Scratch STEM";
      case "amarillo": return "Arduino Maker";
      case "naranja": return "ESP32 IoT";
      case "verde": return "Raspberry Pi";
      case "azul": return "Python Code";
      case "marron": return "AI & Machine Learning";
      case "negro": return "Competidor Master";
      default: return belt;
    }
  };

  const isDocente = role === "sensei" || role === "sempai";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Manuales y Material Didáctico</h1>
          <p>
            {isDocente 
              ? "Sube y gestiona las cartas descriptivas y manuales didácticos de cada nivel de robótica." 
              : "Consulta y descarga tu manual de participante y material didáctico complementario."}
          </p>
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
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : statusMsg.type === 'error' ? <AlertCircle size={16} /> : <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={36} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Cargando manuales del sistema...</span>
        </div>
      ) : (
        <>
          {isDocente ? (
            /* TEACHER/ADMINISTRATOR VIEW */
            <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-red)' }}>
              <h2>
                <BookOpen size={20} style={{ color: 'var(--brand-red)' }} />
                Panel de Carga y Gestión de Manuales
              </h2>

              <div className={styles.manualesList}>
                {beltPrograms.map((p, idx) => (
                  <div key={idx} className={styles.manualesItem}>
                    <div className={styles.levelHeader}>
                      <span className={styles.levelTitle}>{p.belt} ({p.kyu})</span>
                      <span 
                        className="belt-badge" 
                        style={{ 
                          backgroundColor: p.colorHex, 
                          color: p.textColor, 
                          borderColor: '#475569',
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem'
                        }}
                      >
                        Nivel {idx + 1}
                      </span>
                    </div>

                    <div className={styles.grid}>
                      {/* Carta Descriptiva */}
                      <div className={styles.pdfCard}>
                        <div className={styles.pdfInfo}>
                          <FileText size={24} className={styles.pdfIcon} />
                          <div>
                            <span className={styles.pdfTitle}>Carta Descriptiva</span>
                            <div className={styles.pdfSubtitle}>Estructura académica</div>
                          </div>
                        </div>
                        <div className={styles.pdfActions}>
                          {materiales[p.levelEnum]?.carta_descriptiva_url ? (
                            <>
                              <a 
                                href={materiales[p.levelEnum].carta_descriptiva_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={styles.viewLink}
                              >
                                <Eye size={14} /> Ver PDF
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
                            <label className={styles.uploadLabel} style={{ width: '100%' }}>
                              <UploadCloud size={14} /> Subir Carta Descriptiva
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
                      <div className={styles.pdfCard}>
                        <div className={styles.pdfInfo}>
                          <FileText size={24} className={styles.pdfIcon} />
                          <div>
                            <span className={styles.pdfTitle}>Manual del Instructor</span>
                            <div className={styles.pdfSubtitle}>Guías y respuestas</div>
                          </div>
                        </div>
                        <div className={styles.pdfActions}>
                          {materiales[p.levelEnum]?.manual_instructor_url ? (
                            <>
                              <a 
                                href={materiales[p.levelEnum].manual_instructor_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={styles.viewLink}
                              >
                                <Eye size={14} /> Ver PDF
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
                            <label className={styles.uploadLabel} style={{ width: '100%' }}>
                              <UploadCloud size={14} /> Subir Manual Instructor
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
                      <div className={styles.pdfCard}>
                        <div className={styles.pdfInfo}>
                          <FileText size={24} className={styles.pdfIcon} />
                          <div>
                            <span className={styles.pdfTitle}>Manual del Participante</span>
                            <div className={styles.pdfSubtitle}>Guía para el alumno</div>
                          </div>
                        </div>
                        <div className={styles.pdfActions}>
                          {materiales[p.levelEnum]?.manual_participante_url ? (
                            <>
                              <a 
                                href={materiales[p.levelEnum].manual_participante_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={styles.viewLink}
                              >
                                <Eye size={14} /> Ver PDF
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
                            <label className={styles.uploadLabel} style={{ width: '100%' }}>
                              <UploadCloud size={14} /> Subir Manual Participante
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
                        <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Subiendo {uploadingFor.type}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STUDENT VIEW */
            <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-gold)' }}>
              <h2>
                <BookOpen size={20} style={{ color: 'var(--brand-gold)' }} />
                Biblioteca de Manuales y Materiales Maker
              </h2>

              {/* 1. Active Level Manual Card (Most prominent) */}
              <div className={styles.studentActiveSection}>
                <div className={styles.studentActiveTitle}>
                  <BookOpen size={24} style={{ color: 'var(--brand-gold)' }} />
                  <span>Tu Manual de Taller Activo: {getRoboticsLevelName(studentBelt)}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '650px' }}>
                  Este es el manual del participante que corresponde a tu cinturón técnico actual. Descárgalo para repasar las actividades, retarse con los proyectos y revisar los temas de clase en tu casa.
                </p>

                {materiales[studentBelt]?.manual_participante_url ? (
                  <div style={{ marginTop: '0.5rem' }}>
                    <a 
                      href={materiales[studentBelt].manual_participante_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className={styles.downloadBtn}
                      style={{ display: 'inline-flex', alignSelf: 'flex-start' }}
                    >
                      <Download size={18} /> Descargar Manual Activo (.pdf)
                    </a>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    marginTop: '0.5rem'
                  }}>
                    <AlertCircle size={16} /> El manual oficial para este nivel estará disponible muy pronto. Consulta con tu Mentor.
                  </div>
                )}
              </div>

              {/* 2. Grid of other levels */}
              <h3 style={{ fontSize: '1.2rem', marginTop: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Manuales de otros niveles para consulta
              </h3>
              <div className={styles.studentGrid}>
                {beltPrograms.map((p, idx) => {
                  const hasManual = !!materiales[p.levelEnum]?.manual_participante_url;
                  const isActive = p.levelEnum === studentBelt;
                  
                  // Skip displaying active level here as it is featured above
                  if (isActive) return null;

                  return (
                    <div key={idx} className={styles.studentCard}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span 
                            className="belt-badge" 
                            style={{ 
                              backgroundColor: p.colorHex, 
                              color: p.textColor, 
                              borderColor: '#475569',
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem'
                            }}
                          >
                            Nivel {idx + 1}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{p.belt}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Temas: {p.kyu} | Manual del participante complementario.
                        </p>
                      </div>

                      <div style={{ marginTop: '0.5rem' }}>
                        {hasManual ? (
                          <a 
                            href={materiales[p.levelEnum].manual_participante_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className={styles.secondaryDownloadBtn}
                          >
                            <Download size={14} /> Descargar Manual
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                            Próximamente disponible
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
