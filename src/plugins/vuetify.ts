import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import colors from 'vuetify/util/colors';

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: colors.cyan.darken2,
          'card-highlight': '#FFFFFF',
        },
      },
      light: {
        dark: false,
        colors: {
          primary: colors.cyan.darken2,
          'card-highlight': colors.green.accent4,
        },
      },
    },
  },
});
