"use client";

import { useState, useEffect } from "react";

interface AnimatedTitleProps {
  onFadeProgress?: (opacity: number) => void;
}

export default function AnimatedTitle({ onFadeProgress }: AnimatedTitleProps) {
  const [suffixText, setSuffixText] = useState("Vault");
  const [isBackspacing, setIsBackspacing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Start with "PulseVault" displayed, then begin animation after a delay
    const startDelay = setTimeout(() => {
      startAnimation();
    }, 2000); // Show "PulseVault" for 2 seconds before starting

    function startAnimation() {
      // Fade in badge when animation starts
      if (onFadeProgress) {
        // Fade in over 1000ms
        const duration = 1000;
        const steps = 60;
        const stepDuration = duration / steps;
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;
          const eased = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
          onFadeProgress(eased);
          
          if (currentStep >= steps) {
            onFadeProgress(1);
            clearInterval(fadeInterval);
          }
        }, stepDuration);
      }

      // Start the cycle: Vault -> (backspace) -> Video -> (backspace) -> Vault (repeat)
      cycleAnimation();
    }

    function cycleAnimation() {
      // Step 1: Backspace "Vault" completely
      setIsBackspacing(true);
      let currentText = "Vault";
      const backspaceInterval = setInterval(() => {
        if (currentText.length > 0) {
          currentText = currentText.slice(0, -1);
          setSuffixText(currentText);
        } else {
          clearInterval(backspaceInterval);
          setIsBackspacing(false);
          
          // Step 2: Type "Video"
          setTimeout(() => {
            setIsTyping(true);
            let typingText = "";
            const typingInterval = setInterval(() => {
              const target = "Video";
              if (typingText.length < target.length) {
                typingText = target.slice(0, typingText.length + 1);
                setSuffixText(typingText);
              } else {
                clearInterval(typingInterval);
                setIsTyping(false);
                
                // Step 3: Wait, then backspace "Video" completely
                setTimeout(() => {
                  setIsBackspacing(true);
                  let backspaceText = "Video";
                  const backspaceInterval2 = setInterval(() => {
                    if (backspaceText.length > 0) {
                      backspaceText = backspaceText.slice(0, -1);
                      setSuffixText(backspaceText);
                    } else {
                      clearInterval(backspaceInterval2);
                      setIsBackspacing(false);
                      
                      // Step 4: Type "Vault" again
                      setTimeout(() => {
                        setIsTyping(true);
                        let typingText2 = "";
                        const typingInterval2 = setInterval(() => {
                          const target = "Vault";
                          if (typingText2.length < target.length) {
                            typingText2 = target.slice(0, typingText2.length + 1);
                            setSuffixText(typingText2);
                          } else {
                            clearInterval(typingInterval2);
                            setIsTyping(false);
                            
                            // Step 5: Wait, then repeat the cycle
                            setTimeout(() => {
                              cycleAnimation();
                            }, 2000); // Pause before repeating
                          }
                        }, 150); // Type each character every 150ms
                      }, 300); // Brief pause before typing "Vault"
                    }
                  }, 100); // Backspace each character every 100ms
                }, 2000); // Show "Video" for 2 seconds
              }
            }, 150); // Type each character every 150ms
          }, 300); // Brief pause before typing "Video"
        }
      }, 100); // Backspace each character every 100ms
    }

    return () => {
      clearTimeout(startDelay);
    };
  }, [onFadeProgress]);

  return (
    <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold mb-6 sm:mb-8 text-foreground leading-tight">
      <span className="text-destructive">Pulse</span>
      <span className="text-white">
        {suffixText}
        {(isBackspacing || isTyping) && (
          <span className="inline-block w-0.5 h-[0.9em] bg-white ml-1 animate-pulse" />
        )}
      </span>
    </h1>
  );
}

