import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HoraBoa — Agendamento online para barbearias e salões",
  description:
    "Sistema de agendamento online para barbearias, salões de beleza e negócios com horário marcado.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Usa a área inteira da tela no iPhone (barra de navegação respeita a "safe area")
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
