"use client";

import { useEffect, useState, useRef, use } from "react";
import styles from "../../cursos.module.css";
import { 
  Save, ArrowLeft, Plus, Video, FileText, UploadCloud, 
  Trash2, File, Link as LinkIcon, CheckCircle2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  video_intro_url: string;
  thumbnail_url: string;
  estado: string;
  nivel: string;
  precio?: number;
  mercadopago_url?: string;
}

interface Recurso {
  id: string;
  leccion_id: string;
  titulo: string;
  archivo_url: string;
  tipo: string;
}

interface Leccion {
  id: string;
  seccion_id: string;
  titulo: string;
  descripcion: string;
  video_url: string;
  orden: number;
  recursos?: Recurso[];
}

interface Seccion {
  id: string;
  curso_id: string;
  titulo: string;
  orden: number;
  lecciones?: Leccion[];
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function CourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState("karateka");
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [curso, setCurso] = useState<Curso | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'ajustes' | 'temario'>('ajustes');
  const [activeSeccionId, setActiveSeccionId] = useState<string | null>(null);
  const [activeLeccion, setActiveLeccion] = useState<Leccion | null>(null);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  
  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    setRole(userRole);
    if (userRole !== "sensei" && userRole !== "admin") {
      router.push("/dashboard/cursos");
      return;
    }
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      // Load course
      const { data: cursoData, error: cursoError } = await supabase
        .from("cursos")
        .select("*")
        .eq("id", courseId)
        .single();
      
      if (cursoData) setCurso(cursoData);

      // Load sections
      const { data: seccData } = await supabase
        .from("curso_secciones")
        .select("*")
        .eq("curso_id", courseId)
        .order("orden", { ascending: true });
        
      if (seccData) {
        // For each section, load lessons and resources
        const fullSecciones = await Promise.all(seccData.map(async (sec: any) => {
          const { data: lecData } = await supabase
            .from("curso_lecciones")
            .select("*")
            .eq("seccion_id", sec.id)
            .order("orden", { ascending: true });
            
          let leccionesList = lecData || [];
          
          leccionesList = await Promise.all(leccionesList.map(async (lec: any) => {
            const { data: recData } = await supabase
              .from("curso_recursos")
              .select("*")
              .eq("leccion_id", lec.id);
            return { ...lec, recursos: recData || [] };
          }));
          
          return { ...sec, lecciones: leccionesList };
        }));
        
        setSecciones(fullSecciones);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (msg: string, type: string = "success") => {
    setStatusMsg({ text: msg, type });
    setTimeout(() => setStatusMsg({ text: "", type: "" }), 4000);
  };

  // --- COURSE SAVE ---
  const handleSaveCourse = async () => {
    if (!curso) return;
    try {
      const { error } = await supabase
        .from("cursos")
        .update({
          titulo: curso.titulo,
          descripcion: curso.descripcion,
          video_intro_url: curso.video_intro_url,
          estado: curso.estado,
          nivel: curso.nivel,
          precio: curso.precio,
          mercadopago_url: curso.mercadopago_url
        })
        .eq("id", curso.id);
        
      if (error) throw error;
      showStatus("Ajustes del curso guardados correctamente.");
    } catch (e: any) {
      showStatus(e.message || "Error al guardar el curso", "error");
    }
  };

  // --- SECTIONS ---
  const handleAddSection = async () => {
    const title = prompt("Nombre de la nueva sección (Módulo):");
    if (!title) return;
    
    try {
      const { data, error } = await supabase
        .from("curso_secciones")
        .insert([{
          curso_id: courseId,
          titulo: title,
          orden: secciones.length
        }])
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        setSecciones([...secciones, { ...data, lecciones: [] }]);
        setActiveSeccionId(data.id);
        showStatus("Sección creada");
      }
    } catch (e: any) {
      showStatus("Error: " + e.message, "error");
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if(!confirm("¿Eliminar esta sección y TODAS sus lecciones?")) return;
    try {
      await supabase.from("curso_secciones").delete().eq("id", secId);
      setSecciones(secciones.filter(s => s.id !== secId));
      if(activeSeccionId === secId) {
        setActiveSeccionId(null);
        setActiveLeccion(null);
      }
      showStatus("Sección eliminada");
    } catch (e: any) {
      showStatus("Error al eliminar", "error");
    }
  };

  // --- LESSONS ---
  const handleAddLesson = async (secId: string) => {
    const secIndex = secciones.findIndex(s => s.id === secId);
    if(secIndex === -1) return;
    
    const title = prompt("Título de la nueva lección:");
    if (!title) return;
    
    const orden = secciones[secIndex].lecciones?.length || 0;
    
    try {
      const { data, error } = await supabase
        .from("curso_lecciones")
        .insert([{
          seccion_id: secId,
          titulo: title,
          orden: orden
        }])
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        const newSec = [...secciones];
        if(!newSec[secIndex].lecciones) newSec[secIndex].lecciones = [];
        newSec[secIndex].lecciones.push({ ...data, recursos: [] });
        setSecciones(newSec);
        setActiveLeccion({ ...data, recursos: [] });
        showStatus("Lección creada");
      }
    } catch (e: any) {
      showStatus("Error al crear lección", "error");
    }
  };

