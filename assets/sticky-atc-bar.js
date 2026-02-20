if (!customElements.get('sticky-atc-bar')) {
	customElements.define('sticky-atc-bar', class StickyAtcBar extends HTMLElement {
		constructor() {
			super()
			document.body.classList.add('sticky-atc-bar-enabled')

			this.selectors = {
				variantIdSelect: '[name="id"]'
			}
		}

		connectedCallback() {
			this.productFormActions = document.querySelector('.f-main-product-form')
			this.container = this.closest('.sticky-atc-bar')

			this.variantData = this.getVariantData()
			
			this.init()
			this.addEventListener('change', () => {
				const selectedVariantId = this.querySelector(this.selectors.variantIdSelect).value
				this.currentVariant = this.variantData.find(variant => variant.id === Number(selectedVariantId))
				this.updatePrice()
				this.updateButton(true, '', false)
				if (!this.currentVariant) {
					this.updateButton(true, '', true)
				} else {
					this.updateButton(!this.currentVariant.available, window.FoxThemeStrings.soldOut)
				}
			})
		}

		getVariantData() {
			this.variantData = this.variantData || JSON.parse(this.container.querySelector('[type="application/json"]').textContent)
			return this.variantData
		}

		init() {
			if (!this.productFormActions) {
				this.container.classList.add('sticky-atc-bar--show')
				return
			}
			this.productId = this.dataset.productId
			const isMobile = window.matchMedia('(max-width: 639px)')

			try {
				// Chrome & Firefox
				isMobile.addEventListener('change', this.checkDevice.bind(this))
			} catch (err) {
				try {
					// Safari
					isMobile.addListener(this.checkDevice.bind(this));
				} catch (e2) {
					console.error(e2);
				}
			}

			// Initial check
			this.checkDevice(isMobile)

			const headerHeight = window.FoxThemeSettings.headerHeight || 80
			const rootMargin = `-${headerHeight}px 0px 0px 0px`
			this.observer = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					const method = entry.intersectionRatio !== 1 ? 'add' : 'remove'
					this.container.classList[method]('sticky-atc-bar--show')
				})
			}, {threshold: 1, rootMargin})
			this.setObserveTarget()
			this.syncWithMainProductForm()
		}

		setObserveTarget() {
			this.observer.observe(this.productFormActions)
			this.observeTarget = this.productFormActions
		}

		checkDevice(e) {
			const sectionHeight = this.clientHeight + 'px'
			document.documentElement.style.setProperty("--f-sticky-atc-bar-height", sectionHeight)
		}

		updateButton(disable = true, text, modifyClass = true) {
			const productForm = document.getElementById('product-form-sticky-atc-bar')
			if (!productForm) return
			const addButton = productForm.querySelector('[name="add"]')
			const addButtonText = productForm.querySelector('[name="add"] > span:not(.f-icon)')

			if (!addButton) return

			if (disable) {
				addButton.setAttribute('disabled', 'disabled')
				if (text) addButtonText.textContent = text
			} else {
				addButton.removeAttribute('disabled')
				addButtonText.textContent = window.FoxThemeStrings.addToCart
			}
		}

		updatePrice() {
			const classes = {
				onSale: 'f-price--on-sale',
				soldOut: 'f-price--sold-out'
			}
			const selectors = {
				priceWrapper: '.f-price',
				salePrice: '.f-price-item--sale',
				compareAtPrice: ['.f-price-item--regular'],
				unitPrice: '.f-price__unit',
				saleBadge: '.f-price__badge-sale',
				saleAmount: '[data-sale-value]'
			}
			const money_format = window.FoxThemeSettings.money_format
			const {
				priceWrapper,
				salePrice,
				unitPrice,
				compareAtPrice
			} = queryDomNodes(selectors, this)

			const {compare_at_price, price, unit_price_measurement} = this.currentVariant

			const onSale = compare_at_price && compare_at_price > price
			const soldOut = !this.currentVariant.available

			if (onSale) {
				priceWrapper.classList.add(classes.onSale)
			} else {
				priceWrapper.classList.remove(classes.onSale)
			}

			if (soldOut) {
				priceWrapper.classList.add(classes.soldOut)
			} else {
				priceWrapper.classList.remove(classes.soldOut)
			}

			if (priceWrapper) priceWrapper.classList.remove('visibility-hidden')
			if (salePrice) salePrice.innerHTML = formatMoney(price, money_format)

			if (compareAtPrice && compareAtPrice.length && compare_at_price > price) {
				compareAtPrice.forEach(item => item.innerHTML = formatMoney(compare_at_price, money_format))
			} else {
				compareAtPrice.forEach(item => item.innerHTML = formatMoney(price, money_format))
			}


			if (unit_price_measurement && unitPrice) {
				unitPrice.classList.remove('f-hidden')
				const unitPriceContent = `<span>${formatMoney(this.currentVariant.unit_price, money_format)}</span>/<span data-unit-price-base-unit>${this._getBaseUnit()}</span>`
				unitPrice.innerHTML = unitPriceContent
			} else {
				unitPrice.classList.add('f-hidden')
			}
		}

		syncWithMainProductForm() {
			const variantInput = this.querySelector('[name="id"]')
			window.FoxThemeEvents.subscribe(`${this.productId}__VARIANT_CHANGE`, async (variant) => {
				this.currentVariant = variant
				variantInput.value = variant.id
				this.updatePrice()
				this.updateButton(true, '', false)
				if (!variant) {
					this.updateButton(true, '', true)
				} else {
					this.updateButton(!variant.available, window.FoxThemeStrings.soldOut)
				}
			})
		}
	})
}
