import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function PagoRequeridoPage() {
  const mercadopagoUrl = process.env.NEXT_PUBLIC_MERCADOPAGO_URL || "#";

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white', padding: '1rem' }}>
      <div style={{ maxWidth: '500px', width: '100%', backgroundColor: '#1e293b', padding: '2.5rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <AlertCircle size={64} color="#f43f5e" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#f8fafc' }}>Acceso Suspendido por Falta de Pago</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.6' }}>
          Tu cuenta actualmente se encuentra inactiva. Para continuar accediendo a tus laboratorios, proyectos y credencial, por favor realiza el pago correspondiente.
        </p>
        
        <a 
          href={mercadopagoUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block',
            width: '100%',
            backgroundColor: '#009ee3',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            marginBottom: '1rem',
            transition: 'background 0.2s'
          }}
        >
          Pagar con Mercado Pago
        </a>

        <Link 
          href="/login" 
          style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.9rem' }}
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
