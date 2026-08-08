"use client";

import { useEffect, useState } from "react";
import styles from "./cursos.module.css";
import { Plus, PlaySquare, Clock, User, BookOpen } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
  created_at: string;
}

// Helper function to extract YouTube thumbnail
function getYouTubeThumbnail(url: string) {
  if (!url) return null;
  const cleanUrl = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = cleanUrl.match(regExp);
  return (match && match[1].length === 11) 
    ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` 
    : null;
}

// Client-side helper to read cookies
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  return '';
};

export default function CursosListPage() {
  const [role, setRole] = useState("karateka");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const userRole = getCookie("dojoia_role") || "karateka";
    setRole(userRole);
    loadCursos(userRole);
  }, []);

  const loadCursos = async (userRole: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (data) {
        setCursos(data);
      }
    } catch (e) {
      console.error("Error cargando cursos", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    // Create a draft course and redirect to builder
    try {
      const { data, error } = await supabase
        .from("cursos")
        .insert([{
          titulo: "Nuevo Curso Borrador",
          descripcion: "Descripción del curso...",
          estado: "borrador",
          nivel: "Todos los niveles"
        }])
        .select()
        .single();
        
      if (data && data.id) {
        router.push(`/dashboard/cursos/builder/${data.id}`);
      } else {
        alert("Error al crear el curso base. Verifica las políticas RLS.");
      }
    } catch (e) {
      console.error("Error creating course", e);
    }
  };

  const isSensei = role === "sensei" || role === "admin";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isSensei ? "Gestión de Cursos" : "Mis Cursos STEM"}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isSensei 
              ? "Crea y administra tus propios cursos con temarios, videos y recursos adjuntos." 
              : "Explora los cursos en los que estás inscrito y avanza a tu propio ritmo."}
          </p>
        </div>
        
        {isSensei && (
          <button onClick={handleCreateCourse} className={styles.createBtn}>
            <Plus size={18} /> Nuevo Curso
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando cursos...</div>
      ) : cursos.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} color="var(--border-color)" />
          <h3>No hay cursos disponibles</h3>
          <p>{isSensei ? "Haz clic en 'Nuevo Curso' para empezar a crear tu primer temario." : "Actualmente no hay cursos publicados."}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {cursos.map(curso => (
            <div 
              key={curso.id} 
              className={styles.courseCard}
              onClick={() => router.push(isSensei ? `/dashboard/cursos/builder/${curso.id}` : `/dashboard/cursos/view/${curso.id}`)}
            >
              <div className={styles.thumbnailContainer}>
                <img 
                  src={curso.thumbnail_url || getYouTubeThumbnail(curso.video_intro_url) || "/ia-make-logo.png"} 
                  alt={curso.titulo} 
                  className={styles.thumbnailImg} 
                  style={!(curso.thumbnail_url || getYouTubeThumbnail(curso.video_intro_url)) ? { objectFit: 'contain', padding: '2rem' } : {}}
                />
                <div className={styles.statusTag} style={curso.estado === 'publicado' ? { background: 'rgba(16, 185, 129, 0.9)' } : { background: 'rgba(234, 179, 8, 0.9)' }}>
                  {curso.estado}
                </div>
              </div>
              
              <div className={styles.meta}>
                <h3>{curso.titulo}</h3>
                <p>{(curso.descripcion || "").substring(0, 80)}{curso.descripcion && curso.descripcion.length > 80 ? "..." : ""}</p>
                
                <div className={styles.metaFooter}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <BookOpen size={12} /> {curso.nivel}
                  </span>
                  {!isSensei ? (
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                      ${(curso.precio || 1000).toFixed(2)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--brand-accent)', fontWeight: 'bold' }}>
                      Editar Temario →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
