<template>
  <v-dialog
    :model-value="!!confirmState.pending"
    persistent
    max-width="500"
    @update:model-value="onDialogUpdate"
  >
    <v-card v-if="confirmState.pending">
      <v-card-title class="text-h6">{{ confirmState.pending.title }}</v-card-title>
      <v-card-text>{{ confirmState.pending.message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="answer(false)">
          {{ confirmState.pending.buttonFalseText }}
        </v-btn>
        <v-btn color="primary" variant="text" @click="answer(true)">
          {{ confirmState.pending.buttonTrueText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { confirmState } from '@/plugins/confirm';

function onDialogUpdate(value: boolean) {
  if (!value && confirmState.pending) {
    confirmState.pending.resolve(false);
    confirmState.pending = null;
  }
}

function answer(value: boolean) {
  if (confirmState.pending) {
    confirmState.pending.resolve(value);
    confirmState.pending = null;
  }
}
</script>
