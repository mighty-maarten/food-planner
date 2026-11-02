<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import DayCard from '@/components/plan/DayCard.vue';
import type { PlanDay } from '@/api/services/types/plans';
import { DateUtil } from '@/utils/date';

const props = defineProps<{ planId: string; days: PlanDay[]; today: string }>();
/** The day in view; starts at today when not given or not in the plan */
const date = defineModel<string | null>('date', { default: null });
const emit = defineEmits<{ chooseDish: [day: PlanDay]; move: [day: PlanDay] }>();

const { t } = useI18n();
const track = useTemplateRef('track');
const strip = useTemplateRef('strip');

function startIndex(): number {
    for (const wanted of [date.value, props.today]) {
        const found = props.days.findIndex((day) => day.date === wanted);
        if (found >= 0) return found;
    }
    return 0;
}

const index = ref(startIndex());
const current = computed(() => props.days[index.value]);

// Fewer days after changing the plan's dates
watch(
    () => props.days.length,
    (length) => {
        if (index.value >= length) index.value = Math.max(length - 1, 0);
    },
);

/** The distance between two slides: a slide and the gap after it */
function slideStep(element: HTMLElement): number {
    const [first, second] = element.children;
    if (first instanceof HTMLElement && second instanceof HTMLElement) {
        return second.offsetLeft - first.offsetLeft;
    }
    return element.clientWidth;
}

function scrollTo(target: number, behavior: ScrollBehavior = 'smooth') {
    const element = track.value;
    if (!element) return;
    element.scrollTo({ left: target * slideStep(element), behavior });
}

// The URL follows once the swipe has settled, not on every frame
const syncDate = useDebounceFn(() => {
    if (current.value) date.value = current.value.date;
}, 200);

function onScroll() {
    const element = track.value;
    if (!element) return;
    const next = Math.round(element.scrollLeft / slideStep(element));
    index.value = Math.min(Math.max(next, 0), props.days.length - 1);
    void syncDate();
}

// Keep the chosen day in the middle of the strip (scrolled by hand: no jump of the page)
watch(index, async () => {
    await nextTick();
    const element = strip.value;
    const button = element?.children[index.value];
    if (!element || !(button instanceof HTMLElement)) return;
    element.scrollTo({
        left: button.offsetLeft - (element.clientWidth - button.offsetWidth) / 2,
        behavior: 'smooth',
    });
});

onMounted(() => {
    scrollTo(index.value, 'instant');
});
</script>

<!-- The week menu one day at a time: swipe sideways, or tap a day in the strip -->
<template>
    <div class="day-carousel">
        <div ref="strip" class="strip" role="group" :aria-label="t('plan.carousel.choose_day')">
            <button
                v-for="(day, i) in days"
                :key="day.date"
                type="button"
                class="strip-day"
                :class="{ active: i === index, today: day.date === today, planned: day.dish }"
                :aria-label="`${DateUtil.formatWeekday(day.date)} ${DateUtil.formatDayMonth(day.date)}`"
                :aria-current="i === index"
                @click="scrollTo(i)"
            >
                <span class="weekday">{{ DateUtil.formatWeekdayShort(day.date) }}</span>
                <span class="number">{{ Number(day.date.slice(8)) }}</span>
                <span class="mark" />
            </button>
        </div>

        <div
            ref="track"
            class="track"
            tabindex="0"
            role="group"
            :aria-roledescription="t('plan.carousel.pager')"
            :aria-label="t('plan.carousel.days')"
            @scroll.passive="onScroll"
        >
            <div v-for="(day, i) in days" :key="day.date" class="slide" :inert="i !== index">
                <DayCard
                    :plan-id="planId"
                    :day="day"
                    :is-today="day.date === today"
                    @choose-dish="emit('chooseDish', day)"
                    @move="emit('move', day)"
                />
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.day-carousel {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm-md;
}

// To the edges of the screen, so the strip and the cards scroll under the page padding
.strip,
.track {
    margin: 0 (-$spacing-md);
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
}

// Positioned: the offsets of its days are measured from it
.strip {
    position: relative;
    display: flex;
    gap: $spacing-xs;
    padding: 0 $spacing-md;
    overflow-x: auto;
}

.strip-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1 0 $touch-target;
    gap: $spacing-xxs;
    min-height: $touch-target + $spacing-md;
    padding: $spacing-xs 0;
    border: 1px solid transparent;
    border-radius: $radius-lg;
    background: none;
    color: $text-muted-color;
    font: inherit;
    cursor: pointer;

    .weekday {
        font-size: $font-size-xs;
        text-transform: capitalize;
    }

    .number {
        color: $text-color;
        font-size: $font-size-md;
        font-weight: $font-weight-semibold;
        font-variant-numeric: tabular-nums;
    }

    // A dot for a day with a dish
    .mark {
        width: 6px;
        height: 6px;
        border-radius: $radius-full;
    }

    &.planned .mark {
        background: $text-muted-color;
    }

    &.today {
        border-color: $primary-color;
    }

    &.active {
        background: $primary-color;
        color: $primary-contrast-color;

        .number {
            color: inherit;
        }

        &.planned .mark {
            background: $primary-contrast-color;
        }
    }
}

.track {
    display: flex;
    align-items: flex-start;
    gap: $spacing-sm;
    // The neighbours peek in from the sides: there is more to swipe to
    padding: 0 $spacing-lg;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;

    &:focus-visible {
        outline: 2px solid $primary-color;
        outline-offset: -2px;
    }
}

.slide {
    flex: 0 0 100%;
    scroll-snap-align: center;
    scroll-snap-stop: always;
    // Room for the today ring of the card
    padding: 2px 0;
}
</style>
