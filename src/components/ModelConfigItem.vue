<template>
  <div class="model-config-item">
    <n-space justify="space-between" align="flex-start">
      <div class="model-info">
        <div class="model-header">
          <h4>{{ model.displayName }}</h4>
          <n-tag size="small" type="info">{{ model.modelName }}</n-tag>
        </div>
        
        <n-collapse v-model:expanded-names="expandedSections" accordion>
          <n-collapse-item title="기본 파라미터" name="basic">
            <n-space direction="vertical" :size="16">
              <n-grid :cols="2" :x-gap="16" :y-gap="12">
                <n-grid-item>
                  <div class="param-item">
                    <label>Temperature</label>
                    <n-input-number
                      :value="model.parameters.temperature ?? DEFAULT_MODEL_PARAMETERS.temperature"
                      @update:value="updateParameter('temperature', $event)"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      size="small"
                    />
                  </div>
                </n-grid-item>
                
                <n-grid-item>
                  <div class="param-item">
                    <label>Top P</label>
                    <n-input-number
                      :value="model.parameters.top_p ?? DEFAULT_MODEL_PARAMETERS.top_p"
                      @update:value="updateParameter('top_p', $event)"
                      :min="0"
                      :max="1"
                      :step="0.1"
                      size="small"
                    />
                  </div>
                </n-grid-item>
                
                <n-grid-item>
                  <div class="param-item">
                    <label>Top K</label>
                    <n-input-number
                      :value="model.parameters.top_k ?? DEFAULT_MODEL_PARAMETERS.top_k"
                      @update:value="updateParameter('top_k', $event)"
                      :min="1"
                      :max="100"
                      size="small"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
            </n-space>
          </n-collapse-item>
          
          <n-collapse-item title="고급 파라미터" name="advanced">
            <n-space direction="vertical" :size="16">
              <n-grid :cols="2" :x-gap="16" :y-gap="12">
                <n-grid-item>
                  <div class="param-item">
                    <label>Frequency Penalty</label>
                    <n-input-number
                      :value="model.parameters.frequency_penalty ?? DEFAULT_MODEL_PARAMETERS.frequency_penalty"
                      @update:value="updateParameter('frequency_penalty', $event)"
                      :min="-2"
                      :max="2"
                      :step="0.1"
                      size="small"
                    />
                  </div>
                </n-grid-item>
                
                <n-grid-item>
                  <div class="param-item">
                    <label>Presence Penalty</label>
                    <n-input-number
                      :value="model.parameters.presence_penalty ?? DEFAULT_MODEL_PARAMETERS.presence_penalty"
                      @update:value="updateParameter('presence_penalty', $event)"
                      :min="-2"
                      :max="2"
                      :step="0.1"
                      size="small"
                    />
                  </div>
                </n-grid-item>
                
                <n-grid-item>
                  <div class="param-item">
                    <label>Repetition Penalty</label>
                    <n-input-number
                      :value="model.parameters.repetition_penalty ?? DEFAULT_MODEL_PARAMETERS.repetition_penalty"
                      @update:value="updateParameter('repetition_penalty', $event)"
                      :min="0.1"
                      :max="2"
                      :step="0.1"
                      size="small"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              
              <!-- 커스텀 파라미터 -->
              <div>
                <n-space justify="space-between" align="center" style="margin-bottom: 12px;">
                  <label style="font-weight: 600;">커스텀 파라미터</label>
                  <n-button size="small" @click="addCustomParameter">
                    <template #icon>
                      <n-icon><add-outline /></n-icon>
                    </template>
                    추가
                  </n-button>
                </n-space>
                
                <div v-if="customParameters.length === 0" class="empty-custom">
                  <n-text depth="3">커스텀 파라미터가 없습니다</n-text>
                </div>
                
                <n-space direction="vertical" :size="8" v-else>
                  <div 
                    v-for="(param, index) in customParameters" 
                    :key="index"
                    class="custom-param-row"
                  >
                    <n-input-group>
                      <n-input
                        v-model:value="param.key"
                        placeholder="키"
                        style="width: 40%;"
                        @update:value="updateCustomParameterKey(index, $event)"
                      />
                      <n-input
                        v-model:value="param.value"
                        placeholder="값"
                        style="width: 50%;"
                        @update:value="updateCustomParameterValue(index, $event)"
                      />
                      <n-button 
                        @click="removeCustomParameter(index)"
                        type="error" 
                        ghost
                        style="width: 10%;"
                      >
                        <template #icon>
                          <n-icon><trash-outline /></n-icon>
                        </template>
                      </n-button>
                    </n-input-group>
                  </div>
                </n-space>
              </div>
            </n-space>
          </n-collapse-item>
        </n-collapse>
      </div>
      
      <n-button 
        type="error" 
        ghost 
        circle
        @click="$emit('delete')"
        title="모델 제거"
      >
        <template #icon>
          <n-icon><trash-outline /></n-icon>
        </template>
      </n-button>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NSpace,
  NTag,
  NButton,
  NIcon,
  NCollapse,
  NCollapseItem,
  NGrid,
  NGridItem,
  NInputNumber,
  NInputGroup,
  NInput,
  NText
} from 'naive-ui'
import { AddOutline, TrashOutline } from '@vicons/ionicons5'
import type { AIModelConfig } from '@/types'
import { DEFAULT_MODEL_PARAMETERS } from '@/types'

