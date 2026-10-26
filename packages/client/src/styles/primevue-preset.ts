import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { Colors, SurfaceScale } from '@/styles/colors';

export const primevuePreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#FDF3EF',
            100: '#FADFD4',
            200: '#F4BFA9',
            300: '#EC9877',
            400: '#E2714B',
            500: Colors.tomato,
            600: '#B04322',
            700: '#8C351D',
            800: '#6B2A19',
            900: '#4D1F13',
            950: '#2B110A',
        },
        colorScheme: {
            light: {
                surface: SurfaceScale,
                text: {
                    color: SurfaceScale[950],
                    mutedColor: SurfaceScale[600],
                },
            },
            dark: {
                surface: SurfaceScale,
                primary: {
                    color: '{primary.400}',
                    contrastColor: SurfaceScale[950],
                    hoverColor: '{primary.300}',
                    activeColor: '{primary.200}',
                },
                text: {
                    color: SurfaceScale[50],
                    mutedColor: SurfaceScale[400],
                },
            },
        },
    },
});
