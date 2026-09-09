/* ==========================================================================
   MOSAL STICKERS - MAIN APPLICATION ENTRY POINT
   ========================================================================== */

import { store } from './state.js';
import { initCustomizer } from './customizer.js';
import { initMockupSwitcher } from './mockups.js';
import { initCart } from './cart.js';

// Materials Lab Specifications Data
const MATERIALS_DATA = {
  holographic: {
    title: 'Holográfico Prismático',
    desc: 'Un material iridiscente y cromático que refleja los colores del arcoíris al incidir la luz solar o artificial. Ideal para logos, ilustraciones psicodélicas y marcas que buscan el máximo impacto visual.',
    durability: '2 - 4 años al exterior',
    finish: 'Laminado UV ultra brillante',
    resistance: 'Impermeable 100% y lavavajillas',
    thickness: '180 micras de vinilo premium',
    sampleImg: '/samples/vaporwave-skull.png',
    badge: 'El Más Popular',
  },
  classic: {
    title: 'Vinilo Blanco Clásico',
    desc: 'La base estándar de mayor calidad de la industria. Base blanca opaca con una fidelidad de color inigualable, colores saturados y negros profundos.',
    durability: '3 - 5 años al exterior',
    finish: 'Lustroso o Mate sedoso',
    resistance: 'Totalmente resistente al agua y rayos UV',
    thickness: '150 micras de vinilo de alta densidad',
    sampleImg: '/samples/cyberpunk-cat.png',
    badge: 'Bestseller',
  },
  transparent: {
    title: 'Transparente Cristalino',
    desc: 'Vinilo ultra transparente sin opacidad de fondo. Diseñado con impresión de tinta blanca selectiva para que tus diseños destaquen sobre ventanas, frascos y botellas.',
    durability: '2 - 3 años al exterior',
    finish: 'Brillante transparente',
    resistance: 'Apto para lavavajillas y exteriores',
    thickness: '140 micras de film óptico',
    sampleImg: '/samples/kawaii-shiba.png',
    badge: 'Especial Packaging',
  },
  glitter: {
    title: 'Purpurina / Glitter Radiante',
    desc: 'Incrustaciones de micro-purpurina metálica integradas en el vinilo que brillan intensamente bajo cualquier fuente de luz directa.',
    durability: '2 - 4 años al exterior',
    finish: 'Laminado UV protector',
    resistance: '100% resistente al agua y lluvia',
    thickness: '190 micras texturizadas',
    sampleImg: '/samples/vaporwave-skull.png',
    badge: 'Edición Exclusiva',
  },
  metallic: {
    title: 'Metálico Oro / Plata Cepillado',
    desc: 'Aspecto metálico de lujo que simula aluminio pulido u oro pulido. Añade una estética industrial y de alta gama a packaging y marcas de autor.',
    durability: '3 - 5 años al exterior',
    finish: 'Lustroso de alta reflexión',
    resistance: 'Resistente a arañazos y clima extremo',
    thickness: '160 micras metalizadas',
    sampleImg: '/samples/cyberpunk-cat.png',
    badge: 'Look Premium',
  },
  kraft: {
    title: 'Papel Kraft Reciclado',
    desc: 'Hecho con fibras 100% recicladas con textura natural orgánica. La opción preferida por marcas ecológicas y cafeterías de especialidad.',
    durability: '1 - 2 años (recomendado interiores)',
    finish: 'Mate sin revestir agradable al tacto',
    resistance: 'Resistente a salpicaduras ligeras',
    thickness: '120 gr/m² papel kraft con adhesivo fuerte',
    sampleImg: '/samples/kawaii-shiba.png',
    badge: '100% Sostenible',
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Subsystems
  initCustomizer();
  initMockupSwitcher();
  initCart();

  // 2. Currency Selector
  const currencySelector = document.getElementById('currencySelector');
  currencySelector?.addEventListener('change', (e) => {
    store.setCurrency(e.target.value);
  });

  // 3. Mobile Navigation Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');
  mobileMenuBtn?.addEventListener('click', () => {
    navMenu?.classList.toggle('open');
  });

  // 4. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    btn?.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(fi => fi.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // 5. Materials Lab Interactive Tabs
  const materialTabBtns = document.querySelectorAll('.material-tab-btn');
  const labTitle = document.getElementById('labTitle');
  const labDesc = document.getElementById('labDesc');
  const labDurability = document.getElementById('labDurability');
  const labFinish = document.getElementById('labFinish');
  const labResistance = document.getElementById('labResistance');
  const labThickness = document.getElementById('labThickness');
  const labBadge = document.getElementById('labBadge');
  const labPreviewContainer = document.getElementById('labPreviewContainer');
  const labPreviewImg = document.getElementById('labPreviewImg');

  materialTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const matKey = btn.dataset.mat;
      materialTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const data = MATERIALS_DATA[matKey];
      if (!data) return;

      if (labTitle) labTitle.textContent = data.title;
      if (labDesc) labDesc.textContent = data.desc;
      if (labDurability) labDurability.textContent = data.durability;
      if (labFinish) labFinish.textContent = data.finish;
      if (labResistance) labResistance.textContent = data.resistance;
      if (labThickness) labThickness.textContent = data.thickness;
      if (labBadge) labBadge.textContent = data.badge;

      if (labPreviewImg) {
        labPreviewImg.src = data.sampleImg;
      }

      if (labPreviewContainer) {
        labPreviewContainer.className = 'sticker-container';
        labPreviewContainer.classList.add(`material-${matKey}`);
        labPreviewContainer.classList.add('finish-glossy');
      }
    });
  });

  // 6. Smooth Scroll on Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});
