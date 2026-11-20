import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgendaFácil — Agendamento online para barbearias e salões",
  description:
    "Sistema de agendamento online para barbearias, salões de beleza e negócios com horário marcado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
