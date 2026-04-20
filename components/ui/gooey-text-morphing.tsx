"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
  textClassName?: string;
  loop?: boolean;
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName,
  loop = true
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    let textIndex = texts.length - 1;
    let time = performance.now();
    let morph = 0;
    let cooldown = cooldownTime;
    let rafId: number;
    let isStopped = false;

    // Initialize text contents
    if (text1Ref.current && text2Ref.current) {
      text1Ref.current.textContent = texts[texts.length - 1];
      text2Ref.current.textContent = texts[0];
    }

    const setMorph = (fraction: number) => {
      if (!text1Ref.current || !text2Ref.current) return;
      
      const t2Blur = Math.min(8 / fraction - 8, 100);
      const t2Opacity = Math.pow(fraction, 0.4) * 100;
      
      const invFraction = 1 - fraction;
      const t1Blur = Math.min(8 / invFraction - 8, 100);
      const t1Opacity = Math.pow(invFraction, 0.4) * 100;

      text2Ref.current.style.filter = `blur(${t2Blur.toFixed(2)}px)`;
      text2Ref.current.style.opacity = `${t2Opacity.toFixed(1)}%`;

      text1Ref.current.style.filter = `blur(${t1Blur.toFixed(2)}px)`;
      text1Ref.current.style.opacity = `${t1Opacity.toFixed(1)}%`;
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "0%";
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "100%";
      }
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    function animate(now: number) {
      if (isStopped) return;
      rafId = requestAnimationFrame(animate);
      
      const dt = (now - time) / 1000;
      time = now;

      const wasInCooldown = cooldown > 0;
      cooldown -= dt;

      if (cooldown <= 0) {
        if (wasInCooldown) {
          // Check if we should stop at the last word
          if (!loop && textIndex === texts.length - 2) {
            isStopped = true;
            doCooldown();
            return;
          }
          
          textIndex = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = texts[textIndex % texts.length];
            text2Ref.current.textContent = texts[(textIndex + 1) % texts.length];
          }
        }
        doMorph();
      } else {
        doCooldown();
      }
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      isStopped = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [texts, morphTime, cooldownTime, loop]);

  return (
    <div className={cn("relative", className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="flex items-center justify-center select-none pointer-events-none"
        style={{ filter: "url(#threshold)", willChange: "filter" }}
      >
        <span
          ref={text1Ref}
          style={{ opacity: '0%', willChange: 'filter, opacity' }}
          className={cn(
            "absolute inline-block text-center text-6xl md:text-[60pt] font-bold",
            textClassName
          )}
        />
        <span
          ref={text2Ref}
          style={{ opacity: '100%', willChange: 'filter, opacity' }}
          className={cn(
            "absolute inline-block text-center text-6xl md:text-[60pt] font-bold",
            textClassName
          )}
        />
      </div>
    </div>
  );
}
