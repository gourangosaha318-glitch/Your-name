import React from 'react';
import { millConfig } from '../data/mock';
import heroBannerImg from '../assets/images/hero_flour_mill_banner_1793953009556.jpg';

export const HeroBanner: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 shadow-md">
      {/* Background Panoramic Image */}
      <div className="relative h-44 sm:h-52 md:h-60 w-full overflow-hidden">
        <img
          src={heroBannerImg}
          alt="মা ফ্লাওয়ার মিল ব্যানার"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center transform scale-102 transition-transform duration-700 hover:scale-105"
        />

        {/* Ambient Gradient Overlays for High Legibility & Warmth */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/40 via-white/85 to-amber-950/40 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-radial from-white/95 via-white/70 to-transparent" />

        {/* Center Title and Tagline Lockup */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 sm:px-4 text-center">
          <div className="relative rounded-2xl bg-white/75 backdrop-blur-md px-6 sm:px-10 py-3.5 sm:py-5 border border-white/90 shadow-lg shadow-stone-900/10 transition-transform duration-300 hover:scale-[1.01]">
            {/* Main Bengali Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#0d381e] leading-tight">
              {millConfig.name}
            </h1>

            {/* Golden Wheat Tagline */}
            <p className="mt-1 sm:mt-2 text-xs sm:text-base md:text-lg lg:text-xl font-extrabold text-[#ea580c] tracking-normal">
              {millConfig.tagline}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
