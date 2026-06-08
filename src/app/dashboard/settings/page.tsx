"use client";

import { useEffect, useState } from "react";
import styles from "./settings.module.css";
import { 
  Settings, 
  MessageSquare, 
  Shield, 
  Smartphone,
  Save,
  RefreshCw,
  Info
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface DojoConfig {
  id?: string;
  dojo_name: string;
  sensei_principal: string;
  estilo: string;
  whatsapp_provider: 'mock' | 'meta' | 'twilio';
  whatsapp_token: string;
  whatsapp_phone_number_id: string;
  template_entrada: string;
  template_salida: string;
  kata_semana?: string;
  video_semana_id?: string;
  recordatorio_sabado?: string;
}

interface SimulatedMessage {
  id: string;
  tutor: string;
  telefono: string;
  nombre: string;
  message: string;
  timestamp: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<DojoConfig>({
    dojo_name: "IA Make Academy",
    sensei_principal: "Director Maker",
    estilo: "Robótica & IA",
    whatsapp_provider: "mock",
    whatsapp_token: "",
    whatsapp_phone_number_id: "",
    template_entrada: "🤖 *{dojo_name}*\n\nHola *{tutor}*,\n\nLe informamos que el alumno:\n👦 *{nombre}* ({cinturon} - {grado})\n\n✅ *ENTRÓ* al Laboratorio de Robótica.\n\n🕒 Hora: {hora}\n📅 Fecha: {fecha}\n\n🤖 ¡A crear!",
    template_salida: "🤖 *{dojo_name}*\n\nHola *{tutor}*,\n\nLe informamos que el alumno:\n👦 *{nombre}* ({cinturon} - {grado})\n\n✅ *SALIÓ* de la Academia.\n\n🕒 Hora: {hora}\n📅 Fecha: {fecha}\n\n🤖 ¡Nos vemos en el próximo proyecto!",
    kata_semana: "Arduino IoT",
    video_semana_id: "",
    recordatorio_sabado: "🤖 *Taller Especial Maker*\n\nHola *{tutor}*,\n\nTe recordamos que este sábado tenemos sesión práctica de laboratorios en la academia.\n\n📖 *Proyecto de la semana:* {kata_semana}\n🎥 *Video de repaso:* {video_url}\n\nPor favor, asegúrate de que *{nombre}* estudie el video de preparación antes del sábado para aprovechar los componentes en clase. ¡A crear!"
  });

  const [videos, setVideos] = useState<any[]>([]);

  const [simulatedMessages, setSimulatedMessages] = useState<SimulatedMessage[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Load configuration and message history
  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("configuracion_dojo")
        .select("*")
        .limit(1);

      if (data && data.length > 0) {
        setConfig(data[0]);
        localStorage.setItem("dojo_config", JSON.stringify(data[0]));
      } else {
        const cached = localStorage.getItem("dojo_config");
        if (cached) {
          setConfig(JSON.parse(cached));
        } else {
          localStorage.setItem("dojo_config", JSON.stringify(config));
        }
      }
    } catch (e) {
      console.warn("Could not load database configuration. Using local storage.", e);
    } finally {
      setLoading(false);
    }
  };

  const loadSimulatedMessages = () => {
    const list = localStorage.getItem("simulated_whatsapp_messages");
    if (list) {
      setSimulatedMessages(JSON.parse(list));
    } else {
      setSimulatedMessages([
        {
          id: "m1",
          tutor: "Adriana López",
          telefono: "+5215512345678",
          nombre: "Mateo García López",
          message: "🤖 *IA Make Academy*\n\nHola *Adriana López*,\n\nLe informamos que el alumno:\n👦 *Mateo García López* (Raspberry Pi - Nivel 4)\n\n✅ *ENTRÓ* al Laboratorio de Robótica.\n\n🕒 Hora: 17:12\n📅 Fecha: 2026-06-08\n\n🤖 ¡A crear!",
          timestamp: "17:12"
        }
      ]);
    }
  };

  useEffect(() => {
    loadConfig();
    loadSimulatedMessages();
    loadVideosList();

    // Set up polling for simulated messages so scans are shown in real-time
    const interval = setInterval(loadSimulatedMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadVideosList = async () => {
    try {
      const { data } = await supabase.from("videos").select("*").eq("tipo", "entrenamiento");
      if (data && data.length > 0) {
        setVideos(data);
      } else {
        const cached = localStorage.getItem("dojo_videos");
        if (cached) {
          setVideos(JSON.parse(cached).filter((v: any) => v.tipo === "entrenamiento"));
        }
      }
    } catch (e) {
      console.warn("Could not load videos in settings.", e);
    }
  };

  const handleInputChange = (key: keyof DojoConfig, val: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { data: check } = await supabase.from("configuracion_dojo").select("id").limit(1);
      
      if (check && check.length > 0) {
        // Update
        await supabase
          .from("configuracion_dojo")
          .update(config)
          .eq("id", check[0].id);
      } else {
        // Insert
        await supabase
          .from("configuracion_dojo")
          .insert(config);
      }

      localStorage.setItem("dojo_config", JSON.stringify(config));
      alert("Configuración guardada correctamente.");
    } catch (err) {
      console.error(err);
      localStorage.setItem("dojo_config", JSON.stringify(config));
      alert("Se guardó localmente en memoria.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendSaturdayReminder = async () => {
    try {
      // 1. Get student list
      let studentsList: any[] = [];
      const { data } = await supabase.from("karatekas").select("*").eq("activo", true);
      if (data && data.length > 0) {
        studentsList = data;
      } else {
        const cachedObj = localStorage.getItem("local_karatekas");
        if (cachedObj) {
          studentsList = JSON.parse(cachedObj);
        }
      }
      
      if (studentsList.length === 0) {
        alert("No hay alumnos registrados para enviar recordatorios.");
        return;
      }

      // Find selected video URL
      const selectedVid = videos.find(v => v.id === config.video_semana_id) || videos[0] || { url: "https://media.w3.org/2010/05/sintel/trailer_hd.mp4" };
      const videoUrl = selectedVid.url;

      // 2. Generate messages
      const newMessages = studentsList.map(st => {
        let text = config.recordatorio_sabado || "";
        text = text.replace(/{dojo_name}/g, config.dojo_name)
                   .replace(/{tutor}/g, st.tutor)
                   .replace(/{nombre}/g, st.nombre)
                   .replace(/{kata_semana}/g, config.kata_semana || "Arduino IoT")
                   .replace(/{video_url}/g, videoUrl);

        return {
          id: `sat_${Date.now()}_${st.id}`,
          tutor: st.tutor,
          telefono: st.telefono,
          nombre: st.nombre,
          message: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });

      // 3. Save to simulated messages
      const existing = localStorage.getItem("simulated_whatsapp_messages");
      const currentList = existing ? JSON.parse(existing) : [];
      const updatedList = [...newMessages, ...currentList];
      localStorage.setItem("simulated_whatsapp_messages", JSON.stringify(updatedList));
      setSimulatedMessages(updatedList);

      // Save config to db / local
      await handleSave();
      
      alert(`¡Recordatorios de Aula Invertida enviados a ${studentsList.length} alumnos por WhatsApp con éxito!`);
    } catch (err) {
      console.error(err);
      alert("Error al enviar recordatorios.");
    }
  };

  const clearChatHistory = () => {
    localStorage.removeItem("simulated_whatsapp_messages");
    setSimulatedMessages([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className={styles.header}>
        <h1 style={{ background: 'linear-gradient(90deg, var(--brand-red), var(--brand-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Configuración del Sistema
        </h1>
        <p>Gestiona las credenciales de la API de WhatsApp, plantillas de mensajes y asignación del Aula Invertida.</p>
      </div>

      <div className={styles.container}>
        {/* Left side: Config fields */}
        <div className={styles.settingsPanel}>
          <div className={styles.card}>
            <h2>
              <Shield size={22} style={{ color: 'var(--brand-red)' }} />
              Perfil de la Academia
            </h2>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre de la Academia</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={config.dojo_name} 
                  onChange={(e) => handleInputChange("dojo_name", e.target.value)} 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Enfoque Educativo</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={config.estilo} 
                  onChange={(e) => handleInputChange("estilo", e.target.value)} 
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.label}>Director Maker (Administrador)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={config.sensei_principal} 
                  onChange={(e) => handleInputChange("sensei_principal", e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2>
              <MessageSquare size={22} style={{ color: 'var(--brand-red)' }} />
              Configuración de WhatsApp API
            </h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Proveedor de Envío</label>
                <select 
                  className={styles.selectInput}
                  value={config.whatsapp_provider}
                  onChange={(e) => handleInputChange("whatsapp_provider", e.target.value as any)}
                >
                  <option value="mock">Simulador en Pantalla (Ideal para demos)</option>
                  <option value="meta">Meta Cloud API (Oficial)</option>
                  <option value="twilio">Twilio WhatsApp API</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>ID del Número de Teléfono (Meta)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g. 1098273645271" 
                  disabled={config.whatsapp_provider === 'mock'}
                  value={config.whatsapp_phone_number_id}
                  onChange={(e) => handleInputChange("whatsapp_phone_number_id", e.target.value)}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.label}>Token de Acceso / API Key</label>
                <input 
                  type="password" 
                  className={styles.input} 
                  placeholder={config.whatsapp_provider === 'mock' ? "Bajo modo simulación (no requiere clave)" : "EAAGy..."}
                  disabled={config.whatsapp_provider === 'mock'}
                  value={config.whatsapp_token}
                  onChange={(e) => handleInputChange("whatsapp_token", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.card} style={{ borderLeft: '4px solid var(--brand-gold)' }}>
            <h2>
              <MessageSquare size={22} style={{ color: 'var(--brand-gold)' }} />
              Aula Invertida (Flipped Classroom) - Planificación Semanal
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Configura las asignaciones técnicas y envía automáticamente por WhatsApp el material de estudio para la clase presencial.
            </p>

            <div className={styles.formGrid} style={{ marginTop: '1rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Proyecto Maker de la Semana</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g. Arduino IoT" 
                  value={config.kata_semana || ""}
                  onChange={(e) => handleInputChange("kata_semana", e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Video de Estudio</label>
                <select 
                  className={styles.selectInput}
                  value={config.video_semana_id || ""}
                  onChange={(e) => handleInputChange("video_semana_id", e.target.value)}
                >
                  <option value="">-- Selecciona un Video Corto --</option>
                  {videos.map(v => (
                    <option key={v.id} value={v.id}>{v.titulo}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.label}>Plantilla del Recordatorio (WhatsApp)</label>
                <textarea 
                  className={styles.textarea}
                  rows={4}
                  value={config.recordatorio_sabado || ""}
                  onChange={(e) => handleInputChange("recordatorio_sabado", e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Variables: <code>{"{dojo_name}, {tutor}, {nombre}, {kata_semana}, {video_url}"}</code>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                className="btn-primary" 
                style={{ background: 'var(--brand-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={handleSendSaturdayReminder}
              >
                <Smartphone size={18} /> Enviar a Todos los Alumnos 💬
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h2>
              <Settings size={22} style={{ color: 'var(--brand-red)' }} />
              Plantillas de Mensajes
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Info size={14} /> Variables disponibles: <code>{"{dojo_name}, {nombre}, {cinturon}, {grado}, {tutor}, {hora}, {fecha}"}</code>
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Plantilla: Entrada del Alumno</label>
              <textarea 
                className={styles.textarea}
                value={config.template_entrada}
                onChange={(e) => handleInputChange("template_entrada", e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Plantilla: Salida del Alumno</label>
              <textarea 
                className={styles.textarea}
                value={config.template_salida}
                onChange={(e) => handleInputChange("template_salida", e.target.value)}
              />
            </div>

            <button 
              className="btn-primary" 
              style={{ background: 'var(--brand-red)', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
              disabled={saving}
              onClick={handleSave}
            >
              <Save size={18} /> {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>

        {/* Right side: Live Simulator Frame */}
        <div className={styles.simulatorWrapper}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem' }}>
              <Smartphone size={18} /> Celular del Tutor
            </h3>
            <button 
              onClick={clearChatHistory}
              style={{ fontSize: '0.75rem', color: 'var(--brand-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
            >
              <RefreshCw size={12} /> Limpiar Chat
            </button>
          </div>

          <div className={styles.phoneFrame}>
            <div className={styles.phoneNotch}></div>
            
            <div className={styles.phoneHeader}>
              <div className={styles.phoneUserAvatar}>🤖</div>
              <div className={styles.phoneUserInfo}>
                <h4>{config.dojo_name.split(" ").slice(-2).join(" ")}</h4>
                <p>Online (Mentor Bot)</p>
              </div>
            </div>

            <div className={styles.phoneChatArea}>
              {simulatedMessages.map((msg) => (
                <div key={msg.id} className={styles.chatBubble}>
                  <div>{msg.message}</div>
                  <span className={styles.bubbleTime}>
                    {msg.timestamp} <span className={styles.bubbleCheck}>✓✓</span>
                  </span>
                </div>
              ))}
              {simulatedMessages.length === 0 && (
                <p style={{ color: '#707070', fontSize: '0.75rem', textAlign: 'center', margin: 'auto', padding: '1rem', fontFamily: 'sans-serif' }}>
                  Esperando escaneos... Al realizar asistencia con QR verás los mensajes simulados aquí.
                </p>
              )}
            </div>

            <div className={styles.phoneFooter}>
              <div className={styles.phoneInputMock}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
