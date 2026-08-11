'use client';

import React from 'react';
import { ShoppingBag, ShoppingCart, Store, Package, Layers, Sparkles, LayoutGrid, Boxes } from 'lucide-react';

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
  subtitle = 'Unified E-Commerce',
  badgeText,
  size = 'md',
  iconType = 'shopping-bag',
  className = '',
  accentColor = 'cyan',
  hideSubtitle = false,
}: PradoLogoProps) {
  const isDark = theme === 'dark';

  const badgeSizeClasses = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-2.5 rounded-xl',
  }[size];

  const iconPxSize = {
    sm: 16,
    md: 20,
    lg: 24,
  }[size];

  const titleSizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  const accentClasses = {
    cyan: 'bg-cyan-500 text-white shadow-cyan-500/30',
    teal: 'bg-teal-500 text-white shadow-teal-500/30',
    emerald: 'bg-emerald-500 text-white shadow-emerald-500/30',
    amber: 'bg-amber-400 text-white shadow-amber-200/80',
  }[accentColor];

  const subtitleColor = {
    cyan: isDark ? 'text-cyan-400/90' : 'text-slate-500',
    teal: isDark ? 'text-teal-400/90' : 'text-slate-500',
    emerald: isDark ? 'text-emerald-400/90' : 'text-slate-500',
    amber: isDark ? 'text-amber-400/90' : 'text-slate-500',
  }[accentColor];

  const renderIcon = () => {
    switch (iconType) {
      case 'shopping-cart':
        return <ShoppingCart size={iconPxSize} className="shrink-0 text-white" />;
      case 'store':
        return <Store size={iconPxSize} className="shrink-0 text-white" />;
      case 'package':
        return <Package size={iconPxSize} className="shrink-0 text-white" />;
      case 'layers':
        return <Layers size={iconPxSize} className="shrink-0 text-white" />;
      case 'sparkles':
        return <Sparkles size={iconPxSize} className="shrink-0 text-white" />;
      case 'grid':
        return <LayoutGrid size={iconPxSize} className="shrink-0 text-white" />;
      case 'boxes':
        return <Boxes size={iconPxSize} className="shrink-0 text-white" />;
      case 'shopping-bag':
      default:
        return <ShoppingBag size={iconPxSize} className="shrink-0 text-white" />;
    }
  };

  return (
    <div className={`group flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon container styled matching Prado Fleet & ERP rounded badge */}
      <div
        className={`${badgeSizeClasses} ${accentClasses} shadow-sm transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center`}
      >
        {renderIcon()}
      </div>

      {/* Brand Text Stack */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-sans ${titleSizeClasses} font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </span>
          {badgeText ? (
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                isDark
                  ? 'bg-white/10 text-slate-200 border-white/20'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {badgeText}
            </span>
          ) : null}
        </div>
        {!hideSubtitle && subtitle ? (
          <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-widest ${subtitleColor}`}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default PradoLogo;
