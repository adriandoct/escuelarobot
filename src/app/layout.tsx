import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IA Make - Academia de Robótica e IA",
  description: "Plataforma inteligente de control escolar, proyectos y asistencia QR para laboratorios STEM.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="dark-theme">
        {children}
      </body>
    </html>
  );
}
