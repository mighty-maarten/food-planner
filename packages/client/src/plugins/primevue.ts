import { type Plugin } from 'vue';
import PrimeVue from 'primevue/config';
import { DialogService, ToastService } from 'primevue';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import Ripple from 'primevue/ripple';
import { primevuePreset } from '../styles/primevue-preset';
import { nl } from 'primelocale/js/nl.js';

export const primevuePlugin: Plugin = {
    install(app) {
        app.use(DialogService);
        app.use(ConfirmationService);
        app.use(ToastService);

        app.use(PrimeVue, {
            ripple: true,
            theme: {
                preset: primevuePreset,
                options: {
                    darkModeSelector: 'system',
                },
            },

            locale: nl,
        });

        app.directive('ripple', Ripple);
        app.directive('tooltip', Tooltip);
    },
};
