"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AssessmentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Assessment Error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-card border border-destructive/30 rounded-sm p-12 max-w-lg w-full text-center shadow-xl">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4 uppercase tracking-tight">
              Error en la Evaluación
            </h2>
            <p className="text-muted-foreground mb-10 leading-relaxed uppercase tracking-wider text-xs font-bold">
              Se ha producido un error inesperado al cargar el módulo de evaluación. Sus respuestas se han guardado localmente.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-3 py-5 bg-primary text-primary-foreground font-bold text-[0.625rem] uppercase tracking-[0.2em] rounded-sm transition-colors hover:brightness-90 shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
