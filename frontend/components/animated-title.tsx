"use client";

import { useState, useEffect } from "react";

export default function AnimatedTitle() {
  const [displayText, setDisplayText] = useState("Video");
  const [isBackspacing, setIsBackspacing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let backspaceInterval: NodeJS.Timeout | null = null;
    let typingInterval: NodeJS.Timeout | null = null;
    let typingTimer: NodeJS.Timeout | null = null;

    // Start backspacing immediately
    setIsBackspacing(true);
    let currentText = "Video";
    backspaceInterval = setInterval(() => {
      if (currentText.length > 2) {
        currentText = currentText.slice(0, -1);
        setDisplayText(currentText);
      } else {
        if (backspaceInterval) clearInterval(backspaceInterval);
        setIsBackspacing(false);
        // Start typing "tals" after a brief pause
        typingTimer = setTimeout(() => {
          setIsTyping(true);
          let typingText = "Vi";
          typingInterval = setInterval(() => {
            const target = "Vitals";
            if (typingText.length < target.length) {
              typingText = target.slice(0, typingText.length + 1);
              setDisplayText(typingText);
            } else {
              if (typingInterval) clearInterval(typingInterval);
              setIsTyping(false);
            }
          }, 150); // Type each character every 150ms
        }, 300); // Brief pause before typing
      }
    }, 100); // Backspace each character every 100ms

    return () => {
      if (backspaceInterval) clearInterval(backspaceInterval);
      if (typingInterval) clearInterval(typingInterval);
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, []);

  return (
    <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold mb-6 sm:mb-8 text-foreground leading-tight">
      {displayText.startsWith("Vi") ? (
        <>
          <span className="text-white">Vi</span>
          {displayText.length > 2 && (
            <span className="text-destructive">{displayText.slice(2)}</span>
          )}
          {(isBackspacing || isTyping) && (
            <span className="inline-block w-0.5 h-[0.9em] bg-destructive ml-1 animate-pulse" />
          )}
        </>
      ) : (
        <>
          {displayText}
          {isBackspacing && (
            <span className="inline-block w-0.5 h-[0.9em] bg-foreground ml-1 animate-pulse" />
          )}
        </>
      )}
    </h1>
  );
}

