/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	darkMode: 'class',
	// Hover só em dispositivos com mouse: no toque o estado de hover ficava preso.
	future: {
		hoverOnlyWhenSupported: true,
	},
	theme: {
		// Estética plana: sem sombra em superfícies comuns. Só camadas flutuantes
		// (popover, dropdown, modal, toast, tooltip) usam lg/xl/2xl para se destacar do fundo.
		boxShadow: {
			sm: 'none',
			DEFAULT: 'none',
			md: 'none',
			lg: '0 8px 24px -6px rgb(0 0 0 / 0.16), 0 2px 6px -2px rgb(0 0 0 / 0.08)',
			xl: '0 16px 40px -8px rgb(0 0 0 / 0.22), 0 4px 10px -4px rgb(0 0 0 / 0.1)',
			'2xl': '0 24px 56px -12px rgb(0 0 0 / 0.3)',
			inner: 'none',
			none: 'none'
		},
		extend: {
			fontFamily: {
				montserrat: ['Montserrat', 'sans-serif']
			},
			colors: {
				background: 'rgb(var(--background) / <alpha-value>)',
				surface: 'rgb(var(--bg-surface) / <alpha-value>)',
				sidebar: 'rgb(var(--bg-sidebar) / <alpha-value>)',
				primary: {
					DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
					foreground: 'rgb(var(--primary-foreground) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
					foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)'
				},
				success: '#10b981',
				warning: '#f59e0b',
				danger: '#ef4444',
				border: 'rgb(var(--border) / <alpha-value>)',
				foreground: 'rgb(var(--foreground) / <alpha-value>)',
				card: {
					DEFAULT: 'rgb(var(--card) / <alpha-value>)',
					foreground: 'rgb(var(--card-foreground) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
					foreground: 'rgb(var(--popover-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
					foreground: 'rgb(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
					foreground: 'rgb(var(--accent-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
					foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)'
				},
				input: 'rgb(var(--input) / <alpha-value>)',
				ring: 'rgb(var(--ring) / <alpha-value>)',
				status: {
					realizado: 'rgb(var(--status-realizado) / <alpha-value>)',
					pendente: 'rgb(var(--status-pendente) / <alpha-value>)',
					cancelado: 'rgb(var(--status-cancelado) / <alpha-value>)',
					reagendado: 'rgb(var(--status-reagendado) / <alpha-value>)',
					esquecimento: 'rgb(var(--status-esquecimento) / <alpha-value>)',
					noshow: 'rgb(var(--status-noshow) / <alpha-value>)',
					iniciando: 'rgb(var(--status-iniciando) / <alpha-value>)',
					total: 'rgb(var(--status-total) / <alpha-value>)'
				},
				chart: {
					'1': 'rgb(var(--chart-1) / <alpha-value>)',
					'2': 'rgb(var(--chart-2) / <alpha-value>)',
					'3': 'rgb(var(--chart-3) / <alpha-value>)',
					'4': 'rgb(var(--chart-4) / <alpha-value>)',
					'5': 'rgb(var(--chart-5) / <alpha-value>)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
	],
}