  const handleSaveLesson = async () => {
    if (!activeLeccion) return;
    try {
      const { error } = await supabase
        .from("curso_lecciones")
        .update({
          titulo: activeLeccion.titulo,
          descripcion: activeLeccion.descripcion,
          video_url: activeLeccion.video_url
        })
        .eq("id", activeLeccion.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedSecciones = secciones.map(sec => {
        if(sec.id === activeLeccion.seccion_id) {
          return {
            ...sec,
            lecciones: sec.lecciones?.map(lec => lec.id === activeLeccion.id ? activeLeccion : lec)
          };
        }
        return sec;
      });
      setSecciones(updatedSecciones);
      showStatus("Lección guardada");
    } catch (e: any) {
      showStatus("Error al guardar lección", "error");
    }
  };

  // --- RESOURCES UPLOAD ---
  const handleUploadResource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!activeLeccion || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    
    let tipo = 'enlace';
    if(file.type.includes('pdf')) tipo = 'pdf';
    else if(file.type.includes('video')) tipo = 'video';
    
    setUploading(true);
    setStatusMsg({ text: "Subiendo archivo...", type: "" });
    
    try {
      // 1. Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("cursos_recursos")
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("cursos_recursos")
        .getPublicUrl(fileName);
        
      // 2. Save DB record
      const { data, error } = await supabase
        .from("curso_recursos")
        .insert([{
          leccion_id: activeLeccion.id,
          titulo: file.name,
          archivo_url: publicUrl,
          tipo: tipo
        }])
        .select()
        .single();
        
      if(error) throw error;
      
      // 3. Update UI
      const newRecursos = [...(activeLeccion.recursos || []), data];
      setActiveLeccion({...activeLeccion, recursos: newRecursos});
      showStatus("Recurso añadido con éxito");
      
    } catch(err: any) {
      showStatus(`Error: ${err.message}`, "error");
    } finally {
      setUploading(false);
      if(resourceFileRef.current) resourceFileRef.current.value = "";
    }
  };

  const handleDeleteResource = async (resId: string) => {
    if(!activeLeccion || !confirm("¿Eliminar este recurso?")) return;
    try {
      await supabase.from("curso_recursos").delete().eq("id", resId);
      const newRecursos = activeLeccion.recursos?.filter(r => r.id !== resId) || [];
      setActiveLeccion({...activeLeccion, recursos: newRecursos});
    } catch(e) {
      showStatus("Error al eliminar", "error");
    }
  };

