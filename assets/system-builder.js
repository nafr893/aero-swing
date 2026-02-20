/**
 * System Builder Web Component
 * A multi-step bat system configurator.
 *
 * Flow:
 *   Sport → Shaft Type → Shaft Size → Shaft product card
 *   After shaft size selected: Balls panel + Pineapples panel appear
 *
 * Product selection is toggle-based. Any selected products go into
 * the summary sidebar and are added to cart together.
 */
class SystemBuilder extends HTMLElement {
  constructor() {
    super();

    // Chip selection state
    this.state = {
      sport: null,
      shaftType: null,
      shaftSize: null
    };

    // Selected products keyed by slot: 'shaft', 'ball-0', 'ball-1', 'pineapple-0', etc.
    // Each value: { id, title, price, image, slotKey }
    this.selectedProducts = {};

    // Metaobject data loaded from embedded JSON
    this.data = {
      sports: [],
      shaftTypes: [],
      shaftSizes: []
    };
  }


  connectedCallback() {
    this.loadData();
    this.bindEvents();
    this.updateSummary();
  }


  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  loadData() {
    try {
      const sportsEl     = this.querySelector('[data-sports]');
      const shaftTypesEl = this.querySelector('[data-shaft-types]');
      const shaftSizesEl = this.querySelector('[data-shaft-sizes]');

      this.data.sports     = sportsEl     ? JSON.parse(sportsEl.textContent)     : [];
      this.data.shaftTypes = shaftTypesEl ? JSON.parse(shaftTypesEl.textContent) : [];
      this.data.shaftSizes = shaftSizesEl ? JSON.parse(shaftSizesEl.textContent) : [];
    } catch (e) {
      console.error('System Builder: Error parsing data', e);
    }
  }


  // ---------------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------------

  bindEvents() {
    this.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-chip]');
      if (chip) return this.handleChipClick(chip);

      const removeBtn = e.target.closest('[data-summary-remove]');
      if (removeBtn) return this.handleRemoveFromSummary(removeBtn);

      const productCard = e.target.closest('[data-product-card]');
      if (productCard) return this.handleProductCardClick(productCard);

