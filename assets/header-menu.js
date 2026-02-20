class SiteHeader extends HTMLElement {
  constructor() {
    super()
  }

  connectedCallback() {
    this.classes = {
      active: 'f-header__mega-active',
      headerScheme: this.dataset.headerColorScheme,
      dropdownScheme: this.dataset.dropdownColorScheme
    }
    this.headerSticky = document.querySelector('.site-header__wrapper')

    this.isRTL = document.documentElement.getAttribute('dir') === 'rtl'
    this.grandLinks = this.querySelectorAll('.f-site-nav__sub-item--has-child')
    this.grandLinks && this.grandLinks.forEach((item, index) => {
        this.handleGrandLinksPosition(item)
    })
  }

  calcDropdownHeight(dropdown) {
    const rect = dropdown.getBoundingClientRect()
    this.style.setProperty('--f-dropdown-height', rect.height + 'px')
  }

  handleMegaItemActive() {
    this.classList.add(this.classes.active, this.classes.dropdownScheme)
    this.classList.remove(this.classes.headerScheme)
    document.documentElement.style.setProperty("--f-header-height", this.clientHeight + "px")
  }

  handleMegaItemDeactive() {
    this.classList.remove(this.classes.active, this.classes.dropdownScheme)
    this.classList.add(this.classes.headerScheme)
    document.documentElement.style.setProperty("--f-header-height", this.clientHeight + "px")
  }

  handleGrandLinksPosition(target) {
    const dropdownLV3 = target.querySelector('.f-site-nav__dropdown')
    if( dropdownLV3 ) {
      const rect = dropdownLV3.getBoundingClientRect()
      dropdownLV3.classList.remove('f-site-nav__dropdown-reversed')
      if( ( ! this.isRTL && document.documentElement.clientWidth < rect.x + rect.width + 10  )
        || ( this.isRTL && rect.x < 10 )
        ) {
          dropdownLV3.classList.add('f-site-nav__dropdown-reversed')
      }
    }
  }
}
customElements.define('site-header', SiteHeader)

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super()
  }

  connectedCallback() {
    this.header = this.closest('.site-header')
    this.classes = {
      itemActive: 'f-menu__item-active'
    }
    this.header.timeoutEnter = null
    this.header.timeoutLeave = null
  }

    onToggle(evt) {
    const { target } = evt

    const li = target.closest('.f-site-nav__item')
    const isOpen = this.mainDetailsToggle.open
    const isMega = li.classList.contains('f-site-nav__item--mega')

    if( ! isOpen ) {
      clearTimeout(this.header.timeoutEnter)
      li.classList.remove(this.classes.itemActive)
      this.header.timeoutLeave = setTimeout(() => {
        this.header.handleMegaItemDeactive()
      }, 80)
    } else {
      if ( isMega ) {
        clearTimeout(this.header.timeoutLeave)
        const dropdown = li.querySelector('.f-site-nav__dropdown')
        this.header.calcDropdownHeight( dropdown )
        this.header.handleMegaItemActive()
        this.header.timeoutEnter = setTimeout(() => {
          li.classList.add( this.classes.itemActive )
        }, 160)
      } else {
        li.classList.add( this.classes.itemActive )
      }
    }

    if (this.header.headerSticky) {
      this.header.headerSticky.preventReveal = this.mainDetailsToggle.open
    }
  }
}
customElements.define('header-menu', HeaderMenu);

class SiteNav extends HTMLElement {
  constructor() {
    super()
  }

  connectedCallback() {
    this.header = this.closest('.site-header')
    this.classes = {
      itemActive: 'f-menu__item-active'
    }

    this.megaItems = this.querySelectorAll('.f-site-nav__item--mega')
    this.timeoutEnter = null
    this.timeoutLeave = null
    this.isHover = this.header && this.header.classList.contains('show-dropdown-menu-on-hover')
    if( this.isHover ) {
      this.megaItems && this.megaItems.forEach((megaItem, index) => {
        megaItem.addEventListener('mouseenter', (evt) => this.onMenuItemEnter(evt, index))
        megaItem.addEventListener('mouseleave', (evt) => this.onMenuItemLeave(evt, index))
      })
    }
  }

  onMenuItemEnter(evt, index) {
    clearTimeout(this.timeoutLeave)

    const { target } = evt
    const dropdown = target.querySelector('.f-site-nav__dropdown')
    
    if( dropdown ) {
      this.header.calcDropdownHeight( dropdown )
      this.header.handleMegaItemActive()
      this.timeoutEnter = setTimeout(() => {
        target.classList.add( this.classes.itemActive )
      }, 160)
    }
  }

  onMenuItemLeave(evt, index) {
    const { target } = evt
    clearTimeout(this.timeoutEnter)
    target.classList.remove( this.classes.itemActive )
    this.timeoutLeave = setTimeout(() => {
      this.header.handleMegaItemDeactive()
    }, 80)
  }

  closeMegaDropdowns() {
    clearTimeout(this.timeoutEnter)
    this.megaItems && this.megaItems.forEach((megaItem, index) => {
      megaItem.classList.remove( this.classes.itemActive )
    })
    this.timeoutLeave = setTimeout(() => {
      this.header.handleMegaItemDeactive()
    }, 80)
  } 

  disconnectedCallback() {
    this.megaItems && this.megaItems.forEach((megaItem, index) => {
      megaItem.removeEventListener('mouseenter', (evt) => this.onMenuItemEnter(evt, index))
      megaItem.removeEventListener('mouseleave', (evt) => this.onMenuItemLeave(evt, index))
    })
  }
}
customElements.define('site-nav', SiteNav)