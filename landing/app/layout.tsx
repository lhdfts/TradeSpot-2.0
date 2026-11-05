import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk, Manrope, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Schibsted_Grotesk({ subsets: ['latin'], weight: ['500', '700', '800', '900'], variable: '--font-schibsted', display: 'swap' });
const body = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-manrope', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex', display: 'swap' });

export const metadata: Metadata = {
  // Rota de teste: fora dos buscadores até a LP ser oficial.
  robots: { index: false, follow: false },
  title: 'Spot · Agenda comercial que se distribui sozinha',
  description:
    'Escala, distribuição automática, no show e reagendamento numa agenda só. Seu lead escolhe o horário, o Spot escolhe quem atende.',
  openGraph: {
    title: 'Spot · Cada horário no lugar certo',
    description: 'Agenda comercial com distribuição automática para times de vendas.',
    locale: 'pt_BR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
