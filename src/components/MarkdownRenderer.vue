<template>
  <div class="markdown-renderer" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 간단한 마크다운 렌더러 (실제 프로덕션에서는 마크다운 라이브러리 사용 권장)
const renderedContent = computed(() => {
  let html = props.content

  // 코드 블록 처리
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`
  })

  // 인라인 코드 처리
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // 볼드 처리
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // 이탤릭 처리
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 링크 처리
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // 줄바꿈 처리
  html = html.replace(/\n/g, '<br>')

  // 리스트 처리 (간단한 버전)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

  return html
})

const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
</script>

<style scoped>
.markdown-renderer {
  :deep(pre.code-block) {
    background: var(--code-color);
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0;
    border: 1px solid var(--border-color);
    
    code {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.4;
    }
  }

  :deep(code.inline-code) {
    background: var(--code-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }

  :deep(a) {
    color: var(--primary-color);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  :deep(ul) {
    margin: 12px 0;
    padding-left: 24px;
  }

  :deep(li) {
    margin: 4px 0;
    list-style-type: disc;
  }

  :deep(strong) {
    font-weight: 600;
  }

  :deep(em) {
    font-style: italic;
  }
}
</style>
