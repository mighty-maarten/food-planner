import { ref } from 'vue';
import { useEventListener } from '@vueuse/core';

/**
 * The part of the screen that is visible: smaller than the window while the on-screen keyboard is
 * open, and shifted (offsetTop) when iOS scrolls the page to keep a focused field in view.
 */
export function useVisualViewport() {
    const viewport = typeof window === 'undefined' ? null : window.visualViewport;
    const height = ref(
        viewport?.height ?? (typeof window === 'undefined' ? 0 : window.innerHeight),
    );
    const offsetTop = ref(viewport?.offsetTop ?? 0);

    function update() {
        if (!viewport) return;
        height.value = viewport.height;
        offsetTop.value = viewport.offsetTop;
    }

    if (viewport) {
        useEventListener(viewport, 'resize', update);
        useEventListener(viewport, 'scroll', update);
    }

    return { height, offsetTop };
}