  if (loading || !curso) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando Constructor de Curso...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/cursos" className={styles.btnSecondary} style={{ border: 'none', padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Constructor: {curso.titulo}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className={styles.statusTag} style={{ position: 'static', background: curso.estado === 'publicado' ? '#10b981' : '#eab308' }}>
                {curso.estado}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {statusMsg.text && (
        <div style={{
          padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: statusMsg.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
        }}>
          <CheckCircle2 size={18} /> {statusMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('ajustes')}
          style={{ background: 'none', border: 'none', color: activeTab==='ajustes' ? 'var(--brand-red)' : 'var(--text-secondary)', padding: '0.5rem 1rem', borderBottom: activeTab==='ajustes' ? '2px solid var(--brand-red)' : 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Ajustes Básicos
        </button>
        <button 
          onClick={() => setActiveTab('temario')}
          style={{ background: 'none', border: 'none', color: activeTab==='temario' ? 'var(--brand-red)' : 'var(--text-secondary)', padding: '0.5rem 1rem', borderBottom: activeTab==='temario' ? '2px solid var(--brand-red)' : 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Temario del Curso
        </button>
      </div>

      {activeTab === 'ajustes' && (
        <div className={styles.builderContent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Título del Curso</label>
            <input type="text" className={styles.input} value={curso.titulo} onChange={e => setCurso({...curso, titulo: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción Global</label>
            <textarea className={styles.textarea} value={curso.descripcion || ""} onChange={e => setCurso({...curso, descripcion: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>URL Video Introducción (YouTube o Público)</label>
              <input type="text" className={styles.input} placeholder="https://youtube.com/..." value={curso.video_intro_url || ""} onChange={e => setCurso({...curso, video_intro_url: e.target.value})} />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Estado de Publicación</label>
              <select className={styles.input} value={curso.estado} onChange={e => setCurso({...curso, estado: e.target.value})}>
                <option value="borrador">Borrador (Oculto)</option>
                <option value="publicado">Publicado (Visible a Alumnos)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Precio (Opcional)</label>
              <input type="number" className={styles.input} placeholder="0.00" value={curso.precio || ""} onChange={e => setCurso({...curso, precio: parseFloat(e.target.value) || 0})} />
            </div>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label className={styles.label}>Enlace de MercadoPago (Opcional)</label>
              <input type="text" className={styles.input} placeholder="https://mpago.la/..." value={curso.mercadopago_url || ""} onChange={e => setCurso({...curso, mercadopago_url: e.target.value})} />
            </div>
          </div>
          <div className={styles.actionRow}>
            <button onClick={handleSaveCourse} className={styles.btnPrimary}>
              <Save size={16} style={{marginRight: '0.5rem', display:'inline'}} /> Guardar Ajustes
            </button>
          </div>
        </div>
      )}

      {activeTab === 'temario' && (
        <div className={styles.builderLayout}>
          {/* SIDEBAR: SECTIONS AND LESSONS LIST */}
          <div className={styles.builderSidebar}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Estructura</h3>
              <button onClick={handleAddSection} className={styles.btnSecondary} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                <Plus size={14} /> Sección
              </button>
            </div>

            {secciones.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                Agrega tu primera sección para empezar.
              </div>
            ) : (
              <div>
                {secciones.map(sec => (
                  <div key={sec.id} className={styles.sectionItem}>
                    <div 
                      className={styles.sectionHeader}
                      onClick={() => setActiveSeccionId(activeSeccionId === sec.id ? null : sec.id)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {activeSeccionId === sec.id ? '▼' : '▶'} {sec.titulo}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }} className={styles.deleteBtn}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {activeSeccionId === sec.id && (
                      <div>
                        {sec.lecciones?.map(lec => (
                          <div 
                            key={lec.id} 
                            className={`${styles.lessonItem} ${activeLeccion?.id === lec.id ? styles.active : ''}`}
                            onClick={() => setActiveLeccion(lec)}
                          >
                            <Video size={14} /> {lec.titulo}
                          </div>
                        ))}
                        <div 
                          className={styles.lessonItem} 
                          style={{ color: 'var(--brand-accent)', justifyContent: 'center', fontWeight: 'bold' }}
                          onClick={() => handleAddLesson(sec.id)}
                        >
                          <Plus size={14} /> Añadir Lección
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MAIN AREA: LESSON EDITOR */}
          <div className={styles.builderContent}>
            {!activeLeccion ? (
              <div className={styles.emptyState}>
                <FileText size={48} color="var(--border-color)" />
                <h3>Selecciona una lección</h3>
                <p>Haz clic en una lección del temario a la izquierda para editar su contenido y adjuntar recursos.</p>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Editando: {activeLeccion.titulo}
                </h2>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Título de la Lección</label>
                  <input type="text" className={styles.input} value={activeLeccion.titulo} onChange={e => setActiveLeccion({...activeLeccion, titulo: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>URL del Video (Principal de la Lección)</label>
                  <input type="text" className={styles.input} placeholder="https://youtube.com/..." value={activeLeccion.video_url || ""} onChange={e => setActiveLeccion({...activeLeccion, video_url: e.target.value})} />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Texto o Descripción (Soporta HTML/Markdown Básico)</label>
                  <textarea className={styles.textarea} value={activeLeccion.descripcion || ""} onChange={e => setActiveLeccion({...activeLeccion, descripcion: e.target.value})} />
                </div>
                
                <div className={styles.actionRow} style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                  <button onClick={handleSaveLesson} className={styles.btnPrimary}>
                    Guardar Cambios de Lección
                  </button>
                </div>

                {/* RESOURCES SUB-SECTION */}
                <div style={{ marginTop: '3rem', borderTop: '2px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Recursos Adjuntos</h3>
                    
                    <button 
                      onClick={() => resourceFileRef.current?.click()} 
                      className={styles.btnSecondary} 
                      disabled={uploading}
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                      <UploadCloud size={14} /> {uploading ? 'Subiendo...' : 'Subir Archivo (PDF, Video)'}
                    </button>
                    <input 
                      type="file" 
                      ref={resourceFileRef} 
                      style={{ display: 'none' }} 
                      accept=".pdf,video/mp4,video/webm" 
                      onChange={handleUploadResource} 
                    />
                  </div>

                  <div className={styles.resourceList}>
                    {(!activeLeccion.recursos || activeLeccion.recursos.length === 0) ? (
                      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontStyle: 'italic' }}>No hay recursos adjuntos para esta lección.</p>
                    ) : (
                      activeLeccion.recursos.map(rec => (
                        <div key={rec.id} className={styles.resourceItem}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {rec.tipo === 'pdf' ? <FileText size={16} className={styles.resourceIcon} /> : 
                             rec.tipo === 'video' ? <Video size={16} className={styles.resourceIcon} /> :
                             <LinkIcon size={16} className={styles.resourceIcon} />}
                            <a href={rec.archivo_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                              {rec.titulo}
                            </a>
                          </div>
                          <button onClick={() => handleDeleteResource(rec.id)} className={styles.deleteBtn} title="Eliminar recurso">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
