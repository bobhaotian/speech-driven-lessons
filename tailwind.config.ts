import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
    	screens: {
    		xs: '475px',
    		sm: '640px',
    		md: '768px',
    		lg: '1024px',
    		xl: '1280px',
    		'2xl': '1536px'
    	},
    	extend: {
    		fontSize: {
    			xs: [
    				'0.75rem',
    				{
    					lineHeight: '1rem'
    				}
    			],
    			sm: [
    				'0.875rem',
    				{
    					lineHeight: '1.25rem'
    				}
    			],
    			base: [
    				'1rem',
    				{
    					lineHeight: '1.5rem'
    				}
    			],
    			lg: [
    				'1.125rem',
    				{
    					lineHeight: '1.75rem'
    				}
    			],
    			xl: [
    				'1.25rem',
    				{
    					lineHeight: '1.75rem'
    				}
    			],
    			'2xl': [
    				'1.5rem',
    				{
    					lineHeight: '2rem'
    				}
    			],
    			'3xl': [
    				'1.875rem',
    				{
    					lineHeight: '2.25rem'
    				}
    			],
    			'4xl': [
    				'2.25rem',
    				{
    					lineHeight: '2.5rem'
    				}
    			],
    			'5xl': [
    				'3rem',
    				{
    					lineHeight: '1.15'
    				}
    			],
    			'6xl': [
    				'3.75rem',
    				{
    					lineHeight: '1.1'
    				}
    			],
    			'7xl': [
    				'4.5rem',
    				{
    					lineHeight: '1.05'
    				}
    			],
    			'8xl': [
    				'6rem',
    				{
    					lineHeight: '1'
    				}
    			],
    			'9xl': [
    				'8rem',
    				{
    					lineHeight: '1'
    				}
    			]
    		},
    		colors: {
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			},
    			neon: 'hsl(var(--neon))',
    			'color-1': 'hsl(var(--color-1))',
    			'color-2': 'hsl(var(--color-2))',
    			'color-3': 'hsl(var(--color-3))',
    			'color-4': 'hsl(var(--color-4))',
    			'color-5': 'hsl(var(--color-5))'
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		backdropBlur: {
    			xs: '2px'
    		},
    		typography: {
    			DEFAULT: {
    				css: {
    					maxWidth: 'none',
    					color: 'hsl(var(--foreground))',
    					h1: {
    						color: 'hsl(var(--primary))'
    					},
    					h2: {
    						color: 'hsl(var(--primary))'
    					},
    					h3: {
    						color: 'hsl(var(--primary))'
    					},
    					strong: {
    						color: 'hsl(var(--primary))'
    					},
    					a: {
    						color: 'hsl(var(--primary))',
    						'&:hover': {
    							color: 'hsl(var(--primary))'
    						}
    					}
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			shimmer: 'shimmer 2s infinite',
    			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    			'pulse-gradient': 'pulseGradient 1.5s ease-in-out infinite',
    			'bounce-dot': 'bounceDot 1.4s infinite ease-in-out both',
    			'bounce-dot-delay-1': 'bounceDot 1.4s infinite ease-in-out both 0.2s',
    			'bounce-dot-delay-2': 'bounceDot 1.4s infinite ease-in-out both 0.4s',
    			'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
    			'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
    			rainbow: 'rainbow var(--speed, 2s) infinite linear',
    			aurora: 'aurora 8s ease-in-out infinite alternate'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			},
    			shimmer: {
    				'0%': {
    					transform: 'translateX(-100%)'
    				},
    				'100%': {
    					transform: 'translateX(100%)'
    				}
    			},
    			pulseGradient: {
    				'0%, 100%': {
    					backgroundPosition: '0% 50%'
    				},
    				'50%': {
    					backgroundPosition: '100% 50%'
    				}
    			},
    			bounceDot: {
    				'0%, 80%, 100%': {
    					transform: 'translateY(0)'
    				},
    				'40%': {
    					transform: 'translateY(-4px)'
    				}
    			},
    			'shimmer-slide': {
    				to: {
    					transform: 'translate(calc(100cqw - 100%), 0)'
    				}
    			},
    			'spin-around': {
    				'0%': {
    					transform: 'translateZ(0) rotate(0)'
    				},
    				'15%, 35%': {
    					transform: 'translateZ(0) rotate(90deg)'
    				},
    				'65%, 85%': {
    					transform: 'translateZ(0) rotate(270deg)'
    				},
    				'100%': {
    					transform: 'translateZ(0) rotate(360deg)'
    				}
    			},
    			rainbow: {
    				'0%': {
    					'background-position': '0%'
    				},
    				'100%': {
    					'background-position': '200%'
    				}
    			},
    			aurora: {
    				'0%': {
    					backgroundPosition: '0% 50%',
    					transform: 'rotate(-5deg) scale(0.9)'
    				},
    				'25%': {
    					backgroundPosition: '50% 100%',
    					transform: 'rotate(5deg) scale(1.1)'
    				},
    				'50%': {
    					backgroundPosition: '100% 50%',
    					transform: 'rotate(-3deg) scale(0.95)'
    				},
    				'75%': {
    					backgroundPosition: '50% 0%',
    					transform: 'rotate(3deg) scale(1.05)'
    				},
    				'100%': {
    					backgroundPosition: '0% 50%',
    					transform: 'rotate(-5deg) scale(0.9)'
    				}
    			}
    		},
    		backgroundImage: {
    			'grid-pattern': 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)'
    		}
    	}
    },
	plugins: [
		require("tailwindcss-animate"),
		require("@tailwindcss/typography")
	],
};

export default config;