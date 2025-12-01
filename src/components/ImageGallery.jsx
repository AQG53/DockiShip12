import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { Fragment } from "react";

export default function ImageGallery({ images = [], absImg, placeholder, className, thumbnailClassName, compact = false, showName = false }) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        if (compact) {
            return (
                <div className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded-md overflow-hidden ${className || "h-10 w-10"}`}>
                    {placeholder ? (
                        <img src={placeholder} alt="No image" className="h-full w-full object-cover opacity-50" />
                    ) : (
                        <div className="text-gray-300">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 mb-2 opacity-50"
                >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-xs">No images</span>
            </div>
        );
    }

    const handleNext = (e) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = (e) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const currentImg = images[currentIndex];

    return (
        <>
            {/* Small View Slider */}
            <div className={`relative group ${className || "w-full max-w-[200px]"}`}>
                <div
                    className={`overflow-hidden rounded-md border border-gray-200 bg-gray-100 cursor-pointer relative ${thumbnailClassName || "h-32 w-full"}`}
                    onClick={() => setLightboxOpen(true)}
                >
                    <img
                        src={absImg(currentImg.url)}
                        alt={currentImg.alt || "Product image"}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = placeholder;
                        }}
                    />

                    {/* Product Name Overlay */}
                    {showName && currentImg.productName && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate text-center">
                            {currentImg.productName}
                        </div>
                    )}

                    {/* Hover Overlay with Maximize Icon */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="text-white drop-shadow-md" size={compact ? 16 : 20} />
                    </div>

                    {/* Image Counter Badge */}
                    {!compact && images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {currentIndex + 1} / {images.length}
                        </div>
                    )}

                    {/* Compact Multiple Indicator */}
                    {compact && images.length > 1 && (
                        <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded-sm">
                            +{images.length - 1}
                        </div>
                    )}
                </div>

                {/* Navigation Arrows (Small View) - Hide in compact */}
                {!compact && images.length > 1 && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute top-1/2 -left-3 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                        >
                            <ChevronLeft size={14} className="text-gray-700" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute top-1/2 -right-3 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                        >
                            <ChevronRight size={14} className="text-gray-700" />
                        </button>
                    </>
                )}
            </div>

            {/* Lightbox Modal */}
            <Transition show={lightboxOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setLightboxOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/90" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="relative flex items-center justify-center h-[70vh]">
                                        <img
                                            src={absImg(currentImg.url)}
                                            alt={currentImg.alt || "Product image"}
                                            className="max-h-full max-w-full object-contain"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = placeholder;
                                            }}
                                        />

                                        {/* Product Name Header */}
                                        {currentImg.productName && (
                                            <div className="absolute -top-5 left-0 right-0 text-center">
                                                <span className="text-white text-lg font-medium drop-shadow-md">
                                                    {currentImg.productName}
                                                </span>
                                            </div>
                                        )}

                                        {/* Close Button */}
                                        <button
                                            onClick={() => setLightboxOpen(false)}
                                            className="absolute -top-5 -right-4 text-white/70 hover:text-white p-2"
                                        >
                                            <X size={32} />
                                        </button>

                                        {/* Navigation Arrows (Lightbox) */}
                                        {images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={handlePrev}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors"
                                                >
                                                    <ChevronLeft size={40} />
                                                </button>
                                                <button
                                                    onClick={handleNext}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors"
                                                >
                                                    <ChevronRight size={40} />
                                                </button>
                                            </>
                                        )}

                                        {/* Counter (Lightbox) */}
                                        {images.length > 1 && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                                                {currentIndex + 1} / {images.length}
                                            </div>
                                        )}
                                    </div>

                                    {/* Thumbnails Strip (Optional, for better UX) */}
                                    {images.length > 1 && (
                                        <div className="mt-4 flex justify-center gap-2 overflow-x-auto py-2">
                                            {images.map((img, idx) => (
                                                <button
                                                    key={img.id || idx}
                                                    onClick={() => setCurrentIndex(idx)}
                                                    className={`relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border-2 ${idx === currentIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                                                        }`}
                                                >
                                                    <img
                                                        src={absImg(img.url)}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
