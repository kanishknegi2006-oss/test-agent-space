"use client";

import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Mic, Loader2, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface AgentMagicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (graph: { nodes: any[], edges: any[] }) => void;
}

export function AgentMagicModal({ isOpen, onClose, onGenerate }: AgentMagicModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef(prompt);

  // Sync ref when prompt changes manually
  useEffect(() => {
    finalTranscriptRef.current = prompt;
  }, [prompt]);

  // We instantiate SpeechRecognition dynamically when the button is clicked 
  const handleResult = (event: any) => {
    let interim = '';
    let finalChunk = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalChunk += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    if (finalChunk) {
      finalTranscriptRef.current = finalTranscriptRef.current.trim() 
        ? finalTranscriptRef.current + ' ' + finalChunk 
        : finalChunk;
    }

    setPrompt((finalTranscriptRef.current + ' ' + interim).trim());
  };

  useEffect(() => {
    if (isOpen) setPrompt('');
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined' || (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window))) {
      toast({ title: 'Not Supported', description: 'Speech recognition requires Chrome/Edge desktop.', variant: 'destructive' });
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = handleResult;
      
      recognition.onerror = (event: any) => {
        console.error('Speech error', event.error);
        if (event.error === 'not-allowed') {
          toast({ title: 'Microphone Blocked', description: 'Ensure you are using localhost or HTTPS and granted microphone permission.', variant: 'destructive' });
        } else if (event.error !== 'no-speech') {
          toast({ title: 'Microphone Error', description: event.error, variant: 'destructive' });
        }
        setIsListening(false);
      };
      
      recognition.onend = () => setIsListening(false);

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start dictation:', err);
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/agentmagic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      
      if (data.error && !data.fallback) {
        throw new Error(data.error);
      }
      
      if (data.fallback) {
        toast({ title: 'Fallback Triggered', description: 'Using default pipeline due to generation error.', variant: 'default' });
      } else {
        toast({ title: 'Pipeline Generated', description: '✨ AgentMagic built your flow!' });
      }

      onGenerate(data.graph);
      onClose();
    } catch (error: any) {
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-primary/20 bg-background shadow-2xl shadow-primary/10 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Magic Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-600/20 via-primary/20 to-violet-600/20 p-6 border-b border-white/5">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">AgentMagic</h2>
                <p className="text-xs text-primary/80 font-medium tracking-wide uppercase">AI Pipeline Builder</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 bg-black/20 hover:bg-black/40 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Describe the pipeline you want to build. Our AI will automatically select and connect the best agents for the job.
          </p>

          <div className="relative mb-5">
            <textarea
              className="w-full h-32 px-4 py-3 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm leading-relaxed"
              placeholder="E.g., Build a resume optimization pipeline with keyword extraction and rewriting..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isGenerating}
              autoFocus
            />
            <Button
              type="button"
              variant={isListening ? "default" : "secondary"}
              size="icon"
              className={`absolute bottom-3 right-3 h-8 w-8 rounded-full transition-colors ${
                isListening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''
              }`}
              onClick={toggleListen}
              disabled={isGenerating}
              title="Dictate with microphone"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all"
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conjuring Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Pipeline
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
