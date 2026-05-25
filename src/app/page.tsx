"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  MousePointerClick,
  BookmarkCheck,
  Brain,
  BookOpen,
  Library,
  Search,
  Tags,
  Download,
  ArrowDown,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Zap,
  Newspaper,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Animation Helpers ─────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ScaleIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-emerald-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200 group-hover:shadow-emerald-300 transition-shadow">
            <Newspaper className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">
            CleanNews <span className="text-emerald-600">Vault</span>
          </span>
        </button>
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={() => scrollTo("how-it-works")} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
            Cómo funciona
          </button>
          <button onClick={() => scrollTo("demo")} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
            Probar
          </button>
          <button onClick={() => scrollTo("features")} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
            Funciones
          </button>
          <Button
            onClick={() => scrollTo("download")}
            className="ml-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 hover:shadow-emerald-300 transition-all"
          >
            Descargar
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden text-emerald-700"
          onClick={() => scrollTo("download")}
        >
          <Download className="h-4 w-4 mr-1" />
          Descargar
        </Button>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────
function HeroSection() {
  const scrollToDemo = () => {
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToDownload = () => {
    document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-100/70 via-emerald-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-teal-100/50 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-40 left-0 w-[250px] h-[250px] bg-gradient-to-br from-emerald-100/40 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-1.5 text-sm font-medium bg-emerald-100/80 text-emerald-800 border-emerald-200/60 hover:bg-emerald-100"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Extensión para Chrome
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08]"
        >
          Tu archivo personal de
          <br />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            noticias, sin ruido
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 leading-relaxed"
        >
          Extrae el contenido limpio de cualquier artículo mientras navegas.{" "}
          <span className="text-gray-700 font-medium">
            Sin publicidad, sin banners, sin distracciones.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Button
            size="lg"
            onClick={scrollToDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.03] active:scale-[0.98] transition-all h-12 px-8 text-base font-semibold rounded-xl"
          >
            <Download className="h-5 w-5 mr-2" />
            Descargar Extensión
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToDemo}
            className="border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 h-12 px-8 text-base font-semibold rounded-xl transition-all"
          >
            <Zap className="h-5 w-5 mr-2" />
            Probar Demo
          </Button>
        </motion.div>

        {/* Visual mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 sm:mt-20 max-w-3xl mx-auto"
        >
          <div className="relative rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-emerald-900/5 overflow-hidden">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-2">
                <div className="h-7 bg-gray-100 rounded-lg flex items-center px-3 gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-gray-400 font-mono">
                    elpais.com/internacional/articulo-2024
                  </span>
                </div>
              </div>
            </div>
            {/* Content area */}
            <div className="p-5 sm:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  Extraído con CleanNews
                </Badge>
                <Badge variant="secondary" className="text-xs">~5 min lectura</Badge>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-7 w-3/4 bg-gray-100" />
                <Skeleton className="h-7 w-1/2 bg-gray-100" />
              </div>
              <div className="flex gap-3 text-sm text-gray-400">
                <span>El País</span>
                <span>·</span>
                <span>Hace 2 horas</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-gray-50" />
                <Skeleton className="h-4 w-full bg-gray-50" />
                <Skeleton className="h-4 w-5/6 bg-gray-50" />
                <Skeleton className="h-4 w-full bg-gray-50" />
                <Skeleton className="h-4 w-4/5 bg-gray-50" />
              </div>
            </div>
            {/* Extension popup indicator */}
            <div className="absolute -right-3 sm:-right-6 top-14 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-48 sm:w-52">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Newspaper className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-800">CleanNews Vault</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Contenido extraído</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Sin publicidad</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Guardar artículo
                </Button>
              </div>
              {/* Arrow pointing left */}
              <div className="absolute top-6 -left-2 w-4 h-4 bg-white border-l border-b border-gray-200 transform rotate-45" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ArrowDown className="h-5 w-5 text-gray-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────
const steps = [
  {
    icon: Globe,
    title: "Navega a una noticia",
    description:
      "Visita cualquier artículo de noticias en tu navegador habitual. El detector funciona con miles de sitios.",
    color: "bg-emerald-100 text-emerald-700",
    step: "01",
  },
  {
    icon: MousePointerClick,
    title: "Haz clic en la extensión",
    description:
      "Con un solo clic, la extensión extrae el contenido limpio eliminando publicidad y elementos innecesarios.",
    color: "bg-teal-100 text-teal-700",
    step: "02",
  },
  {
    icon: BookmarkCheck,
    title: "Guarda y lee cuando quieras",
    description:
      "Almacena el artículo en tu biblioteca personal. Organízalo con etiquetas y léelo sin conexión.",
    color: "bg-green-100 text-green-700",
    step: "03",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-gradient-to-b from-white to-emerald-50/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-14 sm:mb-16">
            <Badge variant="outline" className="mb-4 text-emerald-700 border-emerald-200 bg-emerald-50/50">
              Simple y rápido
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Cómo funciona
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              En tres pasos sencillos tendrás tu archivo de noticias personal
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, i) => (
            <ScaleIn key={step.step} delay={i * 0.12}>
              <Card className="relative border-gray-200/80 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/30 transition-all duration-300 group h-full">
                <CardContent className="pt-8 pb-8 px-6 sm:px-8 flex flex-col items-center text-center h-full">
                  {/* Step number */}
                  <span className="text-6xl font-extrabold text-emerald-100/70 group-hover:text-emerald-100 transition-colors absolute top-4 right-6">
                    {step.step}
                  </span>
                  {/* Icon */}
                  <div
                    className={`h-14 w-14 rounded-2xl ${step.color} flex items-center justify-center mb-5 shadow-sm`}
                  >
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Demo Section ──────────────────────────────────────────────────
interface ExtractedArticle {
  title: string;
  author: string | null;
  source: string;
  sourceUrl: string;
  content: string;
  excerpt: string;
  publishedAt: string | null;
  readTime: number;
  wordCount: number;
}

function DemoSection() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<ExtractedArticle | null>(null);
  const [error, setError] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const handleExtract = async () => {
    if (!url.trim()) {
      toast({ title: "Introduce una URL", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    setArticle(null);
    setSaved(false);
    try {
      const res = await fetch("/api/articles/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al extraer el artículo");
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setArticle(data);
    } catch {
      setError("No se pudo conectar con el servidor");
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!article) return;
    setSaving(true);
    try {
      const tagNames = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          source: article.source,
          sourceUrl: article.sourceUrl,
          content: article.content,
          excerpt: article.excerpt,
          author: article.author,
          publishedAt: article.publishedAt,
          tagNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error al guardar", description: data.error, variant: "destructive" });
        return;
      }
      setSaved(true);
      toast({ title: "Artículo guardado", description: "Se añadió a tu biblioteca." });
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleExtract();
  };

  return (
    <section id="demo" className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-emerald-700 border-emerald-200 bg-emerald-50/50">
              <Zap className="h-3.5 w-3.5 mr-1" />
              Interactivo
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Pruébalo ahora
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              Introduce la URL de un artículo y observa la magia
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <Card className="border-gray-200/80 shadow-lg shadow-gray-100/50">
            <CardContent className="pt-8 pb-8 px-5 sm:px-8">
              {/* URL Input */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="https://ejemplo.com/articulo-de-noticias"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-12 text-base rounded-xl border-gray-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
                  />
                </div>
                <Button
                  onClick={handleExtract}
                  disabled={loading}
                  className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-200 hover:shadow-emerald-300 transition-all disabled:opacity-70 shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extrayendo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extraer
                    </>
                  )}
                </Button>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="mt-6 space-y-4 animate-in fade-in">
                  <Skeleton className="h-7 w-3/4 bg-gray-100 rounded-lg" />
                  <div className="flex gap-3 text-sm text-gray-400">
                    <Skeleton className="h-4 w-24 bg-gray-50" />
                    <Skeleton className="h-4 w-20 bg-gray-50" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-gray-50" />
                    <Skeleton className="h-4 w-full bg-gray-50" />
                    <Skeleton className="h-4 w-5/6 bg-gray-50" />
                    <Skeleton className="h-4 w-full bg-gray-50" />
                    <Skeleton className="h-4 w-4/5 bg-gray-50" />
                  </div>
                </div>
              )}

              {/* Extracted article */}
              {article && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6"
                >
                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 overflow-hidden">
                    {/* Article header */}
                    <div className="p-5 sm:p-6 border-b border-emerald-200/40">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                          Contenido extraído
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ~{article.readTime} min
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {article.wordCount} palabras
                        </Badge>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                        {article.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                        {article.author && <span>{article.author}</span>}
                        {article.author && <span>·</span>}
                        <span>{article.source}</span>
                        {article.publishedAt && (
                          <>
                            <span>·</span>
                            <span>{new Date(article.publishedAt).toLocaleDateString("es-ES")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Article content preview */}
                    <div className="p-5 sm:p-6">
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-line line-clamp-8 max-h-64 overflow-hidden relative">
                        {article.content}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-emerald-50/80 to-transparent" />
                      </p>
                    </div>
                    {/* Tags & Save */}
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Tags className="h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Etiquetas separadas por coma (ej: tecnología, IA)"
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                          disabled={saving || saved}
                          className="h-9 text-sm border-gray-200 rounded-lg focus-visible:border-emerald-400 focus-visible:ring-emerald-200"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {saved ? (
                          <div className="flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-emerald-100 text-emerald-700 font-medium text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            Guardado en tu biblioteca
                          </div>
                        ) : (
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <BookmarkCheck className="h-4 w-4 mr-2" />
                                Guardar artículo
                              </>
                            )}
                          </Button>
                        )}
                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 h-10 px-6 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver original
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Features Grid ─────────────────────────────────────────────────
const features = [
  {
    icon: Brain,
    title: "Extracción inteligente",
    description:
      "Algoritmos avanzados que identifican y extraen solo el contenido relevante del artículo.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: BookOpen,
    title: "Lectura limpia",
    description:
      "Elimina publicidad, pop-ups, banners y distracciones para una experiencia de lectura pura.",
    color: "bg-teal-100 text-teal-700",
  },
  {
    icon: Library,
    title: "Biblioteca personal",
    description:
      "Organiza todos tus artículos guardados en una biblioteca local privada y accesible.",
    color: "bg-green-100 text-green-700",
  },
  {
    icon: Search,
    title: "Buscador interno",
    description:
      "Encuentra artículos rápidamente con búsqueda por título, contenido, fuente o autor.",
    color: "bg-lime-100 text-lime-700",
  },
  {
    icon: Tags,
    title: "Organización por etiquetas",
    description:
      "Crea etiquetas personalizadas y organiza tu lectura por temas, fuentes o prioridades.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Download,
    title: "Exportación",
    description:
      "Exporta tus artículos en diferentes formatos para llevar tu lectura a cualquier lugar.",
    color: "bg-teal-100 text-teal-700",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-gradient-to-b from-emerald-50/40 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-14 sm:mb-16">
            <Badge variant="outline" className="mb-4 text-emerald-700 border-emerald-200 bg-emerald-50/50">
              Todo lo que necesitas
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Funcionalidades
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              Herramientas pensadas para lectores compulsivos de noticias
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((feature, i) => (
            <ScaleIn key={feature.title} delay={i * 0.08}>
              <Card className="border-gray-200/80 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/20 transition-all duration-300 group h-full cursor-default">
                <CardContent className="pt-7 pb-7 px-6 flex flex-col h-full">
                  <div
                    className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Download Section ──────────────────────────────────────────────
function DownloadSection() {
  const installSteps = [
    {
      step: "1",
      title: "Descarga el archivo",
      description: "Haz clic en el botón de descarga para obtener la extensión.",
    },
    {
      step: "2",
      title: "Abre extensiones de Chrome",
      description:
        'Ve a chrome://extensions y activa "Modo desarrollador" en la esquina superior derecha.',
    },
    {
      step: "3",
      title: "Carga la extensión",
      description:
        'Haz clic en "Cargar extensión sin empaquetar" y selecciona la carpeta descargada.',
    },
  ];

  return (
    <section id="download" className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-emerald-700 border-emerald-200 bg-emerald-50/50">
              Gratis y privado
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Instala la extensión en Chrome
            </h2>
            <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
              Lleva CleanNews Vault a tu navegador en tres simples pasos
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="border-gray-200/80 shadow-lg shadow-gray-100/50 overflow-hidden">
            <CardContent className="pt-10 pb-10 px-6 sm:px-10">
              {/* Install steps */}
              <div className="space-y-6 mb-10">
                {installSteps.map((item, i) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-4"
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-md shadow-emerald-200">
                      {item.step}
                    </div>
                    <div className="pt-1">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-500 text-sm mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-8" />

              {/* Download button */}
              <div className="text-center">
                <a href="/extension/" download>
                  <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.03] active:scale-[0.98] transition-all h-14 px-10 text-lg font-bold rounded-2xl"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Descargar Extensión
                  </Button>
                </a>
                <p className="mt-4 text-sm text-gray-400">
                  Compatible con Google Chrome y navegadores basados en Chromium
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Privacy note */}
        <FadeIn delay={0.2}>
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-800 font-medium">
                Tus datos se guardan localmente. No enviamos nada a servidores.
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
              <Newspaper className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">
              CleanNews <span className="text-emerald-600">Vault</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm max-w-md">
            Hecho con ❤️ para lectores compulsivos de noticias
          </p>
          <Separator className="max-w-xs" />
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} CleanNews Vault. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <DemoSection />
      <FeaturesSection />
      <DownloadSection />
      <Footer />
    </div>
  );
}
