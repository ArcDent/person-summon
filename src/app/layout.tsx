import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人格生成器 | Persona Generator",
  description: "Generate bot personality configs for maimaibot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
