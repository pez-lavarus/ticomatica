"use client";

import { X, Shapes, BarChart3, Binary, Info } from "lucide-react";
import type { TestMode } from "@/lib/types";

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTopic: string;
  testMode: TestMode;
}

const SECTION_INFO = {
  "Geometría": {
    icon: Shapes,
    description: "Estudio de las propiedades y medidas de las figuras en el plano o en el espacio.",
    topics: ["Circunferencia", "Traslaciones", "Polígonos", "Transformaciones", "Visualización Espacial"]
  },
  "Funciones": {
    icon: Binary,
    description: "Análisis de relaciones de dependencia entre variables y sus representaciones.",
    topics: ["Relaciones y Funciones", "Función Lineal", "Función Cuadrática", "Función Exponencial", "Función Logarítmica"]
  },
  "Estadística y Probabilidad": {
    icon: BarChart3,
    description: "Recopilación, organización, análisis e interpretación de datos y estudio de fenómenos aleatorios.",
    topics: ["Estadística Descriptiva", "Medidas de Posición", "Probabilidad", "Eventos", "Espacio Muestral"]
  }
};

export default function SectionModal({ isOpen, onClose, currentTopic, testMode }: SectionModalProps) {
  if (!isOpen) return null;

  const sectionsToShow = testMode === "full"
    ? Object.keys(SECTION_INFO) as (keyof typeof SECTION_INFO)[]
    : [currentTopic as keyof typeof SECTION_INFO];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Información de la Prueba</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-sm transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
          {sectionsToShow.map((sectionKey) => {
            const info = SECTION_INFO[sectionKey];
            const Icon = info.icon;
            const isCurrent = sectionKey === currentTopic;

            return (
              <div key={sectionKey} className={`p-6 rounded-sm border transition-colors ${
                isCurrent ? "border-primary bg-primary/5 shadow-sm" : "border-border/60"
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-sm ${isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-base uppercase tracking-wider">{sectionKey}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-widest rounded-sm border border-primary/20">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-serif mt-1 italic">
                      {info.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {info.topics.map((topic) => (
                    <span key={topic} className="px-3 py-1 bg-muted/50 border border-border/40 text-[9px] font-bold text-foreground/80 uppercase tracking-widest rounded-sm">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-border bg-muted/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-[0.2em] rounded-sm shadow-md hover:brightness-90 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
