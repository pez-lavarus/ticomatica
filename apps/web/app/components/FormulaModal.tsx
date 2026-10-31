"use client";

import { useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  section?: string;
}

export default function FormulaModal({ isOpen, onClose, section }: FormulaModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const showSection = (name: string) => !section || section === name;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-4xl max-h-[90vh] rounded-sm shadow-2xl overflow-hidden border border-border/60 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-border/60 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em]">Material de Apoyo: Fórmulas MEP</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-sm transition-colors"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-14">
          {/* Geometría */}
          {showSection("Geometría") && (
            <section>
              <h4 className="text-xs uppercase tracking-[0.3em] font-bold text-primary mb-8 flex items-center gap-4">
                <span className="w-8 h-px bg-primary/30"></span>
                Geometría
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Circunferencia</p>
                  <div className="text-lg py-2">
                    <BlockMath math="(x - h)^2 + (y - k)^2 = r^2" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Distancia entre puntos</p>
                  <div className="text-lg py-2">
                    <BlockMath math="d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Área de un polígono regular</p>
                  <div className="text-lg py-2">
                    <BlockMath math="A = \frac{n \cdot l \cdot a}{2} = \frac{P \cdot a}{2}" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Suma de ángulos internos</p>
                  <div className="text-lg py-2">
                    <BlockMath math="S = 180^\circ(n - 2)" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Ángulo interno de polígono regular</p>
                  <div className="text-lg py-2">
                    <BlockMath math="i = \frac{180^\circ(n - 2)}{n}" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Apotema</p>
                  <div className="text-lg py-2">
                    <BlockMath math="a = \frac{r\sqrt{3}}{n}" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Ángulo externo de polígono regular</p>
                  <div className="text-lg py-2">
                    <BlockMath math="e = \frac{360^\circ}{n}" />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Funciones */}
          {showSection("Funciones") && (
            <section>
              <h4 className="text-xs uppercase tracking-[0.3em] font-bold text-primary mb-8 flex items-center gap-4">
                <span className="w-8 h-px bg-primary/30"></span>
                Funciones
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Función Lineal</p>
                  <div className="text-lg py-2">
                    <BlockMath math="f(x) = mx + b" />
                  </div>
                  <div className="mt-6 flex justify-around border-t border-border/20 pt-6">
                    <InlineMath math="m = \frac{y_2 - y_1}{x_2 - x_1}" />
                    <InlineMath math="b = y - mx" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Función Cuadrática</p>
                  <div className="text-lg py-2">
                    <BlockMath math="f(x) = ax^2 + bx + c" />
                  </div>
                  <div className="mt-6 text-center border-t border-border/20 pt-6">
                    <InlineMath math="\Delta = b^2 - 4ac" />
                    <div className="mt-3">
                      <InlineMath math="V = \left( \frac{-b}{2a}, \frac{-\Delta}{4a} \right)" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Estadística y Probabilidad */}
          {showSection("Estadística y Probabilidad") && (
            <section>
              <h4 className="text-xs uppercase tracking-[0.3em] font-bold text-primary mb-8 flex items-center gap-4">
                <span className="w-8 h-px bg-primary/30"></span>
                Estadística y Probabilidad
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Probabilidad Simple</p>
                  <div className="text-lg py-2">
                    <BlockMath math="P(A) = \frac{\text{Casos Favorables}}{\text{Casos Totales}}" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Media Aritmética</p>
                  <div className="text-lg py-2">
                    <BlockMath math="\bar{x} = \frac{\sum_{i=1}^n x_i}{n}" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Coeficiente de variación</p>
                  <div className="text-lg py-2">
                    <BlockMath math="C_v = \frac{\text{Desviación estándar}}{\text{Media aritmética}} * 100" />
                  </div>
                </div>
                <div className="p-8 bg-muted/20 rounded-sm border border-border/40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Posición relativa de un dato</p>
                  <div className="text-lg py-2">
                    <BlockMath math="P_r = \frac{\text{Dato - Media aritmética}}{\text{Desviación estándar}}" />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="p-8 border-t border-border/60 text-center bg-muted/10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Material de consulta oficial • Ministerio de Educación Pública</p>
        </div>
      </div>
    </div>
  );
}
