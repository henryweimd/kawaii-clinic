import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'white';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative py-3 px-6 rounded-3xl font-bold text-lg transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 overflow-hidden group";
  
  const variants = {
    primary: "bg-kawaii-blue text-kawaii-dark hover:bg-kawaii-blueDark border-b-4 border-blue-400 active:border-b-0 active:translate-y-[4px]",
    secondary: "bg-kawaii-lavender text-purple-900 hover:bg-purple-200 border-b-4 border-purple-400 active:border-b-0 active:translate-y-[4px]",
    danger: "bg-red-200 text-red-800 hover:bg-red-300 border-b-4 border-red-400 active:border-b-0 active:translate-y-[4px]",
    success: "bg-kawaii-green text-green-900 hover:bg-green-300 border-b-4 border-green-500 active:border-b-0 active:translate-y-[4px]",
    white: "bg-white text-kawaii-dark hover:bg-gray-50 border-b-4 border-gray-200 active:border-b-0 active:translate-y-[4px]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${props.disabled ? 'opacity-50 grayscale cursor-not-allowed border-b-0 translate-y-[4px]' : ''}`} 
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left pointer-events-none"></div>
    </button>
  );
};