import { StoreProvider } from '@/components/StoreContext';
import { Nav } from '@/components/Nav';
import { SmoothScroll } from '@/components/SmoothScroll';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Story } from '@/components/Story';
import { Showcase } from '@/components/Showcase';
import { Highlights } from '@/components/Highlights';
import { CartDrawer, Store } from '@/components/Store';
import { Faq } from '@/components/Faq';
import { Closing, Footer } from '@/components/Closing';

export default function Page() {
  return (
    <StoreProvider>
      <SmoothScroll />
      <Nav />
      <main id="conteudo">
        <Hero />
        <Marquee />
        <Story />
        <Showcase />
        <Highlights />
        <Store />
        <Faq />
        <Closing />
      </main>
      <Footer />
      <CartDrawer />
    </StoreProvider>
  );
}
