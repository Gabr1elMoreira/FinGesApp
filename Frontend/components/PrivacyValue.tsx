import React from 'react';

interface PrivacyValueProps {
    value: number;
    privacyMode?: boolean;
    className?: string; // Para classes de cor/fonte adicionais
    currency?: boolean; // Se deve mostrar símbolo da moeda (default true)
}

const PrivacyValue: React.FC<PrivacyValueProps> = ({ value, privacyMode = false, className = '', currency = true }) => {
    if (privacyMode) {
        return <span className={`filter blur-md transition-all select-none ${className}`}>R$ 0.000,00</span>;
    }

    const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

    return (
        <span className={className}>
            {currency && "R$ "}
            {formatted}
        </span>
    );
};

export default PrivacyValue;
