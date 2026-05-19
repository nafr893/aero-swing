if (!customElements.get('product-tabs')) {
  customElements.define('product-tabs', class ProductTabs extends HTMLElement {
    connectedCallback() {
      this.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => this._select(tab))
      })
    }

    _select(activeTab) {
      const idx = activeTab.dataset.tab
      this.querySelectorAll('[data-tab]').forEach(t => {
        const active = t === activeTab
        t.classList.toggle('is-active', active)
        t.setAttribute('aria-selected', String(active))
      })
      this.querySelectorAll('[data-panel]').forEach(p => {
        const active = p.dataset.panel === idx
        p.classList.toggle('is-active', active)
        p.hidden = !active
      })
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  })
}
