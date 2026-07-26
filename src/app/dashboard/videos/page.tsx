"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./videos.module.css";
import { 
  Play, 
  Clock, 
  User, 
  X, 
  Video, 
  Lock, 
  ChevronRight,
  Maximize2,
  Volume2,
  Plus,
  Trash2,
  UploadCloud,
  FileVideo,
  CheckCircle2,
  Globe,
  Award,
  LogOut
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface TrainingVideo {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  instructor: string;
  nivel: string;
  url: string;
  tipo: 'inicio' | 'entrenamiento';
  thumbnail?: string;
  created_at?: string;
  categoria_id?: string | null;
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

// Helper function to extract YouTube ID and build embed URL
function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = cleanUrl.match(regExp);
  return (match && match[1].length === 11) 
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1` 
    : null;
}

// Verify if YouTube URL is public or unlisted
async function checkYouTubePrivacy(videoUrl: string): Promise<{ isPrivate: boolean; error?: string }> {
  try {
    let cleanUrl = videoUrl.trim();
    if (cleanUrl.includes('/shorts/')) {
      cleanUrl = cleanUrl.replace('/shorts/', '/watch?v=');
    }
    const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(noembedUrl);
    if (!res.ok) {
      return { isPrivate: true, error: `HTTP status: ${res.status}` };
    }
    const data = await res.json();
    if (data.error && (data.error.includes('403') || data.error.toLowerCase().includes('forbidden'))) {
      return { isPrivate: true, error: "El video está configurado como Privado en YouTube." };
    }
    return { isPrivate: false };
  } catch (err) {
    console.warn("Could not check YouTube video privacy status:", err);
    return { isPrivate: false };
  }
}


// Default seed videos if no database records or localStorage cached data exists
const DEFAULT_VIDEOS: TrainingVideo[] = [
  {
    id: "v1",
    titulo: "Introducción a Scratch: Tu primer juego STEM",
    descripcion: "Aprende las bases de la programación por bloques creando un videojuego interactivo de forma lógica.",
    duracion: "05:12",
    instructor: "Mentor IA Make",
    nivel: "Principiantes",
    url: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4",
    tipo: "entrenamiento",
    thumbnail: "/ia-make-logo.png"
  },
  {
    id: "v2",
    titulo: "Arduino Básico: Controlando un LED RGB",
    descripcion: "Bases de electrónica física. Aprende a conectar tu placa Arduino y cambiar los colores de un LED por código.",
    duracion: "07:45",
    instructor: "Mentor Maker",
    nivel: "Intermedios",
    url: "https://vjs.zencdn.net/v/oceans.mp4",
    tipo: "entrenamiento",
    thumbnail: "/ia-make-logo.png"
  },
  {
    id: "v3",
    titulo: "Visión Artificial con Python y OpenCV",
    descripcion: "Proyecto práctico de IA. Configura tu cámara para detectar objetos y caras en tiempo real usando scripts de Python.",
    duracion: "04:30",
    instructor: "Científico de IA",
    nivel: "Avanzados",
    url: "https://www.w3schools.com/html/movie.mp4",
    tipo: "entrenamiento",
    thumbnail: "/ia-make-logo.png"
  }
];

export default function VideosPage() {
  const [role, setRole] = useState("karateka");
  const [plan, setPlan] = useState("Mensualidad Regular");
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // Categories states
  const [categories, setCategories] = useState<{id: string, nombre: string, descripcion?: string}[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Player overlay states
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);

  // Admin tabs & form states
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>('view');
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [url, setUrl] = useState("");
  const [tipo, setTipo] = useState<'inicio' | 'entrenamiento'>('entrenamiento');
  const [instructor, setInstructor] = useState("Director Maker");
  const [nivel, setNivel] = useState("Todos los niveles");
  const [duracion, setDuracion] = useState("05:00");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" }); // type: 'success' | 'error'

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Protection Check & Initial load
  useEffect(() => {
    const userEmail = getCookie("dojoia_email");
    const userRole = getCookie("dojoia_role") || "karateka";
    const userPlan = getCookie("dojoia_plan") || "Mensualidad Regular";
    
    if (!userEmail) {
      redirect("/login?error=Debes iniciar sesión para ver los videos exclusivos de la academia.");
    }
    setRole(userRole);
    setPlan(userPlan);
    loadVideos();
    loadCategories();
  }, []);

  const handleSignOutClient = async () => {
    try {
      document.cookie = "dojoia_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "dojoia_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "dojoia_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      document.cookie = "dojoia_plan=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      
      await fetch("/auth/signout", { method: "POST" });
      window.location.href = "/";
    } catch (e) {
      console.error("Error signing out", e);
      window.location.href = "/";
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("video_categorias")
        .select("*")
        .order("nombre");

      if (data && data.length > 0) {
        setCategories(data);
        localStorage.setItem("dojo_categories", JSON.stringify(data));
      } else {
        const cached = localStorage.getItem("dojo_categories");
        if (cached && JSON.parse(cached).length > 0) {
          setCategories(JSON.parse(cached));
        } else {
          const defaults = [
            { id: "1a1a1a1a-1111-1111-1111-111111111111", nombre: "Módulo Académico", descripcion: "Cursos, lecciones y fundamentos STEM de robótica y algoritmos" },
            { id: "2b2b2b2b-2222-2222-2222-222222222222", nombre: "Módulo Maker", descripcion: "Circuitos físicos, Arduino, ESP32, sensores e impresión 3D" },
            { id: "3c3c3c3c-3333-3333-3333-333333333333", nombre: "Módulo IA", descripcion: "Machine Learning, redes neuronales, visión artificial y chatbots" },
            { id: "4d4d4d4d-4444-4444-4444-444444444444", nombre: "Módulo Competencias", descripcion: "Torneos de robótica, ranking, insignias y desarrollo en equipo" },
            { id: "5e5e5e5e-5555-5555-5555-555555555555", nombre: "Módulo Innovación", descripcion: "Habilidades blandas, diseño centrado en el usuario y metodologías ágiles" }
          ];
          setCategories(defaults);
          localStorage.setItem("dojo_categories", JSON.stringify(defaults));
        }
      }
    } catch (e) {
      console.warn("Categories fetch error, using local storage fallback", e);
      const cached = localStorage.getItem("dojo_categories");
      if (cached) {
        setCategories(JSON.parse(cached));
      }
    }
  };

  // Fetch all videos (Supabase -> LocalStorage -> Default seed)
  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setVideos(data);
        localStorage.setItem("dojo_videos", JSON.stringify(data));
      } else {
        const cached = localStorage.getItem("dojo_videos");
        if (cached && JSON.parse(cached).length > 0) {
          setVideos(JSON.parse(cached));
        } else {
          setVideos(DEFAULT_VIDEOS);
          localStorage.setItem("dojo_videos", JSON.stringify(DEFAULT_VIDEOS));
        }
      }
    } catch (e) {
      console.warn("Supabase database fetch error, using local storage fallback", e);
      const cached = localStorage.getItem("dojo_videos");
      if (cached) {
        setVideos(JSON.parse(cached));
      } else {
        setVideos(DEFAULT_VIDEOS);
      }
    } finally {
      setLoading(false);
    }
  };

  // Simulate progress when video plays
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleOpenVideo = (video: TrainingVideo) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
    setIsPlaying(true);
    setPlayProgress(0);
    setVideoError(false);
  };

  const handleCloseVideo = () => {
    setIsPlayerOpen(false);
    setSelectedVideo(null);
    setIsPlaying(false);
    setVideoError(false);
  };

  // Select dynamic thumbnail
  const getThumbnailForVideo = (v: TrainingVideo) => {
    if (v.thumbnail) return v.thumbnail;
    return "/ia-make-logo.png";
  };

  // Handle Form Submission / Video Upload
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || (!url && !videoFile)) {
      setStatusMsg({ text: "Por favor introduce un título y un archivo de video o una URL.", type: "error" });
      return;
    }

    try {
      setUploading(true);
      setStatusMsg({ text: "Procesando video...", type: "" });
      
      // Check YouTube Privacy before saving
      if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
        setStatusMsg({ text: "Verificando visibilidad del video en YouTube...", type: "" });
        const check = await checkYouTubePrivacy(url);
        if (check.isPrivate) {
          setStatusMsg({
            text: `⚠️ ERROR: El video de YouTube está configurado como PRIVADO.\n\nPara que tus alumnos puedan verlo en sus celulares y otros dispositivos, debes cambiar su configuración de visibilidad a "Público" o "Oculto" (No listado) en tu panel de YouTube Studio.\n\nNo se permite guardar videos privados.`,
            type: "error"
          });
          setUploading(false);
          return;
        }
      }

      let finalUrl = url;
      let uploadErrorMsg = "";
      let hasUploadError = false;

      // 1. Handle File Upload if present
      if (videoFile) {
        try {
          const fileExt = videoFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const filePath = `${fileName}`;

          // Attempt upload to Supabase storage bucket 'videos'
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("videos")
            .upload(filePath, videoFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.warn("Storage upload failed, fallback to Object URL for demo session:", uploadError);
            hasUploadError = true;
            uploadErrorMsg = uploadError.message;
            finalUrl = URL.createObjectURL(videoFile);
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from("videos")
              .getPublicUrl(filePath);
            finalUrl = publicUrl;
          }
        } catch (storageErr: any) {
          console.error("Storage error:", storageErr);
          hasUploadError = true;
          uploadErrorMsg = storageErr?.message || "Error desconocido de almacenamiento";
          finalUrl = URL.createObjectURL(videoFile);
        }
      }

      // If no URL or file upload resolved, use default clip
      if (!finalUrl) {
        finalUrl = "https://media.w3.org/2010/05/sintel/trailer_hd.mp4";
      }

      const newVideoData = {
        titulo,
        descripcion,
        url: finalUrl,
        tipo,
        instructor,
        nivel,
        duracion,
        categoria_id: selectedCategoryId || null,
        thumbnail: tipo === 'inicio' 
          ? "/ia-make-logo.png" 
          : undefined
      };

      // 2. Insert into database (Only if it is NOT a local temporary blob URL)
      let insertSuccess = false;
      let dbErrorMsg = "";
      const isBlob = finalUrl.startsWith("blob:");

      if (!isBlob) {
        try {
          const { data, error } = await supabase
            .from("videos")
            .insert([newVideoData])
            .select();

          if (error) {
            dbErrorMsg = error.message;
          } else if (data && data.length > 0) {
            insertSuccess = true;
          }
        } catch (dbErr: any) {
          console.warn("Database insert failed", dbErr);
          dbErrorMsg = dbErr?.message || "Error al conectar con la base de datos";
        }
      }

      // 3. Fallback to LocalStorage (So the user still sees it locally on this computer)
      const currentVideos = [...videos];
      const localId = `v_${Date.now()}`;
      const savedVideo: TrainingVideo = { id: localId, ...newVideoData };
      
      const updatedList = [savedVideo, ...currentVideos];
      setVideos(updatedList);
      localStorage.setItem("dojo_videos", JSON.stringify(updatedList));

      if (hasUploadError || isBlob || (!insertSuccess && !url)) {
        let detailedMsg = "⚠️ EL VIDEO SOLO SE GUARDÓ LOCALMENTE EN ESTE NAVEGADOR Y NO SE VERÁ EN TU CELULAR.\n\n";
        
        if (hasUploadError) {
          detailedMsg += `Razón (Almacenamiento): La subida del archivo falló (${uploadErrorMsg || "No hay bucket configurado o error de conexión"}).\n\n`;
          detailedMsg += "Para solucionarlo:\n";
          detailedMsg += "1. Ve al panel de Supabase -> 'Storage'.\n";
          detailedMsg += "2. Asegúrate de que exista un bucket público llamado exactamente: videos\n";
          detailedMsg += "3. Verifica el tamaño del archivo (los planes gratuitos de Supabase pueden limitar el tamaño de subida a 50MB).\n\n";
        } else if (!insertSuccess) {
          detailedMsg += `Razón (Base de Datos): La subida al Storage fue exitosa, pero falló el registro en la base de datos de Supabase.\n`;
          detailedMsg += `Detalle del error: ${dbErrorMsg || "Error desconocido o denegado por políticas RLS"}.\n\n`;
          detailedMsg += "Para solucionarlo:\n";
          detailedMsg += "1. Ejecuta el script SQL 'create_videos_table.sql' completo en el SQL Editor de tu panel de Supabase.\n";
          detailedMsg += "2. Esto habilitará la tabla de videos y aplicará las políticas de Row Level Security (RLS) necesarias para que permita insertar registros de forma pública.\n\n";
        } else {
          detailedMsg += `Razón: Se usó una URL temporal local 'blob:'.\n\n`;
        }
        
        detailedMsg += "Una vez corregido el problema en Supabase, elimina este video con el botón rojo 'Eliminar Video Expirado' y vuelve a subirlo.";

        setStatusMsg({
          text: detailedMsg,
          type: "error"
        });
      } else {
        // Reset form
        setTitulo("");
        setDescripcion("");
        setUrl("");
        setVideoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        setStatusMsg({ 
          text: "¡Video agregado y sincronizado correctamente con la base de datos de Supabase! Ahora ya es visible en todos los dispositivos.", 
          type: "success" 
        });

        // Switch to list tab
        setTimeout(() => {
          setActiveTab('view');
          setStatusMsg({ text: "", type: "" });
        }, 3000);
      }

    } catch (err) {
      console.error(err);
      setStatusMsg({ text: "Ocurrió un error al procesar el video.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  // Delete Video (Supabase -> LocalStorage)
  const handleDeleteVideo = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este video?")) return;

    try {
      // 1. Delete from Supabase
      if (!id.startsWith("v_")) { // Database ID
        try {
          await supabase.from("videos").delete().eq("id", id);
        } catch (dbErr) {
          console.warn("DB delete error", dbErr);
        }
      }

      // 2. Delete from LocalState & LocalStorage
      const updatedList = videos.filter(v => v.id !== id);
      setVideos(updatedList);
      localStorage.setItem("dojo_videos", JSON.stringify(updatedList));
      alert("Video eliminado con éxito.");
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el video.");
    }
  };

  const isSensei = role === "sensei";

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Cargando biblioteca de videos...</p>
      </div>
    );
  }

  // Filter training vs homepage videos by category and plan
  const trainingVideos = videos.filter(v => {
    const isTraining = v.tipo === 'entrenamiento';
    if (!isTraining) return false;

    // Filter by Plan (Alumno Básico vs Alumno Premium) if not admin/sensei
    if (!isSensei) {
      const isPremium = plan.toLowerCase().includes("premium") || 
                        plan.toLowerCase().includes("regular") || 
                        plan.toLowerCase().includes("trimestre") || 
                        plan.toLowerCase().includes("semestre");
      if (!isPremium) {
        // Alumno Básico can only watch beginner/intermediate videos
        const nivel = (v.nivel || "").toLowerCase();
        const isBasicVideo = nivel.includes("todos") || nivel.includes("principiante") || nivel.includes("intermedio");
        if (!isBasicVideo) return false;
      }
    }

    if (filterCategory === 'all') return true;
    return v.categoria_id === filterCategory;
  });
  const homepageVideos = videos.filter(v => v.tipo === 'inicio');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isSensei ? "Panel de Gestión de Videos" : "Videoteca de Lecciones STEM"}
          </h1>
          <p>
            {isSensei 
              ? "Sube y administra videos educativos para tus alumnos o el video de portada en la página de inicio." 
              : "Lecciones y talleres STEM semanales para alumnos activos de IA Make Academy."}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginRight: '8.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: isSensei ? 'var(--brand-red)' : 'var(--success)', fontWeight: 'bold' }}>
            {isSensei ? (
              <><Globe size={14} /> Modo Administrador Activado</>
            ) : (
              <><Lock size={14} /> Acceso {plan} Habilitado</>
            )}
          </div>
        </div>
      </div>

      {/* Tabs for Sensei (Admin/Teacher) */}
      {isSensei && (
        <div className={styles.tabNav}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'view' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('view')}
          >
            <Video size={16} /> Biblioteca & Videos de Inicio
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Plus size={16} /> Subir / Configurar Video
          </button>
        </div>
      )}

      {/* RENDER LIST TAB */}
      {(!isSensei || activeTab === 'view') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* SECTION: HOMEPAGE VIDEO (Shown to Admin only to confirm configuration) */}
          {isSensei && (
            <div className={styles.adminSection}>
              <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={20} style={{ color: 'var(--brand-red)' }} />
                Video de la Página de Inicio
              </h2>
              {homepageVideos.length === 0 ? (
                <div className={styles.noVideoCard}>
                  <p>No hay un video personalizado configurado para la página de inicio.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Se está mostrando el video de demostración por defecto. Haz clic en "Subir / Configurar Video" para establecer uno.
                  </p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {homepageVideos.map((vid) => (
                    <div key={vid.id} className={`${styles.videoCard} ${styles.homepageCard}`}>
                      <div className={styles.thumbnailContainer} onClick={() => handleOpenVideo(vid)}>
                        <img src={getThumbnailForVideo(vid)} alt={vid.titulo} className={styles.thumbnailImg} />
                        <div className={styles.playIconWrapper}>
                          <Play size={20} fill="#FFF" color="#FFF" style={{ marginLeft: '2px' }} />
                        </div>
                        <span className={styles.durationTag} style={{ background: 'var(--brand-red)' }}>INICIO</span>
                      </div>
                      
                      <div className={styles.meta}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--brand-gold)', letterSpacing: '1px' }}>
                            Video Destacado Principal
                          </span>
                          <button onClick={() => handleDeleteVideo(vid.id)} className={styles.deleteBtn} title="Eliminar video">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h3>{vid.titulo}</h3>
                        <p>{vid.descripcion.substring(0, 100)}...</p>
                        <div className={styles.metaFooter} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                            <Globe size={12} /> Visible públicamente en la landing page
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: TRAINING VIDEOS */}
          <div className={styles.adminSection}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} style={{ color: 'var(--brand-gold)' }} />
              Videos y Clases STEM (Portal Alumno)
            </h2>

            {/* Category filter pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <button 
                onClick={() => setFilterCategory("all")}
                className="btn-secondary"
                style={{ 
                  background: filterCategory === "all" ? "var(--brand-red)" : "transparent",
                  color: filterCategory === "all" ? "white" : "var(--text-primary)",
                  border: filterCategory === "all" ? "none" : "1px solid var(--border-color)",
                  padding: "0.4rem 1rem",
                  fontSize: "0.85rem",
                  borderRadius: "20px"
                }}
              >
                Todos
              </button>
              {categories.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setFilterCategory(c.id)}
                  className="btn-secondary"
                  style={{ 
                    background: filterCategory === c.id ? "var(--brand-red)" : "transparent",
                    color: filterCategory === c.id ? "white" : "var(--text-primary)",
                    border: filterCategory === c.id ? "none" : "1px solid var(--border-color)",
                    padding: "0.4rem 1rem",
                    fontSize: "0.85rem",
                    borderRadius: "20px"
                  }}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
            
            <div className={styles.grid}>
              {trainingVideos.map((vid) => (
                <div key={vid.id} className={styles.videoCard}>
                  <div className={styles.thumbnailContainer} onClick={() => handleOpenVideo(vid)}>
                    <img src={getThumbnailForVideo(vid)} alt={vid.titulo} className={styles.thumbnailImg} />
                    <div className={styles.playIconWrapper}>
                      <Play size={20} fill="#FFF" color="#FFF" style={{ marginLeft: '2px' }} />
                    </div>
                    <span className={styles.durationTag}>{vid.duracion}</span>
                  </div>
                  
                  <div className={styles.meta}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--brand-red)', letterSpacing: '1px' }}>
                        {vid.nivel}
                      </span>
                      {isSensei && (
                        <button onClick={() => handleDeleteVideo(vid.id)} className={styles.deleteBtn} title="Eliminar video">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <h3>{vid.titulo}</h3>
                    <p>{vid.descripcion.substring(0, 85)}...</p>
                    
                    <div className={styles.metaFooter}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {vid.instructor}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {vid.duracion}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {trainingVideos.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                No hay videos de entrenamiento cargados para tu nivel de suscripción.
              </p>
            )}
          </div>
        </div>
      )}

      {/* RENDER UPLOAD FORM TAB (Admin only) */}
      {isSensei && activeTab === 'upload' && (
        <div className={styles.formContainer}>
          <div className={styles.formCard}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <h2>Configurar Nuevo Video</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Rellena los detalles para subir o registrar un video educativo.
              </p>
            </div>

            {statusMsg.text && (
              <div className={`${styles.statusAlert} ${statusMsg.type === 'success' ? styles.alertSuccess : statusMsg.type === 'error' ? styles.alertError : statusMsg.type === 'alertInfo'}`}>
                {statusMsg.type === 'success' && <CheckCircle2 size={18} />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddVideo} className={styles.uploadForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Título del Video</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="e.g. Arduino Básico: Controlando un LED RGB"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Descripción</label>
                  <textarea 
                    className={styles.textarea} 
                    placeholder="Describe los aspectos técnicos, componentes electrónicos o lógica demostrada en el video..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Destino del Video</label>
                  <select 
                    className={styles.selectInput}
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                  >
                    <option value="entrenamiento">Videos de Entrenamiento (Portal Alumno)</option>
                    <option value="inicio">Video Destacado (Página de Inicio Principal)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Categoría (Solo para Entrenamiento)</label>
                  <select 
                    className={styles.selectInput}
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    disabled={tipo === 'inicio'}
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nivel Técnico</label>
                  <select 
                    className={styles.selectInput}
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    disabled={tipo === 'inicio'}
                  >
                    <option value="Todos los niveles">Todos los niveles</option>
                    <option value="Principiantes">Principiantes</option>
                    <option value="Intermedios">Intermedios</option>
                    <option value="Avanzados">Avanzados</option>
                    <option value="Competidores Master">Competidores Master</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Instructor</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    disabled={tipo === 'inicio'}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Duración del Video (MM:SS)</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="e.g. 05:30"
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
                    disabled={tipo === 'inicio'}
                  />
                </div>

                {/* VIDEO FILE UPLOAD CONTAINER */}
                <div className={styles.formGroupFull} style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <input 
                    type="file" 
                    accept="video/*, .mp4, .webm, .mov, .mkv, .avi, .ogg, .wmv, .flv, .3gp, .m4v" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 50 * 1024 * 1024) {
                        alert("⚠️ EL ARCHIVO EXCEDE LOS 50MB\n\nSi usas el plan gratuito de Supabase, los archivos no pueden superar los 50MB y la subida fallará.\n\nRecomendaciones:\n1. Comprime el video (bajando resolución a 720p/480p) para reducir su peso.\n2. O bien, sube el video a YouTube (como 'Oculto' o 'Público') y pega el enlace de YouTube en el campo de texto de abajo.");
                      }
                      setVideoFile(file);
                    }}
                    style={{ display: 'none' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <UploadCloud size={36} style={{ color: videoFile ? 'var(--brand-gold)' : 'var(--text-secondary)' }} />
                    {videoFile ? (
                      <div>
                        <p style={{ fontWeight: 'bold', color: 'var(--brand-gold)', fontSize: '0.95rem' }}>
                          Archivo seleccionado: {videoFile.name}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <button 
                          type="button" 
                          onClick={() => { setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          style={{ color: 'var(--brand-red)', marginTop: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 600 }}
                        >
                          Remover archivo
                        </button>
                      </div>
                    ) : (
                      <div>
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={{ cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Seleccionar Archivo de Video Local
                        </button>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          Formatos aceptados: MP4, WebM, MOV, AVI, etc. Límite sugerido: 50MB.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.formGroupFull} style={{ textAlign: 'center', margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                  — O TAMBIÉN PUEDES PEGAR UN ENLACE DE VIDEO —
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>URL Directa del Video (o Enlace a YouTube/Vimeo)</label>
                  <input 
                    type="url" 
                    className={styles.input} 
                    placeholder="e.g. https://www.w3schools.com/html/mov_bbb.mp4"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={!!videoFile}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Si subiste un archivo local arriba, se deshabilitará este campo.
                  </p>
                </div>
              </div>

              {/* Category creation inline for Sensei (Admin) */}
              {isSensei && (
                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setShowAddCat(!showAddCat)}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  >
                    <span>{showAddCat ? "Ocultar panel de categoría" : "➕ Crear Nueva Categoría"}</span>
                  </button>
                  {showAddCat && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Nombre de la Categoría</label>
                        <input 
                          type="text" 
                          className={styles.input} 
                          placeholder="e.g. Robótica Avanzada" 
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Descripción</label>
                        <input 
                          type="text" 
                          className={styles.input} 
                          placeholder="Descripción breve..." 
                          value={newCatDesc}
                          onChange={(e) => setNewCatDesc(e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn-primary" 
                        style={{ alignSelf: 'flex-start', background: 'var(--brand-gold)', fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                        onClick={async () => {
                          if (!newCatName) return alert("Introduce el nombre de la categoría.");
                          
                          let finalCatId = `c_${Date.now()}`;
                          const catPayload = { nombre: newCatName.trim(), descripcion: newCatDesc.trim() };
                          
                          try {
                            const { data, error } = await supabase
                              .from("video_categorias")
                              .insert([catPayload])
                              .select();
                              
                            if (data && data.length > 0) {
                              finalCatId = data[0].id;
                            } else if (error) {
                              console.warn("Error al insertar categoría en DB:", error.message);
                            }
                          } catch (e) {
                            console.warn("Excepción al insertar categoría en DB:", e);
                          }
                          
                          const newCat = {
                            id: finalCatId,
                            nombre: newCatName.trim(),
                            descripcion: newCatDesc.trim()
                          };
                          const updatedCats = [...categories, newCat];
                          setCategories(updatedCats);
                          localStorage.setItem("dojo_categories", JSON.stringify(updatedCats));
                          setSelectedCategoryId(finalCatId);
                          setNewCatName("");
                          setNewCatDesc("");
                          setShowAddCat(false);
                          alert(`Categoría "${newCat.nombre}" creada con éxito.`);
                        }}
                      >
                        Guardar Categoría
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ background: 'var(--brand-red)', cursor: 'pointer', flex: 1, padding: '0.75rem' }} 
                  disabled={uploading}
                >
                  {uploading ? "Procesando..." : "Guardar Video"}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ cursor: 'pointer', flex: 1, padding: '0.75rem' }}
                  onClick={() => setActiveTab('view')}
                  disabled={uploading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Video Player Overlay */}
      {isPlayerOpen && selectedVideo && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseVideo(); }}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.playerCard} style={{ cursor: 'default' }}>
            <div className={styles.playerHeader}>
              <h2>{selectedVideo.titulo}</h2>
              <button onClick={handleCloseVideo} style={{ color: 'var(--text-secondary)', cursor: 'pointer', border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.videoWrapper}>
              {/* Actual Video Player Element */}
              {getYouTubeEmbedUrl(selectedVideo.url) ? (
                <iframe
                  src={getYouTubeEmbedUrl(selectedVideo.url) || undefined}
                  title={selectedVideo.titulo}
                  style={{ width: '100%', height: '100%', border: 'none', aspectRatio: '16/9' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={selectedVideo.url} 
                  className={styles.videoElement} 
                  autoPlay={isPlaying}
                  controls
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  onError={() => setVideoError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
              )}

              {videoError && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: '#ff4d4d', zIndex: 5 }}>
                  <span style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</span>
                  <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Error al cargar el video</h4>
                  <p style={{ fontSize: '0.85rem', color: '#ccc', maxWidth: '320px', lineHeight: '1.5', marginBottom: '1rem' }}>
                    {selectedVideo.url.startsWith('blob:') 
                      ? 'Este video se guardó temporalmente en la memoria de tu navegador y ya expiró. Por favor, ejecuta el script SQL en Supabase y vuelve a subirlo.' 
                      : 'El enlace de este video no está disponible o el formato no es compatible.'}
                  </p>
                  {selectedVideo.url.startsWith('blob:') && (
                    <button 
                      onClick={() => {
                        handleDeleteVideo(selectedVideo.id);
                        handleCloseVideo();
                      }}
                      className="btn-primary"
                      style={{ background: 'var(--brand-red)', fontSize: '0.85rem', padding: '0.5rem 1.25rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Eliminar Video Expirado
                    </button>
                  )}
                </div>
              )}

              {/* HUD Controls Overlay (Custom styled fallback overlay) */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1rem', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', display: 'none', flexDirection: 'column', gap: '0.5rem', zIndex: 10 }}>
                {/* Timeline progress bar */}
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: `${playProgress}%`, height: '100%', background: 'var(--brand-red)', borderRadius: '2px', transition: 'width 0.1s linear' }}></div>
                </div>
                
                {/* HUD Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => setIsPlaying(!isPlaying)} style={{ color: 'white', cursor: 'pointer', border: 'none', background: 'transparent' }}>
                      {isPlaying ? (
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>PAUSE</span>
                      ) : (
                        <Play size={16} fill="#FFF" />
                      )}
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#ccc' }}>
                      {Math.floor((playProgress / 100) * 5)}:00 / {selectedVideo.duracion}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ccc' }}>
                    <Volume2 size={16} />
                    <Maximize2 size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {selectedVideo.descripcion}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                {selectedVideo.tipo === 'entrenamiento' ? (
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span><strong>Mentor:</strong> {selectedVideo.instructor}</span>
                    <span><strong>Nivel:</strong> {selectedVideo.nivel}</span>
                  </div>
                ) : (
                  <div></div>
                )}
                <button 
                  onClick={handleCloseVideo} 
                  className="btn-secondary" 
                  style={{ 
                    padding: '0.5rem 1.25rem', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  Cerrar Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
