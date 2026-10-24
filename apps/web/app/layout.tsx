import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { Header } from "@/app/components/Header";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ticomatica — Matemáticas",
  description:
    "Plataforma educativa piloto: Práctica de Matemáticas para Bachillerato por Madurez Suficiente. Área de Funciones — 10 preguntas de selección única.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${publicSans.variable} ${sourceSerif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-dvh flex flex-col font-sans overflow-hidden">
        <ThemeProvider defaultTheme="system">
          <Header />
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
