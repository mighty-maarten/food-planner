import { computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';

/** Phones get bottom sheets and full-screen pickers instead of centered dialogs */
export function useIsPhone() {
    return useMediaQuery('(max-width: 575px)');
}

/** Dialog props: a bottom sheet on phones (in reach of the thumb), centered on larger screens */
export function useSheetDialog() {
    const isPhone = useIsPhone();
    return computed(() => ({
        position: isPhone.value ? ('bottom' as const) : ('center' as const),
        style: {
            width: isPhone.value ? '100vw' : '30rem',
            margin: isPhone.value ? '0' : undefined,
        },
        modal: true,
        dismissableMask: true,
        draggable: false,
    }));
}
