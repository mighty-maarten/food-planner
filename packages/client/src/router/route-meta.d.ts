import type { Component } from 'vue';
import 'vue-router';

export {};

declare module 'vue-router' {
    interface RouteMeta {
        layout?: Component;
        /** i18n key of the page title, shown in the browser tab */
        title?: string;
        /** Accessible without being logged in */
        public?: boolean;
    }
}
