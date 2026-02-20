document.addEventListener('shopify:section:load', function(event) {
	const {target} = event
	const sliders = target.querySelectorAll('flickity-component')
	const pressNavs = target.querySelectorAll('press-nav-component')

	sliders.forEach(slider => {
		setTimeout(() => {
			slider.update()
		}, 500)
	})

	pressNavs.forEach(nav => {
		setTimeout(() => {
			nav.update()
		}, 800)
	})

	__reInitTooltip(target);
});

document.addEventListener('shopify:block:select', function(event) {
	const {target} = event

	const blockSelectedIsSlide = target.classList.contains('f-press__text') || target.classList.contains('f-slideshow__slide') || target.classList.contains('f-slideshow__content') || target.classList.contains('f-favorite-products__block');
	if (blockSelectedIsSlide) {
		const slider = target.closest('flickity-component')
		if (slider) {
			const index = Number(target.dataset.index)
			slider.select(index, true, false)
		}
	}
	const blockSelectedIsTab = target.classList.contains('f-tabs__content');
	if (blockSelectedIsTab) {
		const tabs = target.closest('tabs-component')
		tabs.setActiveTab(target.dataset.index)
	}

	const blockSelectedLookbook = target.classList.contains('f-lookbook-card');
	if (blockSelectedLookbook) {
		const lookbookIcons = target.querySelectorAll('lookbook-icon')
		lookbookIcons.forEach(lookbookIcon => {
			lookbookIcon.init()
		});
	}

	/**
	 * Selected on collapsible tab, collection tab.
	 */
	if ( target.classList.contains('collapsible__item') ) {
		target.open()
	}
});

function initMobileSwiper() {
	const sliders = document.querySelectorAll('flickity-component')
	sliders.forEach(slider => {
		if (!slider.initialized) new window.FoxTheme.Slider(slider)
	})
}
if (FoxThemeSettings.isMobile) initMobileSwiper()

document.addEventListener('matchMobile', initMobileSwiper)
