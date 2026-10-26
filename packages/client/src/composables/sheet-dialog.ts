import { computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';

/** Dialog props: a bottom sheet on phones (in reach of the thumb), centered on larger screens */
export function useSheetDialog() {
    const isPhone = useMediaQuery('(max-width: 575px)');
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
