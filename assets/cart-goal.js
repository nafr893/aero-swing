if (!customElements.get('f-cart-goal')) {
    class FCartGoal extends HTMLElement {
        constructor() {
            super()

            this.selectors = {
                cartDrawer: '.f-cart-drawer__inner',
                leftToSpend: '[data-left-to-spend]',
                cartGoalTitle: '.f-cartgoal__title'
            }

            this.confettiShow = false
            this.goalDone = false
            this.goal = Number(this.dataset.cartGoal) * Number(window.Shopify.currency.rate || 1) || 0
            this.money_format = window.FoxThemeSettings.money_format
            this.enableConfetti = this.dataset.enableConfetti === 'true'
        }

        connectedCallback() {
            this.updateCartGoal(Number(this.dataset.cartTotal))
            window.FoxThemeEvents.subscribe(`ON_CART_UPDATED`, state => {
              this.updateCartGoal(state.items_subtotal_price)
            })
            window.FoxThemeEvents.subscribe(`ON_ITEM_ADDED`, async () => {
              const newCart = await window.FoxThemeCartHelpers.getState()
              if (newCart) {
                this.updateCartGoal(newCart.items_subtotal_price)
              }
            })
            this.confettiShow = this.goalDone
        }

        updateCartGoal(state) {
            if (state > 0) {
                this.classList.remove('hidden')
            } else {
                this.classList.add('hidden')
            }

            this.cartTotal = state / 100
            this.goalLeft = this.goal - this.cartTotal
            this.goalDone = this.goalLeft <= 0

            this.percent = (this.cartTotal * 100) / this.goal

            if (this.percent >= 100) this.percent = 100

            if (this.cartTotal >= this.goal) {
                this.style.setProperty('--progress', `${this.percent}%`)
                this.classList.add('f-cartgoal--done', 'shakeY')
                this.dataset.total = this.cartTotal
            } else {
                let spend = (this.goal - this.cartTotal) * 100
                this.querySelector(this.selectors.leftToSpend).innerHTML = formatMoney(spend, this.money_format)
                this.classList.remove('f-cartgoal--done', 'shakeY')
                this.style.setProperty('--progress', `${this.percent}%`)
                this.dataset.total = this.cartTotal
            }

            if (this.goalLeft <= 0 && this.enableConfetti) {
                this.showConfetti()
            } else {
                this.confettiShow = false
            }
        }

        showConfetti() {
            const cartDrawer = this.closest(this.selectors.cartDrawer)
            if (!this.confettiShow && cartDrawer) {
                setTimeout(() => {
                    new window.FoxTheme.Confetti(cartDrawer)
                    this.confettiShow = true
                }, 800)
            }
        }
    }

    customElements.define('f-cart-goal', FCartGoal)
}
