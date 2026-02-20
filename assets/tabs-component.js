if (!customElements.get('tabs-component')) {
	class Tabs extends HTMLElement {
		constructor() {
			super()
			this.selectors = {
				tabHeader: '[role="tablist"]',
				tabPanels: ['[role="tabpanel"]'],
				tabNavs: ['[role="tab"]'],
				tabSelect: 'tab-selector',
				tabNavGroup: '.f-tabs__header-group'
			}
			this.domNodes = queryDomNodes(this.selectors, this)

			this.Collapsible = null
			this.selectedIndex = 0
			this.selectedTab = this.domNodes.tabPanels[this.selectedIndex]

			this.init()
			this.setActiveTab(0)

			this.tabChange = new CustomEvent('tabChange', {
				bubbles: true,
				detail: {selectedTab: this.selectedTab}
			})
		}

		connectedCallback() {
			this.setActiveTab(0)
		}

		init = () => {
			this.domNodes.tabNavs.forEach(tab => {
				tab.addEventListener('click', e => {
					e.preventDefault()
					const index = e.target ? Number(e.target.dataset.index) : -1
					this.setActiveTab(index)
				})
			})

			this.domNodes.tabHeader && this.domNodes.tabHeader.addEventListener('keydown', this.handleKeyDown.bind(this))
			this.setAccessible()
		}

		setLineStyle = (tab) => {
			let navGroupWidth = this.domNodes.tabNavGroup && this.domNodes.tabNavGroup.clientWidth
			let scale = tab.clientWidth / navGroupWidth
			let translate = tab.offsetLeft / navGroupWidth / scale

			this.style.setProperty('--scale', scale)
			this.style.setProperty('--translate', `${translate * 100}%`)
		}

		setActiveTab = (tabIndex) => {
			const {tabNavs, tabPanels, tabSelect} = this.domNodes
			if (tabIndex !== -1) {
				const newHeader = tabNavs && tabNavs[tabIndex]
				const newTab = tabPanels && tabPanels[tabIndex]
				this.setAttribute('data-selected', tabIndex)

				tabNavs.forEach(nav => nav.setAttribute('aria-selected', false))
				this.selectedTab && this.selectedTab.setAttribute('hidden', '')

				newHeader && newHeader.setAttribute('aria-selected', true)
				newTab && newTab.removeAttribute('hidden')
				this.setLineStyle(newHeader)

				this.selectedIndex = tabIndex
				this.selectedTab = newTab

				this.dispatchEvent(new CustomEvent('tabChange', {
					bubbles: true,
					detail: {selectedIndex: tabIndex, selectedTab: newTab}
				}))

				if (this.isMobile && this.isMobile.matches && this.Collapsible) {
					this.Collapsible.toggle(this.Collapsible.els[tabIndex])
				}

				if (tabSelect) {
					tabSelect.querySelector('select').value = tabIndex
				}

				const sliders = newTab.querySelectorAll('flickity-component')
				sliders && sliders.forEach((slider) => {
					slider.update()
					if( slider.slider ) {
						slider.slider.calcArrowsPos()
					}
				})
			}
		}

		setAccessible() {
			const {tabNavs, tabPanels} = this.domNodes
			tabNavs.forEach((tab, index) => {
				if (tab.id) tabPanels[index].setAttribute('aria-labelledby', tab.id)
				tab.setAttribute('aria-selected', index === 0)
				tab.setAttribute('data-index', index)
				if (index !== 0) {
					tab.setAttribute('tabindex', -1)
				}
			})
			tabPanels.forEach((panel, index) => {
				if (panel.id) tabNavs[index].setAttribute('aria-controls', panel.id)
				panel.setAttribute('tabindex', 0)
			})
		}

		handleKeyDown(e) {
			const {tabNavs} = this.domNodes
			if (e.keyCode === 39 || e.keyCode === 37) {
				tabNavs[this.selectedIndex].setAttribute('tabindex', -1)
				if (e.keyCode === 39) {
					this.selectedIndex++
					// If we're at the end, go to the start
					if (this.selectedIndex >= tabNavs.length) {
						this.selectedIndex = 0
					}
					// Move left
				} else if (e.keyCode === 37) {
					this.selectedIndex--
					// If we're at the start, move to the end
					if (this.selectedIndex < 0) {
						this.selectedIndex = tabNavs.length - 1
					}
				}

				tabNavs[this.selectedIndex].setAttribute('tabindex', 0)
				tabNavs[this.selectedIndex].focus()
			}
		}

		getSelected() {
			return {
				index: this.selectedIndex,
				element: this.selectedTab
			}
		}
	}

	customElements.define('tabs-component', Tabs)
}

if (!customElements.get('tab-selector')) {
	class TabSelector extends HTMLElement {
		constructor() {
			super()

			this.tabs = this.closest('tabs-component')

			this.querySelector('select').addEventListener('change', (e) => {
				this.tabs.setActiveTab(e.target.value)
			})
		}

	}
	customElements.define('tab-selector', TabSelector)
}
