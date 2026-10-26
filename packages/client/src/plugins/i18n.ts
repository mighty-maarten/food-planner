import { type Plugin } from 'vue';
import { createI18n } from 'vue-i18n';
import nl from '@/assets/locales/nl.json';

// The app is Dutch only, all UI text still lives in the locale file
const instance = createI18n({
    legacy: false,
    locale: 'nl',
    fallbackLocale: 'nl',
    messages: { nl },
});

export const i18nPlugin: Plugin = {
    install(app) {
        app.use(instance);
    },
};

export const i18n = instance.global;
