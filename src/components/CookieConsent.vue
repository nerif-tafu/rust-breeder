<template>
  <div>
    <v-btn
      class="cookie-consent_remanage-button"
      icon
      v-if="!isSnackbarOpen && !isManageModalOpen"
      @click="handleCookieButtonClick"
    >
      <v-icon size="large">mdi-cookie</v-icon>
    </v-btn>
    <v-snackbar v-model="isSnackbarOpen" multi-line :timeout="-1" location="bottom">
      <div class="d-flex">
        <v-icon size="large" class="cookie-consent_snackbar-cookie-icon d-none d-sm-flex">
          mdi-cookie
        </v-icon>
        <div>
          This site uses cookies and local storage to deliver its services. Functionalities like previously calculated
          genes and saving your preferred options require your acceptance to work.
        </div>
        <div class="cookie-consent_actions flex-column d-flex ml-2">
          <v-btn color="primary" @click="handleAcceptAllClick">Accept all</v-btn>
          <v-btn @click="handleDeclineAllClick">Decline all</v-btn>
          <v-btn variant="text" @click="handleManageClick">Manage</v-btn>
        </div>
      </div>
    </v-snackbar>

    <v-dialog v-model="isManageModalOpen" max-width="600" @click:outside="handleManageModalClose">
      <v-card>
        <v-card-title class="text-h5 px-3 px-sm-5">
          <v-icon size="large" class="mr-2">mdi-cookie</v-icon>
          Manage Your Storage Preferences
        </v-card-title>
        <v-card-text>
          <v-switch
            v-model="essentialCookiesAccepted"
            disabled
            label="Enable Essential Cookies"
            hint="These cookies are necessary to track your Storage preferences."
            persistent-hint
          />
          <v-switch
            v-model="currentFunctionalCookiesAccepted"
            label="Allow Functional Cookies and Local Storage"
            hint="Controls whether functionalities like previously calculated genes and saving your preferred options are enabled."
            persistent-hint
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="handleManageModalClose">Close</v-btn>
          <v-btn color="primary" @click="handleSavePreferences">Save Preferences</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import { getCookie, getCookies, setCookie, removeCookie } from 'typescript-cookie';
import { OPTIONS_COOKIE_PREFIX } from './Options.vue';

export type CookiesUpdateEvent = {
  functionalCookiesAccepted: boolean;
};

const CONSENTS_VERSION = 1;
const PREF_COOKIE_NAME_PREFIX = `rb-cookie-pref-v${CONSENTS_VERSION}`;
const STORAGE_PREFERENCE_DECIDED_COOKIE_NAME = `${PREF_COOKIE_NAME_PREFIX}-storage-preference-decided`;
const FUNCTIONAL_GROUP_COOKIE_NAME = `${PREF_COOKIE_NAME_PREFIX}-functional-cookies-and-storage`;

const FUNCTIONAL_DECLINE_CONFIRM_MODAL_TEXT =
  'You might lose previously saved genes or your saved preferred options.';
const FUNCTIONAL_DECLINE_CONFIRM_MODAL_OPTIONS = {
  title: 'Warning',
  buttonTrueText: 'Proceed Anyway',
  buttonFalseText: 'Cancel'
};

const PREFERENCE_EXPIRATION_DAYS = 182;
const CHOICE_EXPIRATION_DAYS = 365;

@Component({ emits: ['cookies-updated'] })
export default class CookieConsent extends Vue {
  isSnackbarOpen = false;
  isManageModalOpen = false;
  arePreferencesSet = false;
  essentialCookiesAccepted = true;
  functionalCookiesAccepted = getCookie(FUNCTIONAL_GROUP_COOKIE_NAME) === 'true' || false;
  currentFunctionalCookiesAccepted = this.functionalCookiesAccepted;

  mounted() {
    this.arePreferencesSet = getCookie(STORAGE_PREFERENCE_DECIDED_COOKIE_NAME) === 'true';
    if (this.arePreferencesSet) {
      this.fireCookieStateUpdateEvent();
      this.setGroupChoiceCookies();
    } else {
      this.isSnackbarOpen = true;
    }
  }

