<template>
  <v-app style="min-height: 100vh !important;">
    <ConfirmDialog />
    <v-app-bar class="app-bar">
      <div class="app-bar__content">
        <LogoSelector @plant-type-change="handlePlantTypeChange" />
        <div class="d-flex align-center ml-auto">
        <div v-if="estimatedTime" class="mr-2 estimated-time">
          <v-icon size="small">mdi-timer-outline</v-icon>
          {{ calcEstimatedTime }}
        </div>
        <InfoButtons class="d-none d-sm-flex" />
        </div>
      </div>
    </v-app-bar>
    <v-main>
      <CrossbreedingSimulator
        :selected-plant-type-name="selectedPlantTypeName"
        :functional-cookies-accepted="functionalCookiesAccepted"
        @estimated-time-updated="handleEstimatedTimeUpdated"
      />
      <InfoButtons class="d-flex justify-center d-sm-none mb-3 flex-wrap" />
    </v-main>
    <CookieConsent @cookies-updated="handleCookiesUpdated" />
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import CrossbreedingSimulator from './components/CrossbreedingSimulator.vue';
import InfoButtons from './components/InfoButtons.vue';
import CookieConsent, { CookiesUpdateEvent } from './components/CookieConsent.vue';
import LogoSelector from './components/LogoSelector.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import 'cookie-store';
import { timeMsToTimeString } from './lib/time-utils';

@Component({
  components: {
    LogoSelector,
    CrossbreedingSimulator,
    InfoButtons,
    CookieConsent,
    ConfirmDialog
  }
})
export default class App extends Vue {
  functionalCookiesAccepted = false;
  selectedPlantTypeName: string | null = null;
  estimatedTime: number | null = null;

  get calcEstimatedTime() {
    if (this.estimatedTime) {
      return timeMsToTimeString(this.estimatedTime);
    }
    return null;
  }

  handleCookiesUpdated(cookiesState: CookiesUpdateEvent) {
    this.functionalCookiesAccepted = cookiesState.functionalCookiesAccepted;
  }

  handlePlantTypeChange(name: string) {
    this.selectedPlantTypeName = name;
  }

  handleEstimatedTimeUpdated(value: number | null) {
    this.estimatedTime = value;
  }
}
</script>

<style lang="scss">
.app-bar .v-toolbar__content {
  padding-left: 12px;
  padding-right: 12px;
}
.app-bar__content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
body {
  overflow: hidden;
}
@media (max-width: 599px) {
  .v-input__slider .v-input__slot {
    display: block !important;
  }
}
.v-input__slider .v-messages__message {
  margin-top: 10px;
}
</style>
