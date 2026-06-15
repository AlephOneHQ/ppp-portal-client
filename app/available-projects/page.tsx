"use client"
/* eslint-disable @next/next/no-img-element */

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowRight,
    Clock,
    Landmark,
    Wallet,
} from "lucide-react"

import type { ProjectFilters } from "@/types/projects"
import { useAvailableProjects } from "@/hooks/useAvailableProjects"
import { transformToAvailableProject } from "@/lib/transformProjectToAvailable"
import { ContentDisplay } from "@/components/ui/content-display"

/* =======================
   SKELETON CARD
======================= */
function ProjectCardSkeleton() {
    return (
        <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border border-[#FFE0AF] py-0">
            <CardContent className="p-0">
                <div className="grid md:grid-cols-[220px_1fr] gap-6">
                    {/* Image */}
                    <div className="h-56 md:h-full w-full">
                        <Skeleton className="h-full w-full" />
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                            <Skeleton className="h-6 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-6 w-28 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

/* =======================
   PAGE
======================= */
export default function AvailableProjectsPage() {
    const filters: ProjectFilters = {
        status: "published",
        sort_by: "-created_at",
        limit: 20,
        offset: 0,
    }

    const { availableProjects, loading, error } = useAvailableProjects(filters)

    const projects = availableProjects.map(transformToAvailableProject)

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-[#F4EFE6] to-[#FFE0AF]/30 text-[#040404]">
            {/* ================= HEADER ================= */}
            <header className="container mx-auto py-6 flex justify-between items-center">
                <Link href="/" className="flex items-center space-x-2">
                    <img
                        src="/icons/oyntcda-logo.svg"
                        className="h-14 w-14 md:h-16 md:w-16"
                        alt="oyntcda logo"
                    />
                </Link>

                <nav className="hidden md:flex items-center space-x-8">
                    <Link
                        href="/available-projects"
                        className="text-[#383F1E] hover:text-[#C13C3D] transition-colors"
                    >
                        Projects
                    </Link>

                    <Button
                        asChild
                        className="bg-gradient-to-r from-[#C13C3D] to-[#C9481C] text-white px-8 py-6 rounded-xl shadow-lg"
                    >
                        <Link href="/partner/login">Partner</Link>
                    </Button>
                </nav>
            </header>

            {/* ================= MAIN ================= */}
            <main className="container mx-auto px-4 py-16 max-w-6xl">
                {/* Intro */}
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Available PPP Projects
                    </h1>
                    <p className="text-[#383F1E] max-w-2xl mx-auto">
                        Browse current public-private partnership opportunities across
                        priority sectors driving sustainable development in Oyo State.
                    </p>
                </div>

                {/* Error State */}
                {error && (
                    <div className="text-center text-red-600 py-12">
                        Failed to load projects. Please try again.
                    </div>
                )}

                {/* Projects */}
                <div className="space-y-6">
                    {/* Loading Skeletons */}
                    {loading &&
                        Array.from({ length: 5 }).map((_, i) => (
                            <ProjectCardSkeleton key={i} />
                        ))}

                    {/* Loaded Projects */}
                    {!loading &&
                        projects.map((project) => (
                            <Card
                                key={project.id}
                                className="overflow-hidden bg-white/80 backdrop-blur-sm border border-[#FFE0AF] hover:border-[#C13C3D] hover:shadow-xl transition-all duration-300 py-0"
                            >
                                <CardContent className="p-0">
                                    <div className="grid md:grid-cols-[220px_1fr] gap-6">
                                        {/* Thumbnail */}
                                        <div className="relative h-56 md:h-full w-full bg-white flex items-center justify-center">
                                            {project.image ? (
                                                <Image
                                                    src={project.image.file_url}
                                                    alt={project.image.file_name}
                                                    fill
                                                    sizes="220px"
                                                    className="object-contain"
                                                />
                                            ) : (
                                                <Image
                                                    src="/icons/oyntcda-logo.svg"
                                                    alt="OYNTCDA project placeholder"
                                                    width={96}
                                                    height={96}
                                                    className="opacity-60"
                                                />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 flex flex-col justify-between">
                                            <div>
                                                <h2 className="text-xl font-semibold mb-2">
                                                    {project.title}
                                                </h2>

                                                <p className="text-sm text-[#383F1E] leading-relaxed line-clamp-2 mb-4">
                                                    <ContentDisplay
                                                        content={project.description}
                                                        className="text-xs md:text-sm text-muted-foreground line-clamp-2"
                                                        as="span"
                                                    />
                                                </p>
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div className="flex flex-wrap gap-3">
                                                    <Badge className="bg-[#C13C3D]/10 text-[#C13C3D] flex items-center gap-1">
                                                        <Wallet className="w-3 h-3" />
                                                        {project.cost}
                                                    </Badge>

                                                    <Badge className="bg-[#C9481C]/10 text-[#C9481C] flex items-center gap-1">
                                                        <Landmark className="w-3 h-3" />
                                                        {project.ministry}
                                                    </Badge>

                                                    <Badge className="bg-[#383F1E]/10 text-[#383F1E] flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {project.timeline}
                                                    </Badge>
                                                </div>

                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    className="self-start md:self-auto text-[#C13C3D] hover:bg-[#C13C3D]/10"
                                                >
                                                    <Link
                                                        href={`/available-projects/${project.id}`}
                                                        className="flex items-center gap-2"
                                                    >
                                                        View Project Details
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            </main>

            {/* ================= FOOTER ================= */}
            <footer className="relative bg-white/80 backdrop-blur-sm border-t border-[#FFE0AF]">
                <div className="container mx-auto px-4 py-12">
                    <div className="grid md:grid-cols-4 gap-8">
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
                                A government-led initiative transforming urban landscapes
                                through innovative public-private partnerships.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4">Quick Access</h3>
                            <Link href="/partner/login" className="block text-sm hover:text-[#C13C3D]">
                                Partner Portal
                            </Link>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4">Contact Info</h3>
                            <div className="text-sm space-y-2">
                                <div>📍 Agodi GRA, Ibadan</div>
                                <div>📞 09114444144</div>
                                <div>✉️ enquiries@oyntcda.oy.gov.ng</div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t mt-8 pt-6 text-sm text-center">
                        © {new Date().getFullYear()} PPP Portal. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
