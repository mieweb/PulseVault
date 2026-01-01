"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import GridBackgroundDemo from "@/components/ui/grid-background-demo";
import AnimatedTitle from "@/components/animated-title";
import {
  Shield,
  Video,
  Lock,
  Zap,
  Database,
  Cloud,
  Heart,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: Video,
      title: "Short-Form Video Feed",
      description:
        "View and browse short-form videos in an infinite scrolling feed. Perfect for quick knowledge sharing and content discovery.",
    },
    {
      icon: Zap,
      title: "Easy Video Upload",
      description:
        "Upload videos directly from your browser with resumable uploads. Handle large files reliably with automatic progress tracking.",
    },
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description:
        "Built with security and compliance at its core. Encryption in transit and at rest.",
    },
    {
      icon: Video,
      title: "Adaptive Streaming",
      description:
        "Automatic transcoding to HLS/DASH formats with multiple quality renditions for optimal playback.",
    },
    {
      icon: Lock,
      title: "Secure Access",
      description:
        "HMAC-signed URLs with configurable expiry. No PHI in logs or URLs.",
    },
    {
      icon: Database,
      title: "Self-Hosted",
      description:
        "Complete control over your data. Deploy on-premise or in your own cloud.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0">
        <GridBackgroundDemo />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section - Full Screen */}
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 md:pt-14">
          <div className="max-w-7xl mx-auto text-center w-full -mt-20 sm:-mt-24 md:-mt-28 lg:-mt-32 xl:-mt-36">
            <div className="inline-block mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm md:text-base font-bold text-muted-foreground px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-border bg-card/50 backdrop-blur-sm">
                HIPAA-Compliant • Self-Hosted • Secure
              </span>
            </div>

            <AnimatedTitle />

            <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground mb-3 sm:mb-4 max-w-3xl mx-auto font-semibold leading-tight">
              Upload, view, and manage short-form videos for
              <span className="text-destructive"> healthcare</span> and
              <span className="text-destructive"> research</span>
            </p>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-5 sm:mb-6 max-w-2xl mx-auto font-medium leading-relaxed">
              HIPAA-compliant platform for uploading short-form videos, viewing them in an infinite feed, and securely sharing encrypted content
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4 sm:mt-6">
              <Button
                asChild
                size="lg"
                className="text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 bg-destructive hover:bg-destructive/90 text-white border-0 rounded-full shadow-lg shadow-destructive/50 hover:shadow-destructive/70 transition-all duration-300 group font-bold"
              >
                <Link href="/auth" className="flex items-center gap-1.5 sm:gap-2">
                  Get Started
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section - Appears on Scroll */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border border-border bg-card/30 backdrop-blur-sm hover:border-destructive/50 transition-all duration-300 hover:shadow-lg hover:shadow-destructive/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/0 to-destructive/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="p-3 bg-muted rounded-lg w-fit mb-4 group-hover:bg-destructive/10 transition-colors border border-border group-hover:border-destructive/30">
                    <Icon className="w-6 h-6 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="relative p-12 rounded-3xl border border-border bg-card/30 backdrop-blur-sm">
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-destructive fill-destructive" />
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                    Ready to get started?
                  </h2>
                </div>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
                  Join healthcare and research teams using <span className="text-destructive">Pulse</span><span className="text-foreground dark:text-white">Vault</span> to securely
                  manage their video data
                </p>
                <Button
                  asChild
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white border-0 rounded-full shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-all duration-300 group"
                >
                  <Link href="/auth" className="flex items-center gap-2">
                    Create Account
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
