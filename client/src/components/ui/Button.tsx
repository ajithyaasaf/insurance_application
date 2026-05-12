import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
}

const Button: React.FC<ButtonProps> = ({
    children,
    isLoading,
    loadingText = 'Processing...',
    disabled,
    className = '',
    ...props
}) => {
    // Add a disabled class when loading or disabled
    const disabledClass = isLoading || disabled ? 'opacity-70 cursor-not-allowed pointer-events-none' : '';
    
    return (
        <button
            disabled={isLoading || disabled}
            className={`${className} ${disabledClass}`.trim()}
            {...props}
        >
            {isLoading ? loadingText : children}
        </button>
    );
};

export default Button;
