class CartDrawer extends HTMLElement {
	constructor() {
		super()
		window.FoxTheme = window.FoxTheme || {}
		window.FoxTheme.Cart = this
		this.drawer = this.closest('drawer-component')
		window.FoxTheme.CartDrawer = this.drawer
    this.openWhenAdded = this.dataset.openWhenAdded === 'true'
	}

	connectedCallback() {
    window.FoxThemeEvents.subscribe(`ON_ITEM_ADDED`, async state => {
      this.renderContents(state)
    })
	}

  renderContents(parsedState, renderFooter = true) {
    this.classList.contains('is-empty') && this.classList.remove('is-empty');
    this.getSectionsToRender(renderFooter).forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    if (window.FoxKitV2 && window.FoxKitPlugins.InCart.length > 0 && window.FoxKitV2.Modules.InCart) {
      window.FoxKitV2.Modules.InCart.getCart()
    }

    setTimeout(() => {
      if (this.openWhenAdded && !this.drawer.isOpen()) {
        this.drawer.openDrawer()
        document.body.classList.add('prevent-scroll')
        window.FoxThemeEvents.emit(`ON_CART_DRAWER_OPEN`, parsedState)
      }
    });

  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender(renderFooter = false) {
    const sections = [
      {
        id: 'cart-drawer',
        selector: '.f-cart-drawer__items',
      },
    ]

    if (renderFooter) {
      sections.push({
        id: 'cart-drawer',
        selector: '.f-drawer__footer',
      })
    }

    return sections
  }

}
customElements.define('cart-drawer', CartDrawer)

class CartDrawerItems extends CartItems {

  initLoading() {
    this.loading = new window.FoxTheme.AnimateLoading(document.querySelector('cart-drawer'), { overlay: document.querySelector('cart-drawer') })
  }
  getSectionsToRender() {
    return [
      {
        id: 'Drawer-Cart',
        section: 'cart-drawer',
        selector: '.f-cart-drawer__items',
      },
      {
        id: 'Drawer-Cart',
        section: 'cart-drawer',
        selector: '.f-cart-drawer__block-subtotal',
      }
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
