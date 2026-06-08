"use client";

import { useEffect, useState } from "react";
import styles from "./examenes.module.css";
import { 
  CheckSquare, 
  Award, 
  Play, 
  Video, 
  ClipboardCheck, 
  UserCheck, 
  MessageSquare,
  FileText,
  Clock,
  Sparkles
} from "lucide-react";
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

interface ExamRequest {
  id: string;
  karateka_id: string;
  cinturon_solicitado: string;
  grado_solicitado: string;
  video_evidencia_url: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  comentarios_sensei?: string;
  calificacion?: number;
  fecha_evaluacion?: string;
  created_at: string;
  karateka?: {
    nombre: string;
    cinturon: string;
    grado: string;
    foto_url: string;
  };
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

const isPlayableVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes("youtube.com") || lowercaseUrl.includes("youtu.be") || lowercaseUrl.includes("vimeo.com")) {
    return false;
  }
  
  return lowercaseUrl.endsWith(".mp4") || 
         lowercaseUrl.endsWith(".webm") || 
         lowercaseUrl.endsWith(".mov") || 
         lowercaseUrl.endsWith(".ogg") || 
         lowercaseUrl.endsWith(".mkv") || 
         lowercaseUrl.endsWith(".avi") || 
         lowercaseUrl.endsWith(".3gp") || 
         lowercaseUrl.endsWith(".m4v") || 
         lowercaseUrl.startsWith("blob:") || 
         lowercaseUrl.startsWith("data:video/") || 
         lowercaseUrl.includes("/storage/v1/object/");
};

