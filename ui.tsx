"use client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

export function Button({ className, loading, children, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: string; size?: string }) {
  return (
    <button className={cn("btn-gold", className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink/45 mt-1">{hint}</p>}
    </div>
  );
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...p} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="input min-h-[90px]" {...p} />;
export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("input", className)} {...p}>{children}</select>;
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card p-5 hand-crafted-card", className)} {...p}>
      {children}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("badge", className)}>{children}</span>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card p-4 md:p-5">
      <div className="text-xs font-bold text-ink/50">{label}</div>
      <div className={cn("text-2xl md:text-3xl font-black mt-1", tone)}>{value}</div>
      {sub && <div className="text-[11px] text-ink/45 mt-1">{sub}</div>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="card p-10 text-center text-ink/45 text-sm font-bold">{text}</div>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("card w-full max-h-[88vh] overflow-auto p-6 shadow-pop", wide ? "max-w-4xl" : "max-w-lg")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="h2">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl font-black leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
