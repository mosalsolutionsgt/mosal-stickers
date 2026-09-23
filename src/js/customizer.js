/* ==========================================================================
   MOSAL STICKERS - INTERACTIVE STUDIO CONTROLLER
   Manages image upload, live material shaders, cutline proofs & volume pricing
   ========================================================================== */

import { store } from './state.js';
import { calculateStickerPricing, formatPrice, QUANTITY_TIERS } from './pricing.js';
import { renderCutlinePaths } from './cutline-generator.js';
import { showToast, getWhatsAppOrderUrl } from './cart.js';
import { processStickerImage } from './bg-remover.js';

const BASE_URL = import.meta.env.BASE_URL || './';
export const resolvePath = (p) => {
  if (!p) return p;
  if (p.startsWith('data:') || p.startsWith('blob:') || p.startsWith('http')) return p;
  if (p.startsWith('./')) return `${BASE_URL}${p.slice(2)}`.replace(/\/\//g, '/');
  if (p.startsWith('/')) return `${BASE_URL}${p.slice(1)}`.replace(/\/\//g, '/');
  return `${BASE_URL}${p}`.replace(/\/\//g, '/');
};

export function initCustomizer() {
  // DOM Elements
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('fileInput');
  const autoRemoveBgBtn = document.getElementById('autoRemoveBgBtn');
  const sampleThumbBtns = document.querySelectorAll('.sample-thumb-btn');
  const shapeRadioCards = document.querySelectorAll('.shape-radio-card');
  const materialCards = document.querySelectorAll('.material-card');
  const finishPills = document.querySelectorAll('.finish-pill');
  const sizePills = document.querySelectorAll('.size-pill');
  const customSizeBox = document.getElementById('customSizeBox');
  const widthSlider = document.getElementById('widthSlider');
  const heightSlider = document.getElementById('heightSlider');
  const widthValDisplay = document.getElementById('widthValDisplay');
  const heightValDisplay = document.getElementById('heightValDisplay');
  const quantityTiersList = document.getElementById('quantityTiersList');
  const vatCheckbox = document.getElementById('vatCheckbox');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const toggleCutlineBtn = document.getElementById('toggleCutlineBtn');
  const cutMarginSlider = document.getElementById('cutMarginSlider');
  const cutMarginValDisplay = document.getElementById('cutMarginValDisplay');
  const cutMarginStepSlider = document.getElementById('cutMarginStepSlider');
  const cutMarginStepValDisplay = document.getElementById('cutMarginStepValDisplay');
  const cutMarginLegendVal = document.getElementById('cutMarginLegendVal');

  // Preview elements
  const stickerContainers = document.querySelectorAll('.sticker-container');
  const stickerImages = document.querySelectorAll('.sticker-image-layer');
  const stickerCutlineSvg = document.getElementById('stickerCutlineSvg');
  const summaryTotalPrice = document.getElementById('summaryTotalPrice');
  const summaryUnitPrice = document.getElementById('summaryUnitPrice');
  const summaryQtyDesc = document.getElementById('summaryQtyDesc');

  // 1. File Upload & Drag-and-Drop
  dropzone?.addEventListener('click', () => fileInput?.click());

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropzone?.addEventListener(evt, () => dropzone.classList.remove('dragover'));
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  async function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido', 'error');
      return;
    }
    showToast('Procesando recorte y optimizando silueta...', 'info');
    try {
      const processedDataUrl = await processStickerImage(file, {
        tolerance: 40,
        addWhiteBorder: false
      });
      store.updateSticker({
        imageSrc: processedDataUrl,
        name: file.name.replace(/\.[^/.]+$/, "") + " Troquelado",
      });
      showToast('¡Diseño troquelado cargado sin fondo!', 'success');
    } catch (err) {
      console.error(err);
      const reader = new FileReader();
      reader.onload = (e) => {
        store.updateSticker({
          imageSrc: e.target.result,
          name: file.name.replace(/\.[^/.]+$/, "") + " Troquelado",
        });
        showToast('¡Diseño cargado!', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  // Auto remove background button
  autoRemoveBgBtn?.addEventListener('click', async () => {
    const currentSrc = store.getState().sticker.imageSrc;
    showToast('Quitando fondo con IA...', 'info');
    try {
      const transparentDataUrl = await processStickerImage(currentSrc, {
        tolerance: 45,
        addWhiteBorder: false
      });
      store.updateSticker({ imageSrc: transparentDataUrl });
      showToast('¡Fondo eliminado con éxito!', 'success');
    } catch (err) {
      showToast('No se pudo procesar el fondo de la imagen actual', 'error');
    }
  });

  // 2. Sample Art Selection
  sampleThumbBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const src = resolvePath(btn.dataset.src);
      const name = btn.dataset.name;
      store.updateSticker({ imageSrc: src, name });
    });
  });

  // 3. Shape Selection
  shapeRadioCards.forEach(card => {
    card.addEventListener('click', () => {
      const shape = card.dataset.shape;
      store.updateSticker({ shape });
    });
  });

  // 4. Material Selection
  materialCards.forEach(card => {
    card.addEventListener('click', () => {
      const material = card.dataset.material;
      store.updateSticker({ material });
    });
  });

  // 5. Finish Selection
  finishPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const finish = pill.dataset.finish;
      store.updateSticker({ finish });
    });
  });

  // 6. Size Selection
  sizePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const isCustom = pill.dataset.custom === 'true';
      if (isCustom) {
        store.updateSticker({ isCustomSize: true });
      } else {
        const w = parseFloat(pill.dataset.w);
        const h = parseFloat(pill.dataset.h);
        store.updateSticker({
          widthCm: w,
          heightCm: h,
          isCustomSize: false,
        });
      }
    });
  });

  // Custom Size Sliders
  widthSlider?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (widthValDisplay) widthValDisplay.textContent = val + ' cm';
    store.updateSticker({ widthCm: val });
  });

  heightSlider?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (heightValDisplay) heightValDisplay.textContent = val + ' cm';
    store.updateSticker({ heightCm: val });
  });

  // VAT Toggle
  vatCheckbox?.addEventListener('change', (e) => {
    store.toggleVat(e.target.checked);
  });

  // Cutline Proof Toggle
  toggleCutlineBtn?.addEventListener('click', () => {
    const state = store.getState();
    const nextVal = !state.sticker.showCutline;
    store.updateSticker({ showCutline: nextVal });
    toggleCutlineBtn.classList.toggle('active', nextVal);
    document.getElementById('stageCanvas')?.classList.toggle('show-cutline', nextVal);
  });

  // Cut Margin Thickness Sliders (Toolbar & Step 2 Synchronized)
  function handleCutMarginChange(val) {
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return;
    const formatted = numVal.toFixed(1) + ' mm';
    if (cutMarginValDisplay) cutMarginValDisplay.textContent = formatted;
    if (cutMarginStepValDisplay) cutMarginStepValDisplay.textContent = formatted;
    if (cutMarginLegendVal) cutMarginLegendVal.textContent = formatted;
    if (cutMarginSlider && parseFloat(cutMarginSlider.value) !== numVal) {
      cutMarginSlider.value = numVal;
    }
    if (cutMarginStepSlider && parseFloat(cutMarginStepSlider.value) !== numVal) {
      cutMarginStepSlider.value = numVal;
    }
    store.updateSticker({ cutMarginMm: numVal });
  }

  cutMarginSlider?.addEventListener('input', (e) => handleCutMarginChange(e.target.value));
  cutMarginStepSlider?.addEventListener('input', (e) => handleCutMarginChange(e.target.value));

  // 7. Interactive 3D Tilt & Holographic Lighting (Mouse Move)
  stickerContainers.forEach(container => {
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      // 3D Tilt angles
      const rotateX = ((y / rect.height) - 0.5) * -22;
      const rotateY = ((x / rect.width) - 0.5) * 22;

      // Conic / linear gradient angle
      const angleDeg = Math.round(Math.atan2(y - rect.height / 2, x - rect.width / 2) * (180 / Math.PI) + 180);

      container.style.setProperty('--mouse-x', `${xPercent}%`);
      container.style.setProperty('--mouse-y', `${yPercent}%`);
      container.style.setProperty('--glare-x', `${xPercent}%`);
      container.style.setProperty('--glare-y', `${yPercent}%`);
      container.style.setProperty('--angle', `${angleDeg}deg`);

      const card3d = container.querySelector('.sticker-card-3d');
      if (card3d) {
        card3d.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    });

    container.addEventListener('mouseleave', () => {
      const card3d = container.querySelector('.sticker-card-3d');
      if (card3d) {
        card3d.style.transform = `rotateX(0deg) rotateY(0deg)`;
      }
    });
  });

  // 8. Add to Cart Handler
  addToCartBtn?.addEventListener('click', () => {
    const state = store.getState();
    const pricing = calculateStickerPricing(state.sticker);
    const item = {
      name: state.sticker.name,
      imageSrc: state.sticker.imageSrc,
      shape: state.sticker.shape,
      material: state.sticker.material,
      finish: state.sticker.finish,
      sizeText: `${state.sticker.widthCm} x ${state.sticker.heightCm} cm`,
      quantity: state.sticker.quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.totalPrice,
    };
    store.addToCart(item);
    showToast('¡Stickers añadidos al carrito!', 'success');
  });

  // Direct WhatsApp Quote Handler
  const customizerWhatsAppBtn = document.getElementById('customizerWhatsAppBtn');
  customizerWhatsAppBtn?.addEventListener('click', () => {
    const state = store.getState();
    const pricing = calculateStickerPricing(state.sticker);
    const item = {
      name: state.sticker.name,
      imageSrc: state.sticker.imageSrc,
      shape: state.sticker.shape,
      material: state.sticker.material,
      finish: state.sticker.finish,
      sizeText: `${state.sticker.widthCm} x ${state.sticker.heightCm} cm`,
      quantity: state.sticker.quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.totalPrice,
    };
    const waUrl = getWhatsAppOrderUrl([item], pricing.totalPrice, state.currency);
    window.open(waUrl, '_blank');
    showToast('¡Abriendo WhatsApp para cotizar este diseño con Mosal Solutions!', 'success');
  });

  // 9. Subscribe to Store Updates to Sync UI
  store.subscribe(state => {
    const s = state.sticker;

    // Update images
    stickerImages.forEach(img => {
      if (img.src !== s.imageSrc) {
        img.src = s.imageSrc;
      }
    });

    // Update sample active states
    sampleThumbBtns.forEach(btn => {
      btn.classList.toggle('active', resolvePath(btn.dataset.src) === s.imageSrc);
    });

    // Update shape active states
    shapeRadioCards.forEach(card => {
      card.classList.toggle('active', card.dataset.shape === s.shape);
    });

    // Update material active states
    materialCards.forEach(card => {
      card.classList.toggle('active', card.dataset.material === s.material);
    });

    // Update finish active states
    finishPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.finish === s.finish);
    });

    // Update size pills
    sizePills.forEach(pill => {
      if (s.isCustomSize) {
        pill.classList.toggle('active', pill.dataset.custom === 'true');
      } else {
        const matchW = parseFloat(pill.dataset.w) === s.widthCm;
        const matchH = parseFloat(pill.dataset.h) === s.heightCm;
        pill.classList.toggle('active', matchW && matchH && pill.dataset.custom !== 'true');
      }
    });

    if (customSizeBox) {
      customSizeBox.style.display = s.isCustomSize ? 'grid' : 'none';
    }

    // Update container classes for shaders & materials
    const maskVal = `url("${s.imageSrc}")`;
    stickerContainers.forEach(container => {
      // Remove all material-* classes
      container.className = 'sticker-container';
      container.classList.add(`material-${s.material}`);
      container.classList.add(`finish-${s.finish}`);
      container.classList.add(`shape-${s.shape}`);
      if (s.shape === 'die-cut') container.classList.add('has-diecut');
      container.style.setProperty('--sticker-mask-url', maskVal);
    });

    // Sync cut margin sliders and displays
    const cutMargin = s.cutMarginMm || 2.0;
    if (cutMarginSlider && parseFloat(cutMarginSlider.value) !== cutMargin) {
      cutMarginSlider.value = cutMargin;
    }
    if (cutMarginStepSlider && parseFloat(cutMarginStepSlider.value) !== cutMargin) {
      cutMarginStepSlider.value = cutMargin;
    }
    const cutMarginStr = cutMargin.toFixed(1) + ' mm';
    if (cutMarginValDisplay) cutMarginValDisplay.textContent = cutMarginStr;
    if (cutMarginStepValDisplay) cutMarginStepValDisplay.textContent = cutMarginStr;
    if (cutMarginLegendVal) cutMarginLegendVal.textContent = cutMarginStr;

    // Physical Real-Scale Calibrations:
    // Base sticker element size: 290 px
    // Studio View: balanced visual display for inspecting detail (base 5x5 cm)
    const baseCm = 5.0;
    const studioScaleX = Math.min(1.45, Math.max(0.65, s.widthCm / baseCm));
    const studioScaleY = Math.min(1.45, Math.max(0.65, s.heightCm / baseCm));

    // MacBook 14" Lid Mockup:
    // Real MacBook lid: 31.2 cm wide. Mockup image lid: 605 px wide out of 1200 px.
    // At container nominal height 480px, lid width is 324.1 px -> 1 cm = 10.388 px.
    // Ratio to 290px card: scale = (cm * 10.388) / 290
    const laptopScaleX = (s.widthCm * 10.388) / 290;
    const laptopScaleY = (s.heightCm * 10.388) / 290;

    // Yeti Tumbler 26/36 oz Mockup:
    // Real bottle cylinder diameter: 9.0 cm. Mockup image bottle: 224 px wide out of 1200 px.
    // At container nominal height 480px, bottle width is 120.0 px -> 1 cm = 13.333 px.
    // Ratio to 290px card: scale = (cm * 13.333) / 290
    const yetiScaleX = (s.widthCm * 13.333) / 290;
    const yetiScaleY = (s.heightCm * 13.333) / 290;

    // iPhone 15 Pro Mockup:
    // Real iPhone 15 Pro width: 7.06 cm. Mockup image phone: 385 px wide out of 1200 px.
    // At container nominal height 480px, phone width is 206.2 px -> 1 cm = 29.214 px.
    // Ratio to 290px card: scale = (cm * 29.214) / 290
    const iphoneScaleX = (s.widthCm * 29.214) / 290;
    const iphoneScaleY = (s.heightCm * 29.214) / 290;

    const stageCanvas = document.getElementById('stageCanvas');
    if (stageCanvas) {
      stageCanvas.style.setProperty('--size-scale-x', studioScaleX.toFixed(4));
      stageCanvas.style.setProperty('--size-scale-y', studioScaleY.toFixed(4));
      stageCanvas.style.setProperty('--size-scale', Math.max(studioScaleX, studioScaleY).toFixed(4));
      stageCanvas.style.setProperty('--laptop-scale-x', laptopScaleX.toFixed(4));
      stageCanvas.style.setProperty('--laptop-scale-y', laptopScaleY.toFixed(4));
      stageCanvas.style.setProperty('--yeti-scale-x', yetiScaleX.toFixed(4));
      stageCanvas.style.setProperty('--yeti-scale-y', yetiScaleY.toFixed(4));
      stageCanvas.style.setProperty('--iphone-scale-x', iphoneScaleX.toFixed(4));
      stageCanvas.style.setProperty('--iphone-scale-y', iphoneScaleY.toFixed(4));
    }

    // Dynamic Context Dimension Badge (Real dimensions + surface identification)
    const stageDimensionText = document.getElementById('stageDimensionText');
    if (stageDimensionText) {
      const surfaceLabels = {
        studio: 'Vista de estudio',
        laptop: 'MacBook 14″ (Escala real 1:1)',
        yeti: 'Termo Yeti 26 oz (Escala real 1:1)',
        iphone: 'iPhone 15 Pro (Escala real 1:1)'
      };
      const surfaceText = surfaceLabels[s.surface] || 'Escala real 1:1';
      stageDimensionText.textContent = `${s.widthCm} × ${s.heightCm} cm • ${surfaceText}`;
    }

    // Render Precision Centered Cutline SVG with current cutMarginMm
    if (stickerCutlineSvg) {
      renderCutlinePaths(stickerCutlineSvg, s.shape, s.imageSrc, cutMargin);
    }
    toggleCutlineBtn?.classList.toggle('active', s.showCutline);
    stageCanvas?.classList.toggle('show-cutline', s.showCutline);

    // Render Bulk Quantity Tiers Table
    renderQuantityTiers(s, quantityTiersList);

    // Update Sticky Pricing Summary
    const pricing = calculateStickerPricing(s);
    if (summaryTotalPrice) {
      summaryTotalPrice.textContent = formatPrice(pricing.totalPrice);
    }
    if (summaryUnitPrice) {
      summaryUnitPrice.textContent = `${formatPrice(pricing.unitPrice)} / ud`;
    }
    if (summaryQtyDesc) {
      const finishLabel = s.finish === 'glossy' ? 'Brillante' : 'Mate';
      const materialLabels = {
        holographic: 'Holográfico',
        classic: 'Vinilo Blanco',
        transparent: 'Transparente',
        glitter: 'Glitter',
        metallic: 'Metálico'
      };
      const matLabel = materialLabels[s.material] || s.material;
      summaryQtyDesc.textContent = `${s.quantity} uds • ${s.widthCm}×${s.heightCm} cm • ${matLabel} • ${finishLabel}`;
    }
  });

  // Initial trigger to render
  store.notify();
}

function renderQuantityTiers(sticker, container) {
  if (!container) return;

  container.innerHTML = QUANTITY_TIERS.map(tier => {
    const tierPricing = calculateStickerPricing(sticker, tier.qty);
    const isSelected = sticker.quantity === tier.qty;

    return `
      <div class="quantity-tier-row ${isSelected ? 'active' : ''}" data-qty="${tier.qty}">
        <div class="tier-qty">
          ${tier.qty} uds
          ${tier.discountPercent > 0 ? `<span class="tier-discount-badge">-${tier.discountPercent}%</span>` : ''}
        </div>
        <div class="tier-unit-price">${formatPrice(tierPricing.unitPrice)}/ud</div>
        <div class="tier-total-price">${formatPrice(tierPricing.totalPrice)}</div>
        <div style="text-align: right;">
          <input type="radio" name="quantity_tier" ${isSelected ? 'checked' : ''} style="accent-color: var(--color-brand-yellow); cursor: pointer;" />
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener to each row
  container.querySelectorAll('.quantity-tier-row').forEach(row => {
    row.addEventListener('click', () => {
      const qty = parseInt(row.dataset.qty, 10);
      store.updateSticker({ quantity: qty });
    });
  });
}
