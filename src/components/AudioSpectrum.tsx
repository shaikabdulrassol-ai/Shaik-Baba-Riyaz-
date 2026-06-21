import { motion } from "motion/react";

interface AudioSpectrumProps {
  isPlaying: boolean;
}

export default function AudioSpectrum({ isPlaying }: AudioSpectrumProps) {
  if (!isPlaying) return null;

  return (
    <div className="flex items-center gap-1.5 h-8 px-3 py-1 bg-rose-50/80 border border-rose-100 rounded-full shadow-xs">
      <span className="text-[10px] uppercase tracking-wider text-rose-500 font-bold font-mono">Narrating</span>
      <div className="flex items-center gap-1 h-5">
        {[1, 2, 3, 4, 5, 6].map((bar) => (
          <motion.div
            key={bar}
            className="w-1 bg-gradient-to-t from-rose-400 to-rose-500 rounded-full"
            animate={{
              height: isPlaying ? [6, 20, 6] : 6,
            }}
            transition={{
              duration: 0.5 + bar * 0.1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
