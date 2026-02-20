class ProductCardChooseOptions {
	constructor() {
		this.modal = null
		
		addEventDelegate({
			selector: '[data-product-choose-options]',
			handler: (e, target) => {
				e.preventDefault()
				this.target = target
				this.target.classList.add('btn--loading')
				const productHandle = this.target.dataset.productChooseOptions
				if (productHandle) this.fetchHtml(productHandle)
			}
		})

		window.FoxThemeEvents.subscribe(`ON_ITEM_ADDED`, () => {
			if (this.modal) this.modal.hide()
		})
	}

	fetchHtml(productHandle) {
		loadAssets([window.FoxThemeStyles.product], 'pcard-choose-options')
		fetchSection('pcard-choose-options', {url: `${window.FoxThemeSettings.base_url}products/${productHandle}`}).then(html => {
			this.modal = html.querySelector('modal-dialog')
			document.body.appendChild(this.modal)
			loadAssets([window.FoxThemeScripts.variantsPicker], 'variant-picker', () => {
				this.modal && this.modal.show(this.target)
				this.target.classList.remove('btn--loading')
				if (Shopify && Shopify.PaymentButton) {
					Shopify.PaymentButton.init()
				}
				this.handleClose()
				__reInitTooltip(this.modal);
			})
		}).catch(console.error)
	}

	handleClose() {
		if (!this.modal) return
		this.modal.addEventListener('close', () => {
			this.modal.remove()
		})
	}
}

new ProductCardChooseOptions()