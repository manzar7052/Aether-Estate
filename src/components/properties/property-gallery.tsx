"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const imageList =
    images && images.length > 0
      ? images
      : [
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
        ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const nextImage = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % imageList.length);
  }, [imageList.length]);

  const prevImage = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  }, [imageList.length]);

  // Lightbox keyboard controls
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  return (
    <div className="space-y-4">
      {/* Main Image Banner */}
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-sm border border-brand-line/80 bg-brand-sand shadow-sm sm:aspect-16/9">
        <Image
          src={imageList[activeIndex]}
          alt={`${title} - Photo ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 70vw"
          className="object-cover transition-opacity duration-300"
        />

        {/* Action controls on main image */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="flex items-center gap-1.5 rounded-sm bg-brand-ink/80 px-3 py-1.5 text-xs font-medium text-brand-cream backdrop-blur-xs transition-all hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            <span>View Fullscreen</span>
          </button>
        </div>

        {/* Counter Badge */}
        <div className="absolute bottom-4 left-4 rounded-sm bg-brand-ink/80 px-2.5 py-1 text-xs font-medium text-brand-cream backdrop-blur-xs">
          Photo {activeIndex + 1} of {imageList.length}
        </div>

        {/* Navigation arrows (desktop) */}
        {imageList.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous photo"
              className="absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-brand-ink/70 text-brand-cream backdrop-blur-xs transition-all hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next photo"
              className="absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-brand-ink/70 text-brand-cream backdrop-blur-xs transition-all hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {imageList.length > 1 && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:grid-cols-4">
          {imageList.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative aspect-4/3 overflow-hidden rounded-sm border transition-all ${
                activeIndex === idx
                  ? "border-brand-ink ring-2 ring-brand-gold"
                  : "border-brand-line opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`${title} thumbnail ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 25vw, 15vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen photo gallery"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/95 backdrop-blur-md p-4 sm:p-8"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close fullscreen gallery"
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Lightbox Image */}
          <div className="relative max-h-[85vh] max-w-5xl aspect-16/10 w-full overflow-hidden rounded-sm">
            <Image
              src={imageList[activeIndex]}
              alt={`${title} - Fullscreen photo ${activeIndex + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          {/* Lightbox Navigation */}
          {imageList.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous photo"
                className="absolute top-1/2 left-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next photo"
                className="absolute top-1/2 right-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Lightbox Caption */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-sm bg-white/10 px-4 py-1.5 text-xs text-white backdrop-blur-xs">
            {title} &bull; {activeIndex + 1} of {imageList.length}
          </div>
        </div>
      )}
    </div>
  );
}
