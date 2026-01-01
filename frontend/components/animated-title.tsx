"use client";

import { useState, useEffect, useRef } from "react";

interface AnimatedTitleProps {
  onFadeProgress?: (opacity: number) => void;
}

// Constants
const INITIAL_DELAY = 2000;
const DISPLAY_DURATION = 2000;
const TYPE_DELAY = 300;
const BACKSPACE_SPEED = 100;
const TYPE_SPEED = 150;
const FADE_DURATION = 1000;
const FADE_STEPS = 60;

const WORDS = {
  VAULT: "Vault",
  VIDEO: "Video",
} as const;

export default function AnimatedTitle({ onFadeProgress }: AnimatedTitleProps) {
  const [suffixText, setSuffixText] = useState<string>(WORDS.VAULT);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Helper to track intervals for cleanup
  const addInterval = (interval: NodeJS.Timeout) => {
    intervalsRef.current.push(interval);
    return interval;
  };

  // Helper to track timeouts for cleanup
  const addTimeout = (timeout: NodeJS.Timeout) => {
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  // Cleanup all intervals and timeouts
  const cleanup = () => {
    intervalsRef.current.forEach(clearInterval);
    timeoutsRef.current.forEach(clearTimeout);
    intervalsRef.current = [];
    timeoutsRef.current = [];
  };

  // Fade in badge with easing
  const fadeInBadge = () => {
    if (!onFadeProgress) return;

    const stepDuration = FADE_DURATION / FADE_STEPS;
    let currentStep = 0;

    const interval = addInterval(
      setInterval(() => {
        currentStep++;
        const progress = currentStep / FADE_STEPS;
        const eased = 1 - Math.pow(1 - progress, 3);
        onFadeProgress(eased);

        if (currentStep >= FADE_STEPS) {
          onFadeProgress(1);
          clearInterval(interval);
        }
      }, stepDuration)
    );
  };

  // Animate backspacing a word
  const backspaceWord = (word: string, onComplete: () => void) => {
    setIsAnimating(true);
    let currentText = word;

    const interval = addInterval(
      setInterval(() => {
        if (currentText.length > 0) {
          currentText = currentText.slice(0, -1);
          setSuffixText(currentText);
        } else {
          clearInterval(interval);
          setIsAnimating(false);
          onComplete();
        }
      }, BACKSPACE_SPEED)
    );
  };

  // Animate typing a word
  const typeWord = (word: string, onComplete: () => void) => {
    setIsAnimating(true);
    let typingText = "";

    const interval = addInterval(
      setInterval(() => {
        if (typingText.length < word.length) {
          typingText = word.slice(0, typingText.length + 1);
          setSuffixText(typingText);
        } else {
          clearInterval(interval);
          setIsAnimating(false);
          onComplete();
        }
      }, TYPE_SPEED)
    );
  };

  // Main animation cycle
  const cycleAnimation = () => {
    // Backspace "Vault" → type "Video"
    backspaceWord(WORDS.VAULT, () => {
      addTimeout(
        setTimeout(() => {
          typeWord(WORDS.VIDEO, () => {
            addTimeout(
              setTimeout(() => {
                // Backspace "Video" → type "Vault"
                backspaceWord(WORDS.VIDEO, () => {
                  addTimeout(
                    setTimeout(() => {
                      typeWord(WORDS.VAULT, () => {
                        addTimeout(
                          setTimeout(() => {
                            cycleAnimation(); // Repeat cycle
                          }, DISPLAY_DURATION)
                        );
                      });
                    }, TYPE_DELAY)
                  );
                });
              }, DISPLAY_DURATION)
            );
          });
        }, TYPE_DELAY)
      );
    });
  };

  useEffect(() => {
    const startDelay = addTimeout(
      setTimeout(() => {
        fadeInBadge();
        cycleAnimation();
      }, INITIAL_DELAY)
    );

    return cleanup;
  }, [onFadeProgress]);

  return (
    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-5 sm:mb-7 text-foreground leading-tight">
      <span className="text-destructive">Pulse</span>
      <span className="text-foreground dark:text-white">
        {suffixText}
        {isAnimating && (
          <span className="inline-block w-0.5 h-[0.9em] bg-foreground dark:bg-white ml-1 animate-pulse" />
        )}
      </span>
    </h1>
  );
}
