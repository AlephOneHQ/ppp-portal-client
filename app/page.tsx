/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Users, TrendingUp, Shield, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F4EFE6] to-[#FFE0AF]/30 text-[#040404]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(192,60,61,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(192,60,61,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

          {/* Animated Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C13C3D]/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C9481C]/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-[#FFE0AF]/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 container mx-auto text-center">
          {/* Logo and Navigation */}
          <div className="flex justify-between items-center py-6 mb-8 md:mb-16">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <img src="/icons/oyntcda-logo.svg" className="h-14 w-14 md:h-16 md:w-16" alt="oyntcda logo" />
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/available-projects" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors">Projects</Link>
              <Button
                asChild
                className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg"
              >
                <Link href="/partner/login">Partner</Link>
              </Button>
            </div>
          </div>

          {/* Main Hero Content */}
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#C13C3D]/10 border border-[#C13C3D]/20 text-[#C13C3D] text-sm mb-6">
                <Shield className="w-4 h-4 mr-2" />
                OYNTCDA PPP Portal
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Building Tomorrow&apos;s
                <span className="block bg-gradient-to-r from-[#C13C3D] via-[#C9481C] to-[#383F1E] bg-clip-text text-transparent">
                  Smart Cities
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-[#383F1E] mb-8 max-w-3xl mx-auto leading-relaxed">
                Transforming urban landscapes through public-private partnerships.
                Join us in creating sustainable, innovative, and connected cities for future generations.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {/* Primary CTA */}
              <Button
                asChild
                size="lg"
                className="
                  bg-gradient-to-r from-[#C13C3D] to-[#C9481C]
                  hover:from-[#A83233] hover:to-[#B0401A]
                  text-white px-8 py-6 text-lg rounded-xl
                  border-0 shadow-lg hover:shadow-[#C13C3D]/25
                  transition-all duration-300
                "
              >
                <Link href="/partner/sign-up" className="flex items-center">
                  Submit Expression of Interest
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              {/* Secondary CTA */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="
                  px-8 py-6 text-lg rounded-xl
                  bg-white/40 backdrop-blur-md
                  border border-[#C13C3D]/30
                  text-[#C13C3D]
                  hover:bg-[#C13C3D]/10
                  hover:border-[#C13C3D]
                  hover:text-[#A83233]
                  transition-all duration-300
                "
              >
                <Link href="/available-projects" className="flex items-center">
                  View Available Projects
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>


            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pb-12">
              {/* Card 1 */}
              <div className="relative rounded-2xl p-6 
                bg-gradient-to-br from-white/30 to-white/10
                backdrop-blur-xl
                border border-white/30
                shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]
                hover:-translate-y-1
                transition-all duration-300">

                {/* glass highlight */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl 
                  bg-gradient-to-tr from-white/20 via-transparent to-transparent" />

                <div className="relative">
                  <div className="w-12 h-12 bg-[#C9481C]/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                    <MapPin className="w-6 h-6 text-[#C9481C]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[#040404]">
                    Land Development
                  </h3>
                  <p className="text-[#383F1E] text-sm">
                    Strategic urban planning and land utilization projects
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="relative rounded-2xl p-6 
                bg-gradient-to-br from-white/30 to-white/10
                backdrop-blur-xl
                border border-white/30
                shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]
                hover:-translate-y-1
                transition-all duration-300">

                <div className="pointer-events-none absolute inset-0 rounded-2xl 
                  bg-gradient-to-tr from-white/20 via-transparent to-transparent" />

                <div className="relative">
                  <div className="w-12 h-12 bg-[#C13C3D]/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                    <Building2 className="w-6 h-6 text-[#C13C3D]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[#040404]">
                    Smart Infrastructure
                  </h3>
                  <p className="text-[#383F1E] text-sm">
                    Modern, sustainable city infrastructure development
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="relative rounded-2xl p-6 
                bg-gradient-to-br from-white/30 to-white/10
                backdrop-blur-xl
                border border-white/30
                shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]
                hover:-translate-y-1
                transition-all duration-300">

                <div className="pointer-events-none absolute inset-0 rounded-2xl 
                bg-gradient-to-tr from-white/20 via-transparent to-transparent" />

                <div className="relative">
                  <div className="w-12 h-12 bg-[#C13C3D]/15 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                    <TrendingUp className="w-6 h-6 text-[#C13C3D]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[#040404]">
                    Economic Growth
                  </h3>
                  <p className="text-[#383F1E] text-sm">
                    Driving local economic development through strategic partnerships
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-white/80 backdrop-blur-sm border-t border-[#FFE0AF]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Link href="/" className="border-r pr-4">
                  <img src="/icons/oyntcda-logo.svg" className="h-16 w-16" alt="oyntcda logo" />
                </Link>
                <Link href="/" className="px-2">
                  <img src="/icons/oyo-logo.png" className="h-12 w-12" alt="oyo state logo" />
                </Link>
              </div>
              <p className="text-[#383F1E] max-w-md text-sm leading-relaxed">
                A government-led initiative transforming urban landscapes through innovative public-private partnerships.
                Building sustainable, smart cities for future generations.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4 text-[#040404]">Quick Access</h3>
              <div className="space-y-2">
                <Link href="/partner/login" className="block text-[#383F1E] hover:text-[#C13C3D] transition-colors text-sm">
                  Partner Portal
                </Link>
                <Link href="#projects" className="block text-[#383F1E] hover:text-[#C13C3D] transition-colors text-sm">
                  Available Projects
                </Link>
                <Link href="#contact" className="block text-[#383F1E] hover:text-[#C13C3D] transition-colors text-sm">
                  Contact Support
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-4 text-[#040404]">Contact Info</h3>
              <div className="space-y-2 text-sm text-[#383F1E]">
                <div>📍 Aba Akinjide Rd, Agodi GRA, Ibadan, Oyo State, Nigeria</div>
                <div>📞 09114444144</div>
                <div>✉️ enquiries@oyntcda.oy.gov.ng</div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#FFE0AF] mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-[#383F1E] text-sm">
              © {new Date().getFullYear()} PPP Portal. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors text-sm">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="text-[#383F1E] hover:text-[#C13C3D] transition-colors text-sm">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}