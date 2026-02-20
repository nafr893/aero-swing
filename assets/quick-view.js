const {FoxThemeStyles, FoxThemeScripts} = window
class QuickView {
	constructor() {
		this.modal = null

		addEventDelegate({
			selector: '[data-product-quickview]',
			handler: (e, target) => {
				e.preventDefault()
				this.target = target
				target.classList.add('btn--loading')
				const productHandle = target.dataset.productQuickview
				if (productHandle) this.fetchHtml(productHandle)
			}
		})

		window.FoxThemeEvents.subscribe(`ON_ITEM_ADDED`, () => {
			if (this.modal) this.modal.hide()
		})
	}

	fetchHtml(productHandle) {
		loadAssets([FoxThemeStyles.product], 'quick-view-assets')
		fetchSection('product-quickview', {url: `${window.FoxThemeSettings.base_url}products/${productHandle}`}).then(html => {
			this.modal = html.querySelector('modal-dialog')
			const firstModel = html.querySelector('product-model')
			this.mediaGallery = this.modal.querySelector('media-gallery')
			document.body.appendChild(this.modal)
			loadAssets([FoxThemeScripts.productMedia, FoxThemeScripts.variantsPicker], 'variants-picker', () => {
				this.modal && this.modal.show(this.target)
				if (this.mediaGallery) {
					const thumb = this.mediaGallery.querySelector('[id^="GalleryThumbnails"]')
					if (thumb) thumb.update()
					this.mediaGallery.update()
				}
				if (Shopify && Shopify.PaymentButton) {
					Shopify.PaymentButton.init()
				}
				this.target.classList.remove('btn--loading')
				this.handleClose()
				__reInitTooltip(this.modal);
			})
			if (firstModel) {
				loadAssets([FoxThemeScripts.productModel, 'https://cdn.shopify.com/shopifycloud/model-viewer-ui/assets/v1.0/model-viewer-ui.css'], 'product-model-assets')
			}
		})
			.catch(console.error)
	}

	handleClose() {
		if (!this.modal) return
		this.modal.addEventListener('close', () => {
			this.modal.remove()
		})
	}
}

new QuickView()
