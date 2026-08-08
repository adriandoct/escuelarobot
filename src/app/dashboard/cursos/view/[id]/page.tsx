"use client";

import { useEffect, useState, use } from "react";
import styles from "../../cursos.module.css";
import { ArrowLeft, Play, Lock, CheckCircle2, FileText, Video, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  video_intro_url: string;
  thumbnail_url: string;
  nivel: string;
  precio: number;
  mercadopago_url?: string;
}

interface Recurso {
  id: string;
  titulo: string;
  archivo_url: string;
  tipo: string;
}

interface Leccion {
  id: string;
  titulo: string;
  descripcion: string;
  video_url: string;
  recursos?: Recurso[];
}

interface Seccion {
  id: string;
  titulo: string;
  lecciones?: Leccion[];
}

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function CourseViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();
  
  const [curso, setCurso] = useState<Curso | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInscrito, setIsInscrito] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [activeSeccionId, setActiveSeccionId] = useState<string | null>(null);

  useEffect(() => {
    loadCourseView();
  }, [courseId]);

  const loadCourseView = async () => {
    setLoading(true);
    try {
      // Load course details
      const { data: cursoData } = await supabase
        .from("cursos")
        .select("*")
        .eq("id", courseId)
        .single();
        
      if (cursoData) setCurso(cursoData);

      // Check enrollment
      // En modo local (mock), simulamos el ID del usuario usando cookies si no hay sesión real.
      const userEmail = getCookie("dojoia_email");
      let uid = "00000000-0000-0000-0000-000000000000"; // Dummy para mock

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
      }
      
      const { data: inscripcion } = await supabase
        .from("curso_inscripciones")
        .select("*")
        .eq("curso_id", courseId)
        .eq("alumno_id", uid)
        .maybeSingle();

      setIsInscrito(!!inscripcion);

      // Load syllabus (Secciones and Lecciones)
      const { data: seccData } = await supabase
        .from("curso_secciones")
        .select("*")
        .eq("curso_id", courseId)
        .order("orden", { ascending: true });
        
      if (seccData) {
        const fullSecciones = await Promise.all(seccData.map(async (sec: any) => {
          const { data: lecData } = await supabase
            .from("curso_lecciones")
            .select("*")
            .eq("seccion_id", sec.id)
            .order("orden", { ascending: true });
            
          let leccionesList = lecData || [];
          
          if (inscripcion) { // Solo carga recursos si está inscrito
            leccionesList = await Promise.all(leccionesList.map(async (lec: any) => {
              const { data: recData } = await supabase
                .from("curso_recursos")
                .select("*")
                .eq("leccion_id", lec.id);
              return { ...lec, recursos: recData || [] };
            }));
          }
          
          return { ...sec, lecciones: leccionesList };
        }));
        setSecciones(fullSecciones);
        if (fullSecciones.length > 0) setActiveSeccionId(fullSecciones[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (curso?.mercadopago_url) {
      window.location.href = curso.mercadopago_url;
      return;
    }

    setEnrolling(true);
    try {
      let uid = "00000000-0000-0000-0000-000000000000"; // Dummy para mock
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
      }

      const { error } = await supabase
        .from("curso_inscripciones")
        .insert([{
          curso_id: courseId,
          alumno_id: uid
        }]);

      if (error) {
        console.warn(error);
        // Fallback for mock mode without RLS constraints
        setIsInscrito(true);
      } else {
        setIsInscrito(true);
      }
      
      // Recargar para obtener los recursos ahora que está inscrito
      loadCourseView();
    } catch (e) {
      console.error(e);
      // Fallback local
      setIsInscrito(true);
      loadCourseView();
    } finally {
      setEnrolling(false);
    }
  };

  // Extract youtube embed
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    const match = cleanUrl.match(regExp);
    return (match && match[1].length === 11) ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  if (loading || !curso) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando curso...</div>;
  }

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/dashboard/cursos" className={styles.btnSecondary} style={{ border: 'none', padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </Link>
        <span style={{ color: 'var(--brand-red)', fontWeight: 'bold' }}>Volver a Mis Cursos</span>
      </div>

      <div className={styles.builderLayout}>
        {/* Lado Izquierdo: Reproductor de Video e Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.videoWrapper} style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            {curso.video_intro_url ? (
              getYouTubeEmbedUrl(curso.video_intro_url) ? (
                <iframe 
                  src={getYouTubeEmbedUrl(curso.video_intro_url) || ""}
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className={styles.videoElement}
                ></iframe>
              ) : (
                <video controls src={curso.video_intro_url} className={styles.videoElement} poster={curso.thumbnail_url}></video>
              )
            ) : (
              <div className={styles.videoPlaceholder}>
                <Play size={48} opacity={0.5} />
                <p>No hay video de introducción</p>
              </div>
            )}
          </div>

          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{curso.titulo}</h1>
            <p style={{ color: 'var(--brand-gold)', fontWeight: 'bold', marginBottom: '1rem' }}>Nivel: {curso.nivel}</p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{curso.descripcion}</p>
          </div>

          {!isInscrito && (
            <div style={{ background: 'rgba(225, 29, 72, 0.1)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(225, 29, 72, 0.2)', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '1rem' }}>¿Quieres acceder al contenido completo?</h3>
              {curso.precio > 0 && <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>${curso.precio.toFixed(2)}</p>}
              <button 
                onClick={handleEnroll}
                disabled={enrolling}
                className={styles.btnPrimary} 
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              >
                {enrolling ? 'Procesando...' : (curso.mercadopago_url ? 'Pagar e Inscribirme' : 'Inscribirme Gratis Ahora')}
              </button>
            </div>
          )}
          
          {isInscrito && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <CheckCircle2 size={20} /> ¡Estás inscrito en este curso! Acceso completo desbloqueado.
            </div>
          )}
        </div>

        {/* Lado Derecho: Temario */}
        <div className={styles.builderSidebar}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Temario del Curso</h3>
          </div>

          <div style={{ padding: '1rem' }}>
            {secciones.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>El temario aún no se ha publicado.</p>
            ) : (
              secciones.map(sec => (
                <div key={sec.id} style={{ marginBottom: '1rem' }}>
                  <div 
                    className={styles.sectionHeader}
                    onClick={() => setActiveSeccionId(activeSeccionId === sec.id ? null : sec.id)}
                    style={{ borderRadius: '8px', background: 'var(--bg-tertiary)', padding: '1rem' }}
                  >
                    <span>{sec.titulo}</span>
                    <span>{activeSeccionId === sec.id ? '▼' : '▶'}</span>
                  </div>
                  
                  {activeSeccionId === sec.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                      {sec.lecciones?.map(lec => (
                        <div key={lec.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: isInscrito ? '3px solid var(--brand-red)' : '3px solid #555' }}>
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: isInscrito ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {isInscrito ? <Play size={16} color="var(--brand-red)" /> : <Lock size={16} />}
                            {lec.titulo}
                          </h4>
                          
                          {isInscrito ? (
                            <div style={{ paddingLeft: '1.5rem' }}>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{lec.descripcion}</p>
                              {lec.video_url && (
                                <a href={lec.video_url} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                  <Video size={14} /> Ver Lección
                                </a>
                              )}
                              
                              {lec.recursos && lec.recursos.length > 0 && (
                                <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                                  <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--brand-gold)' }}>Recursos:</p>
                                  {lec.recursos.map(rec => (
                                    <a key={rec.id} href={rec.archivo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-primary)', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '4px', marginBottom: '0.4rem' }}>
                                      {rec.tipo === 'pdf' ? <FileText size={14} color="#ef4444" /> : <Download size={14} color="#3b82f6" />}
                                      {rec.titulo}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '0 0 0 1.5rem' }}>Contenido bloqueado. Inscríbete para acceder a los videos y recursos descargables.</p>
                          )}
                        </div>
                      ))}
                      {(!sec.lecciones || sec.lecciones.length === 0) && (
                         <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', paddingLeft: '1rem' }}>Próximamente nuevas lecciones...</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
