<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, InputText } from 'primevue';
import { useI18n } from 'vue-i18n';
import { Icons } from '@/types/icons';
import { TextUtil } from '@/utils/text';

const props = defineProps<{
    /** Tags used by other dishes, offered to tap */
    known: string[];
    inputId?: string;
}>();
const tags = defineModel<string[]>({ required: true });

const { t } = useI18n();
const newTag = ref('');

// Every tag to choose from: the known ones and the ones of this dish
const options = computed(() =>
    [...new Set([...props.known, ...tags.value])].sort((a, b) => TextUtil.compare(a, b)),
);

function toggle(tag: string) {
    tags.value = tags.value.includes(tag)
        ? tags.value.filter((current) => current !== tag)
        : [...tags.value, tag];
}

function add() {
    const tag = newTag.value.trim().toLowerCase();
    if (tag && !tags.value.includes(tag)) tags.value = [...tags.value, tag];
    newTag.value = '';
}
</script>

<template>
    <div class="tag-input">
        <div v-if="options.length" class="chips">
            <button
                v-for="tag in options"
                :key="tag"
                type="button"
                class="chip"
                :class="{ active: tags.includes(tag) }"
                :aria-pressed="tags.includes(tag)"
                @click="toggle(tag)"
            >
                <i v-if="tags.includes(tag)" :class="Icons.check" />
                {{ tag }}
            </button>
        </div>
        <div class="add">
            <InputText
                :id="inputId"
                v-model="newTag"
                :placeholder="t('dishes.tags.new_placeholder')"
                maxlength="30"
                autocapitalize="none"
                enterkeyhint="done"
                fluid
                @keydown.enter.prevent="add"
            />
            <Button
                :icon="Icons.plus"
                :aria-label="t('dishes.tags.add')"
                :disabled="!newTag.trim()"
                severity="secondary"
                outlined
                @click="add"
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
.tag-input {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: $spacing-xs;
    min-height: 40px;
    padding: 0 $spacing-sm-md;
    border: 1px solid $border-color;
    border-radius: $radius-full;
    background: $card-color;
    color: $text-color;
    font: inherit;
    font-size: $font-size-sm;
    cursor: pointer;

    i {
        font-size: $font-size-xs;
    }

    &.active {
        border-color: $primary-color;
        background: $primary-color;
        color: $primary-contrast-color;
    }
}

.add {
    display: flex;
    gap: $spacing-sm;

    :deep(.p-button) {
        flex-shrink: 0;
        width: $touch-target;
        height: $touch-target;
    }
}
</style>
