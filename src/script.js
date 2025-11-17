/**
 * @fileoverview Slider de página inteira com navegação por teclado, mouse e touch
 * @version 2.0.0
 */

/**
 * Módulo principal do slider
 */
const SliderApp = (() => {
    'use strict';

    // ========== CONFIGURAÇÕES ==========
    const CONFIG = {
        transitionDuration: 600,
        scrollThrottle: 50,
        swipeThreshold: 50
    };

    // ========== ESTADO ==========
    const state = {
        currentSlide: 1,
        isAnimating: false,
        totalSlides: 0,
        slideIdMap: {}
    };

    // ========== CACHE DE ELEMENTOS DOM ==========
    const elements = {
        slides: null,
        indicators: null,
        prevBtn: null,
        nextBtn: null
    };

    /**
     * Inicializa o cache de elementos DOM
     */
    function cacheElements() {
        elements.slides = document.querySelectorAll('.slide');
        elements.indicators = document.querySelectorAll('.indicator');
        elements.prevBtn = document.getElementById('prevBtn');
        elements.nextBtn = document.getElementById('nextBtn');
        
        state.totalSlides = elements.slides.length;
    }

    /**
     * Cria o mapeamento de IDs para números de slide
     */
    function createSlideIdMap() {
        elements.slides.forEach((slide, index) => {
            const slideId = slide.getAttribute('id');
            if (slideId) {
                state.slideIdMap[slideId] = index + 1;
            }
        });
    }

    /**
     * Valida se o número do slide está dentro do range válido
     * @param {number} slideNumber - Número do slide
     * @returns {boolean}
     */
    function isValidSlideNumber(slideNumber) {
        return slideNumber >= 1 && slideNumber <= state.totalSlides;
    }

    /**
     * Atualiza os atributos ARIA dos indicadores
     * @param {number} slideNumber - Número do slide ativo
     */
    function updateAriaAttributes(slideNumber) {
        elements.indicators.forEach((indicator, index) => {
            const isActive = index + 1 === slideNumber;
            indicator.setAttribute('aria-selected', isActive.toString());
        });
    }

    /**
     * Atualiza a URL com o hash do slide atual
     * @param {number} slideNumber - Número do slide
     */
    function updateURL(slideNumber) {
        const slideEl = document.querySelector(`.slide[data-slide="${slideNumber}"]`);
        const slideId = slideEl?.getAttribute('id');
        
        if (slideId) {
            history.pushState(null, null, `#${slideId}`);
        }
    }

    /**
     * Navega para um slide específico
     * @param {number} slideNumber - Número do slide de destino
     */
    function goToSlide(slideNumber) {
        if (state.isAnimating || !isValidSlideNumber(slideNumber)) {
            return;
        }

        state.isAnimating = true;

        // Remove classe active de todos os slides e indicadores
        elements.slides.forEach(slide => slide.classList.remove('active'));
        elements.indicators.forEach(indicator => indicator.classList.remove('active'));

        // Adiciona active ao slide e indicador de destino
        const targetSlide = document.querySelector(`.slide[data-slide="${slideNumber}"]`);
        const targetIndicator = document.querySelector(`.indicator[data-slide="${slideNumber}"]`);

        if (targetSlide) targetSlide.classList.add('active');
        if (targetIndicator) targetIndicator.classList.add('active');

        state.currentSlide = slideNumber;

        // Atualiza controles de navegação
        updateNavigationButtons();
        updateAriaAttributes(slideNumber);
        updateURL(slideNumber);

        // Libera animação após transição
        setTimeout(() => {
            state.isAnimating = false;
        }, CONFIG.transitionDuration);
    }

    /**
     * Atualiza o estado dos botões de navegação
     */
    function updateNavigationButtons() {
        const isFirstSlide = state.currentSlide === 1;
        const isLastSlide = state.currentSlide === state.totalSlides;

        elements.prevBtn.disabled = isFirstSlide;
        elements.nextBtn.disabled = isLastSlide;

        elements.prevBtn.setAttribute('aria-disabled', isFirstSlide.toString());
        elements.nextBtn.setAttribute('aria-disabled', isLastSlide.toString());
    }

    /**
     * Navega para o slide anterior
     */
    function goToPreviousSlide() {
        if (state.currentSlide > 1) {
            goToSlide(state.currentSlide - 1);
        }
    }

    /**
     * Navega para o próximo slide
     */
    function goToNextSlide() {
        if (state.currentSlide < state.totalSlides) {
            goToSlide(state.currentSlide + 1);
        }
    }

    /**
     * Navega para um slide pelo ID
     * @param {string} slideId - ID do slide
     */
    function goToSlideById(slideId) {
        const slideNumber = state.slideIdMap[slideId];
        if (slideNumber) {
            goToSlide(slideNumber);
        }
    }

    /**
     * Configura event listeners para botões de navegação
     */
    function setupNavigationListeners() {
        elements.prevBtn.addEventListener('click', goToPreviousSlide);
        elements.nextBtn.addEventListener('click', goToNextSlide);
        
        // Botões de próximo slide no final do conteúdo (mobile)
        document.querySelectorAll('.mobile-next-btn').forEach(btn => {
            btn.addEventListener('click', goToNextSlide);
        });
    }

    /**
     * Configura event listeners para indicadores
     */
    function setupIndicatorListeners() {
        elements.indicators.forEach(indicator => {
            indicator.addEventListener('click', () => {
                const slideNumber = parseInt(indicator.getAttribute('data-slide'), 10);
                goToSlide(slideNumber);
            });
        });
    }

    /**
     * Configura navegação por teclado
     */
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            const { key } = event;

            if (key === 'ArrowLeft' || key === 'ArrowUp') {
                event.preventDefault();
                goToPreviousSlide();
            } else if (key === 'ArrowRight' || key === 'ArrowDown') {
                event.preventDefault();
                goToNextSlide();
            }
        });
    }

    /**
     * Configura navegação por scroll do mouse (com throttle e detecção de scroll interno)
     */
    function setupWheelNavigation() {
        let scrollTimeout;
        const SCROLL_SAFEZONE = 800; // pixels de safezone antes de mudar slide

        document.addEventListener('wheel', (event) => {
            // Apenas em desktop (largura > 768px) permite trocar slide por scroll
            if (window.innerWidth <= 768) {
                return; // Bloqueia navegação por scroll em mobile
            }

            // Verifica se há conteúdo scrollável ativo
            const activeSlide = document.querySelector('.slide.active');
            const slideContent = activeSlide?.querySelector('.slide-content');
            
            if (slideContent) {
                const { scrollTop, scrollHeight, clientHeight } = slideContent;
                const isAtTop = scrollTop <= SCROLL_SAFEZONE;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_SAFEZONE;
                
                // Se está scrollando para baixo mas não está no fim do conteúdo, não muda slide
                if (event.deltaY > 0 && !isAtBottom) {
                    return;
                }
                
                // Se está scrollando para cima mas não está no topo do conteúdo, não muda slide
                if (event.deltaY < 0 && !isAtTop) {
                    return;
                }
            }

            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                if (event.deltaY > 0) {
                    goToNextSlide();
                } else {
                    goToPreviousSlide();
                }
            }, CONFIG.scrollThrottle);
        }, { passive: true });
    }

    /**
     * Configura navegação por touch/swipe para mobile
     */
    function setupTouchNavigation() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let isSwiping = false;

        const container = document.querySelector('.slider-container');

        container.addEventListener('touchstart', (event) => {
            // Ignora se o toque for em botões/indicadores
            if (event.target.closest('.navigation') || event.target.closest('.slide-indicators')) {
                return;
            }

            touchStartX = event.changedTouches[0].screenX;
            touchStartY = event.changedTouches[0].screenY;
            isSwiping = false;
        }, { passive: true });

        container.addEventListener('touchmove', (event) => {
            if (!isSwiping) {
                isSwiping = true;
            }
        }, { passive: true });

        container.addEventListener('touchend', (event) => {
            if (!isSwiping) return;

            touchEndX = event.changedTouches[0].screenX;
            touchEndY = event.changedTouches[0].screenY;
            handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        }, { passive: true });
    }

    /**
     * Processa o gesto de swipe (apenas horizontal em mobile)
     * @param {number} startX - Posição X inicial
     * @param {number} startY - Posição Y inicial
     * @param {number} endX - Posição X final
     * @param {number} endY - Posição Y final
     */
    function handleSwipe(startX, startY, endX, endY) {
        const diffX = startX - endX;
        const diffY = startY - endY;
        const absDiffX = Math.abs(diffX);
        const absDiffY = Math.abs(diffY);
        
        // Apenas swipe horizontal em mobile
        if (absDiffX > absDiffY && absDiffX > CONFIG.swipeThreshold) {
            if (diffX > 0) {
                // Swipe para esquerda - próximo slide
                goToNextSlide();
            } else {
                // Swipe para direita - slide anterior
                goToPreviousSlide();
            }
        }
    }

    /**
     * Configura detecção de mudanças no hash da URL
     */
    function setupHashChangeListener() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && state.slideIdMap[hash]) {
                goToSlideById(hash);
            }
        });
    }

    /**
     * Verifica e navega para o slide indicado no hash inicial
     */
    function handleInitialHash() {
        const hash = window.location.hash.substring(1);
        if (hash && state.slideIdMap[hash]) {
            goToSlideById(hash);
        }
    }

    /**
     * Imprime informações de debug no console
     */
    function logInitializationInfo() {
        console.log('🎨 Full Page Slider carregado!');
        console.log(`📊 Total de slides: ${state.totalSlides}`);
        console.log('⌨️  Use as setas do teclado ou scroll para navegar');
        console.log('\n📱 Links diretos disponíveis:');
        
        Object.keys(state.slideIdMap).forEach(id => {
            console.log(`   ${window.location.origin}${window.location.pathname}#${id}`);
        });
    }

    /**
     * Inicializa todos os event listeners
     */
    function setupEventListeners() {
        setupNavigationListeners();
        setupIndicatorListeners();
        setupKeyboardNavigation();
        setupWheelNavigation();
        setupTouchNavigation();
        setupHashChangeListener();
    }

    /**
     * Inicializa a aplicação
     */
    function init() {
        cacheElements();
        createSlideIdMap();
        updateNavigationButtons();
        setupEventListeners();
        logInitializationInfo();
    }

    /**
     * Inicializa quando o DOM estiver pronto
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
        window.addEventListener('load', handleInitialHash);
    } else {
        init();
        handleInitialHash();
    }

    // API pública
    return {
        goToSlide,
        goToSlideById,
        getCurrentSlide: () => state.currentSlide,
        getTotalSlides: () => state.totalSlides
    };
})();

