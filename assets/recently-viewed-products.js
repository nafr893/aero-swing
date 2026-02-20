if (!customElements.get('recently-viewed-products')) {
  customElements.define('recently-viewed-products', class RecentlyViewedProducts extends HTMLElement {
    constructor() {
      super();
      const products = getCookie('foxtheme:recently-viewed')
      if (!products) {
        this.setAttribute('hidden', true)
      } else {
        this.init(products)
      }
    }

    init(products) {
      this.productNodes = {}
      this.products = Array.from(new Set(JSON.parse(products))).reverse()
      this.productContainer = this.querySelector('flickity-component')
      this.slider = this.productContainer.slider
      this.section = this.closest('.f-recently-viewed')
      const handleIntersection = (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this.section);

        this.fetchProducts()
      }

      new IntersectionObserver(handleIntersection.bind(this.section), {rootMargin: '0px 0px 400px 0px'}).observe(this.section);
    }

    async fetchProducts() {
      const promises = this.products.map(async handle => {
        const productUrl = `${window.FoxThemeSettings.base_url}products/${handle}`
        const prodHTML = await fetchSection('product-card-grid', {url: productUrl}).catch(() => {})
        if (prodHTML) {
          this.productNodes[handle] = prodHTML.querySelector('.f-column')
        }
      })

      await Promise.all(promises)

      this.renderProducts()
    }

    renderProducts() {
      this.products.forEach(hdl => {
        const node = this.productNodes[hdl]
        if (node) {
          if (this.slider && typeof this.slider === 'object' && !FoxThemeSettings.isMobile) {
            this.slider.instance.append(node)
          } else {
            this.productContainer.appendChild(node)
          }
        }
      })
      this.slider && this.slider.calcArrowsPos()
      const column = this.productContainer.dataset.sliderColumns
      if (this.products.length <= Number(column)) {
        this.productContainer.destroy()
      }
      this.sendTrekkieEvent(this.products.length)
      __reInitTooltip(this.productContainer);
    }

    sendTrekkieEvent(numberProducts) {
      if (
        !window.ShopifyAnalytics ||
        !window.ShopifyAnalytics.lib ||
        !window.ShopifyAnalytics.lib.track
      ) {
        return
      }
      let didPageJumpOccur = this.getBoundingClientRect().top <= window.innerHeight

      window.ShopifyAnalytics.lib.track('Recently Viewed Products Displayed', {
        theme: Shopify.theme.name,
        didPageJumpOccur: didPageJumpOccur,
        numberOfRecommendationsDisplayed: numberProducts
      })
    }
  });
}
