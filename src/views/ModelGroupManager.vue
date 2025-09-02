<template>
  <div class="model-group-manager">
    <n-space direction="vertical" :size="24">
      <!-- 헤더 -->
      <n-space justify="space-between" align="center">
        <div>
          <h2>AI 모델 그룹 관리</h2>
          <p>여러 AI 모델을 그룹으로 묶어서 동시에 활용할 수 있습니다.</p>
        </div>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <n-icon><add-outline /></n-icon>
          </template>
          새 그룹 생성
        </n-button>
      </n-space>

      <!-- 그룹 목록 -->
      <div v-if="modelGroups.length === 0" class="empty-state">
        <n-empty description="등록된 AI 모델 그룹이 없습니다">
          <template #extra>
            <n-button type="primary" @click="showCreateModal = true">
              첫 번째 그룹 만들기
            </n-button>
          </template>
        </n-empty>
      </div>

      <n-grid v-else :cols="1" :x-gap="16" :y-gap="16">
        <n-grid-item v-for="group in modelGroups" :key="group.id">
          <ModelGroupCard 
            :group="group"
            @edit="handleEditGroup"
            @delete="handleDeleteGroup"
            @duplicate="handleDuplicateGroup"
          />
        </n-grid-item>
      </n-grid>
    </n-space>

    <!-- 생성/편집 모달 -->
    <n-modal 
      v-model:show="showCreateModal" 
      preset="card"
      :title="editingGroup ? '그룹 편집' : '새 그룹 생성'"
      style="width: 90vw; max-width: 1200px;"
      :segmented="{ content: true }"
    >
      <ModelGroupEditor
        :group="editingGroup"
        @save="handleSaveGroup"
        @cancel="handleCancelEdit"
      />
    </n-modal>

    <!-- 삭제 확인 모달 -->
    <n-modal v-model:show="showDeleteModal" preset="dialog" type="error">
      <template #header>
        <div>그룹 삭제 확인</div>
      </template>
      <div>
        정말로 "{{ deletingGroup?.title }}" 그룹을 삭제하시겠습니까?
        <br>
        <strong>이 작업은 되돌릴 수 없습니다.</strong>
      </div>
      <template #action>
        <n-space>
          <n-button @click="showDeleteModal = false">취소</n-button>
          <n-button type="error" @click="confirmDeleteGroup">삭제</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NSpace,
  NButton,
  NIcon,
  NEmpty,
  NGrid,
  NGridItem,
  NModal,
  useMessage
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { AIModelGroup } from '@/types'
import { LocalStorageManager, generateId } from '@/utils'
import ModelGroupCard from '@/components/ModelGroupCard.vue'
import ModelGroupEditor from '@/components/ModelGroupEditor.vue'

const message = useMessage()

const modelGroups = ref<AIModelGroup[]>([])
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const editingGroup = ref<AIModelGroup | null>(null)
const deletingGroup = ref<AIModelGroup | null>(null)

// Methods
const loadModelGroups = () => {
  modelGroups.value = LocalStorageManager.getModelGroups()
}

const handleEditGroup = (group: AIModelGroup) => {
  editingGroup.value = { ...group }
  showCreateModal.value = true
}

const handleDeleteGroup = (group: AIModelGroup) => {
  deletingGroup.value = group
  showDeleteModal.value = true
}

const handleDuplicateGroup = (group: AIModelGroup) => {
  const duplicated: AIModelGroup = {
    ...group,
    id: generateId(),
    title: `${group.title} (복사본)`,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // 타이틀 중복 확인 및 자동 번호 추가
  let counter = 1
  let newTitle = duplicated.title
  while (LocalStorageManager.isModelGroupTitleDuplicate(newTitle, duplicated.id)) {
    counter++
    newTitle = `${group.title} (복사본 ${counter})`
  }
  duplicated.title = newTitle

  LocalStorageManager.saveModelGroup(duplicated)
  loadModelGroups()
  message.success(`그룹이 "${duplicated.title}" 이름으로 복제되었습니다.`)
}

const handleSaveGroup = (group: AIModelGroup) => {
  // 타이틀 중복 확인
  if (LocalStorageManager.isModelGroupTitleDuplicate(group.title, group.id)) {
    message.error('이미 존재하는 그룹 이름입니다.')
    return
  }

  LocalStorageManager.saveModelGroup(group)
  loadModelGroups()
  showCreateModal.value = false
  editingGroup.value = null
  
  message.success(
    editingGroup.value ? '그룹이 수정되었습니다.' : '새 그룹이 생성되었습니다.'
  )
}

const handleCancelEdit = () => {
  showCreateModal.value = false
  editingGroup.value = null
}

const confirmDeleteGroup = () => {
  if (!deletingGroup.value) return

  LocalStorageManager.deleteModelGroup(deletingGroup.value.id)
  loadModelGroups()
  showDeleteModal.value = false
  deletingGroup.value = null
  message.success('그룹이 삭제되었습니다.')
}

// Lifecycle
onMounted(() => {
  loadModelGroups()
})
</script>

<style scoped>
.model-group-manager {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  h2 {
    margin: 0 0 8px 0;
    font-size: 28px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--text-color-2);
    font-size: 16px;
  }

  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }
}
</style>
