"use client";

/**
 * App Store and Google Play store badge section.
 * Uses official-style badge imagery; links open in new tab.
 */
const PULSE_APP_STORE_URL = "https://apps.apple.com/za/app/pulse-cam/id6748621024";
const PULSE_GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.mieweb.pulse&pcampaignid=web_share";

// Local badge SVGs in public/ (Apple black badge; Google Play English)
const APP_STORE_BADGE = "/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg";
const GOOGLE_PLAY_BADGE = "/GetItOnGooglePlay_Badge_Web_color_English.svg";

type StoreBadgesProps = {
  /** Optional heading above the badges, e.g. "Don't have PulseCam?" */
  heading?: string;
  /** Layout: inline (side by side) or stack (vertical on small screens). */
  layout?: "inline" | "stack";
  /** Size of badge images. */
  size?: "sm" | "md" | "lg";
  className?: string;
};

// Same pixel box for both badges so they render equal size
const sizeClasses = {
  sm: "h-9 w-[130px]",
  md: "h-11 w-[155px]",
  lg: "h-[52px] w-[180px]",
};

export function StoreBadges({
  heading = "Get the Pulse app",
  layout = "inline",
  size = "md",
  className = "",
}: StoreBadgesProps) {
  return (
    <div className={className}>
      {heading && (
        <p className="text-sm text-muted-foreground mb-3 text-center sm:text-left">
          {heading}
        </p>
      )}
      <div
        className={`flex flex-wrap items-center justify-center gap-3 ${
          layout === "stack" ? "flex-col sm:flex-row" : "flex-row"
        }`}
      >
        <a
          href={PULSE_APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-opacity hover:opacity-90 focus:opacity-90 ${sizeClasses[size]}`}
          aria-label="Download on the App Store"
        >
          <img
            src={APP_STORE_BADGE}
            alt="Download on the App Store"
            className="h-full w-full object-contain object-center"
            width={180}
            height={60}
          />
        </a>
        <a
          href={PULSE_GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex shrink-0 items-center justify-center overflow-hidden transition-opacity hover:opacity-90 focus:opacity-90 ${sizeClasses[size]}`}
          aria-label="Get it on Google Play"
        >
          <img
            src={GOOGLE_PLAY_BADGE}
            alt="Get it on Google Play"
            className="h-full w-full object-contain object-center"
            width={180}
            height={60}
          />
        </a>
      </div>
    </div>
  );
}
