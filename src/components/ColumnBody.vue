<template>
  <q-tr>
    <q-td auto-width>
      <q-btn
        v-show="row.scores.length > 1"
        flat
        dense
        size="sm"
        :icon="isExpanded ? 'remove' : 'add'"
        @click="expandRow"
      />
    </q-td>

    <q-td auto-width>
      <q-img
        :src="imageSrc"
        fit="scale-down"
        class="image"
        @error="onImageError(row.beatmap)"
      >
        <template #error>
          <q-icon
            class="full-width full-height"
            size="xl"
            name="image_not_supported"
          />
        </template>
      </q-img>
    </q-td>

    <q-td
      v-if="visibleColumns.includes('name')"
      class="text-center"
    >
      <a
        v-if="STATUS.get(row.beatmap.status) !== UNSUBMITTED"
        href="#"
        class="text-primary"
        @click.prevent="openURL(`https://osu.ppy.sh/b/${row.beatmap.beatmapId}`)"
        @auxclick.prevent
        @keypress.prevent
      >{{ row.beatmap.name }}</a>
      <span v-else>{{ row.beatmap.name }}</span>
    </q-td>

    <q-td
      v-if="visibleColumns.includes('status')"
      class="text-center"
    >
      {{ STATUS.get(row.beatmap.status) }}
    </q-td>

    <GamemodeCell
      :score="firstScore"
      :beatmap="row.beatmap"
    />

    <ScoreCell
      :score="firstScore"
    />

    <GradeCell
      :score="firstScore"
    />

    <AccuracyCell
      :score="firstScore"
    />

    <MissesCell
      :score="firstScore"
    />

    <ComboCell
      :score="firstScore"
    />

    <ModsCell
      :score="firstScore"
    />

    <DateCell
      :score="firstScore"
    />

    <PpCell
      :score="firstScore"
    />
  </q-tr>

  <q-tr
    v-for="(score, index) in row.scores"
    v-show="isExpanded && score !== firstScore"
    :key="`${score.date}${index}`"
  >
    <q-td
      v-for="tdIndex in 4"
      :key="tdIndex"
    />

    <GamemodeCell
      :score="score"
      :beatmap="row.beatmap"
    />

    <ScoreCell
      :score="score"
    />

    <GradeCell
      :score="score"
    />

    <AccuracyCell
      :score="score"
    />

    <MissesCell
      :score="score"
    />

    <ComboCell
      :score="score"
    />

    <ModsCell
      :score="score"
    />

    <DateCell
      :score="score"
    />

    <PpCell
      :score="score"
    />
  </q-tr>
</template>

<script lang="ts">
import DatabaseResponse, { Beatmap, Score, STATUS, UNSUBMITTED } from 'src/interfaces/DatabaseResponse'
import { defineComponent, PropType, watch, ref } from 'vue'
import GamemodeCell from 'src/components/cells/Gamemode.vue'
import ScoreCell from 'src/components/cells/Score.vue'
import GradeCell from 'src/components/cells/Grade.vue'
import AccuracyCell from 'src/components/cells/Accuracy.vue'
import MissesCell from 'src/components/cells/Misses.vue'
import ComboCell from 'src/components/cells/Combo.vue'
import ModsCell from 'src/components/cells/Mods.vue'
import DateCell from 'src/components/cells/Date.vue'
import PpCell from 'src/components/cells/Pp.vue'
import SettingsService from 'src/services/SettingsService'
import PlatformService from 'src/services/PlatformService'

export default defineComponent({
  name: 'ColumnBody',

  components: {
    GamemodeCell,
    ScoreCell,
    GradeCell,
    AccuracyCell,
    MissesCell,
    ComboCell,
    ModsCell,
    DateCell,
    PpCell
  },

  props: {
    row: {
      type: Object as PropType<DatabaseResponse>,
      required: true
    },
    firstScore: {
      type: Object as PropType<Score | undefined>,
      required: true
    },
    expanded: {
      type: Object as PropType<Map<number, boolean>>,
      required: true
    }
  },

  emits: ['update:expand'],

  setup (props, context) {
    const { visibleColumns, osuPath } = SettingsService()
    const platformService = PlatformService()

    const getImageSrc = (beatmap: Beatmap) => {
      return (beatmap.filePath !== undefined && beatmap.filePath.length > 0)
        ? `atom://${osuPath.value}/Songs/${beatmap.filePath}`
        : `https://b.ppy.sh/thumb/${beatmap.beatmapsetId}l.jpg`
    }

    const getExpanded = (key: number) => {
      return props.expanded.get(key) === true
    }

    const key = ref(props.row.beatmap.beatmapId)
    const imageSrc = ref(getImageSrc(props.row.beatmap))
    const isExpanded = ref(getExpanded(key.value))

    watch(props, () => {
      if (props.row.beatmap.beatmapId !== key.value) {
        imageSrc.value = getImageSrc(props.row.beatmap)
      }
      key.value = props.row.beatmap.beatmapId

      isExpanded.value = getExpanded(key.value)
    })

    const onImageError = (beatmap: Beatmap) => { imageSrc.value = `https://b.ppy.sh/thumb/${beatmap.beatmapsetId}l.jpg` }
    const openURL = (url: string) => { platformService.openURL(url) }
    const expandRow = () => { context.emit('update:expand', props.row.beatmap.beatmapId) }

    return {
      visibleColumns,
      osuPath,
      imageSrc,
      onImageError,
      openURL,
      expandRow,
      isExpanded,
      STATUS,
      UNSUBMITTED
    }
  }
})
</script>
