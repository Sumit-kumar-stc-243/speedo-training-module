document.addEventListener('DOMContentLoaded', () => {
  if (!customElements.get('video-slide')) {
    class VideoSlide extends HTMLElement {
      constructor() {
        console.log('constructor')
        super();
        this.attachShadow({ mode: 'open' });
        this.onGlobalPlay = this.onGlobalPlay.bind(this);
      }

      connectedCallback() {
        console.log('connected')
        // 1. Read all attributes
        this.videoSrc = this.getAttribute('data-video-src');
        this.poster = this.getAttribute('data-poster') || '';
        this.width = this.getAttribute('data-width') || '100%';
        this.height = this.getAttribute('data-height') || 'auto';
        this.heading = this.getAttribute('data-heading') || '';

        this.autoplay = this.getAttribute('data-autoplay') === 'true';
        this.loop = this.getAttribute('data-loop') === 'true';
        this.showControls = this.getAttribute('data-controls') === 'true';

        // Autoplay must be muted, or if user explicitly requested muted
        this.isMuted = this.autoplay || this.getAttribute('data-muted') === 'true';

        // Setup IntersectionObserver for lazy loading
        if ('IntersectionObserver' in window) {
          this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                this.initComponent();
                this.observer.disconnect();
              }
            });
          }, { rootMargin: '200px' });
          this.observer.observe(this);
        } else {
          // Fallback immediately if no observer support
          this.initComponent();
        }

        // Listen for other videos playing to pause this one
        window.addEventListener('video-slide:play', this.onGlobalPlay);
      }

      disconnectedCallback() {
        window.removeEventListener('video-slide:play', this.onGlobalPlay);
        if (this.observer) {
          this.observer.disconnect();
        }
      }

      initComponent() {
        if (this.rendered) return;
        this.rendered = true;

        // Read dynamic styling attributes
        this.headingAlign = this.getAttribute('data-heading-align') || 'left';
        this.headingTop = this.getAttribute('data-heading-top') || '80'; // default 80%
        this.headingSize = this.getAttribute('data-heading-size') || '20';
        this.headingColor = this.getAttribute('data-heading-color') || '#ffffff';
        this.headingWeight = this.getAttribute('data-heading-weight') || '600';

        this.render();

        this.video = this.shadowRoot?.querySelector('video');
        this.playBtn = this.shadowRoot?.querySelector('.play-btn');

        if (this.video) {
          // Handle init logic
          if (this.autoplay) {
            this.video.muted = true;
            // Attempt autoplay
            this.video.play().catch(err => console.log('Autoplay blocked', err));
          }

          this.video.addEventListener('play', () => {
            this.playBtn?.classList.add('hidden');
            this.dispatchPlayEvent();
          });

          this.video.addEventListener('pause', () => {
            if (!this.showControls) {
              this.playBtn?.classList.remove('hidden');
            }
          });

          // Add click listener to play button
          this.playBtn?.addEventListener('click', () => {
            this.video?.play();
          });
        }
      }

      dispatchPlayEvent() {
        window.dispatchEvent(
          new CustomEvent('video-slide:play', {
            detail: { element: this }
          })
        );
      }

      /**
       * @param {CustomEvent} e
       */
      onGlobalPlay(e) {
        if (this.video && e.detail.element !== this && !this.video.paused) {
          this.video.pause();
        }
      }

      render() {
        if (!this.shadowRoot) return;

        const heightStyle = this.height === 'auto' ? 'auto' : '100%';

        this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: ${this.width};
                  height: ${this.height === 'auto' ? 'auto' : this.height};
                }
      
                .video-wrapper {
                  position: relative;
                  width: 100%;
                  height: ${heightStyle};
                  border-radius: 12px;
                  overflow: hidden;
                  background: #000;
                }
      
                video {
                  width: 100%;
                  height: ${heightStyle};
                  object-fit: cover;
                  display: block;
                }

                /* Allow clicks to pass through to the container for swiping when controls are hidden */
                video:not([controls]) {
                  pointer-events: none;
                }
      
                .play-btn {
                  position: absolute;
                  inset: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: rgba(0,0,0,0.35);
                  cursor: pointer;
                  z-index: 2;
                  transition: opacity 0.3s ease;
                }
      
                /* Hide play button if controls are enabled (native controls take over) */
                .play-btn.hidden {
                  opacity: 0;
                  pointer-events: none;
                }
      
                .play-btn svg {
                  width: 64px;
                  height: 64px;
                  fill: #fff;
                  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));
                }
      
                .video-heading {
                  position: absolute;
                  top: ${this.headingTop}%;
                  left: 20px;
                  right: 20px;
                  color: ${this.headingColor};
                  font-size: ${this.headingSize}px;
                  font-weight: ${this.headingWeight};
                  text-align: ${this.headingAlign};
                  z-index: 3;
                  pointer-events: none;
                  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                }
              </style>
      
              <div class="video-wrapper">
                <video
                  src="${this.videoSrc}"
                  poster="${this.poster}"
                  ${this.isMuted ? 'muted' : ''}
                  ${this.autoplay ? 'autoplay' : ''}
                  ${this.loop ? 'loop' : ''}
                  ${this.showControls ? 'controls' : ''}
                  playsinline
                  preload="metadata"
                  draggable="false"
                ></video>
      
                ${this.heading ? `<div class="video-heading">${this.heading}</div>` : ''}
      
                <!-- Only show custom play button if native controls are OFF -->
                ${!this.showControls ? `
                  <div class="play-btn">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"></path>
                    </svg>
                  </div>
                ` : ''}
              </div>
            `;
      }
    }

    customElements.define('video-slide', VideoSlide);
  }
})
