"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
  textClassName?: string;
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    let textIndex = texts.length - 1;
    let time = performance.now();
    let morph = 0;
    let cooldown = cooldownTime;
    let rafId: number;

    // Initialize: show the first word in text2 immediately
    if (text1Ref.current && text2Ref.current) {
      text2Ref.current.textContent = texts[0];
      text1Ref.current.textContent = texts[texts.length - 1];
      text2Ref.current.style.opacity = "100%";
      text1Ref.current.style.opacity = "0%";
    }

    const lastStyles = {
      t1Blur: -1, t1Opacity: -1,
      t2Blur: -1, t2Opacity: -1
    };

    const setMorph = (fraction: number) => {
      if (text1Ref.current && text2Ref.current) {
        const t2Blur = Math.min(8 / fraction - 8, 100);
        const t2Opacity = Math.pow(fraction, 0.4) * 100;
        
        const invFraction = 1 - fraction;
        const t1Blur = Math.min(8 / invFraction - 8, 100);
        const t1Opacity = Math.pow(invFraction, 0.4) * 100;

        if (t2Blur !== lastStyles.t2Blur) {
          text2Ref.current.style.filter = `blur(${t2Blur.toFixed(2)}px)`;
          lastStyles.t2Blur = t2Blur;
        }
        if (t2Opacity !== lastStyles.t2Opacity) {
          text2Ref.current.style.opacity = `${t2Opacity.toFixed(1)}%`;
          lastStyles.t2Opacity = t2Opacity;
        }
        if (t1Blur !== lastStyles.t1Blur) {
          text1Ref.current.style.filter = `blur(${t1Blur.toFixed(2)}px)`;
          lastStyles.t1Blur = t1Blur;
        }
        if (t1Opacity !== lastStyles.t1Opacity) {
          text1Ref.current.style.opacity = `${t1Opacity.toFixed(1)}%`;
          lastStyles.t1Opacity = t1Opacity;
        }
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        if (lastStyles.t1Opacity !== 0) {
          text1Ref.current.style.filter = "";
          text1Ref.current.style.opacity = "0%";
          lastStyles.t1Opacity = 0;
        }
        if (lastStyles.t2Opacity !== 100) {
          text2Ref.current.style.filter = "";
          text2Ref.current.style.opacity = "100%";
          lastStyles.t2Opacity = 100;
        }
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
      rafId = requestAnimationFrame(animate);
      const dt = (now - time) / 1000;
      time = now;

      const wasInCooldown = cooldown > 0;
      cooldown -= dt;

      if (cooldown <= 0) {
        if (wasInCooldown) {
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
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [texts, morphTime, cooldownTime]);

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
        className="flex items-center justify-center"
        style={{ filter: "url(#threshold)", willChange: "filter" }}
      >
        <span
          ref={text1Ref}
          className={cn(
            "absolute inline-block select-none text-center text-6xl md:text-[60pt]",
            "text-foreground",
            textClassName
          )}
        />
        <span
          ref={text2Ref}
          className={cn(
            "absolute inline-block select-none text-center text-6xl md:text-[60pt]",
            "text-foreground",
            textClassName
          )}
        />
      </div>
    </div>
  );
}