"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  ChevronRight, 
  Layout, 
  Image as ImageIcon,
  Palette,
  Calendar,
  Zap,
  Users,
  Edit3,
  FileText,
  ArrowRight,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

type CardContent = {
  id: number;
  t1: string;
  t2: string;
  t3: string;
};

type ProcessedData = {
  monthName: string;
  monthColor: string;
  symbol: string;
  tribe: string;
  subheadline: string;
  cards: CardContent[];
};

export default function Home() {
  const [step, setStep] = useState(0); // 0: Form, 1: Review, 2: Results
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    monthName: "",
    monthColor: "",
    symbol: "",
    tribe: "",
    baseText: "",
  });

  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [finalResult, setFinalResult] = useState<{
    tsv: string;
    prompts: string[];
  } | null>(null);

  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});

  const [error, setError] = useState<string | null>(null);
  const [refinementInputs, setRefinementInputs] = useState<Record<number, string>>({});

  const generateSingleImage = async (index: number, prompt: string) => {
    setGeneratingImages(prev => ({ ...prev, [index]: true }));
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, cardId: index + 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro na imagem.");
      setGeneratedImages(prev => ({ ...prev, [index]: data.image }));
    } catch (err: any) {
      console.error(err);
      setError(`Erro no Card ${index + 1}: ${err.message}`);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const generateAllImages = async () => {
    if (!finalResult) return;
    setError(null);
    finalResult.prompts.forEach((prompt, i) => {
      generateSingleImage(i, prompt);
    });
  };

  const regenerateSinglePrompt = async (index: number) => {
    setGeneratingImages(prev => ({ ...prev, [index]: true }));
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          phase: "regenerate-single-prompt", 
          cardIndex: index,
          refinedTexts: processedData 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao regerar prompt.");
      
      // Update the prompt and then generate the image
      const newPrompts = [...(finalResult?.prompts || [])];
      newPrompts[index] = data.prompt;
      setFinalResult(prev => prev ? { ...prev, prompts: newPrompts } : null);
      
      await generateSingleImage(index, data.prompt);
    } catch (err: any) {
      setError(`Erro ao regerar Card ${index + 1}: ${err.message}`);
      setGeneratingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const updatePromptText = (index: number, newPrompt: string) => {
    if (!finalResult) return;
    const updatedPrompts = [...finalResult.prompts];
    const currentPrompt = finalResult.prompts[index];
    const styleMatch = currentPrompt.match(/^(\[STYLE:\s*[^\]]+\]\s*)/);
    const prefix = styleMatch ? styleMatch[1] : "";
    updatedPrompts[index] = prefix + newPrompt;
    setFinalResult({ ...finalResult, prompts: updatedPrompts });
  };

  const handleRefinePrompt = async (index: number) => {
    const instruction = refinementInputs[index];
    if (!instruction || !instruction.trim() || !finalResult) return;

    setGeneratingImages(prev => ({ ...prev, [index]: true }));
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          phase: "refine-prompt", 
          cardIndex: index,
          currentPrompt: finalResult.prompts[index],
          instruction: instruction,
          refinedTexts: processedData 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao refinar prompt.");
      
      const newPrompts = [...(finalResult?.prompts || [])];
      newPrompts[index] = data.prompt;
      setFinalResult(prev => prev ? { ...prev, prompts: newPrompts } : null);
      
      // Limpa a caixa de instrução
      setRefinementInputs(prev => ({ ...prev, [index]: "" }));
      
      await generateSingleImage(index, data.prompt);
    } catch (err: any) {
      setError(`Erro ao refinar Card ${index + 1}: ${err.message}`);
      setGeneratingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, phase: "summarize" }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao resumir.");

      setProcessedData(data.texts);
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          phase: "generate-prompts", 
          refinedTexts: processedData 
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao gerar prompts.");

      setFinalResult(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCardText = (id: number, field: keyof CardContent, value: string) => {
    if (!processedData) return;
    const newCards = processedData.cards.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    setProcessedData({ ...processedData, cards: newCards });
  };

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-20 relative">
        {/* Header */}
        <header className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" />
              Elohim Church Content Automation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white">
              Automador de Carrosséis Bíblicos
            </h1>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mt-8">
              {[
                { icon: FileText, label: "Dados" },
                { icon: Edit3, label: "Revisão" },
                { icon: ImageIcon, label: "Prompts" }
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    step === i 
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20" 
                      : step > i ? "bg-green-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  )}>
                    {step > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:block",
                    step === i ? "text-indigo-600" : "text-slate-400"
                  )}>{s.label}</span>
                  {i < 2 && <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 mx-2" />}
                </div>
              ))}
            </div>
          </motion.div>
        </header>

        <AnimatePresence mode="wait">
          {/* STEP 0: FORM */}
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                <form onSubmit={handleSummarize} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" /> Nome do Mês
                      </label>
                      <input
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Ex: Nissan"
                        value={formData.monthName}
                        onChange={(e) => setFormData({ ...formData, monthName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Palette className="w-4 h-4" /> Cor do Mês (Destaque)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative">
                          <input
                            type="color"
                            value={formData.monthColor.startsWith('#') && formData.monthColor.length === 7 ? formData.monthColor : '#4f46e5'}
                            onChange={(e) => setFormData({ ...formData, monthColor: e.target.value })}
                            className="w-12 h-12 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 appearance-none overflow-hidden"
                          />
                        </div>
                        <input
                          required
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                          placeholder="#HEX ou Nome"
                          value={formData.monthColor}
                          onChange={(e) => setFormData({ ...formData, monthColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Zap className="w-4 h-4" /> Animal/Símbolo
                      </label>
                      <input
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Ex: Leão"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" /> Tribo do Mês
                      </label>
                      <input
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Ex: Judá"
                        value={formData.tribe}
                        onChange={(e) => setFormData({ ...formData, tribe: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Texto Base (Para resumir)</label>
                    <textarea
                      required
                      rows={8}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                      placeholder="Cole aqui o texto completo..."
                      value={formData.baseText}
                      onChange={(e) => setFormData({ ...formData, baseText: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Resumir e Iniciar Revisão"}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* STEP 1: REVIEW AND EDIT */}
          {step === 1 && processedData && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Revisar Textos dos Cards</h2>
                <button 
                  onClick={() => setStep(0)}
                  className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Voltar para o início
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Capa */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4 shadow-lg shadow-indigo-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Card 1 (Capa)</span>
                    <span className="text-[10px] text-slate-400">Título Automático</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Título (Mês)</label>
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-lg font-bold border border-slate-100 dark:border-slate-800">
                        {processedData.monthName}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Subheadline</label>
                      <textarea
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500"
                        value={processedData.subheadline}
                        onChange={(e) => setProcessedData({ ...processedData, subheadline: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Conteúdo (C2 - C12) */}
                {processedData.cards.map((card) => (
                  <div key={card.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Card {card.id}</span>
                      <span className="text-[10px] text-slate-400 italic">@elohim.church.oficial</span>
                    </div>
                    <div className="space-y-3">
                      {(['t1', 't2', 't3'] as const).map((t) => (
                        <div key={t}>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Texto {t.slice(1)}</label>
                          <textarea
                            className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                            value={card[t]}
                            onChange={(e) => updateCardText(card.id, t, e.target.value)}
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sticky bottom-8 max-w-sm mx-auto">
                <button
                  onClick={handleGeneratePrompts}
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/40"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      Gerar Prompts e Canva
                      <Sparkles className="w-6 h-6" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: FINAL RESULTS */}
          {step === 2 && finalResult && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Carrossel Pronto!</h2>
                  <p className="text-slate-500 text-sm">Crie as imagens com o Nano Banana 2 e use o TSV no Canva.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={generateAllImages}
                    disabled={Object.values(generatingImages).some(v => v)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:bg-slate-600"
                  >
                    {Object.values(generatingImages).some(v => v) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Gerar Todas as Imagens
                  </button>
                  <button 
                    onClick={() => {
                      setStep(0);
                      setGeneratedImages({});
                    }}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold transition-all"
                  >
                    Novo Carrossel
                  </button>
                </div>
              </div>

              {/* TSV Section */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Copy className="w-4 h-4 text-indigo-500" />
                    Dados para Canva (TSV Atualizado)
                  </h3>
                  <button
                    onClick={() => handleCopy(finalResult.tsv, 'tsv')}
                    className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    {copied === 'tsv' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="p-6">
                  <textarea
                    readOnly
                    className="w-full h-24 bg-slate-50 dark:bg-slate-950 p-4 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 resize-none outline-none"
                    value={finalResult.tsv}
                  />
                </div>
              </div>

              {/* Prompts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {finalResult.prompts.map((prompt, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col group hover:border-indigo-500/50 transition-all shadow-sm"
                  >
                    <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                      {generatedImages[index] ? (
                        <img 
                          src={generatedImages[index]} 
                          alt={`Gerada ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-100 dark:bg-slate-950">
                          <img 
                            src={
                              index === 0 
                                ? "/ref-cards/CARD-PRINCIPAL.png" 
                                : index === 12 
                                  ? "/ref-cards/CARD-FINAL.png" 
                                  : "/ref-cards/CARD-MIDDLE.png"
                            } 
                            alt={`Referência ${index + 1}`}
                            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                          />
                          {generatingImages[index] ? (
                            <div className="z-10 flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                              <span className="text-xs font-bold text-indigo-500 animate-pulse">GERANDO IMAGEM...</span>
                            </div>
                          ) : (
                            <div className="z-10">
                              <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aguardando Comando</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="absolute top-6 left-6 w-12 h-12 bg-white/90 dark:bg-slate-950/90 backdrop-blur rounded-2xl flex items-center justify-center font-bold text-xl text-indigo-600 shadow-xl ring-1 ring-black/5">
                        {index + 1}
                      </div>
                    </div>
                    <div className="p-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          Nano Banana Prompt
                        </span>
                        <button
                          onClick={() => handleCopy(prompt.replace(/^\[STYLE:\s*[^\]]+\]\s*/, ""), `prompt-${index}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          {copied === `prompt-${index}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          COPIAR
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        className="w-full p-4 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none font-medium leading-relaxed"
                        value={prompt.replace(/^\[STYLE:\s*[^\]]+\]\s*/, "")}
                        onChange={(e) => updatePromptText(index, e.target.value)}
                        placeholder="Edite o prompt para refinar a imagem..."
                      />

                      {/* Caixa de Ajustes IA */}
                      <div className="pt-1 space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Instruções de Ajuste (Corrija erros ou mude o fundo)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-amber-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                            placeholder="Ex: mude o leão para a direita, remova o ancião, mude o tom para azul..."
                            value={refinementInputs[index] || ""}
                            onChange={(e) => setRefinementInputs(prev => ({ ...prev, [index]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRefinePrompt(index);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleRefinePrompt(index)}
                            disabled={generatingImages[index] || !refinementInputs[index]?.trim()}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/15"
                            title="Refinar prompt com instrução e regerar imagem"
                          >
                            {generatingImages[index] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Ajustar
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => regenerateSinglePrompt(index)}
                          disabled={generatingImages[index]}
                          className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                          title="IA: Refazer o prompt do zero de forma automática"
                        >
                          {generatingImages[index] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Novo Fundo IA
                        </button>
                        <button
                          onClick={() => generateSingleImage(index, prompt)}
                          disabled={generatingImages[index]}
                          className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                          title="Gerar imagem com o prompt atual"
                        >
                          {generatingImages[index] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          {generatedImages[index] ? "Gerar Novamente" : "Gerar Imagem"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-sm text-center max-w-md mx-auto"
          >
            {error}
          </motion.div>
        )}
      </div>
    </main>
  );
}
