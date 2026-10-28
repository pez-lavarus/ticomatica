"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import { History, Play, User, Calendar, ArrowRight } from "lucide-react";
import type { TestMode, TestConfig } from "@/lib/types";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { MathBackground } from "@/app/components/MathBackground";
import { loadTestSession, hasTestProgress, resetTestSession } from "@/lib/test-session";
import { FULL_TEST_TIME, SECTION_TIME } from "@/lib/constants";

const userSchema = z.object({
  name: z.string().optional(),
  age: z.number().int().min(12, "Debe ser mayor de 12 años").max(100, "Debe ser menor de 100 años").optional(),
});

const TEST_CONFIGS: Record<TestMode, TestConfig> = {
  full: { mode: "full", durationMinutes: 120, questionCount: 60 },
  Geometría: { mode: "Geometría", durationMinutes: 40, questionCount: 22 },
  Funciones: { mode: "Funciones", durationMinutes: 40, questionCount: 20 },
  "Estadística y Probabilidad": { mode: "Estadística y Probabilidad", durationMinutes: 40, questionCount: 18 },
};

export default function WelcomePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", age: "" });
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
  const [selectedMode, setSelectedMode] = useState<TestMode>("full");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const session = loadTestSession();
    if (hasTestProgress() && session.phase === "active") {
      setTimeout(() => setHasSession(true), 0);
    }
  }, []);

  const handleContinue = () => {
    router.push("/test");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = userSchema.safeParse({
      name: formData.name.trim() || "Estudiante Invitado",
      age: parseInt(formData.age) || 18,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        age: fieldErrors.age?.[0],
      });
      return;
    }

    // Persist test configuration and start a fresh session
    const duration = selectedMode === "full" ? FULL_TEST_TIME : SECTION_TIME;
    resetTestSession(selectedMode, duration);

    router.push("/test");
  };

  const currentConfig = TEST_CONFIGS[selectedMode];

  return (
    <div className="flex items-center justify-center p-4 md:p-4 transition-colors relative overflow-hidden bg-transparent">
      {/* <MathBackground /> */}
      <div className="max-w-3xl w-full z-10 py-6">
        {/* Main Card */}
        <div className="bg-card text-card-foreground border border-border shadow-md rounded-sm overflow-hidden">
          {/* Title Section */}
          <div className="px-5 md:px-12 pt-8 md:pt-16 pb-6 md:pb-12 border-b border-border bg-muted/20 relative">
            {/* <div className="absolute top-4 left-6 hidden md:block">
              <span className="px-3 py-1 bg-secondary/10 border border-secondary text-secondary text-xs font-bold uppercase tracking-[0.2em] rounded-sm">
                Proxima prueba: Febrero, 2026
              </span>
            </div>
            <div className="absolute top-4 right-6">
              <ThemeToggle />
            </div> */}
            <div className="text-center">
              <div className="md:hidden mb-4">
                <span className="px-3 py-1 bg-secondary/10 border border-secondary text-secondary text-xs font-bold uppercase tracking-[0.2em] rounded-sm">
                  Convocatoria 01
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-serif tracking-tight text-foreground mb-3 md:mb-4 font-bold">
                Práctica de Matemáticas
              </h1>
              <p className="text-xs md:text-lg text-muted-foreground font-medium uppercase tracking-[0.15em] md:tracking-[0.2em]">
                Bachillerato por Madurez Suficiente
              </p>
              <div className="mt-2 md:mt-3 inline-flex items-center justify-center gap-1.5 text-foreground">
                <Image src="/costa-rica-flag.svg" alt="Bandera de Costa Rica" width={24} height={14} className="rounded-[2px] border border-border" />
                <span className="text-xs md:text-sm font-bold">Costa Rica</span>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="mt-8 md:mt-14">
              <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                {(Object.keys(TEST_CONFIGS) as TestMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedMode(mode)}
                    className={`flex-1 min-w-[140px] sm:flex-none px-4 md:px-10 py-2.5 md:py-4 rounded-sm font-bold transition-all text-xs md:text-xs uppercase tracking-[0.1em] md:tracking-[0.15em] border active:scale-95 ${selectedMode === mode
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/20"
                      : "bg-card border-border hover:border-accent text-foreground"
                      }`}
                  >
                    {mode === "full" ? "Práctica Completa" : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Metadata */}
          <div className="grid grid-cols-2 border-b border-border">
            <div className="px-2 py-3 md:px-4 md:py-3 text-center border-r border-border">
              <div className="text-xl md:text-4xl font-bold text-foreground tabular-nums">
                {currentConfig.questionCount}
              </div>
              <div className="text-xs md:text-xs font-bold text-muted-foreground mt-1 md:mt-2 uppercase tracking-widest">Preguntas</div>
            </div>
            <div className="px-2 py-3 md:px-4 md:py-3 text-center">
              <div className="text-xl md:text-3xl font-bold text-foreground tabular-nums">
                {currentConfig.durationMinutes}
              </div>
              <div className="text-xs md:text-xs font-bold text-muted-foreground mt-1 md:mt-2 uppercase tracking-widest">Minutos</div>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="px-5 md:px-12 py-6 md:py-10 space-y-6 md:space-y-8 bg-card">
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div>
                <label htmlFor="name" className="block text-xs md:text-xs font-bold text-foreground mb-2 md:mb-2.5 flex items-center gap-2 uppercase tracking-widest">
                  <User className="w-3.5 h-3.5" />
                  Nombre completo
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-background border border-border focus:border-primary rounded-sm text-sm md:text-base focus:outline-none transition-all focus:ring-1 focus:ring-primary"
                  placeholder="Nombre y apellidos"
                />
                {errors.name && <p className="mt-2 text-xs md:text-xs text-destructive font-bold uppercase tracking-widest">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="age" className="block text-xs md:text-xs font-bold text-foreground mb-2 md:mb-2.5 flex items-center gap-2 uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" />
                  Edad (opcional)
                </label>
                <input
                  id="age"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-background border border-border focus:border-primary rounded-sm text-sm md:text-base focus:outline-none transition-all focus:ring-1 focus:ring-primary"
                  placeholder="Edad"
                />
                {errors.age && <p className="mt-2 text-xs md:text-xs text-destructive font-bold uppercase tracking-widest">{errors.age}</p>}
              </div>
            </div> */}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 md:gap-5 pt-4 md:pt-6">
              {hasSession && (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="flex-1 py-7 bg-success/10 border border-success text-foreground font-bold text-base rounded-sm transition-colors hover:bg-success/20 flex items-center justify-center gap-3 shadow-sm"
                >
                  <History className="w-5 h-5" />
                  CONTINUAR
                </button>
              )}

              <button
                type="submit"
                className={`flex-[2] py-7 bg-primary text-primary-foreground font-bold text-base rounded-sm transition-colors hover:brightness-90 flex items-center justify-center gap-3 shadow-md ${hasSession ? "" : "w-full"}`}
              >
                <Play className="w-5 h-5 fill-current" />
                {hasSession ? "NUEVA PRÁCTICA" : "INICIAR PRÁCTICA"}
                <ArrowRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}