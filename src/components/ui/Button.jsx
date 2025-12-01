import React from "react";

const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent",
    secondary: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent",
    "danger-outline": "bg-white text-red-700 border-red-200 hover:bg-red-50 focus:ring-red-500",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent",
    warning: "bg-[#ffd026] text-blue-700 hover:opacity-90 border-transparent", // Special case for "Create PO" style
};

const sizes = {
    xs: "px-1.5 py-0.5 text-[11px] h-auto min-h-0",
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    icon: "p-2",
};

export const Button = React.forwardRef(
    ({ className = "", variant = "primary", size = "md", isLoading, disabled, children, type = "button", ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

        const variantStyles = variants[variant] || variants.primary;
        const sizeStyles = sizes[size] || sizes.md;

        return (
            <button
                ref={ref}
                type={type}
                className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
