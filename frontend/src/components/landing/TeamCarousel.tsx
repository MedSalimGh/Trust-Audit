/**
 * TeamCarousel Component
 *
 * A self-contained, high-fidelity developer testimonial stack:
 * - Fanned stack of portrait cards with the active one upright
 * - Loop navigation with previous / next controls and keyboard arrows
 * - Drawn initial-based avatars on colored discs (zero external asset dependency)
 * - Light shadcn register: #FAFAFA ground, #FFFFFF card, 1px border #E4E4E7, #4F46E5 indigo accent
 * - Easing with cubic-bezier(0.16, 1, 0.3, 1)
 * - Accessible reduced-motion fallback that reflows into a readable grid
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Github, ExternalLink, Code2, Award, Sparkles } from 'lucide-react';
import { TEAM_MEMBERS } from './AboutModal';

export interface TeamCarouselProps {
  onOpenAboutModal?: () => void;
  className?: string;
}

export const TeamCarousel: React.FC<TeamCarouselProps> = ({ onOpenAboutModal, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const total = TEAM_MEMBERS.length;

  // Listen to prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Reduced motion fallback: Render clean accessible grid without 3D stack
  if (prefersReducedMotion) {
    return (
      <div className={`w-full py-8 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 font-bold text-base flex items-center justify-center border border-indigo-200 dark:border-indigo-800/40">
                    {member.initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{member.name}</h3>
                    <p className="text-xs text-[#4F46E5] dark:text-indigo-400 font-medium">{member.role}</p>
                  </div>
                </div>
                <p className="text-xs italic text-zinc-500 dark:text-zinc-400 mb-2">"{member.focus}"</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">{member.bio}</p>
              </div>
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
                {member.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fanned Stack with active card upright and loop navigation
  return (
    <div className={`relative w-full py-6 flex flex-col items-center select-none ${className}`}>
      {/* Cards Display Stage */}
      <div className="relative w-full max-w-md h-[460px] sm:h-[480px] flex items-center justify-center">
        {TEAM_MEMBERS.map((member, i) => {
          // Compute wrapped distance: 0 is active, 1 is right, -1 is left
          let diff = (i - activeIndex) % total;
          if (diff > total / 2) diff -= total;
          if (diff < -total / 2) diff += total;

          const isActive = diff === 0;

          // Fan positioning calculations
          let xOffset = 0;
          let yOffset = 0;
          let rotateDeg = 0;
          let scaleVal = 1;
          let zIndexVal = 30;
          let opacityVal = 1;

          if (diff === 0) {
            xOffset = 0;
            yOffset = 0;
            rotateDeg = 0;
            scaleVal = 1;
            zIndexVal = 30;
            opacityVal = 1;
          } else if (diff === 1) {
            xOffset = 65;
            yOffset = 14;
            rotateDeg = 7;
            scaleVal = 0.94;
            zIndexVal = 20;
            opacityVal = 0.72;
          } else if (diff === -1) {
            xOffset = -65;
            yOffset = 14;
            rotateDeg = -7;
            scaleVal = 0.94;
            zIndexVal = 15;
            opacityVal = 0.72;
          } else {
            xOffset = diff * 45;
            yOffset = 24;
            rotateDeg = diff * 5;
            scaleVal = 0.88;
            zIndexVal = 5;
            opacityVal = 0.4;
          }

          return (
            <motion.div
              key={member.name}
              onClick={() => setActiveIndex(i)}
              initial={false}
              animate={{
                x: xOffset,
                y: yOffset,
                rotate: rotateDeg,
                scale: scaleVal,
                zIndex: zIndexVal,
                opacity: opacityVal,
              }}
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`absolute top-4 w-[310px] sm:w-[350px] p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 shadow-[0_1px_3px_rgba(9,9,11,0.06),0_10px_30px_rgba(9,9,11,0.04)] cursor-pointer transition-colors ${
                isActive ? 'ring-2 ring-[#4F46E5]/40 shadow-xl' : 'hover:opacity-90'
              }`}
            >
              {/* Card Header: Initial Disc Avatar + Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-13 h-13 rounded-full flex items-center justify-center font-bold text-base transition-transform ${
                      i === 0
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-[#4F46E5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : i === 1
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-[#09090B] dark:text-white leading-tight">
                      {member.name}
                    </h3>
                    <p className="text-[12px] font-medium text-[#4F46E5] dark:text-indigo-400 mt-0.5">
                      {member.role}
                    </p>
                  </div>
                </div>
              </div>

              {/* Focus Quote */}
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[11px] text-[#71717A] dark:text-zinc-400 italic">
                  "{member.focus}"
                </p>
              </div>

              {/* Bio */}
              <p className="text-xs text-[#3F3F46] dark:text-zinc-300 leading-relaxed mb-4 line-clamp-4">
                {member.bio}
              </p>

              {/* Skills Tag Pills */}
              <div className="pt-3 border-t border-[#E4E4E7] dark:border-zinc-800">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {member.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAFAFA] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-[#E4E4E7] dark:border-zinc-700 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                  {member.skills.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400 font-mono font-medium">
                      +{member.skills.length - 4}
                    </span>
                  )}
                </div>

                {/* Footer Link */}
                <div className="flex items-center justify-between text-[11px] text-[#71717A] dark:text-zinc-400 pt-1">
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 hover:text-[#4F46E5] dark:hover:text-indigo-400 transition"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub Profile</span>
                  </a>

                  {onOpenAboutModal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAboutModal();
                      }}
                      className="flex items-center gap-1 text-[#4F46E5] dark:text-indigo-400 hover:underline font-medium"
                    >
                      <span>Full Bio</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation Controls: Prev, Next & Dots */}
      <div className="flex items-center gap-4 mt-6">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous developer card"
          className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-[#4F46E5] dark:hover:text-indigo-400 hover:border-[#4F46E5]/50 flex items-center justify-center shadow-xs transition active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Indicator Dots */}
        <div className="flex items-center gap-2">
          {TEAM_MEMBERS.map((m, idx) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to ${m.name}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === idx
                  ? 'w-6 bg-[#4F46E5]'
                  : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next developer card"
          className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-[#4F46E5] dark:hover:text-indigo-400 hover:border-[#4F46E5]/50 flex items-center justify-center shadow-xs transition active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Subtext info */}
      <p className="mt-4 text-[11px] text-[#71717A] dark:text-zinc-500 font-mono">
        {activeIndex + 1} / {total}
      </p>
    </div>
  );
};

export default TeamCarousel;
