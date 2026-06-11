"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./asistencia.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Wifi, 
  WifiOff, 
  Camera, 
  CameraOff,
  Search,
  UserCheck
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
}

interface ScanLog {
  id: string;
  nombre: string;
  cinturon: string;
  grado: string;
  time: string;
  status: 'entrada' | 'salida';
  whatsapp: 'sent' | 'error' | 'simulated';
}

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

export default function AsistenciaPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [jsqrLoaded, setJsqrLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [scanMode, setScanMode] = useState<'auto' | 'entrada' | 'salida'>('auto');
  const [manualMatricula, setManualMatricula] = useState("");
  const [recentLogs, setRecentLogs] = useState<ScanLog[]>([]);
  const [offlineQueueLength, setOfflineQueueLength] = useState(0);

  // Scanner states
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [scannedStatus, setScannedStatus] = useState<'entrada' | 'salida'>('entrada');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedCodeRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const supabase = createClient();

  // Play synthesized Web Audio sounds (Oss! success chime / Deep buzzer error)
  const playSound = (type: 'success' | 'error') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.16); // A5 (rising chords)
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.error("Failed to play sound", e);
    }
  };

  // Monitor network status
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const goOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Load offline queue length
    const queue = localStorage.getItem("offline_scans");
    if (queue) {
      setOfflineQueueLength(JSON.parse(queue).length);
    }

    // Load recent scan logs from local memory
    const logs = localStorage.getItem("recent_dojo_scans");
    if (logs) {
      setRecentLogs(JSON.parse(logs));
    } else {
      setRecentLogs([
        { id: "1", nombre: "Mateo García López", cinturon: "verde", grado: "Raspberry Pi", time: "17:12", status: "entrada", whatsapp: "simulated" },
        { id: "2", nombre: "Sofía Martínez Ruiz", cinturon: "amarillo", grado: "Arduino Maker", time: "17:15", status: "entrada", whatsapp: "simulated" },
        { id: "3", nombre: "Lucas Torres Mendoza", cinturon: "marron", grado: "AI & Machine Learning", time: "17:35", status: "entrada", whatsapp: "simulated" }
      ]);
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Dynamically load jsQR library from CDN
  useEffect(() => {
    if (typeof window === "undefined" || window.hasOwnProperty("jsQR")) {
      setJsqrLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js";
    script.async = true;
    script.onload = () => setJsqrLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Toggle Camera
  const startCamera = async () => {
    try {
      if (streamRef.current) stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 }
      });
      streamRef.current = stream;
      setCameraActive(true);
      setIsScanning(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("No se pudo acceder a la cámara. Por favor ingresa la matrícula manualmente.");
      setCameraActive(false);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    setCameraActive(false);
    setIsScanning(false);
  };

  // Connect stream to video element when camera becomes active
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(err => {
        console.error("Error playing video stream:", err);
      });
    }
  }, [cameraActive]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // QR Scanning Loop
  useEffect(() => {
    if (!cameraActive || !jsqrLoaded || !isScanning) return;

    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current) {
        requestRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // jsQR comes from the CDN script loaded in window
        const code = (window as any).jsQR?.(
          imageData.data,
          imageData.width,
          imageData.height,
          { inversionAttempts: "dontInvert" }
        );

        if (code && code.data) {
          const now = Date.now();
          // Anti-duplicate protection: prevent scanning same QR within 10s
          if (code.data !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 10000) {
            lastScannedCodeRef.current = code.data;
            lastScannedTimeRef.current = now;
            handleScannedCode(code.data);
          }
        }
      }
      requestRef.current = requestAnimationFrame(scanFrame);
    };

    requestRef.current = requestAnimationFrame(scanFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [cameraActive, jsqrLoaded, isScanning]);

  // Handle a successfully scanned code (e.g. "KA-2026-001")
  const handleScannedCode = async (matricula: string) => {
    setIsScanning(false); // Stop scanning momentarily
    try {
      // Find Student in Supabase or local mock database
      const { data: student, error } = await supabase
        .from("karatekas")
        .select("*")
        .eq("matricula", matricula.trim())
        .single();

      let matchedStudent: Student | null = student;

      // Graceful fallback for mock demo
      if (error || !student) {
        const mockKaratekas: Student[] = [
          { id: "1", nombre: "Mateo García López", matricula: "KA-2026-001", cinturon: "verde", grado: "Raspberry Pi", tutor: "Adriana López", telefono: "+5215512345678", foto_url: "https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=200" },
          { id: "2", nombre: "Sofía Martínez Ruiz", matricula: "KA-2026-002", cinturon: "amarillo", grado: "Arduino Maker", tutor: "Carlos Martínez", telefono: "+5215587654321", foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" },
          { id: "3", nombre: "Diego Fernández Silva", matricula: "KA-2026-003", cinturon: "negro", grado: "Competidor Master", tutor: "Juan Fernández", telefono: "+5215545678901", foto_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
          { id: "4", nombre: "Valentina Ruiz Castro", matricula: "KA-2026-004", cinturon: "azul", grado: "Python Code", tutor: "Patricia Castro", telefono: "+5215598765432", foto_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200" },
          { id: "5", nombre: "Lucas Torres Mendoza", matricula: "KA-2026-005", cinturon: "marron", grado: "AI & Machine Learning", tutor: "Fernando Torres", telefono: "+5215565432109", foto_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200" }
        ];
        matchedStudent = mockKaratekas.find(k => k.matricula === matricula.trim()) || null;
      }

      if (!matchedStudent) {
        playSound("error");
        alert(`Matrícula inválida: "${matricula}" no pertenece a ningún alumno.`);
        setIsScanning(true);
        return;
      }

      // Determine Entry/Exit status
      let status: 'entrada' | 'salida' = 'entrada';
      if (scanMode === 'auto') {
        // Query latest attendance for this student
        const { data: latest } = await supabase
          .from("asistencias_karate")
          .select("tipo")
          .eq("karateka_id", matchedStudent.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (latest && latest.length > 0 && latest[0].tipo === 'entrada') {
          status = 'salida';
        }
      } else {
        status = scanMode;
      }

      // Play success chime
      playSound("success");

      // Save Log
      const now = new Date();
      const timeStr = now.toTimeString().substring(0, 5);
      const dateStr = now.toISOString().split("T")[0];

      const scanRecord = {
        studentId: matchedStudent.id,
        nombre: matchedStudent.nombre,
        cinturon: matchedStudent.cinturon,
        grado: matchedStudent.grado,
        tutor: matchedStudent.tutor,
        telefono: matchedStudent.telefono,
        tipo: status,
        fecha: dateStr,
        hora: now.toTimeString().split(" ")[0],
      };

      // Add to UI state scanned profile card
      setScannedStudent(matchedStudent);
      setScannedStatus(status);
      setIsModalOpen(true);

      if (isOnline) {
        // Post directly to Supabase
        await supabase.from("asistencias_karate").insert({
          karateka_id: matchedStudent.id,
          tipo: status,
          fecha: dateStr,
          hora: now.toTimeString().split(" ")[0],
          whatsapp_sent: true,
          whatsapp_status: "simulated"
        });

        // Trigger WhatsApp Simulator storage queue
        saveWhatsAppLog(scanRecord);
      } else {
        // Store in Offline Queue
        const queue = localStorage.getItem("offline_scans");
        const queueList = queue ? JSON.parse(queue) : [];
        queueList.push(scanRecord);
        localStorage.setItem("offline_scans", JSON.stringify(queueList));
        setOfflineQueueLength(queueList.length);
      }

      // Add to recent scan logs list
      const newLog: ScanLog = {
        id: Math.random().toString(),
        nombre: matchedStudent.nombre,
        cinturon: matchedStudent.cinturon,
        grado: matchedStudent.grado,
        time: timeStr,
        status: status,
        whatsapp: isOnline ? "simulated" : "error"
      };

      const updatedLogs = [newLog, ...recentLogs.slice(0, 9)];
      setRecentLogs(updatedLogs);
      localStorage.setItem("recent_dojo_scans", JSON.stringify(updatedLogs));

      // Auto close scanned popup card after 4.5 seconds and restart camera
      setTimeout(() => {
        setIsModalOpen(false);
        setScannedStudent(null);
        if (cameraActive) {
          setIsScanning(true);
        }
      }, 4500);

    } catch (err) {
      console.error(err);
      playSound("error");
      setIsScanning(true);
    }
  };

  // Sync Offline queue with Supabase
  const syncOfflineQueue = async () => {
    const queue = localStorage.getItem("offline_scans");
    if (!queue) return;
    const list = JSON.parse(queue);
    if (list.length === 0) return;

    for (const record of list) {
      await supabase.from("asistencias_karate").insert({
        karateka_id: record.studentId,
        tipo: record.tipo,
        fecha: record.fecha,
        hora: record.hora,
        whatsapp_sent: true,
        whatsapp_status: "sent"
      });
      // Save logs in simulated phone log too
      saveWhatsAppLog(record);
    }

    localStorage.removeItem("offline_scans");
    setOfflineQueueLength(0);
    alert("¡Cola offline sincronizada con Supabase exitosamente!");
  };

  // Save logs into localStorage for WhatsApp Simulator
  const saveWhatsAppLog = (record: any) => {
    const wLogs = localStorage.getItem("simulated_whatsapp_messages");
    const list = wLogs ? JSON.parse(wLogs) : [];
    
    const messageTemplate = record.tipo === 'entrada' 
      ? `🤖 *IA Make Academy*\n\nHola *${record.tutor}*,\n\nLe informamos que el alumno:\n👦 *${record.nombre}* (${getRoboticsLevelName(record.cinturon)} - ${record.grado})\n\n✅ *ENTRÓ* al Laboratorio de Robótica.\n\n🕒 Hora: ${record.hora.substring(0, 5)}\n📅 Fecha: ${record.fecha}\n\n🤖 ¡A crear!`
      : `🤖 *IA Make Academy*\n\nHola *${record.tutor}*,\n\nLe informamos que el alumno:\n👦 *${record.nombre}* (${getRoboticsLevelName(record.cinturon)} - ${record.grado})\n\n✅ *SALIÓ* de la Academia.\n\n🕒 Hora: ${record.hora.substring(0, 5)}\n📅 Fecha: ${record.fecha}\n\n🤖 ¡Nos vemos en el próximo proyecto!`;

    list.unshift({
      id: Math.random().toString(),
      tutor: record.tutor,
      telefono: record.telefono,
      nombre: record.nombre,
      message: messageTemplate,
      timestamp: new Date().toLocaleTimeString().substring(0, 5)
    });

    localStorage.setItem("simulated_whatsapp_messages", JSON.stringify(list.slice(0, 50)));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatricula.trim()) return;
    handleScannedCode(manualMatricula.trim());
    setManualMatricula("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Control de Asistencia QR
          </h1>
          <p>Control de acceso escolar en tiempo real para talleres maker y laboratorios.</p>
        </div>
        <div style={{ marginRight: '8.5rem' }}>
          {isOnline ? (
            <span className={styles.onlineBadge}>
              <Wifi size={14} /> Sistema Online
            </span>
          ) : (
            <span className={styles.offlineBadge}>
              <WifiOff size={14} /> Modo Offline ({offlineQueueLength} en cola)
            </span>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left Side: Scanner Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.qrSection} style={{ borderTop: '4px solid var(--brand-red)' }}>
            <h3>Lector de Credenciales</h3>
            
            {cameraActive ? (
              <div className={styles.videoContainer}>
                <video 
                  ref={videoRef} 
                  className={styles.video} 
                  autoPlay 
                  playsInline 
                  muted 
                />
                <div className={styles.beam}></div>
              </div>
            ) : (
              <div className={styles.qrScanner} style={{ borderColor: 'var(--brand-red)', color: 'var(--brand-red)' }} onClick={startCamera}>
                <Camera size={48} />
                <p>Activar Cámara de Escaneo</p>
              </div>
            )}

            {cameraActive && (
              <button 
                className="btn-secondary" 
                onClick={stopCamera} 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CameraOff size={16} /> Desactivar Cámara
              </button>
            )}

            <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Modo de Registro:
              </p>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px' }}>
                <button 
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: scanMode === 'auto' ? 'var(--brand-red)' : 'transparent', color: scanMode === 'auto' ? 'white' : 'var(--text-secondary)' }}
                  onClick={() => setScanMode('auto')}
                >
                  Automático
                </button>
                <button 
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: scanMode === 'entrada' ? 'var(--brand-red)' : 'transparent', color: scanMode === 'entrada' ? 'white' : 'var(--text-secondary)' }}
                  onClick={() => setScanMode('entrada')}
                >
                  Entrada
                </button>
                <button 
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, background: scanMode === 'salida' ? 'var(--brand-red)' : 'transparent', color: scanMode === 'salida' ? 'white' : 'var(--text-secondary)' }}
                  onClick={() => setScanMode('salida')}
                >
                  Salida
                </button>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className={styles.manualForm}>
              <input 
                type="text" 
                placeholder="Ingresar matrícula..." 
                className={styles.manualInput}
                value={manualMatricula}
                onChange={(e) => setManualMatricula(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ background: 'var(--brand-red)', padding: '0.5rem' }}>
                <Search size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Scan Table Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <h3>Registros del Turno</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Muestra los últimos 10 escaneos</p>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Nivel</th>
                    <th>Especialidad</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Notificación</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{log.nombre}</span>
                      </td>
                      <td>
                        <span className={`belt-badge belt-${(log.cinturon || '').toLowerCase()}`}>
                          {getRoboticsLevelName(log.cinturon)}
                        </span>
                      </td>
                      <td>{log.grado}</td>
                      <td>{log.time}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${log.status === 'entrada' ? styles.presente : styles.ausente}`}>
                          {log.status === 'entrada' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td>
                        {log.whatsapp === 'sent' || log.whatsapp === 'simulated' ? (
                          <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 500 }}>Enviado 💬</span>
                        ) : (
                          <span style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 500 }}>Falla / Offline ⚠️</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                        No hay escaneos recientes en esta sesión.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Scanned Student Popup Card Overlay */}
      <AnimatePresence>
        {isModalOpen && scannedStudent && (
          <div className={styles.modalOverlay}>
            <motion.div 
              className={styles.studentCard}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className={styles.cardPhotoContainer} style={{ borderColor: 'var(--brand-red)' }}>
                  {scannedStudent.foto_url ? (
                    <img src={scannedStudent.foto_url} alt={scannedStudent.nombre} className={styles.cardPhoto} />
                  ) : (
                    <span style={{ fontSize: '3rem' }}>🤖</span>
                  )}
                </div>
                
                <span className={`belt-badge belt-${(scannedStudent.cinturon || '').toLowerCase()}`} style={{ fontSize: '1rem' }}>
                  {getRoboticsLevelName(scannedStudent.cinturon)}
                </span>

                <div className={styles.cardDetails}>
                  <h2>{scannedStudent.nombre}</h2>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Especialidad: {scannedStudent.grado}</p>
                  <p>Matrícula: {scannedStudent.matricula}</p>
                  <p>Tutor: {scannedStudent.tutor}</p>
                </div>

                <div className={`${styles.cardStatus} ${scannedStatus === 'entrada' ? styles.entrada : styles.salida}`}>
                  {scannedStatus === 'entrada' ? '✅ ENTRADA REGISTRADA' : '🚪 SALIDA REGISTRADA'}
                </div>

                <p style={{ fontSize: '0.8,rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                  <UserCheck size={14} /> WhatsApp enviado al tutor (+52...)
                </p>

                <button className={styles.closeCardBtn} onClick={() => {
                  setIsModalOpen(false);
                  setScannedStudent(null);
                  if (cameraActive) setIsScanning(true);
                }}>
                  Entendido (Cerrar)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
