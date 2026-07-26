"use client";

import { useEffect, useState } from "react";
import styles from "./ranking.module.css";
import { 
  Trophy, 
  Search, 
  Award, 
  Sparkles, 
  Medal, 
  Target,
  CheckCircle,
  Clock
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Student {
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
  insignias?: string[];
}

export default function RankingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadStudents();
  }, []);

  const getRoboticsLevelName = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return "Robot seguidor de linea";
      case "amarillo": return "Arduino Maker (Nivel 2)";
      case "naranja": return "ESP32 IoT (Nivel 3)";
      case "verde": return "Raspberry Pi (Nivel 4)";
      case "azul": return "Python Code (Nivel 5)";
      case "marron": return "AI & Machine Learning (Nivel 6)";
      case "negro": return "Competidor Master (Nivel 7)";
      default: return belt || "Nivel Inicial";
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      
      let kList: Student[] = [];
      const { data } = await supabase
        .from("karatekas")
        .select("*")
        .eq("activo", true);

      if (data && data.length > 0) {
        kList = data;
      } else {
        const cached = localStorage.getItem("local_karatekas");
        if (cached) {
          kList = JSON.parse(cached);
        } else {
          kList = [
            { id: "1", matricula: "KA-2026-001", nombre: "Mateo García López", cinturon: "verde", grado: "Raspberry Pi", tutor: "Adriana López", telefono: "+5215512345678", foto_url: "https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "2", matricula: "KA-2026-002", nombre: "Sofía Martínez Ruiz", cinturon: "amarillo", grado: "Arduino Maker", tutor: "Carlos Martínez", telefono: "+5215587654321", foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "3", matricula: "KA-2026-003", nombre: "Diego Fernández Silva", cinturon: "negro", grado: "Competidor Master", tutor: "Juan Fernández", telefono: "+5215545678901", foto_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "4", matricula: "KA-2026-004", nombre: "Valentina Ruiz Castro", cinturon: "azul", grado: "Python Code", tutor: "Patricia Castro", telefono: "+5215598765432", foto_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200", activo: true },
            { id: "5", matricula: "KA-2026-005", nombre: "Lucas Torres Mendoza", cinturon: "marron", grado: "AI & Machine Learning", tutor: "Fernando Torres", telefono: "+5215565432109", foto_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200", activo: true }
          ];
        }
      }

      // Add seed points and badges if not present in DB
      const processedList = kList.map((k) => {
        let pts = k.puntos;
        if (pts === undefined || pts === null || pts === 100) {
          // Dynamic points seed
          const defaultPoints: Record<string, number> = {
            "KA-2026-001": 380, // Mateo (Approved exam!)
            "KA-2026-003": 350, // Diego
            "KA-2026-004": 280, // Valentina
            "KA-2026-002": 210, // Sofía
            "KA-2026-005": 160  // Lucas
          };
          pts = defaultPoints[k.matricula] || 100;
        }

        let insignias: string[] = [];
        if (k.matricula === "KA-2026-001") insignias = ["Asistencia Perfecta 🎖️", "Proyecto Aprobado 🤖", "Maker Master 🛠️"];
        else if (k.matricula === "KA-2026-003") insignias = ["Competidor Master 🤖", "Robótica Pro 🏆", "Líder de Equipo 🌟"];
        else if (k.matricula === "KA-2026-004") insignias = ["Código Limpio 🐍", "Lógica Ágil 💡"];
        else if (k.matricula === "KA-2026-002") insignias = ["Progreso Rápido ⚡", "Esfuerzo Constante 💪"];
        else if (k.matricula === "KA-2026-005") insignias = ["Técnica Depurada 🌟", "Hardware Hacker 🔌"];
        else insignias = ["Estudiante Activo 🤖"];

        return {
          ...k,
          puntos: pts,
          insignias
        };
      });

      // Sort by points descending
      processedList.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
      setStudents(processedList);
    } catch (e) {
      console.warn(e);
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

  const getRankMedal = (rank: number) => {
    if (rank === 0) return <Medal size={20} color="#F59E0B" />; // Oro
    if (rank === 1) return <Medal size={20} color="#94A3B8" />; // Plata
    if (rank === 2) return <Medal size={20} color="#D97706" />; // Bronce
    return null;
  };

  // Filter list
  const filteredList = students.filter(k => 
    k.nombre.toLowerCase().includes(search.toLowerCase()) ||
    k.matricula.toLowerCase().includes(search.toLowerCase())
  );

  const podium = students.slice(0, 3);
  const tableRows = filteredList;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Ranking de Alumnos
          </h1>
          <p>Tabla de honor y gamificación técnica de la academia IA Make.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando tabla de posiciones...</p>
      ) : (
        <>
          {/* PODIUM SECTION */}
          {podium.length >= 3 && (
            <div className={styles.podiumGrid}>
              
              {/* 2nd Place Card */}
              {podium[1] && (
                <div className={styles.podiumCard} style={{ order: 1 }}>
                  <div className={`${styles.podiumRankBadge} ${styles.second}`}>2</div>
                  <div className={styles.podiumAvatar}>
                    {podium[1].foto_url ? (
                      <img src={podium[1].foto_url} alt={podium[1].nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : "🤖"}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{podium[1].nombre}</h4>
                    <span className={`belt-badge ${getBeltColorClass(podium[1].cinturon)}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', marginTop: '0.25rem' }}>
                      {getRoboticsLevelName(podium[1].cinturon)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--brand-gold)' }}>
                    {podium[1].puntos} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>PTS</span>
                  </div>
                </div>
              )}

              {/* 1st Place Card */}
              {podium[0] && (
                <div className={styles.podiumCard} style={{ order: 2, transform: 'scale(1.08)', zIndex: 10, borderColor: 'var(--brand-gold)', boxShadow: '0 8px 25px rgba(217,119,6,0.15)' }}>
                  <div className={`${styles.podiumRankBadge} ${styles.first}`} style={{ top: '-20px', width: '45px', height: '45px', fontSize: '1.25rem' }}>
                    <Trophy size={18} />
                  </div>
                  <div className={styles.podiumAvatar} style={{ width: '80px', height: '80px', border: '3px solid var(--brand-gold)' }}>
                    {podium[0].foto_url ? (
                      <img src={podium[0].foto_url} alt={podium[0].nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : "🤖"}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                      {podium[0].nombre} <Sparkles size={16} color="var(--brand-gold)" />
                    </h3>
                    <span className={`belt-badge ${getBeltColorClass(podium[0].cinturon)}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', marginTop: '0.25rem' }}>
                      {getRoboticsLevelName(podium[0].cinturon)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--brand-gold)', fontSize: '1.2rem' }}>
                    {podium[0].puntos} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>PTS</span>
                  </div>
                </div>
              )}

              {/* 3rd Place Card */}
              {podium[2] && (
                <div className={styles.podiumCard} style={{ order: 3 }}>
                  <div className={`${styles.podiumRankBadge} ${styles.third}`}>3</div>
                  <div className={styles.podiumAvatar}>
                    {podium[2].foto_url ? (
                      <img src={podium[2].foto_url} alt={podium[2].nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : "🤖"}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{podium[2].nombre}</h4>
                    <span className={`belt-badge ${getBeltColorClass(podium[2].cinturon)}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', marginTop: '0.25rem' }}>
                      {getRoboticsLevelName(podium[2].cinturon)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--brand-gold)' }}>
                    {podium[2].puntos} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>PTS</span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Leaderboard Table Search */}
          <div className={styles.searchBar}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o matrícula..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* LEADERBOARD TABLE */}
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Posición</th>
                  <th>Alumno</th>
                  <th>Nivel</th>
                  <th>Especialidad</th>
                  <th>Insignias y Logros</th>
                  <th style={{ textAlign: 'right' }}>Puntuación Maker</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((k, idx) => {
                  const originalIndex = students.findIndex(orig => orig.id === k.id);
                  const isTopThree = originalIndex < 3;
                  
                  return (
                    <tr key={k.id}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          {getRankMedal(originalIndex)}
                          <span>{originalIndex + 1}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={styles.avatar}>
                            {k.foto_url ? (
                              <img src={k.foto_url} alt={k.nombre} className={styles.avatarImg} />
                            ) : (
                              k.nombre.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600 }}>{k.nombre}</span>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{k.matricula}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`belt-badge ${getBeltColorClass(k.cinturon)}`}>
                          {getRoboticsLevelName(k.cinturon)}
                        </span>
                      </td>
                      <td>{k.grado}</td>
                      <td>
                        <div className={styles.badgeGrid}>
                          {k.insignias?.map((ins, i) => (
                            <span key={i} className={styles.badge}>{ins}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: isTopThree ? 'var(--brand-gold)' : 'var(--text-primary)' }}>
                        {k.puntos} PTS
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
