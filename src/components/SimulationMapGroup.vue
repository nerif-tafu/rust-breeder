<template>
  <div
    class="group mx-auto"
    :class="{ 'group--show': addAnimationAppearClass }"
    :style="{ '--appear-animation-duration': appearAnimationDuration + 'ms' }"
  >
    <div class="group_container">
      <div class="group_map-list">
        <div
          class="group_map-container"
          v-for="(map, index) in mapList"
          :key="
            (map.baseSapling ? map.baseSapling.toString() + '-' : '') +
              map.crossbreedingSaplings.map((sapling) => sapling.toString()).join('')
          "
        >
          <SimulationMap
            @click="handleMapClick(index)"
            @mouseenter="handleMapMouseEnter(index)"
            @mouseleave="handleMouseLeave(index)"
            @pointerleave="handleMouseLeave(index)"
            @touchmove="handleMouseLeave(index)"
            @mousedown="handleMapMouseDown(index)"
            @pointerdown="handleMapMouseDown(index)"
            @mouseup="handleMapMouseUp(index)"
            @pointerup="handleMapMouseUp(index)"
            :ref="index === 0 ? 'primaryMap' : null"
            class="group_map"
            :class="{
              'group_map--backing': index !== 0,
              'group_map--highlighted': map === highlightedMap,
              'group_map--backing-hovered': index !== 0 && isMouseHoveringBackingMap
            }"
            :key="
              (map.baseSapling ? map.baseSapling.toString() + '-' : '') +
                map.crossbreedingSaplings.map((sapling) => sapling.toString()).join('')
            "
            :map="map"
            enable-map-selection
            :enable-ripple="index === 0"
            :enable-tooltip="index === 0"
            :forced-height="index !== 0 ? backingMapHeight : null"
            enable-geographical-direction-tips
            :style="{
              'z-index': group.mapList.length - index
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-facing-decorator';
import SimulationMap from './SimulationMap.vue';
import { GeneticsMapGroup, GeneticsMap } from '@/services/crossbreeding-service/models';

@Component({
  components: { SimulationMap },
  emits: ['group-selected', 'map-selected']
})
export default class SimulationMapGroup extends Vue {
  @Prop({ type: Object, required: true }) readonly group!: GeneticsMapGroup;
  @Prop({ type: Object }) readonly highlightedMap: GeneticsMap;
  @Prop({ type: Number }) readonly index: number;

  backingMapHeight = 0;
  addAnimationAppearClass = false;

  isLongPressingMap = false;
  isMouseHoveringBackingMap = false;
  showAlternateCards = false;
  showAlternateCardsTimeoutRef: NodeJS.Timeout | null;

  appearAnimationDuration = 300;

  get hasBrowsingMessageSlotContent() {
    return this.$slots.browsingMessage;
  }

  get mapList() {
    return this.group.mapList.filter((_map, index) => index === 0 || this.computedShowAlternateCards);
  }

  get computedShowAlternateCards() {
    return this.showAlternateCards && !this.$vuetify.display.xs;
  }

  mounted() {
    this.playAppearAnimation();
  }

  @Watch('index')
  onIndexChange() {
    this.playAppearAnimation();
  }

  handleMapMouseEnter(index: number) {
    if (index !== 0) this.handleBackingMapMouseEnter();
  }

  handleMapMouseDown(index: number) {
    if (index === 0) this.handleMouseDown();
  }

  handleMapMouseUp(index: number) {
    if (index === 0) this.handleMouseUp();
  }

  playAppearAnimation() {
    this.showAlternateCards = false;
    this.addAnimationAppearClass = false;
    this.onNextTickRerender(() => {
      this.addAnimationAppearClass = true;
    });
    if (this.showAlternateCardsTimeoutRef) {
      clearTimeout(this.showAlternateCardsTimeoutRef);
    }
    // Alternate cards should be shown after the entry animation is finished to prevent animation flicker.
    this.showAlternateCardsTimeoutRef = setTimeout(() => {
      this.showAlternateCardsTimeoutRef = null;
      this.setForcedHeight();
      this.showAlternateCards = true;
    }, this.appearAnimationDuration);
  }

  updated() {
    this.setForcedHeight();
  }

  setForcedHeight() {
    const ref = this.$refs.primaryMap;
    if (!ref) return;
    const component = Array.isArray(ref) ? ref[0] : ref;
    const el = component?.$el as HTMLElement | undefined;
    if (el?.offsetHeight != null) {
      this.backingMapHeight = el.offsetHeight;
    }
  }

  handleMapClick(index: number) {
    if (index !== 0) {
      this.handleBackingMapClick();
    } else {
      this.handlePrimaryMapClick(this.group.mapList[index]);
    }
  }

  handleBackingMapClick() {
    this.$emit('group-selected', this.group);
  }

  handlePrimaryMapClick(map: GeneticsMap) {
    setTimeout(() => {
      this.$emit('map-selected', map);
    }, 100);
  }

  handleBackingMapMouseEnter() {
    this.isMouseHoveringBackingMap = true;
  }

  handleMouseLeave(index: number) {
    if (index === 0) {
      this.isLongPressingMap = false;
    } else {
      this.isMouseHoveringBackingMap = false;
    }
  }

  handleMouseDown() {
    this.isLongPressingMap = true;
    setTimeout(() => {
      if (this.isLongPressingMap) {
        this.$emit('group-selected', this.group);
      }
    }, 500);
  }

  handleMouseUp() {
    this.isLongPressingMap = false;
  }
}
</script>

<style scoped lang="scss">
.group {
  z-index: 0;
  width: 320px;
  position: relative;
  transform: scale(0.935);
  opacity: 0.6;
  .group_map {
    transition: transform 0.2s;
    position: relative;
    transform-origin: bottom right;
    &.group_map--backing {
      position: absolute;
      overflow: hidden;
      top: 0;
    }
    &.group_map--highlighted {
      box-shadow: 0px 0px 1px 2px var(--v-cardHighlight-base);
      border: 1px solid var(--v-cardHighlight-base);
    }
  }
  &:hover {
    .group_map-container:nth-child(2) .group_map {
      transform: rotate(9deg);
      &.group_map--backing-hovered {
        transition: transform 0.1s;
        transform: rotate(13deg);
      }
    }
    .group_map-container:nth-child(3) .group_map {
      transform: rotate(18deg);
      &.group_map--backing-hovered {
        transition: transform 0.1s;
        transform: rotate(26deg);
      }
    }
  }
  &.group--show {
    transition: transform var(--appear-animation-duration) cubic-bezier(0, 1.45, 1, 1.43),
      opacity var(--appear-animation-duration) ease-in;
    opacity: 1;
    transform: scale(1);
  }
}
</style>
