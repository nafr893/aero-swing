if (!customElements.get('countdown-timer')) {
	customElements.define('countdown-timer', class CountdownTimer extends HTMLElement {
		times = ['day', 'hour', 'min', 'sec']
		selectors = {
			day: '[data-timer-day]',
			hour: '[data-timer-hour]',
			min: '[data-timer-minute]',
			sec: '[data-timer-second]',
			wrapper: '[data-countdown-wrapper]'
		}
		DAY_IN_MS = 24 * 60 * 60 * 1000
		HOUR_IN_MS = 60 * 60 * 1000
		MIN_IN_MS = 60 * 1000
		startTime = Date.now()

		constructor() {
			super()
		}

		connectedCallback() {
			if (!this.dataset.countdownTimer) return;
			this.init()
		}

		init = () => {
			this.startTime = Date.now()
			this.savedStartTime = this.startTime
			this.endTime = new Date(this.dataset.countdownTimer).getTime()
			this.options = {
				addZeroPrefix: true,
				loop: false,
				callback: () => {
				}
			}

			if (this.endTime < this.startTime) return
			this.intervalTime = 1000
			this.timer = null
			this.domNodes = queryDomNodes(this.selectors, this)
			this.wrapper = this.closest(this.selectors.wrapper)

			this.start()
		}

		start = () => {
			this.timer = setInterval(() => {
				if (this.startTime > this.endTime) this.stop()
				else this.update()
			}, this.intervalTime)

			this.classList.remove("f-hidden")
			this.wrapper && this.wrapper.removeAttribute('hidden')
		}

		update = () => {
			const timeData = this.format(this.endTime - this.startTime)
			this.times.forEach(time => {
				if (this.domNodes[time]) {
					this.domNodes[time].textContent = this.addZeroPrefix(timeData[time])
				}
			})
			this.startTime += this.intervalTime
		}

		stop = () => {
			clearInterval(this.timer)
			if (this.options.loop) {
				this.startTime = this.savedStartTime
				this.start()
			} else {
				this.timer = null
				this.options.callback()
				this.classList.add("f-hidden")
				this.wrapper && this.wrapper.setAttribute('hidden', true)
			}
		}

		clear = () => {
			clearInterval(this.timer)
			this.timer = null
			this.startTime = this.savedStartTime
			this.times.forEach(time => {
				if (this.domNodes[time]) {
					this.domNodes[time].textContent = "00"
				}
			})
		}

		addZeroPrefix = (num) => {
			if (this.options.addZeroPrefix && num < 10) {
				return `0${num}`
			}
			return num.toString()
		}

		format = (ms) => {
			return {
				day: Math.floor(ms / this.DAY_IN_MS),
				hour: Math.floor(ms / this.HOUR_IN_MS) % 24,
				min: Math.floor(ms / this.MIN_IN_MS) % 60,
				sec: Math.floor(ms / 1000) % 60
			}
		}
	})
}