export default function ExamenesPage() {
  const [role, setRole] = useState("karateka");
  const [userName, setUserName] = useState("Alumno");
  const [currentKarateka, setCurrentKarateka] = useState<Karateka | null>(null);
  const [karatekas, setKaratekas] = useState<Karateka[]>([]);
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExamRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Student Form States
  const [cinturonSolicitado, setCinturonSolicitado] = useState("amarillo");
  const [gradoSolicitado, setGradoSolicitado] = useState("Arduino Maker");
  const [videoEvidenciaUrl, setVideoEvidenciaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sensei Review Form States
  const [calificacion, setCalificacion] = useState(9.0);
  const [comentariosSensei, setComentariosSensei] = useState("");
  const [grading, setGrading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    const name = getCookie("dojoia_name") || "Alumno";
    
    setRole(userRole);
    setUserName(name);
    
    loadData(userRole, name);
  }, []);

  const getRoboticsLevelName = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return "Scratch STEM (Nivel 1)";
      case "amarillo": return "Arduino Maker (Nivel 2)";
      case "naranja": return "ESP32 IoT (Nivel 3)";
      case "verde": return "Raspberry Pi (Nivel 4)";
      case "azul": return "Python Code (Nivel 5)";
      case "marron": return "AI & Machine Learning (Nivel 6)";
      case "negro": return "Competidor Master (Nivel 7)";
      default: return belt || "Nivel Inicial";
    }
  };

  const loadData = async (userRole: string, name: string) => {
    try {
      setLoading(true);
      
      // 1. Fetch karatekas
      let localKaratekas: Karateka[] = [];
      const { data: kData } = await supabase.from("karatekas").select("*").eq("activo", true);
      
      if (kData && kData.length > 0) {
        localKaratekas = kData;
      } else {
        const cached = localStorage.getItem("local_karatekas");
        if (cached) localKaratekas = JSON.parse(cached);
      }
      setKaratekas(localKaratekas);

      // Find current student if role is karateka
      let student: Karateka | null = null;
      if (userRole === "karateka") {
        student = localKaratekas.find(k => k.nombre.toLowerCase().includes(name.toLowerCase())) || localKaratekas[3] || localKaratekas[0] || null;
        setCurrentKarateka(student);
      }

      // 2. Fetch requests
      let reqList: ExamRequest[] = [];
      const { data: rData } = await supabase
        .from("examenes_solicitudes")
        .select(`
          id, karateka_id, cinturon_solicitado, grado_solicitado, video_evidencia_url, estado, comentarios_sensei, calificacion, fecha_evaluacion, created_at,
          karatekas(nombre, cinturon, grado, foto_url)
        `)
        .order("created_at", { ascending: false });

      if (rData && rData.length > 0) {
        reqList = rData.map((r: any) => ({
          ...r,
          karateka: r.karatekas
        }));
      } else {
        const cachedReqs = localStorage.getItem("dojo_exam_requests");
        if (cachedReqs) {
          reqList = JSON.parse(cachedReqs);
        } else {
          // Default seed data
          reqList = [
            {
              id: "r1",
              karateka_id: localKaratekas[0]?.id || "1",
              cinturon_solicitado: "verde",
              grado_solicitado: "Raspberry Pi",
              video_evidencia_url: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
              estado: "aprobado",
              comentarios_sensei: "Excelente uso de GPIO en la Raspberry Pi. Muy bien estructuradas las funciones en Python. ¡Buen trabajo!",
              calificacion: 9.4,
              fecha_evaluacion: new Date().toISOString(),
              created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
              karateka: {
                nombre: localKaratekas[0]?.nombre || "Mateo García López",
                cinturon: "naranja",
                grado: "ESP32 IoT",
                foto_url: localKaratekas[0]?.foto_url || ""
              }
            },
            {
              id: "r2",
              karateka_id: localKaratekas[1]?.id || "2",
              cinturon_solicitado: "amarillo",
              grado_solicitado: "Arduino Maker",
              video_evidencia_url: "https://vjs.zencdn.net/v/oceans.mp4",
              estado: "pendiente",
              created_at: new Date().toISOString(),
              karateka: {
                nombre: localKaratekas[1]?.nombre || "Sofía Martínez Ruiz",
                cinturon: "blanco",
                grado: "Scratch STEM",
                foto_url: localKaratekas[1]?.foto_url || ""
              }
            }
          ];
          localStorage.setItem("dojo_exam_requests", JSON.stringify(reqList));
        }
      }
      setRequests(reqList);
      
      // Auto select first pending request for Sensei (Mentor/Admin)
      if (userRole === "sensei") {
        const pending = reqList.find(r => r.estado === "pendiente");
        setSelectedRequest(pending || reqList[0] || null);
      }
    } catch (e) {
      console.warn("Exams loading failed, using fallback.", e);
    } finally {
      setLoading(false);
    }
  };

  // Submit Exam Request (Student)
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoEvidenciaUrl) {
      alert("Por favor ingresa una URL con tu video de evidencia.");
      return;
    }
    if (!currentKarateka) {
      alert("No se encontró tu perfil de Alumno.");
      return;
    }

    try {
      setSubmitting(true);
      const newRequestData = {
        karateka_id: currentKarateka.id,
        cinturon_solicitado: cinturonSolicitado,
        grado_solicitado: gradoSolicitado,
        video_evidencia_url: videoEvidenciaUrl,
        estado: "pendiente" as const,
        created_at: new Date().toISOString()
      };

      // 1. Insert to Supabase
      let dbRequest = null;
      try {
        const { data, error } = await supabase
          .from("examenes_solicitudes")
          .insert([newRequestData])
          .select();

        if (data && data.length > 0) {
          dbRequest = data[0];
        }
      } catch (dbErr) {
        console.warn("Could not insert request in DB. Using local storage.", dbErr);
      }

      // 2. Local State update
      const localId = dbRequest?.id || `r_${Date.now()}`;
      const fullRequest: ExamRequest = {
        id: localId,
        ...newRequestData,
        karateka: {
          nombre: currentKarateka.nombre,
          cinturon: currentKarateka.cinturon,
          grado: currentKarateka.grado,
          foto_url: currentKarateka.foto_url
        }
      };

      const updatedRequests = [fullRequest, ...requests];
      setRequests(updatedRequests);
      localStorage.setItem("dojo_exam_requests", JSON.stringify(updatedRequests));

      setVideoEvidenciaUrl("");
      alert("¡Tu video de evidencia ha sido enviado con éxito! El Evaluador lo calificará pronto.");
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al enviar tu solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  // Authorize/Approve Exam (Sensei)
  const handleGradeRequest = async (status: 'aprobado' | 'rechazado') => {
    if (!selectedRequest) return;
    if (!comentariosSensei) {
      alert("Por favor ingresa retroalimentación para el alumno.");
      return;
    }

    try {
      setGrading(true);

      const evaluation = {
        estado: status,
        comentarios_sensei: comentariosSensei,
        calificacion: status === 'aprobado' ? calificacion : undefined,
        fecha_evaluacion: new Date().toISOString()
      };

      // 1. Update request in Supabase
      try {
        await supabase
          .from("examenes_solicitudes")
          .update(evaluation)
          .eq("id", selectedRequest.id);
      } catch (e) {
        console.warn("Database request update failed.", e);
      }

      // 2. Promote Karateka & Add points if approved
      if (status === 'aprobado') {
        const targetBelt = selectedRequest.cinturon_solicitado;
        const targetGrado = selectedRequest.grado_solicitado;
        
        // Update database
        try {
          // Fetch student current points
          const { data: stData } = await supabase.from("karatekas").select("puntos").eq("id", selectedRequest.karateka_id).single();
          const currentPoints = stData?.puntos || 100;
          
          await supabase
            .from("karatekas")
            .update({
              cinturon: targetBelt,
              grado: targetGrado,
              puntos: currentPoints + 250 // Reward 250 pts for exam approval
            })
            .eq("id", selectedRequest.karateka_id);

          // Generate Certificate
          const certCode = `CERT-MAKE-${Date.now().toString().slice(-4)}-${selectedRequest.karateka_id.slice(0, 4).toUpperCase()}`;
          await supabase
            .from("certificados")
            .insert([{
              exam_id: selectedRequest.id,
              karateka_id: selectedRequest.karateka_id,
              codigo_certificado: certCode
            }]);
        } catch (dbErr) {
          console.warn("Dojo promotion database updates failed. Performing LocalStorage fallback.", dbErr);
        }

        // Local Storage Fallback: Promote Student in local list
        const storedKaratekas = localStorage.getItem("local_karatekas");
        if (storedKaratekas) {
          const kList: Karateka[] = JSON.parse(storedKaratekas);
          const updatedKList = kList.map(k => {
            if (k.id === selectedRequest.karateka_id) {
              return {
                ...k,
                cinturon: targetBelt,
                grado: targetGrado,
                puntos: (k.puntos || 100) + 250
              };
            }
            return k;
          });
          setKaratekas(updatedKList);
          localStorage.setItem("local_karatekas", JSON.stringify(updatedKList));
        }

        // Generate Certificate in LocalStorage
        const certCode = `CERT-MAKE-${Date.now().toString().slice(-4)}-${selectedRequest.karateka_id.slice(0, 4).toUpperCase()}`;
        const localCerts = localStorage.getItem("dojo_certificados");
        const certList = localCerts ? JSON.parse(localCerts) : [];
        const newCert = {
          id: `cert_${Date.now()}`,
          exam_id: selectedRequest.id,
          karateka_id: selectedRequest.karateka_id,
          codigo_certificado: certCode,
          fecha_emision: new Date().toISOString().split("T")[0]
        };
        localStorage.setItem("dojo_certificados", JSON.stringify([newCert, ...certList]));
      }

      // 3. Update requests list in state and LocalStorage
      const updatedRequests = requests.map(r => {
        if (r.id === selectedRequest.id) {
          return {
            ...r,
            estado: status,
            comentarios_sensei: comentariosSensei,
            calificacion: status === 'aprobado' ? calificacion : undefined,
            fecha_evaluacion: new Date().toISOString()
          };
        }
        return r;
      });
      setRequests(updatedRequests);
      localStorage.setItem("dojo_exam_requests", JSON.stringify(updatedRequests));

      setComentariosSensei("");
      setSelectedRequest(null);
      
      alert(status === 'aprobado' 
        ? "🤖 ¡Proyecto certificado con éxito! El alumno ha sido promovido de nivel y se ha generado su certificado."
        : "Se ha enviado la retroalimentación de corrección al alumno."
      );
    } catch (err) {
      console.error(err);
      alert("Error al calificar el examen.");
    } finally {
      setGrading(false);
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

  // Filter student requests
  const studentRequests = currentKarateka 
    ? requests.filter(r => r.karateka_id === currentKarateka.id)
    : [];

  const activeStudentRequest = studentRequests.find(r => r.estado === 'pendiente');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {role === "sensei" ? "Certificación y Evaluación de Proyectos" : "Evaluación de Proyectos STEM"}
          </h1>
          <p>
            {role === "sensei" 
              ? "Revisa los videos de evidencia de proyectos de tus alumnos, asígnales calificación y autoriza su ascenso de nivel." 
              : "Envía un video de demostración de tu proyecto integrador para que tu Evaluador certifique tu nivel."}
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando portal de evaluaciones...</p>
      ) : role === "karateka" ? (
        /* ==================== PORTAL ALUMNO ==================== */
        <div className={styles.grid}>
          {/* Card 1: Submit new request */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Video size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--brand-red)' }} />
              Certificación de Próximo Nivel
            </h2>

            {currentKarateka && (
              <div className={styles.studentMeta} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div className={styles.studentAvatar}>
                  {currentKarateka.foto_url ? (
                    <img src={currentKarateka.foto_url} alt={currentKarateka.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : "🤖"}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem' }}>{currentKarateka.nombre}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Nivel Actual: {getRoboticsLevelName(currentKarateka.cinturon)} ({currentKarateka.grado})
                  </p>
                </div>
              </div>
            )}

            {activeStudentRequest ? (
              <div style={{ background: 'var(--brand-gold-light)', color: 'var(--brand-gold)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(217,119,6,0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                <Clock size={32} style={{ margin: '0.5rem auto' }} />
                <h4 style={{ fontWeight: 'bold' }}>Solicitud en Revisión</h4>
                <p style={{ fontSize: '0.85rem' }}>
                  Ya tienes una solicitud de certificación para el nivel <strong>{getRoboticsLevelName(activeStudentRequest.cinturon_solicitado)}</strong> en revisión. 
                  El Evaluador calificará tu video pronto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nivel a Certificar</label>
                  <select 
                    className={styles.selectInput}
                    value={cinturonSolicitado}
                    onChange={(e) => {
                      setCinturonSolicitado(e.target.value);
                      const specialties: Record<string, string> = {
                        amarillo: "Arduino Maker",
                        naranja: "ESP32 IoT",
                        verde: "Raspberry Pi",
                        azul: "Python Code",
                        marron: "AI & Machine Learning",
                        negro: "Competidor Master"
                      };
                      setGradoSolicitado(specialties[e.target.value] || "Scratch STEM");
                    }}
                  >
                    <option value="amarillo">Arduino Maker (Nivel 2)</option>
                    <option value="naranja">ESP32 IoT (Nivel 3)</option>
                    <option value="verde">Raspberry Pi (Nivel 4)</option>
                    <option value="azul">Python Code (Nivel 5)</option>
                    <option value="marron">AI & Machine Learning (Nivel 6)</option>
                    <option value="negro">Competidor Master (Nivel 7)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Especialidad</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={gradoSolicitado}
                    disabled
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Enlace de Video de Demostración (YouTube, Drive, mp4, etc.)</label>
                  <input 
                    type="url" 
                    className={styles.input} 
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    value={videoEvidenciaUrl}
                    onChange={(e) => setVideoEvidenciaUrl(e.target.value)}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Sube un video demostrando el funcionamiento de tu circuito/programa y pega el enlace aquí.
                  </p>
                </div>

                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? "Enviando..." : "Enviar Evidencia de Proyecto"}
                </button>
              </form>
            )}
          </div>

          {/* Card 2: Request list & history */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <ClipboardCheck size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--brand-gold)' }} />
              Historial de Certificaciones
            </h2>

            {studentRequests.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                Aún no has enviado evidencias para certificación de nivel.
              </p>
            ) : (
              <div className={styles.requestList}>
                {studentRequests.map(r => (
                  <div key={r.id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`belt-badge ${getBeltColorClass(r.cinturon_solicitado)}`}>
                        {getRoboticsLevelName(r.cinturon_solicitado)}
                      </span>
                      <span className={`${styles.statusBadge} ${r.estado === 'pendiente' ? styles.pending : r.estado === 'aprobado' ? styles.approved : styles.rejected}`}>
                        {r.estado === 'pendiente' ? 'Pendiente ⏳' : r.estado === 'aprobado' ? 'Aprobado ✓' : 'Corregir ❌'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} />
                      <span>Solicitado el: {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>

                    {r.comentarios_sensei && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--brand-red)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MessageSquare size={14} /> Retroalimentación del Mentor:
                        </p>
                        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                          "{r.comentarios_sensei}"
                        </p>
                        {r.calificacion && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
                            <Sparkles size={14} /> Calificación: {r.calificacion.toFixed(1)} / 10
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==================== PORTAL MAESTRO ==================== */
        <div className={styles.grid}>
          {/* Card 1: Pending requests list */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <UserCheck size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--brand-red)' }} />
              Proyectos por Certificar
            </h2>

            <div className={styles.requestList}>
              {requests.map(r => (
                <div 
                  key={r.id} 
                  className={`${styles.requestItem} ${selectedRequest?.id === r.id ? 'border-primary' : ''}`}
                  style={{ borderLeft: selectedRequest?.id === r.id ? '4px solid var(--brand-red)' : '' }}
                  onClick={() => setSelectedRequest(r)}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className={styles.studentAvatar}>
                      {r.karateka?.foto_url ? (
                        <img src={r.karateka.foto_url} alt={r.karateka.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : "🤖"}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{r.karateka?.nombre}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Progreso: {getRoboticsLevelName(r.karateka?.cinturon || '')} ➡️ <strong>{getRoboticsLevelName(r.cinturon_solicitado)}</strong>
                      </p>
                    </div>
                  </div>

                  <span className={`${styles.statusBadge} ${r.estado === 'pendiente' ? styles.pending : r.estado === 'aprobado' ? styles.approved : styles.rejected}`}>
                    {r.estado}
                  </span>
                </div>
              ))}

              {requests.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No hay exámenes pendientes para evaluar en este momento.
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Selected request evaluation panel */}
          {selectedRequest ? (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                <ClipboardCheck size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--brand-gold)' }} />
                Evaluar Evidencia de {selectedRequest.karateka?.nombre}
              </h2>

              <div className={styles.videoContainer}>
                {isPlayableVideoUrl(selectedRequest.video_evidencia_url) ? (
                  <video 
                    src={selectedRequest.video_evidencia_url} 
                    controls 
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className={styles.videoPlaceholder}>
                    <Play size={32} style={{ color: 'var(--brand-red)' }} />
                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>El video está alojado en una plataforma externa o servicio de la nube.</p>
                    <a 
                      href={selectedRequest.video_evidencia_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.videoLinkBtn}
                    >
                      Ver Video de Evidencia 🎥
                    </a>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span>Nivel actual: <strong>{getRoboticsLevelName(selectedRequest.karateka?.cinturon || '')} ({selectedRequest.karateka?.grado})</strong></span>
                  <span>Certificación: <strong style={{ color: 'var(--brand-red)' }}>{getRoboticsLevelName(selectedRequest.cinturon_solicitado)}</strong></span>
                </div>

                {selectedRequest.estado === 'pendiente' ? (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Calificación Técnica (1.0 - 10.0)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        max="10" 
                        className={styles.input} 
                        value={calificacion} 
                        onChange={(e) => setCalificacion(parseFloat(e.target.value))} 
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Retroalimentación del Evaluador</label>
                      <textarea 
                        className={styles.textarea} 
                        rows={3} 
                        placeholder="Escribe observaciones sobre el hardware, protoboard, código, etc..."
                        value={comentariosSensei} 
                        onChange={(e) => setComentariosSensei(e.target.value)} 
                      />
                    </div>

                    <div className={styles.actionsGrid}>
                      <button 
                        onClick={() => handleGradeRequest('aprobado')}
                        className={styles.btnApprove}
                        disabled={grading}
                      >
                        {grading ? "Procesando..." : "🤖 Certificar Nivel"}
                      </button>
                      <button 
                        onClick={() => handleGradeRequest('rechazado')}
                        className={styles.btnReject}
                        disabled={grading}
                      >
                        {grading ? "Procesando..." : "Rechazar / Corregir"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontWeight: 'bold' }}>Dictamen Guardado</h4>
                      <span className={`${styles.statusBadge} ${selectedRequest.estado === 'aprobado' ? styles.approved : styles.rejected}`}>
                        {selectedRequest.estado}
                      </span>
                    </div>
                    {selectedRequest.calificacion && (
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Calificación: {selectedRequest.calificacion} / 10</p>
                    )}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{selectedRequest.comentarios_sensei}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.card} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
              <CheckSquare size={36} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
              <p>Selecciona un proyecto de la lista izquierda para evaluar la evidencia del alumno.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
