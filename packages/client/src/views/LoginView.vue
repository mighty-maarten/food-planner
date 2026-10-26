<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastMessages } from '@/composables/toast';
import { Button, IconField, InputIcon, InputText, Password } from 'primevue';
import { useI18n } from 'vue-i18n';
import { useForm } from 'vee-validate';
import * as yup from 'yup';
import { Icons } from '@/types/icons';
import { defaultRedirectRoute } from '@/router/utils';
// Served from public/, also the source of the generated PWA icons
const logoUrl = '/logo.svg';

const router = useRouter();
const authStore = useAuthStore();
const { errorToast } = useToastMessages();
const { t } = useI18n();

const schema = yup.object({
    email: yup.string().required().email(),
    password: yup.string().required().min(1),
});

const { defineField, handleSubmit, meta } = useForm({
    validationSchema: schema,
});

const [email] = defineField('email');
const [password] = defineField('password');

const onSubmit = handleSubmit(async (values) => {
    await authStore.login({
        email: values.email,
        password: values.password,
    });

    if (authStore.isAuthenticated) {
        await router.push(defaultRedirectRoute);
    } else if (authStore.hasError('login')) {
        errorToast(t('auth.login.error'), '');
    }
});
</script>

<template>
    <main class="login-container">
        <div class="login-card">
            <div class="title">
                <img :src="logoUrl" alt="" class="logo" />
                <h1>{{ t('app.name') }}</h1>
                <p>{{ t('app.tagline') }}</p>
            </div>
            <form class="login-form" @submit.prevent="onSubmit">
                <IconField>
                    <InputIcon :class="Icons.user" />
                    <InputText
                        id="email"
                        v-model="email"
                        type="email"
                        :placeholder="t('auth.login.email_placeholder')"
                        :disabled="authStore.isLoading('login')"
                        fluid
                        required
                        autocomplete="email"
                        autocapitalize="none"
                    />
                </IconField>

                <IconField>
                    <InputIcon :class="Icons.lock" />
                    <Password
                        id="password"
                        v-model="password"
                        :placeholder="t('auth.login.password_placeholder')"
                        :feedback="false"
                        :disabled="authStore.isLoading('login')"
                        toggle-mask
                        required
                        fluid
                        autocomplete="current-password"
                    />
                </IconField>

                <Button
                    type="submit"
                    :label="t('auth.login.submit')"
                    :loading="authStore.isLoading('login')"
                    :disabled="!meta.valid"
                    size="large"
                    class="login-button"
                />
            </form>
        </div>
    </main>
</template>

<style scoped lang="scss">
.login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100dvh;
    padding: $spacing-md;
    background: $background-color;

    .login-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $spacing-xl;
        width: 100%;
        max-width: 380px;

        .title {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;

            .logo {
                width: 88px;
                height: 88px;
                margin-bottom: $spacing-md;
            }

            h1 {
                font-size: $font-size-2xl;
            }

            p {
                margin-top: $spacing-xs;
                color: $text-muted-color;
            }
        }

        .login-form {
            display: flex;
            flex-direction: column;
            gap: $spacing-md;
            width: 100%;

            .login-button {
                width: 100%;
                border-radius: $radius-full;
                margin-top: $spacing-sm;
            }
        }
    }
}
</style>
