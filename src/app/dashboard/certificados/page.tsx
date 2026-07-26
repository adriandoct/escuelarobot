"use client";

import { useEffect, useState } from "react";
import styles from "./certificados.module.css";
import { 
  FileText, 
  Award, 
  Printer, 
  X, 
  Download, 
  Calendar,
  ShieldCheck,
  Globe
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

interface Certificate {
  id: string;
  exam_id: string;
  karateka_id: string;
  codigo_certificado: string;
  fecha_emision: string;
  karateka?: {
    nombre: string;
    cinturon: string;
    grado: string;
  };
  exam?: {
    cinturon_solicitado: string;
    grado_solicitado: string;
    calificacion?: number;
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

export default function CertificadosPage() {
  const [role, setRole] = useState("karateka");
  const [userName, setUserName] = useState("Alumno");
  const [currentKarateka, setCurrentKarateka] = useState<Karateka | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

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

      // Find current student
      let student: Karateka | null = null;
      if (userRole === "karateka") {
        student = localKaratekas.find(k => k.nombre.toLowerCase().includes(name.toLowerCase())) || localKaratekas[3] || localKaratekas[0] || null;
        setCurrentKarateka(student);
      }

      // 2. Fetch certificates
      let certList: Certificate[] = [];
      const { data: cData } = await supabase
        .from("certificados")
        .select(`
          id, exam_id, karateka_id, codigo_certificado, fecha_emision,
          karatekas(nombre, cinturon, grado)
        `)
        .order("created_at", { ascending: false });

      if (cData && cData.length > 0) {
        certList = cData.map((c: any) => ({
          ...c,
          karateka: c.karatekas
        }));
      } else {
        const cachedCerts = localStorage.getItem("dojo_certificados");
        if (cachedCerts) {
          certList = JSON.parse(cachedCerts);
        } else {
          // Default mock seed data
          certList = [
            {
              id: "c1",
              exam_id: "r1",
              karateka_id: localKaratekas[0]?.id || "1",
              codigo_certificado: "CERT-MAKE-8821-MATEO",
              fecha_emision: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split("T")[0],
              karateka: {
                nombre: localKaratekas[0]?.nombre || "Mateo García López",
                cinturon: "verde",
                grado: "Raspberry Pi"
              },
              exam: {
                cinturon_solicitado: "verde",
                grado_solicitado: "Raspberry Pi",
                calificacion: 9.4
              }
            }
          ];
          
          // If logged in student is different and has approved exams, generate a cert for them too
          if (student && student.id !== localKaratekas[0]?.id) {
            certList.push({
              id: "c2",
              exam_id: "r3",
              karateka_id: student.id,
              codigo_certificado: `CERT-MAKE-9943-${student.nombre.split(" ")[0].toUpperCase()}`,
              fecha_emision: new Date(Date.now() - 3600000 * 24 * 30).toISOString().split("T")[0],
              karateka: {
                nombre: student.nombre,
                cinturon: student.cinturon,
                grado: student.grado
              },
              exam: {
                cinturon_solicitado: student.cinturon,
                grado_solicitado: student.grado,
                calificacion: 9.0
              }
            });
          }
          localStorage.setItem("dojo_certificados", JSON.stringify(certList));
        }
      }

      // Filter certificates list
      if (userRole === "karateka" && student) {
        const filtered = certList.filter(c => c.karateka_id === student.id);
        setCertificates(filtered);
      } else {
        setCertificates(certList);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const getBeltColor = (belt: string) => {
    switch (belt?.toLowerCase()) {
      case "blanco": return "#FFFFFF";
      case "amarillo": return "#FACC15";
      case "naranja": return "#FB923C";
      case "verde": return "#22C55E";
      case "azul": return "#3B82F6";
      case "marron": return "#8B4513";
      case "negro": return "#0F1216";
      default: return "#CBD5E1";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {role === "sensei" ? "Gestión de Certificados Maker" : "Mis Certificados Maker"}
          </h1>
          <p>
            {role === "sensei" 
              ? "Revisa e imprime los diplomas de ascenso autorizados en la academia." 
              : "Descarga e imprime tus diplomas oficiales de certificación de nivel."}
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando certificados...</p>
      ) : (
        <div className={styles.grid}>
          {certificates.map((cert) => (
            <div 
              key={cert.id} 
              className={styles.certificateCard}
              onClick={() => setSelectedCert(cert)}
            >
              <div className={styles.cardIconArea}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: getBeltColor(cert.karateka?.cinturon || "blanco"), border: '2px solid #475569', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}></div>
              </div>
              <div className={styles.cardMeta}>
                <h3>{getRoboticsLevelName(cert.karateka?.cinturon || "")}</h3>
                <p>Especialidad: {cert.karateka?.grado}</p>
                <p>Alumno: {cert.karateka?.nombre}</p>
                <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{cert.codigo_certificado}</span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <Calendar size={12} />
                  <span>Emisión: {cert.fecha_emision}</span>
                </div>

                <div className={styles.viewBtn}>Ver Diploma Oficial</div>
              </div>
            </div>
          ))}

          {certificates.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem', margin: 'auto' }} />
              <p>Aún no tienes certificaciones aprobadas. Completa y aprueba la evaluación de un proyecto integrador para recibir tu diploma STEM.</p>
            </div>
          )}
        </div>
      )}

      {/* Diploma Modal Overlay */}
      {selectedCert && (
        <div className={styles.modalOverlay}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '750px' }}>
            
            {/* Top Modal Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }} className={styles.closePrintBtn}>
              <button 
                onClick={() => window.print()}
                className="btn-primary" 
                style={{ background: 'var(--brand-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <Printer size={18} /> Imprimir / Guardar PDF
              </button>
              <button 
                onClick={() => setSelectedCert(null)}
                className="btn-secondary" 
                style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid white', cursor: 'pointer', background: 'transparent' }}
              >
                <X size={20} /> Cerrar
              </button>
            </div>

            {/* Official Diploma Paper */}
            <div className={styles.diplomaContainer}>
              <div className={styles.diplomaWatermark}>IA</div>
              
              <div className={styles.diplomaHeader}>
                <h2 className="logo-script" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '3rem', margin: 0 }}>IA Make Academy</h2>
                <p>CERTIFICADO OFICIAL DE CERTIFICACIÓN DE NIVEL STEM</p>
              </div>

              <div className={styles.diplomaBody}>
                <p className={styles.diplomaTitle}>Otorgado con orgullo y validación académica a:</p>
                <h1 className={styles.recipientName}>{selectedCert.karateka?.nombre}</h1>
                
                <p className={styles.diplomaText}>
                  Por haber demostrado la lógica, perseverancia y habilidad técnica en la construcción y programación de prototipos de la especialidad de <strong>{selectedCert.karateka?.grado}</strong>, acreditando el desarrollo del circuito y código necesarios para certificar el nivel de:
                </p>

                <h3 className={styles.beltAwarded}>
                  {getRoboticsLevelName(selectedCert.karateka?.cinturon || '')}
                </h3>

                <p className={styles.diplomaText} style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Dado en la sede de la academia en la fecha {selectedCert.fecha_emision}.
                </p>
              </div>

              <div className={styles.diplomaFooter}>
                <div className={styles.signatureLine}>
                  <span>Carlos Martínez</span>
                  <p>Director Maker</p>
                  <p style={{ border: 'none', fontSize: '0.6rem', color: '#94a3b8', paddingTop: 0 }}>IA Make Academy</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px double #b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#b45309', transform: 'rotate(-10deg)', opacity: 0.85 }}>
                    SELLO
                  </div>
                </div>

                <div className={styles.signatureLine}>
                  <span>Comité Evaluador STEM</span>
                  <p>Mentor e Instructor</p>
                  <p style={{ border: 'none', fontSize: '0.6rem', color: '#94a3b8', paddingTop: 0 }}>IA Make Academy</p>
                </div>
              </div>

              <div className={styles.diplomaCode}>
                Código de Autenticidad: {selectedCert.codigo_certificado}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
