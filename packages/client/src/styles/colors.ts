// Food Planner palette: tomato, herb green and saffron on warm cream
export const Colors = {
    tomato: '#D2552C', // Primary actions
    herb: '#5E7A3A', // Ticked / fresh
    saffron: '#E9A23B', // Highlights, "needed soon"
    cream: '#FBF8F3', // Light background
    espresso: '#18140F', // Dark background
} as const;

// Warm neutral scale, used for both color schemes
const warmSurface = {
    0: '#FFFFFF',
    50: Colors.cream,
    100: '#F5EFE6',
    200: '#EAE1D3',
    300: '#D9CCB8',
    400: '#B8A890',
    500: '#94846C',
    600: '#736550',
    700: '#574C3C',
    800: '#3D352A',
    900: '#28221B',
    950: Colors.espresso,
};

export const SurfaceScale = warmSurface;
