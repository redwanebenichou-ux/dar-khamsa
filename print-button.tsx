"use client";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-gold !py-2 !text-sm">
      <Printer className="w-4 h-4" /> طباعة التيكت
    </button>
  );
}
