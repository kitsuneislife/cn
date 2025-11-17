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
     * Configura navegação por scroll do mouse (com throttle)
     */
    function setupWheelNavigation() {
        let scrollTimeout;

        document.addEventListener('wheel', (event) => {
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
        let touchStartY = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (event) => {
            touchStartY = event.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (event) => {
            touchEndY = event.changedTouches[0].screenY;
            handleSwipe(touchStartY, touchEndY);
        }, { passive: true });
    }

    /**
     * Processa o gesto de swipe
     * @param {number} startY - Posição Y inicial
     * @param {number} endY - Posição Y final
     */
    function handleSwipe(startY, endY) {
        const diff = startY - endY;

        if (Math.abs(diff) > CONFIG.swipeThreshold) {
            if (diff > 0) {
                // Swipe para cima - próximo slide
                goToNextSlide();
            } else {
                // Swipe para baixo - slide anterior
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

