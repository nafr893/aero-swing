if (!customElements.get('color-swatch')) {
	class ColorSwatch extends HTMLElement {
		constructor() {
			super()
		}

		connectedCallback() {
			this.optionNodes = this.querySelectorAll('[data-value]')
			this.init()
		}

		disconnectedCallback() {
			this.optionNodes.forEach(button => button.removeEventListener('mouseenter', this.onMouseEnter.bind(this)))
		}

		init() {
			const productCard = this.closest('.product-card')
			this.mainImage = productCard.querySelector('.product-card__image--main img')
			this.optionNodes.forEach(button => button.addEventListener('mouseenter', this.onMouseEnter.bind(this)))

			this.selected = this.querySelector('a[aria-selected="true"]')

			this.getVariantData()
			this.initOptionSwatches()
		}

		initOptionSwatches() {
			const {colorSwatches = []} = window.FoxThemeSettings
			this.optionNodes.forEach(optNode => {
				let variantImage
				const {optionPosition, value: optionValue, fallbackValue} = optNode.dataset
				const variant = this.variantData.find(v => v[`option${optionPosition}`] && v[`option${optionPosition}`].toLowerCase() === optionValue.toLowerCase())
				const check = colorSwatches.find(c => c.key.toLowerCase() === optionValue.toLowerCase())
				const customColor = check ? check.value : ''
				const {optionImage} = optNode.dataset

				if (variant) {
					variantImage = variant.featured_image ? variant.featured_image.src : ''
					optNode.href = `${optNode.href}?variant=${variant.id}`
					if (variantImage) {
						if (!optionImage && !customColor) {
							optNode.style = `background-image: url(${ getSizedImageUrl(variantImage, '60x')}) !important;`
						}
						optNode.setAttribute('data-src', getSizedImageUrl(variantImage, '900x'))
						optNode.setAttribute('data-srcset', getSrcset(variantImage))
					}
				}
				if (!customColor && !variantImage) {
					optNode.style.setProperty('--bg-color', `${fallbackValue}`)
				}
				if (customColor) {
					optNode.style.setProperty('--bg-color', `${customColor}`)
				}

				if (optionImage) {
					optNode.style = `background-image: url(${optionImage}) !important; --bg-color: ${customColor}`
				}
			})
		}

		onMouseEnter(e) {
			const {target} = e
			this.selected && this.selected.removeAttribute('aria-selected')
			target.setAttribute('aria-selected', true)

			const {src, srcset} = target.dataset
			if (this.mainImage && srcset) {
				this.mainImage.src = src
				this.mainImage.srcset = srcset
			}

			this.selected = target
		}

		getVariantData() {
			this.variantData = this.variantData || JSON.parse(this.nextElementSibling.textContent)
		}
	}
	customElements.define('color-swatch', ColorSwatch)
}
