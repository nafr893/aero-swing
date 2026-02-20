class StickyHeader extends HTMLElement {
	constructor() {
		super()
	}

	connectedCallback() {
		this.stickyEnabled = this.dataset.headerSticky === 'true'
		this.hideOnScroll = true
		this.header = document.querySelector('.f-section-header')
		if (this.stickyEnabled) this.initStickyHeader()
	}

	disconnectedCallback() {
		this.removeEventListener('preventHeaderReveal', this._hideHeaderOnScrollUp)
		window.removeEventListener('scroll', this.onScrollHandler)
	}

	initStickyHeader() {
		this.headerBounds = {}
		this.currentScrollTop = 0
		this.preventReveal = false

		this.onScrollHandler = this._onScroll.bind(this)
		this._hideHeaderOnScrollUp = () => this.preventReveal = true

		this.addEventListener('preventHeaderReveal', this._hideHeaderOnScrollUp)
		window.addEventListener('scroll', this.onScrollHandler, false)

		this._createObserver()

		document.body.classList.add('header-sticky-enabled')
	}

	_onScroll() {
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop
		if (scrollTop > this.currentScrollTop && scrollTop > this.offset) {
			requestAnimationFrame(this._hide.bind(this))
		} else if (scrollTop < this.currentScrollTop && scrollTop > this.offset) {
			if (!this.preventReveal) {
				requestAnimationFrame(this._reveal.bind(this))
			} else {
				window.clearTimeout(this.isScrolling)

				this.isScrolling = setTimeout(() => {
					this.preventReveal = false
				}, 66)

				requestAnimationFrame(this._hide.bind(this))
			}
		} else if (scrollTop <= this.headerBounds.top) {
			requestAnimationFrame(this._reset.bind(this))
		}

		this.currentScrollTop = scrollTop
	}

	_createObserver() {
		let observer = new IntersectionObserver((entries, observer) => {
			this.headerBounds = entries[0].intersectionRect
			this.offset =  this.headerBounds.bottom
			observer.disconnect()
		})

		observer.observe(this.header)
	}

	_hide() {
		this.header.classList.add('site-header--sticky', 'site-header--hidden')
		document.body.classList.remove('header-sticky--visible')
		this._closeMenuDisclosure()
	}

	_reveal() {
		this.header.classList.add('site-header--sticky', 'site-header--animate')
		this.header.classList.remove('site-header--hidden')
		document.body.classList.add('header-sticky--visible')
	}

	_reset() {
		this.header.classList.remove('site-header--hidden', 'site-header--sticky', 'site-header--animate')
		document.body.classList.remove('header-sticky--hidden')
	}

	_closeMenuDisclosure() {
		this.disclosures = this.disclosures || this.header.querySelectorAll('header-menu');
		this.disclosures.forEach(disclosure => disclosure.close());

		this.siteNav = this.siteNav || this.header.querySelector('site-nav');
		this.siteNav && this.siteNav.closeMegaDropdowns()
	}
}

customElements.define('sticky-header', StickyHeader)
