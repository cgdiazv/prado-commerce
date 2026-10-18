'use client';

import React from 'react';

export type PradoCommerceIconType =
  | 'shopping-bag'
  | 'shopping-cart'
  | 'store'
  | 'package'
  | 'layers'
  | 'sparkles'
  | 'grid'
  | 'boxes';

export interface PradoLogoProps {
  theme?: 'light' | 'dark';
  title?: string;
  subtitle?: string;
  badgeText?: string;
  size?: 'sm' | 'md' | 'lg';
  iconType?: PradoCommerceIconType;
  className?: string;
  accentColor?: 'cyan' | 'teal' | 'emerald' | 'amber';
  hideSubtitle?: boolean;
}

export function PradoLogo({
  theme = 'light',
  title = 'Prado Commerce',
  subtitle = 'UNIFIED E-COMMERCE',
  badgeText,
  size = 'md',
  className = '',
  hideSubtitle = false,
}: PradoLogoProps) {
  const isDark = theme === 'dark';

  const imgSizeClass = {
    sm: 'h-8 w-8',
    md: 'h-8 w-8',
    lg: 'h-9 w-9',
  }[size] || 'h-8 w-8';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/figma/logo-symbol.png"
        alt="Prado Commerce Logo"
        className={`${imgSizeClass} object-contain shrink-0`}
      />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`text-[17px] font-semibold leading-[21px] tracking-tight ${
              isDark ? 'text-white' : 'text-[#030618]'
            }`}
          >
            {title}
          </span>
          {badgeText ? (
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                isDark
                  ? 'bg-cyan-950/60 text-cyan-400'
                  : 'bg-[#e6f7fa] text-[#0891b2]'
              }`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>
        {!hideSubtitle && subtitle ? (
          <span
            className={`text-[10px] font-normal leading-[12px] tracking-widest uppercase ${
              isDark ? 'text-slate-300' : 'text-[#030618]'
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default PradoLogo;
