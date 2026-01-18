import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "py-3 px-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none";
  
  const variants = {
    primary: "bg-kawaii-blue text-kawaii-dark hover:bg-blue-200 border-2 border-blue-300",
    secondary: "bg-white text-kawaii-dark hover:bg-gray-50 border-2 border-gray-200",
    danger: "bg-red-200 text-red-800 hover:bg-red-300 border-2 border-red-300",
    success: "bg-kawaii-green text-green-900 hover:bg-green-300 border-2 border-green-400",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
