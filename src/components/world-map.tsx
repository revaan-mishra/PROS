"use client";

import { motion } from "framer-motion";

interface AttributeScore {
  key: string;
  label: string;
  score: number;
}

const REGIONS = [
  { id: "execution", label: "Forge of Execution", path: "M50,150 L100,100 L200,120 L150,180 Z", color: "#facc15" }, // Yellow
  { id: "knowledge", label: "Citadel of Knowledge", path: "M220,100 L300,50 L350,120 L260,160 Z", color: "#38bdf8" }, // Sky
  { id: "body", label: "Peaks of Vitality", path: "M100,200 L180,180 L220,250 L130,280 Z", color: "#fb7185" }, // Rose
  { id: "mind", label: "Sanctuary of Mind", path: "M240,180 L320,160 L360,230 L260,260 Z", color: "#c084fc" }, // Purple
  { id: "expression", label: "Fields of Expression", path: "M160,280 L240,260 L280,340 L180,360 Z", color: "#34d399" }, // Emerald
  { id: "relationships", label: "Nexus of Bonds", path: "M320,80 L380,40 L420,100 L360,140 Z", color: "#fb923c" }, // Orange
];

export function WorldMap({ attributes }: { attributes: AttributeScore[] }) {
  // Normalize scores to a 0-1 range for opacity/glow.
  // Assuming a max reasonable score of 100 for normalization, but we can dynamically scale.
  const maxScore = Math.max(...attributes.map(a => a.score), 10);

  return (
    <div className="relative w-full aspect-video rounded-3xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-4">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} 
      />

      <svg viewBox="0 0 500 400" className="w-full h-full drop-shadow-2xl">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {REGIONS.map((region) => {
          // Find corresponding attribute
          const attr = attributes.find(a => a.key === region.id);
          const score = attr ? attr.score : 0;
          // Calculate intensity (0.2 to 1.0)
          const intensity = Math.max(0.2, score / maxScore);

          return (
            <g key={region.id} className="group cursor-pointer">
              <motion.path
                d={region.path}
                fill={region.color}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: intensity * 0.8, scale: 1 }}
                whileHover={{ scale: 1.05, opacity: 1, filter: "url(#glow)" }}
                transition={{ duration: 0.5, type: "spring" }}
                style={{ filter: intensity > 0.6 ? "url(#glow)" : "none" }}
              />
              
              {/* Region Label - Appears on hover (simulated via group hover) */}
              <text 
                x="250" 
                y="380" 
                textAnchor="middle" 
                className="opacity-0 group-hover:opacity-100 fill-white text-[12px] font-semibold tracking-widest uppercase transition-opacity duration-300"
              >
                {region.label} · Lv {score}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Overlay Title */}
      <div className="absolute top-4 left-5 pointer-events-none">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Domain World Map</p>
        <p className="text-[0.65rem] text-slate-500">The health of your regions reflects your life balance.</p>
      </div>
    </div>
  );
}
