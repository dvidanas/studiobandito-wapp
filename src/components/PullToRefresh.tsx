"use client";
import { useState, useEffect, useRef } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

// Helper to check if the touch target or any of its scrollable parents are at scrollTop === 0
function isAtScrollTop(element: HTMLElement | null): boolean {
  let el: HTMLElement | null = element;
  while (el) {
    if (el === document.body || el === document.documentElement) {
      return window.scrollY === 0;
    }
    
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const isScrollable = overflowY === "auto" || overflowY === "scroll";
    
    if (isScrollable && el.scrollHeight > el.clientHeight) {
      return el.scrollTop === 0;
    }
    
    el = el.parentElement;
  }
  return window.scrollY === 0;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<"idle" | "pulling" | "canRelease" | "refreshing">("idle");
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (isAtScrollTop(target)) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const currentY = e.touches[0].pageY;
      const diffY = currentY - startY.current;

      if (diffY > 0) {
        // Prevent default browser behavior (e.g. browser pull-to-refresh or bounce)
        if (e.cancelable) {
          e.preventDefault();
        }
        
        // Elastic resistance formula
        const distance = Math.min(diffY * 0.35, 100);
        setPullDistance(distance);
        
        if (distance >= 60) {
          setStatus("canRelease");
        } else {
          setStatus("pulling");
        }
      } else if (diffY < 0) {
        // If user pulls up, cancel the pull gesture and allow normal scrolling
        isPulling.current = false;
        setPullDistance(0);
        setStatus("idle");
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (status === "canRelease" || pullDistance >= 60) {
        setStatus("refreshing");
        setPullDistance(50); // Lock height while loading
        try {
          await onRefresh();
        } catch (err) {
          console.error("Error updating data:", err);
        } finally {
          setPullDistance(0);
          setStatus("idle");
        }
      } else {
        setPullDistance(0);
        setStatus("idle");
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [status, pullDistance, onRefresh]);

  const showIndicator = pullDistance > 0 || status === "refreshing";
  const rotation = Math.min((pullDistance / 60) * 180, 180);

  return (
    <div className={`relative ${className ?? "w-full"}`}>
      {showIndicator && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(-50%, ${pullDistance}px) scale(${Math.min(pullDistance / 50, 1.05)})`,
            opacity: Math.min(pullDistance / 35, 1),
            transition: status === "refreshing" ? "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none",
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 dark:bg-[var(--color-wa-panel-l)]/95 backdrop-blur-md border border-[var(--color-wa-sep)] rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {status === "refreshing" ? (
              <svg className="w-4 h-4 animate-spin text-[var(--color-wa-green)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-[var(--color-wa-green)] transition-transform duration-100 ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
            <span className="text-[10px] font-bold text-[var(--color-wa-text-main)] tracking-wider uppercase select-none">
              {status === "refreshing"
                ? "Actualizando"
                : status === "canRelease"
                ? "Soltá para actualizar"
                : "Deslizá para actualizar"}
            </span>
          </div>
        </div>
      )}

      {/* Main page content wrapper with elastic offset */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          transform: status === "refreshing" ? "translateY(50px)" : `translateY(${pullDistance * 0.4}px)`,
          transition: isPulling.current ? "none" : "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
