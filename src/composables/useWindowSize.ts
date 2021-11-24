import { ref, onMounted, nextTick } from 'vue'
import { Ref } from '@vue/runtime-core/dist/runtime-core'
import WindowSize from '../interfaces/WindowSize'

export default function useWindowSize () {
  const windowSize: Ref<WindowSize> = ref({ x: window.innerWidth, y: window.innerHeight })
  const getWindowSize = () => {
    windowSize.value = { x: window.innerWidth, y: window.innerHeight }
  }

  onMounted(async () => {
    getWindowSize()
    await nextTick()
    window.addEventListener('resize', getWindowSize)
  })

  return { windowSize }
}
