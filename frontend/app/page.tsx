"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { useEffect, useState } from "react";

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
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
        "Automatic transcoding to HLS/DASH formats with multiple quality renditions.",
    },
    {
      icon: Lock,
      title: "Secure Access",
      description:
        "HMAC-signed URLs with configurable expiry. No PHI in logs or URLs.",
    },
    {
      icon: Zap,
      title: "Resumable Uploads",
      description:
        "Reliable large-file transfers using the tus protocol. Handle uploads up to 2GB+.",
    },
    {
      icon: Database,
      title: "Self-Hosted",
      description:
        "Complete control over your data. Deploy on-premise or in your own cloud.",
    },
    {
      icon: Cloud,
      title: "Observability",
      description:
        "Built-in metrics, logging, and monitoring with Prometheus, Grafana, and Loki.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Subtle Animated Gradient Background */}
      <div className="absolute inset-0 bg-black">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(220, 38, 38, 0.15) 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Subtle Animated Orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20 mt-10">
          <div className="inline-block mb-6">
            <span className="text-sm font-semibold text-gray-400 px-4 py-2 rounded-full border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
              HIPAA-Compliant • Self-Hosted • Secure
            </span>
          </div>

          <h1 className="text-7xl md:text-8xl font-bold mb-6 text-white">
            Pulse<span className="text-red-500">Vault</span>
          </h1>

          <p className="text-2xl md:text-3xl text-gray-400 mb-6 max-w-3xl mx-auto font-light">
            Secure video storage and delivery for
            <span className="text-red-500"> healthcare</span> and
            <span className="text-red-500"> research</span>
          </p>

          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            HIPAA-compliant, self-hosted solution for capturing, processing, and
            sharing encrypted video and data
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 bg-red-600 hover:bg-red-700 text-white border-0 rounded-full shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-all duration-300 group"
            >
              <Link href="/auth" className="flex items-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="text-lg px-8 bg-transparent border border-gray-800 text-gray-300 hover:bg-gray-900 hover:border-gray-700 hover:text-white rounded-full transition-all duration-300"
            >
              <Link href="/auth">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border border-gray-800 bg-gray-900/30 backdrop-blur-sm hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="p-3 bg-gray-800 rounded-lg w-fit mb-4 group-hover:bg-red-500/10 transition-colors border border-gray-800 group-hover:border-red-500/30">
                    <Icon className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="relative p-12 rounded-3xl border border-gray-800 bg-gray-900/30 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 animate-shimmer" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                <h2 className="text-3xl font-bold text-white">
                  Ready to get started?
                </h2>
              </div>
              <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
                Join healthcare and research teams using PulseVault to securely
                manage their video data
              </p>
              <Button
                asChild
                size="lg"
                className="text-lg px-8 bg-red-600 hover:bg-red-700 text-white border-0 rounded-full shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transition-all duration-300 group"
              >
                <Link href="/auth" className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 space-y-6">
          <div className="text-center text-gray-600 text-sm">
            <p className="flex items-center justify-center gap-2 mb-4">
              <span>Your data has a heartbeat.</span>
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span className="text-red-500 font-semibold">PulseVault</span>
              <span>protects it.</span>
            </p>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-sm text-gray-500">
              <span className="text-gray-400">Part of the Pulse Platform</span>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/mieweb/pulse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Video className="w-4 h-4" />
                  Pulse Mobile App
                </a>
                <span className="text-gray-700">•</span>
                <a
                  href="https://github.com/mieweb/pulsevault"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-500 transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
