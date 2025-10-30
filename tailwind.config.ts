// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};

export default config;