import type { Metadata } from "next";
import { I18nLayout } from "@/components/I18nLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "MaiPSummon | MAIBOT人格生成器",
  description: "Generate bot personality configs for maimaibot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <I18nLayout>{children}</I18nLayout>
      </body>
    </html>
  );
}
