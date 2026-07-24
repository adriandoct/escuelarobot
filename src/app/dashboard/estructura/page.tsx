"use client";

import { useState } from "react";
import styles from "./estructura.module.css";
import { 
  Calendar, 
  Award, 
  Clock, 
  BookOpen, 
  BookOpenCheck,
  User
} from "lucide-react";

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
  colorHex: string;
  textColor: string;
  katas: string[];
  kumite: string[];
  requirements: string;
}

export default function EstructuraPage() {
  const [activeTab, setActiveTab] = useState<'horarios' | 'programa'>('horarios');

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
      colorHex: "#FFFFFF", 
      textColor: "#1E293B", 
      katas: ["Variables & Loops", "Animación en Scratch", "Lógica de bloques"], 
      kumite: ["Mi primer videojuego (Esquivar objetos)"],
      requirements: "Conceptos básicos de algoritmos, coordenadas X/Y y lógica de secuencia básica."
    },
    { 
      belt: "Arduino Maker", 
      kyu: "Nivel 2", 
      colorHex: "#FACC15", 
      textColor: "#000000", 
      katas: ["Circuitos de Corriente Directa", "Blink con Arduino", "PWM & Señal Analógica"], 
      kumite: ["Semáforo inteligente LED con pulsador"],
      requirements: "Manejo seguro de protoboard, resistencias, LEDs y uso de la estructura básica de C++ (setup/loop)."
    },
    { 
      belt: "ESP32 IoT", 
      kyu: "Nivel 3", 
      colorHex: "#FB923C", 
      textColor: "#000000", 
      katas: ["Wifi & Servidor Web Local", "Lectura de Sensores Análogos", "Protocolo I2C"], 
      kumite: ["Estación meteorológica conectada a Blynk"],
      requirements: "Conceptos de redes IoT, comunicación inalámbrica y lectura de sensores de temperatura/humedad."
    },
    { 
      belt: "Raspberry Pi", 
      kyu: "Nivel 4", 
      colorHex: "#22C55E", 
      textColor: "#FFFFFF", 
      katas: ["Linux Terminal & GPIO", "Python Scripting Básico", "Cámara Pi & Streaming"], 
      kumite: ["Sistema de seguridad hogareña con sensor PIR y captura de foto"],
      requirements: "Navegación en Linux, control de pines GPIO mediante Python y configuración de cámaras."
    },
    { 
      belt: "Python Code", 
      kyu: "Nivel 5", 
      colorHex: "#3B82F6", 
      textColor: "#FFFFFF", 
      katas: ["Programación Orientada a Objetos", "Estructura de Datos en Python", "Algoritmos de Ordenamiento"], 
      kumite: ["Calculadora científica modular de consola"],
      requirements: "Escribir código modular en Python limpio, herencia de clases y manipulación de archivos."
    },
    { 
      belt: "AI & Machine Learning", 
      kyu: "Nivel 6", 
      colorHex: "#8B4513", 
      textColor: "#FFFFFF", 
      katas: ["Regresión Lineal con NumPy", "Redes Neuronales con TensorFlow", "Visión con OpenCV"], 
      kumite: ["Clasificador de imágenes para clasificar basura orgánica/inorgánica"],
      requirements: "Bases de estadística para machine learning, entrenamiento de modelos con datasets y detección de rostros."
    },
    { 
      belt: "Competidor Master", 
      kyu: "Nivel 7", 
      colorHex: "#0F1216", 
      textColor: "#E11D48", 
      katas: ["Robótica Autónoma Avanzada", "Impresión 3D & Ensamblaje CAD", "Simuladores ROS"], 
      kumite: ["Robot seguidor de líneas autónomo para torneo estatal"],
      requirements: "Dominio general de CAD, soldado avanzado, integración de sistemas de control pid y liderar equipos de torneos."
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Talleres y Programa STEM</h1>
          <p>Planificación de laboratorios prácticos y requisitos de certificación maker.</p>
        </div>
      </div>

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
                  <p>
                    <strong>Competencias Adquiridas:</strong> {p.requirements}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
