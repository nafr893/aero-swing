if (!customElements.get('product-addon')) {
  customElements.define('product-addon', class ProductAddon extends HTMLElement {
    connectedCallback() {
      this.variants = JSON.parse(this.querySelector('[data-variants-json]').textContent)
      this.cartKey        = null
      this.qty            = 0
      this.overridePrice  = this.dataset.overridePrice ? Number(this.dataset.overridePrice) : null
      this.mainProductId  = this.dataset.mainProductId ? Number(this.dataset.mainProductId) : null

      const first = this.variants.find(v => v.available) || this.variants[0]
      this.selectedVariantId = first?.id

      this.priceEl      = this.querySelector('[data-addon-price]')
      this.addedPriceEl = this.querySelector('[data-added-price]')
      this.qtyDisplay   = this.querySelector('[data-qty-display]')
      this.addedRow     = this.querySelector('.product-addon__added-row')

      this.querySelectorAll('[data-swatch]').forEach(s => {
        s.addEventListener('click', () => this._selectSwatch(s))
        if (!s.classList.contains('product-addon__swatch--text')) this._applySwatchColor(s)
      })

      this.querySelectorAll('[data-addon-select]').forEach(sel => {
        sel.addEventListener('change', () => this._selectFromDropdowns())
      })
      this._updateSelectAvailability()

      const swatchesEl = this.querySelector('.product-addon__swatches')
      const prevBtn = this.querySelector('[data-swatches-prev]')
      const nextBtn = this.querySelector('[data-swatches-next]')
      const swatchesNav = this.querySelector('.product-addon__swatches-nav')
      if (swatchesEl && prevBtn && nextBtn) {
        const checkOverflow = () => {
          const hasOverflow = swatchesEl.scrollWidth > swatchesEl.clientWidth + 1
          if (swatchesNav) swatchesNav.style.display = hasOverflow ? '' : 'none'
        }
        const updateArrows = () => {
          prevBtn.disabled = swatchesEl.scrollLeft <= 0
          nextBtn.disabled = swatchesEl.scrollLeft + swatchesEl.clientWidth >= swatchesEl.scrollWidth - 1
        }
        prevBtn.addEventListener('click', () => { swatchesEl.scrollBy({ left: -100, behavior: 'smooth' }); setTimeout(updateArrows, 300) })
        nextBtn.addEventListener('click', () => { swatchesEl.scrollBy({ left: 100, behavior: 'smooth' }); setTimeout(updateArrows, 300) })
        swatchesEl.addEventListener('scroll', updateArrows)
        updateArrows()
        checkOverflow()
        window.addEventListener('load', checkOverflow, { once: true })
      } else if (swatchesNav) {
        swatchesNav.style.display = 'none'
      }
      this.addBtn = this.querySelector('[data-add-btn]')
      this.addBtn.addEventListener('click', () => this._add())
      this.querySelector('[data-qty-minus]').addEventListener('click', () => this._changeQty(-1))
      this.querySelector('[data-qty-plus]').addEventListener('click', () => this._changeQty(1))
      this.querySelector('[data-remove-btn]').addEventListener('click', () => this._remove())

      this._renderPrice(this.overridePrice ?? this._currentVariant()?.price, this.priceEl)
      this._updateAddBtn()

      if (this.mainProductId) this._watchMainProduct()
      this._maybeAutoAdd()
      this._watchItemAdded()
    }

    _selectSwatch(el) {
      this.selectedVariantId = Number(el.dataset.variantId)
      this.querySelectorAll('[data-swatch]').forEach(s =>
        s.classList.toggle('is-selected', s === el)
      )
      this._renderPrice(this.overridePrice ?? this._currentVariant()?.price, this.priceEl)
      this._updateImage()
      this._updateSelectedColor(el)
      this._updateAddBtn()
      if (this.cartKey) this._swapVariant()
    }

    _updateSelectedColor(el) {
      const label = this.querySelector('[data-selected-color]')
      if (!label) return
      const optionLabel = label.dataset.optionLabel || ''
      const value = el.dataset.colorValue || el.title
      label.innerHTML = `<span class="product-addon__option-label">${optionLabel}:</span> ${value}`
    }

    _updateImage() {
      const imgEl = this.querySelector('.product-addon__image-wrap img')
      if (!imgEl) return
      const v = this._currentVariant()
      const src = v?.featured_image?.src
      if (src) imgEl.src = src
    }

    async _add() {
      if (!this.selectedVariantId || !this._currentVariant()?.available) return
      this.isPreselected = false
      const btn = this.querySelector('[data-add-btn]')
      btn.disabled = true
      try {
        const cartDrawer = document.querySelector('cart-drawer')
        const sections = cartDrawer
          ? cartDrawer.getSectionsToRender()
              .filter(s => {
                const el = s.selector
                  ? document.querySelector(s.selector)
                  : document.getElementById(s.id)
                return !el || !el.contains(this)
              })
              .map(s => s.id)
          : []
        const body = {
          id: this.selectedVariantId,
          quantity: 1,
          sections,
          sections_url: window.location.pathname
        }
        if (this.mainProductId) body.properties = { _bundle_main: this.mainProductId }
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
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
      const body = { id: this.selectedVariantId, quantity: this.qty }
      if (this.mainProductId) body.properties = { _bundle_main: this.mainProductId }
      const res  = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const item = await res.json()
      if (res.ok) {
        this.cartKey = item.key
        this._updateAddedRow()
        window.FoxThemeEvents?.emit('ON_CART_UPDATED')
      }
    }

    _maybeAutoAdd() {
      const param = new URLSearchParams(window.location.search).get('with')
      if (!param) return
      const ids = param.split(',').map(s => s.trim())
      const productId = String(this.dataset.productId)
      if (!ids.includes(productId)) return
      this.isPreselected = true
    }

    _watchItemAdded() {
      const handler = () => {
        if (this.isPreselected && !this.cartKey) this._add()
      }
      if (window.FoxThemeEvents) {
        window.FoxThemeEvents.subscribe('ON_ITEM_ADDED', handler)
      } else {
        window.addEventListener('load', () => {
          window.FoxThemeEvents?.subscribe?.('ON_ITEM_ADDED', handler)
        }, { once: true })
      }
    }

    _watchMainProduct() {
      let mainWasInCart = false
      window.FoxThemeEvents?.subscribe?.('ON_CART_UPDATED', (cart) => {
        if (!cart?.items) return
        const mainInCart = cart.items.some(item => item.product_id === this.mainProductId)
        if (mainInCart) {
          mainWasInCart = true
        } else if (mainWasInCart && this.cartKey) {
          mainWasInCart = false
          this.cartKey = null
          this.qty     = 0
          this.classList.remove('is-added')
          this.addedRow?.setAttribute('aria-hidden', 'true')
        }
      })
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
      const price = this.overridePrice ?? this._currentVariant()?.price
      if (price != null) this._renderPrice(price * this.qty, this.addedPriceEl)
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
      const baseValue = value.split('/')[0].trim()
      const words = baseValue.split(/[\s\-]+/).filter(Boolean)
      const color = colorMap[baseValue] || words.reduce((found, w) => found || colorMap[w], '') || baseValue
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

    _selectFromDropdowns() {
      const selects = Array.from(this.querySelectorAll('[data-addon-select]'))
      if (!selects.length) return
      const values = selects.map(s => s.value)

      // Try exact match first
      let variant = this.variants.find(v => values.every((val, i) => v[`option${i + 1}`] === val))

      // No exact match — trim options from the end and find the best available variant
      if (!variant) {
        for (let len = values.length - 1; len >= 1; len--) {
          const partial = values.slice(0, len)
          variant = this.variants.find(v => partial.every((val, i) => v[`option${i + 1}`] === val) && v.available)
                 || this.variants.find(v => partial.every((val, i) => v[`option${i + 1}`] === val))
          if (variant) {
            // Sync the dependent dropdowns to reflect the fallback variant
            selects.forEach((sel, i) => {
              if (variant[`option${i + 1}`]) sel.value = variant[`option${i + 1}`]
            })
            break
          }
        }
      }

      this._updateSelectAvailability()
      if (!variant) return
      this.selectedVariantId = variant.id
      this._renderPrice(this.overridePrice ?? variant.price, this.priceEl)
      this._updateAddBtn()
      this._updateImage()
      if (this.cartKey) this._swapVariant()
    }

    _updateSelectAvailability() {
      const selects = Array.from(this.querySelectorAll('[data-addon-select]'))
      if (!selects.length) return
      const currentValues = selects.map(s => s.value)

      selects.forEach((sel, selIdx) => {
        Array.from(sel.options).forEach(opt => {
          const exists = this.variants.some(v => {
            if (v[`option${selIdx + 1}`] !== opt.value) return false
            return currentValues.every((val, i) => {
              if (i >= selIdx) return true  // only filter by parent options, never peers or children
              return !val || v[`option${i + 1}`] === val
            })
          })
          opt.hidden = !exists
          opt.disabled = !exists
        })
      })
    }

    _updateAddBtn() {
      if (!this.addBtn) return
      const available = this._currentVariant()?.available ?? false
      this.addBtn.disabled = !available
      const label = available ? 'Add +' : 'Out of Stock'
      this.addBtn.querySelector('span')
        ? this.addBtn.querySelector('span').textContent = label
        : this.addBtn.textContent = label
    }

    _currentVariant() {
      return this.variants.find(v => v.id === this.selectedVariantId)
    }
  })
}