  handleAcceptAllClick() {
    this.trackPreferencesSet();
    this.acceptFunctionalCookies();
    this.fireCookieStateUpdateEvent();
    this.isSnackbarOpen = false;
  }

  handleDeclineAllClick() {
    this.isSnackbarOpen = false;
    this.checkIfNeedsConfirmationModal(true).then((confirmed: boolean) => {
      if (confirmed) {
        this.trackPreferencesSet();
        this.declineFunctionalCookies();
        this.fireCookieStateUpdateEvent();
        this.isSnackbarOpen = false;
      } else {
        this.isSnackbarOpen = true;
      }
    });
  }

  handleManageClick() {
    this.isSnackbarOpen = false;
    this.isManageModalOpen = true;
  }

  handleCookieButtonClick() {
    this.isManageModalOpen = true;
  }

  handleSavePreferences() {
    this.isManageModalOpen = false;
    this.checkIfNeedsConfirmationModal(this.currentFunctionalCookiesAccepted === false).then((confirmed: boolean) => {
      if (confirmed) {
        this.trackPreferencesSet();
        this.functionalCookiesAccepted = this.currentFunctionalCookiesAccepted;
        this.setGroupChoiceCookies();
        this.fireCookieStateUpdateEvent();
      } else {
        this.isManageModalOpen = true;
      }
    });
  }

  setGroupChoiceCookies() {
    if (this.functionalCookiesAccepted) {
      this.acceptFunctionalCookies();
    } else {
      this.declineFunctionalCookies();
    }
  }

  checkIfNeedsConfirmationModal(willDeclineFunctionalCookies: boolean) {
    return this.functionalCookiesAccepted && willDeclineFunctionalCookies
      ? (this as unknown as { $confirm: (text: string, options?: object) => Promise<boolean> }).$confirm(
          FUNCTIONAL_DECLINE_CONFIRM_MODAL_TEXT,
          FUNCTIONAL_DECLINE_CONFIRM_MODAL_OPTIONS
        )
      : Promise.resolve(true);
  }

  handleManageModalClose() {
    this.isManageModalOpen = false;
    this.currentFunctionalCookiesAccepted = this.functionalCookiesAccepted;
    if (!this.arePreferencesSet) {
      this.isSnackbarOpen = true;
    }
  }

  trackPreferencesSet() {
    this.arePreferencesSet = true;
    setCookie(STORAGE_PREFERENCE_DECIDED_COOKIE_NAME, true, { expires: PREFERENCE_EXPIRATION_DAYS });
  }

  acceptFunctionalCookies() {
    this.functionalCookiesAccepted = true;
    this.currentFunctionalCookiesAccepted = this.functionalCookiesAccepted;
    setCookie(FUNCTIONAL_GROUP_COOKIE_NAME, String(this.functionalCookiesAccepted), { expires: CHOICE_EXPIRATION_DAYS });
  }

  declineFunctionalCookies() {
    this.functionalCookiesAccepted = false;
    this.currentFunctionalCookiesAccepted = this.functionalCookiesAccepted;
    setCookie(FUNCTIONAL_GROUP_COOKIE_NAME, String(this.functionalCookiesAccepted), { expires: CHOICE_EXPIRATION_DAYS });
    this.clearFunctionalCookiesAndStorage();
  }

  fireCookieStateUpdateEvent() {
    this.$emit('cookies-updated', {
      functionalCookiesAccepted: this.functionalCookiesAccepted
    } as CookiesUpdateEvent);
  }

  clearFunctionalCookiesAndStorage() {
    Object.keys(getCookies())
      .filter((cookieName) => cookieName.startsWith(OPTIONS_COOKIE_PREFIX))
      .forEach((cookieName) => {
        removeCookie(cookieName);
      });
    localStorage.clear();
  }
}
</script>

<style scoped lang="scss">
.cookie-consent_actions {
  gap: 10px;
}
.cookie-consent_snackbar-cookie-icon {
  position: absolute;
  top: -15px;
  left: -12px;
}
.cookie-consent_remanage-button {
  position: fixed;
  z-index: 1;
  bottom: 10px;
  left: 10px;
}
</style>
