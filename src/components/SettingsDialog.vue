<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card>
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title>Settings</q-toolbar-title>
        <q-btn
          v-close-popup
          icon="close"
          flat
          round
          dense
        />
      </q-toolbar>

      <q-form @submit="onOKClick">
        <div class="column q-pa-md q-gutter-sm">
          <q-input
            v-model="osuPath"
            readonly
            name="osu-path"
            label="osu! Folder"
          >
            <template #append>
              <q-btn
                flat
                round
                dense
                icon="create_new_folder"
                @click="openFolderPicker"
              />
            </template>
          </q-input>

          <q-btn-dropdown
            no-caps
            label="Visible columns"
          >
            <q-option-group
              v-model="visibleColumns"
              type="checkbox"
              :options="tableColumns"
            />
          </q-btn-dropdown>

          <q-btn
            no-caps
            @click="getBeatmaps"
          >
            Refresh all beatmaps
          </q-btn>

          <!-- TODO Check replay hash, if none or missing -> add it?
          <q-btn
            no-caps
            @click="syncReplays"
          >
            <q-tooltip>
              Add all replays not stored in your local scores
            </q-tooltip>
            Sync replays
          </q-btn>
          !-->

          <div class="row q-pt-md">
            <q-space />

            <q-btn
              color="primary"
              label="Confirm"
              type="submit"
            />
          </div>
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { useDialogPluginComponent } from 'quasar'
import { defineComponent } from 'vue'
import PlatformService from 'src/services/PlatformService'
import SettingsService from 'src/services/SettingsService'
import useScore, { COLUMNS } from 'src/composables/useScore'

export default defineComponent({
  emits: [...useDialogPluginComponent.emits],

  setup () {
    const platformService = PlatformService()
    const { osuPath, visibleColumns } = SettingsService()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    const { getBeatmaps } = useScore()

    const openFolderPicker = () => {
      platformService.openFilePicker(osuPath.value)
        .then((result) => {
          const newOsuPath = result.filePaths[0]
          if (newOsuPath === undefined || newOsuPath.length === 0) return

          osuPath.value = newOsuPath
        })
        .catch(console.error)
    }

    const tableColumns = Object.entries(COLUMNS).map(([name, label]) => {
      return {
        label,
        value: name
      }
    }).filter((entry) => entry.value !== 'name')

    return {
      dialogRef,
      onDialogHide,
      onOKClick: () => {
        onDialogOK()
      },
      onCancelClick: onDialogCancel,
      openFolderPicker,
      osuPath,
      visibleColumns,
      tableColumns,
      getBeatmaps
    }
  }
})
</script>