      const addToCartBtn = e.target.closest('[data-add-to-cart]');
      if (addToCartBtn) return this.handleAddToCart(addToCartBtn);
    });

    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const productCard = e.target.closest('[data-product-card]');
        if (productCard) {
          e.preventDefault();
          this.handleProductCardClick(productCard);
        }
      }
    });
  }


  // ---------------------------------------------------------------------------
  // Chip selection
  // ---------------------------------------------------------------------------

  handleChipClick(chip) {
    const field = chip.dataset.field;
    const value = chip.dataset.value;

    // Update active chip visuals within this chips container
    const container = chip.closest('[data-chips]');
    if (container) {
      container.querySelectorAll('[data-chip]').forEach(c => {
        c.classList.remove('system-builder__chip--selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('system-builder__chip--selected');
      chip.setAttribute('aria-pressed', 'true');
    }

    switch (field) {
      case 'sport':
        this.state.sport     = value;
        this.state.shaftType = null;
        this.state.shaftSize = null;
        // Clear anything downstream
        delete this.selectedProducts.shaft;
        this.renderShaftTypes();
        this.hideStep('shaft-size');
        this.clearShaftSizeChips();
        this.hideShaftProduct();
        this.hideAccessoryPanels();
        break;

      case 'shaft-type':
        this.state.shaftType = value;
        this.state.shaftSize = null;
        delete this.selectedProducts.shaft;
        this.renderShaftSizes();
        this.hideShaftProduct();
        this.hideAccessoryPanels();
        break;

      case 'shaft-size':
        this.state.shaftSize = value;
        this.renderShaftProduct();
        // Accessories appear as soon as a shaft size is chosen
        this.showAccessoryPanels();
        break;
    }

    this.updateSummary();
  }


  // ---------------------------------------------------------------------------
  // Step rendering helpers
  // ---------------------------------------------------------------------------

  renderShaftTypes() {
    const step      = this.querySelector('[data-step="shaft-type"]');
    const container = this.querySelector('[data-chips="shaft-type"]');
    if (!container) return;

    const filtered = this.data.shaftTypes.filter(st => st.sportHandle === this.state.sport);
    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = '<p class="system-builder__empty-message">No shaft types available for this sport.</p>';
    } else {
      filtered.forEach(st => container.appendChild(this.createChip(st.handle, st.name, 'shaft-type')));
    }

    if (step) step.hidden = false;
  }


  renderShaftSizes() {
    const step      = this.querySelector('[data-step="shaft-size"]');
    const container = this.querySelector('[data-chips="shaft-size"]');
    if (!container) return;

    const filtered = this.data.shaftSizes.filter(ss => ss.shaftTypeHandle === this.state.shaftType);
    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = '<p class="system-builder__empty-message">No shaft sizes available for this type.</p>';
    } else {
      filtered.forEach(ss => container.appendChild(this.createChip(ss.handle, ss.name, 'shaft-size')));
    }

    if (step) step.hidden = false;
  }


  renderShaftProduct() {
    const sizeData = this.data.shaftSizes.find(ss => ss.handle === this.state.shaftSize);
    const display  = this.querySelector('[data-product="shaft"]');
    if (!display) return;

    if (!sizeData || !sizeData.shaft) {
      this.hideShaftProduct();
      return;
    }

    const v           = sizeData.shaft;
    const imageUrl    = v.image ? this.getImageUrl(v.image, 200) : '';
    const price       = this.formatMoney(v.price);
    const displayTitle = v.productTitle
      ? (v.title && v.title !== 'Default Title' ? `${v.productTitle} - ${v.title}` : v.productTitle)
      : v.title || 'Product';
    const isSelected = !!this.selectedProducts.shaft;

    display.innerHTML = `
      <div class="system-builder__product-card${isSelected ? ' system-builder__product-card--selected' : ''}"
           data-product-card
           data-product-type="shaft"
           data-price="${v.price}"
           role="button"
           tabindex="0"
           aria-pressed="${isSelected}"
           aria-label="${isSelected ? 'Remove from' : 'Add to'} your system: ${this.escAttr(displayTitle)}">
        <div class="system-builder__product-select-indicator">
          <span class="system-builder__checkmark"></span>
        </div>
        <div class="system-builder__product-image">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="${this.escAttr(displayTitle)}" class="system-builder__product-img" loading="lazy">`
            : '<div class="system-builder__product-placeholder-image"></div>'
          }
        </div>
        <div class="system-builder__product-info">
          <h4 class="system-builder__product-title">${this.escHtml(displayTitle)}</h4>
          <p class="system-builder__product-price">${price}</p>
        </div>
        <input type="hidden" name="variant_id" value="${v.id}" data-variant-id>
      </div>
    `;

    display.hidden = false;
  }


  // ---------------------------------------------------------------------------
  // Visibility helpers
  // ---------------------------------------------------------------------------

  hideStep(stepName) {
    const step = this.querySelector(`[data-step="${stepName}"]`);
    if (step) step.hidden = true;
  }


  clearShaftSizeChips() {
    const container = this.querySelector('[data-chips="shaft-size"]');
    if (container) container.innerHTML = '';
  }


  hideShaftProduct() {
    const display = this.querySelector('[data-product="shaft"]');
    if (display) {
      display.innerHTML = '';
      display.hidden = true;
    }
    delete this.selectedProducts.shaft;
  }


  showAccessoryPanels() {
    const balls      = this.querySelector('[data-step="balls"]');
    const pineapples = this.querySelector('[data-step="pineapples"]');
    if (balls)      balls.hidden      = false;
    if (pineapples) pineapples.hidden = false;
  }


  hideAccessoryPanels() {
    const balls      = this.querySelector('[data-step="balls"]');
    const pineapples = this.querySelector('[data-step="pineapples"]');
    if (balls)      balls.hidden      = true;
    if (pineapples) pineapples.hidden = true;

    // Deselect all ball/pineapple products
    Object.keys(this.selectedProducts).forEach(key => {
      if (key.startsWith('ball-') || key.startsWith('pineapple-')) {
        delete this.selectedProducts[key];
      }
    });

    // Reset visual state of those cards
    this.querySelectorAll('[data-product-card][data-product-type="ball"], [data-product-card][data-product-type="pineapple"]')
      .forEach(card => {
        card.classList.remove('system-builder__product-card--selected');
        card.setAttribute('aria-pressed', 'false');
      });
  }


  // ---------------------------------------------------------------------------
  // Product card toggle
  // ---------------------------------------------------------------------------

  handleProductCardClick(card) {
    const productType = card.dataset.productType;
    const index       = card.dataset.productIndex;

    // Build the unique slot key
    const slotKey = productType === 'shaft' ? 'shaft' : `${productType}-${index}`;

    const variantId = card.querySelector('[data-variant-id]')?.value;
    if (!variantId) return;

    const price     = parseInt(card.dataset.price || '0', 10);
    const titleEl   = card.querySelector('.system-builder__product-title');
    const imgEl     = card.querySelector('.system-builder__product-img');

    if (this.selectedProducts[slotKey]) {
      // Deselect
      delete this.selectedProducts[slotKey];
      card.classList.remove('system-builder__product-card--selected');
      card.setAttribute('aria-pressed', 'false');
    } else {
      // Select
      this.selectedProducts[slotKey] = {
        id:       parseInt(variantId, 10),
        title:    titleEl?.textContent?.trim() || '',
        price,
        image:    imgEl?.src || '',
        slotKey
      };
      card.classList.add('system-builder__product-card--selected');
      card.setAttribute('aria-pressed', 'true');
    }

    this.updateSummary();
  }


  handleRemoveFromSummary(button) {
    const slotKey = button.dataset.summaryRemove;
    if (!slotKey) return;

    delete this.selectedProducts[slotKey];

    // Deselect the matching card visually
    this.querySelectorAll('[data-product-card]').forEach(card => {
      const type  = card.dataset.productType;
      const idx   = card.dataset.productIndex;
      const key   = type === 'shaft' ? 'shaft' : `${type}-${idx}`;
      if (key === slotKey) {
        card.classList.remove('system-builder__product-card--selected');
        card.setAttribute('aria-pressed', 'false');
      }
    });

    this.updateSummary();
  }


  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  updateSummary() {
    const summary = this.querySelector('[data-summary]');
    if (!summary) return;

    const emptyState     = summary.querySelector('[data-summary-empty]');
    const footer         = summary.querySelector('[data-summary-footer]');
    const itemsContainer = summary.querySelector('[data-summary-items]');

    const entries    = Object.values(this.selectedProducts);
    const hasItems   = entries.length > 0;

    if (emptyState) emptyState.hidden = hasItems;
    if (footer)     footer.hidden     = !hasItems;

    // Rebuild summary item list
    if (itemsContainer) {
      itemsContainer.innerHTML = entries.map(product => {
        const imageHtml = product.image
          ? `<img src="${this.getImageUrl(product.image, 120)}" alt="${this.escAttr(product.title)}" loading="lazy">`
          : '';
        return `
          <div class="system-builder__summary-item">
            <div class="system-builder__summary-item-image">${imageHtml}</div>
            <div class="system-builder__summary-item-details">
              <span class="system-builder__summary-name">${this.escHtml(product.title)}</span>
              <span class="system-builder__summary-price">${this.formatMoney(product.price)}</span>
            </div>
            <button type="button"
                    class="system-builder__summary-remove"
                    data-summary-remove="${product.slotKey}"
                    aria-label="Remove ${this.escAttr(product.title)}">&times;</button>
          </div>
        `;
      }).join('');
    }

    // Total
    const total   = entries.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalEl = summary.querySelector('[data-total-price]');
    if (totalEl) totalEl.textContent = this.formatMoney(total);

    // Button label with item count
    const addToCartBtn = summary.querySelector('[data-add-to-cart]');
    if (addToCartBtn) {
      if (!addToCartBtn.dataset.originalText) {
        addToCartBtn.dataset.originalText = addToCartBtn.textContent.trim();
      }
      if (entries.length > 0) {
        addToCartBtn.textContent = `Add to Cart (${entries.length} item${entries.length !== 1 ? 's' : ''})`;
      } else {
        addToCartBtn.textContent = addToCartBtn.dataset.originalText;
      }
    }
  }


  // ---------------------------------------------------------------------------
  // Add to cart
  // ---------------------------------------------------------------------------

  async handleAddToCart(button) {
    const items = Object.values(this.selectedProducts)
      .filter(p => p.id)
      .map(p => ({ id: p.id, quantity: 1 }));

    if (items.length === 0) {
      const original = button.dataset.originalText || button.textContent.trim();
      button.textContent = 'Select products first';
      setTimeout(() => { button.textContent = original; }, 2000);
      return;
    }

    button.disabled = true;
    const originalText = button.dataset.originalText || button.textContent.trim();
    button.textContent = 'Adding...';

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) throw new Error('Failed to add to cart');
      await response.json();

      const cartResponse = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
      const cart = await cartResponse.json();

      this.updateCartCount(cart.item_count);

      document.documentElement.dispatchEvent(new CustomEvent('cart:change', {
        bubbles: true,
        detail: { cart }
      }));
      document.dispatchEvent(new CustomEvent('cart:refresh', {
        bubbles: true,
        detail: { cart }
      }));

      button.textContent = 'Added!';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('System Builder: Error adding to cart', error);
      button.textContent = 'Error – Try Again';
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
    }
  }


  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  createChip(value, label, field) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'system-builder__chip';
    button.dataset.chip  = '';
    button.dataset.field = field;
    button.dataset.value = value;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="system-builder__chip-label">${this.escHtml(label)}</span>`;
    return button;
  }


  formatMoney(cents) {
    if (typeof cents !== 'number') return '';
    if (window.Shopify?.formatMoney) return window.Shopify.formatMoney(cents);
    return `$${(cents / 100).toFixed(2)}`;
  }


  getImageUrl(image, size) {
    if (!image) return '';
    const src = typeof image === 'string' ? image : (image.src || '');
    if (!src) return '';
    // Insert _SIZEx before the extension, preserving any query string
    return src.replace(/(\.[a-z]+)(\?|$)/i, `_${size}x$1$2`);
  }


  escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }


  updateCartCount(count) {
    const selectors = [
      '.cart-count',
      '.cart-count-bubble',
      '[data-cart-count]',
      '.cart__count',
      '.header__cart-count',
      '#cart-icon-bubble',
      '.cart-icon__count',
      '.js-cart-count',
      '[data-cart-item-count]',
      '.site-header__cart-count'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.textContent = count;
        if (count > 0) {
          el.removeAttribute('hidden');
          el.style.display = '';
        }
      });
    });
  }
}


customElements.define('system-builder', SystemBuilder);
