<template>
  <q-tr>
    <q-th />
    <q-th>
      <q-checkbox
        v-model="filter.highestScorePerMode"
        left-label
        label="Top scores only"
      />
    </q-th>

    <q-th v-if="visibleColumns.includes('name')">
      <q-input
        v-model="filter.search"
        dense
        borderless
        debounce="300"
        placeholder="Search"
        input-class="text-center"
      />
    </q-th>

    <q-th v-if="visibleColumns.includes('status')">
      <q-btn-dropdown
        flat
        dense
        no-caps
        label="Status"
      >
        <q-option-group
          v-model="filter.status"
          type="checkbox"
          :options="statusList"
        />
      </q-btn-dropdown>
    </q-th>

    <q-th v-if="visibleColumns.includes('gamemode')">
      <q-btn-dropdown
        flat
        dense
        no-caps
        label="Gamemode"
      >
        <q-option-group
          v-model="filter.gamemode"
          type="checkbox"
          :options="gamemodeList"
        />
      </q-btn-dropdown>
    </q-th>

    <q-th v-if="visibleColumns.includes('score')">
      <q-input
        v-model.number="filter.scoreMin"
        dense
        borderless
        type="number"
        debounce="300"
        placeholder="Min"
        input-class="text-center"
      />

      <q-input
        v-model.number="filter.scoreMax"
        dense
        borderless
        type="number"
        debounce="300"
        placeholder="Max"
        input-class="text-center"
      />
    </q-th>

    <q-th v-if="visibleColumns.includes('grade')">
      <q-btn-dropdown
        flat
        dense
        no-caps
        label="Grade"
      >
        <q-option-group
          v-model="filter.grade"
          type="checkbox"
          :options="gradeList"
        />
      </q-btn-dropdown>
    </q-th>

    <q-th v-if="visibleColumns.includes('accuracy')">
      <q-input
        v-model.number="filter.accuracyMin"
        dense
        borderless
        suffix="%"
        type="number"
        debounce="300"
        placeholder="Min"
        input-class="text-center"
      />

      <q-input
        v-model.number="filter.accuracyMax"
        dense
        borderless
        suffix="%"
        type="number"
        debounce="300"
        placeholder="Max"
        input-class="text-center"
      />
    </q-th>

    <q-th v-if="visibleColumns.includes('misses')">
      <q-input
        v-model.number="filter.missesMin"
        dense
        borderless
        type="number"
        debounce="300"
        placeholder="Min"
        input-class="text-center"
      />

      <q-input
        v-model.number="filter.missesMax"
        dense
        borderless
        type="number"
        debounce="300"
        placeholder="Max"
        input-class="text-center"
      />
    </q-th>

    <q-th v-if="visibleColumns.includes('combo')">
      <q-btn-dropdown
        flat
        dense
        no-caps
        label="Combo"
      >
        <div class="row">
          <div class="column">
            <span class="text-center q-my-sm">
              Combo
            </span>

            <q-input
              v-model.number="filter.comboMin"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Min"
              input-class="text-center"
            />

            <q-input
              v-model.number="filter.comboMax"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Max"
              input-class="text-center"
            />
          </div>

          <div class="column">
            <span class="text-center q-my-sm">
              Max Combo
            </span>

            <q-input
              v-model.number="filter.maxComboMin"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Min"
              input-class="text-center"
            />

            <q-input
              v-model.number="filter.maxComboMax"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Max"
              input-class="text-center"
            />
          </div>

          <div class="column">
            <span class="text-center q-my-sm">
              Percentage / Ratio
            </span>

            <q-input
              v-model.number="filter.altComboMin"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Min"
              input-class="text-center"
            />

            <q-input
              v-model.number="filter.altComboMax"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Max"
              input-class="text-center"
            />
          </div>
        </div>
      </q-btn-dropdown>
    </q-th>

    <q-th v-if="visibleColumns.includes('mods')">
      <q-btn-dropdown
        flat
        dense
        no-caps
        label="Mods"
      >
        <q-list>
          <q-item
            v-for="mod in modList"
            :key="mod.value"
            class="q-py-none q-px-xs"
          >
            <q-checkbox
              :model-value="filter.mods.get(mod.value)"
              toggle-indeterminate
              @update:model-value="filter.mods.set(mod.value, $event)"
            >
              {{ mod.label }}
            </q-checkbox>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </q-th>

    <q-th v-if="visibleColumns.includes('date')">
      <q-input
        v-model="filter.dateMin"
        dense
        borderless
        type="date"
        debounce="300"
        placeholder="Min"
        input-class="text-center"
      />

      <q-input
        v-model="filter.dateMax"
        dense
        borderless
        type="date"
        debounce="300"
        placeholder="Max"
        input-class="text-center"
      />
    </q-th>

    <q-th v-if="visibleColumns.includes('pp')">
      <q-btn-dropdown
        flat
        dense
        no-caps
        label="PP"
      >
        <div class="row">
          <div class="column">
            <span class="text-center q-my-sm">
              PP
            </span>

            <q-input
              v-model.number="filter.ppMin"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Min"
              input-class="text-center"
            />

            <q-input
              v-model.number="filter.ppMax"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Max"
              input-class="text-center"
            />
          </div>

          <div class="column">
            <span class="text-center q-my-sm">
              Max PP
            </span>

            <q-input
              v-model.number="filter.maxPpMin"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Min"
              input-class="text-center"
            />

            <q-input
              v-model.number="filter.maxPpMax"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Max"
              input-class="text-center"
            />
          </div>

          <div class="column">
            <span class="text-center q-my-sm">
              Percentage
            </span>

            <q-input
              v-model.number="filter.altPpMin"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Min"
              input-class="text-center"
            />

            <q-input
              v-model.number="filter.altPpMax"
              dense
              borderless
              type="number"
              debounce="300"
              placeholder="Max"
              input-class="text-center"
            />
          </div>
        </div>
      </q-btn-dropdown>
    </q-th>
  </q-tr>

  <q-tr :props="props">
    <q-th />
    <q-th />

    <q-th
      v-for="column in props.cols"
      :key="column.name"
      :props="props"
      class="no-padding"
    >
      {{ column.label }}
    </q-th>
  </q-tr>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import useScore from 'src/composables/useScore'
import SettingsService from 'src/services/SettingsService'
import { GRADES, MODS, MODES, STATUS } from 'src/interfaces/DatabaseResponse'

interface Props {
  cols: {
    name: string
    label: string
  }[]
}

export default defineComponent({
  name: 'ColumnHeader',

  props: {
    props: {
      type: Object as PropType<Props>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()
    const { filter } = useScore()

    const statusList = Array.from(STATUS.entries()).map(([key, value]) => {
      return {
        label: value,
        value: key
      }
    })

    const gamemodeList = MODES.map((value, index) => {
      return {
        label: value,
        value: index
      }
    })

    const gradeList = GRADES.map((value, index) => {
      return {
        label: value,
        value: index
      }
    }).reverse()

    const modList = Object.entries(MODS).map(([label, value]) => {
      return {
        label,
        value
      }
    }).sort((a, b) => {
      if (a.label.length <= 2 && b.label.length > 2) return -1
      if (b.label.length <= 2 && a.label.length > 2) return 1
      return (a.label < b.label) ? -1 : (b.label < a.label) ? 1 : 0
    })

    return {
      visibleColumns,
      filter,
      statusList,
      gamemodeList,
      gradeList,
      modList
    }
  }
})
</script>
