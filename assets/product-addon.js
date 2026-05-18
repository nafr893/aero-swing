if (!customElements.get('product-addon')) {
  customElements.define('product-addon', class ProductAddon extends HTMLElement {
    connectedCallback() {
      this.variants = JSON.parse(this.querySelector('[data-variants-json]').textContent)
      this.cartKey   = null
      this.qty       = 0

      const first = this.variants.find(v => v.available) || this.variants[0]
      this.selectedVariantId = first?.id

      this.priceEl      = this.querySelector('[data-addon-price]')
      this.addedPriceEl = this.querySelector('[data-added-price]')
      this.qtyDisplay   = this.querySelector('[data-qty-display]')
      this.addedRow     = this.querySelector('.product-addon__added-row')

      this.querySelectorAll('[data-swatch]').forEach(s => {
        s.addEventListener('click', () => this._selectSwatch(s))
        this._applySwatchColor(s)
      })
      this.querySelector('[data-add-btn]').addEventListener('click', () => this._add())
      this.querySelector('[data-qty-minus]').addEventListener('click', () => this._changeQty(-1))
      this.querySelector('[data-qty-plus]').addEventListener('click', () => this._changeQty(1))
      this.querySelector('[data-remove-btn]').addEventListener('click', () => this._remove())

      this._renderPrice(this._currentVariant()?.price, this.priceEl)
    }

    _selectSwatch(el) {
      this.selectedVariantId = Number(el.dataset.variantId)
      this.querySelectorAll('[data-swatch]').forEach(s =>
        s.classList.toggle('is-selected', s === el)
      )
      this._renderPrice(this._currentVariant()?.price, this.priceEl)
      this._updateImage()
      if (this.cartKey) this._swapVariant()
    }

    _updateImage() {
      const imgEl = this.querySelector('.product-addon__image-wrap img')
      if (!imgEl) return
      const v = this._currentVariant()
      const src = v?.featured_image?.src
      if (src) imgEl.src = src
    }

    async _add() {
      if (!this.selectedVariantId) return
      const btn = this.querySelector('[data-add-btn]')
      btn.disabled = true
      try {
        const cartDrawer = document.querySelector('cart-drawer')
        const sections = cartDrawer
          ? cartDrawer.getSectionsToRender().map(s => s.id)
          : []
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: this.selectedVariantId,
            quantity: 1,
            sections,
            sections_url: window.location.pathname
          })
        })
        const item = await res.json()
        if (!res.ok) throw new Error(item.description)
        this.cartKey = item.key
        this.qty     = 1
        this._setAdded()
        this._syncCart(item)
      } catch (e) {
        console.error('[product-addon] add failed:', e)
      }
      btn.disabled = false
    }

    async _changeQty(delta) {
      const newQty = this.qty + delta
      if (newQty < 1) return
      await this._cartChange(this.cartKey, newQty)
      this.qty = newQty
      this._updateAddedRow()
      const cart = await fetch('/cart.js').then(r => r.json())
      window.FoxThemeEvents?.emit('ON_CART_UPDATED', cart)
    }

    async _remove() {
      const btn = this.querySelector('[data-remove-btn]')
      if (btn) btn.disabled = true
      try {
        await this._cartChange(this.cartKey, 0)
        this.cartKey = null
        this.qty     = 0
        this.classList.remove('is-added')
        this.addedRow.setAttribute('aria-hidden', 'true')
        const cart = await fetch('/cart.js').then(r => r.json())
        window.FoxThemeEvents?.emit('ON_CART_UPDATED', cart)
      } catch (e) {
        console.error('[product-addon] remove failed:', e)
      }
      if (btn) btn.disabled = false
    }

    async _swapVariant() {
      await this._cartChange(this.cartKey, 0)
      const res  = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: this.selectedVariantId, quantity: this.qty })
      })
      const item = await res.json()
      if (res.ok) {
        this.cartKey = item.key
        this._updateAddedRow()
        window.FoxThemeEvents?.emit('ON_CART_UPDATED')
      }
    }

    async _syncCart(addResponse) {
      const cartEl = window.FoxTheme?.Cart
      if (cartEl && addResponse?.sections) {
        cartEl.classList.remove('is-empty')
        cartEl.getSectionsToRender().forEach(section => {
          const el = section.selector
            ? document.querySelector(section.selector)
            : document.getElementById(section.id)
          const html = addResponse.sections[section.id]
          if (el && html) el.innerHTML = cartEl.getSectionInnerHTML(html, section.selector)
        })
      }
      const cart = await fetch('/cart.js').then(r => r.json())
      window.FoxThemeEvents?.emit('ON_CART_UPDATED', cart)
    }

    _cartChange(key, quantity) {
      return fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity })
      })
    }

    _setAdded() {
      this.classList.add('is-added')
      this.addedRow.removeAttribute('aria-hidden')
      this._updateAddedRow()
    }

    _updateAddedRow() {
      const v = this._currentVariant()
      if (v) this._renderPrice(v.price * this.qty, this.addedPriceEl)
      if (this.qtyDisplay) this.qtyDisplay.textContent = this.qty
    }

    _renderPrice(cents, el) {
      if (!el || cents == null) return
      const fmt = window.FoxThemeSettings?.money_format
      el.textContent = fmt ? formatMoney(cents, fmt) : '$' + (cents / 100).toFixed(2)
    }

    _applySwatchColor(el) {
      const colorMap = this._colorMap()
      const value = (el.dataset.colorValue || '').toLowerCase()
      const words = value.split(/[\s\-]+/).filter(Boolean)
      const color = colorMap[value] || words.reduce((found, w) => found || colorMap[w], '') || value
      el.style.backgroundColor = color
    }

    _colorMap() {
      if (this._cachedColorMap) return this._cachedColorMap
      const str = window.FoxThemeSettings?.custom_colors || ''
      const map = {}
      str.split(',').forEach(entry => {
        const idx = entry.indexOf(':')
        if (idx < 0) return
        const key = entry.slice(0, idx).replace(/[\r\n]/g, '').trim().toLowerCase()
        const val = entry.slice(idx + 1).replace(/[\r\n]/g, '').trim()
        if (key && val) map[key] = val
      })
      this._cachedColorMap = map
      return map
    }

    _currentVariant() {
      return this.variants.find(v => v.id === this.selectedVariantId)
    }
  })
}