interface Props {
  model: AIModelConfig
}

interface Emits {
  (e: 'update', model: AIModelConfig): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const expandedSections = ref<string[]>([])

// Computed
const customParameters = computed({
  get(): Array<{ key: string; value: any }> {
    const wellKnownParams = [
      'temperature', 'top_p', 'top_k', 'frequency_penalty', 'presence_penalty', 'repetition_penalty'
    ]
    
    return Object.entries(props.model.parameters)
      .filter(([key]) => !wellKnownParams.includes(key))
      .map(([key, value]) => ({ key, value }))
  },
  set(value: Array<{ key: string; value: any }>) {
    // This setter is handled by individual methods
  }
})

// Methods
const updateParameter = (key: string, value: number | null) => {
  const updatedModel = {
    ...props.model,
    parameters: {
      ...props.model.parameters,
      [key]: value
    }
  }
  emit('update', updatedModel)
}

const addCustomParameter = () => {
  const updatedModel = {
    ...props.model,
    parameters: {
      ...props.model.parameters,
      [`custom_param_${Date.now()}`]: ''
    }
  }
  emit('update', updatedModel)
}

const updateCustomParameterKey = (index: number, newKey: string) => {
  const customParams = customParameters.value
  if (index >= 0 && index < customParams.length) {
    const oldKey = customParams[index].key
    const value = customParams[index].value
    
    const newParameters = { ...props.model.parameters }
    delete newParameters[oldKey]
    newParameters[newKey] = value
    
    const updatedModel = {
      ...props.model,
      parameters: newParameters
    }
    emit('update', updatedModel)
  }
}

const updateCustomParameterValue = (index: number, newValue: any) => {
  const customParams = customParameters.value
  if (index >= 0 && index < customParams.length) {
    const key = customParams[index].key
    
    const updatedModel = {
      ...props.model,
      parameters: {
        ...props.model.parameters,
        [key]: newValue
      }
    }
    emit('update', updatedModel)
  }
}

const removeCustomParameter = (index: number) => {
  const customParams = customParameters.value
  if (index >= 0 && index < customParams.length) {
    const keyToRemove = customParams[index].key
    const newParameters = { ...props.model.parameters }
    delete newParameters[keyToRemove]
    
    const updatedModel = {
      ...props.model,
      parameters: newParameters
    }
    emit('update', updatedModel)
  }
}
</script>

<style scoped>
.model-config-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-color);

  .model-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .param-item {
    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-color-2);
      margin-bottom: 4px;
    }
  }

  .custom-param-row {
    display: flex;
    align-items: center;
  }

  .empty-custom {
    text-align: center;
    padding: 20px;
    border: 1px dashed var(--border-color);
    border-radius: 6px;
  }
}
</style>
