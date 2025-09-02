<template>
  <div class="markdown-renderer" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

interface Props {
  content: string
}

const props = defineProps<Props>()

// marked 설정
marked.setOptions({
  breaks: true, // 줄바꿈을 <br>로 변환
  gfm: true, // GitHub Flavored Markdown 지원
})

// marked 커스텀 렌더러 설정
const renderer = new marked.Renderer()

// 코드 블록에 클래스 추가
renderer.code = function(token) {
  const { text, lang } = token
  return `<pre class="code-block"><code class="language-${lang || 'text'}">${text}</code></pre>`
}

// 인라인 코드에 클래스 추가
renderer.codespan = function(token) {
  const { text } = token
  return `<code class="inline-code">${text}</code>`
}

// 링크에 target="_blank" 추가
renderer.link = function(token) {
  const { href, title, tokens } = token
  const text = this.parser.parseInline(tokens)
  return `<a href="${href}" target="_blank" rel="noopener"${title ? ` title="${title}"` : ''}>${text}</a>`
}

marked.setOptions({ renderer })

// marked를 사용한 마크다운 렌더링
const renderedContent = computed(() => {
  try {
    return marked.parse(props.content)
  } catch (error) {
    console.error('Markdown parsing error:', error)
    // 파싱 에러 시 원본 텍스트 반환
    return props.content.replace(/\n/g, '<br>')
  }
})
</script>

<style scoped>
.markdown-renderer {
  /* 제목 스타일 */
  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 16px 0 12px 0;
    font-weight: 600;
    line-height: 1.4;
    color: var(--text-color-1);
  }

  :deep(h1) { font-size: 24px; border-bottom: 2px solid var(--divider-color); padding-bottom: 8px; }
  :deep(h2) { font-size: 20px; border-bottom: 1px solid var(--divider-color); padding-bottom: 6px; }
  :deep(h3) { font-size: 18px; }
  :deep(h4) { font-size: 16px; }
  :deep(h5) { font-size: 14px; }
  :deep(h6) { font-size: 13px; color: var(--text-color-2); }

  /* 단락 */
  :deep(p) {
    margin: 8px 0;
    line-height: 1.6;
  }

  /* 코드 블록 */
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
      background: transparent;
      padding: 0;
    }
  }

  /* 표준 코드 블록 (pre > code) */
  :deep(pre) {
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
      background: transparent;
      padding: 0;
    }
  }

  /* 인라인 코드 */
  :deep(code.inline-code), :deep(code) {
    background: var(--code-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }

  /* 링크 */
  :deep(a) {
    color: var(--primary-color);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }

  /* 리스트 */
  :deep(ul), :deep(ol) {
    margin: 12px 0;
    padding-left: 24px;
  }

  :deep(li) {
    margin: 4px 0;
    line-height: 1.6;
  }

  :deep(ul li) {
    list-style-type: disc;
  }

  :deep(ol li) {
    list-style-type: decimal;
  }

  /* 중첩 리스트 */
  :deep(ul ul), :deep(ol ol), :deep(ul ol), :deep(ol ul) {
    margin: 4px 0;
  }

  /* 텍스트 스타일 */
  :deep(strong) {
    font-weight: 600;
  }

  :deep(em) {
    font-style: italic;
  }

  /* 인용구 */
  :deep(blockquote) {
    border-left: 4px solid var(--primary-color);
    margin: 12px 0;
    padding: 8px 16px;
    background: var(--card-color);
    color: var(--text-color-2);
    font-style: italic;
  }

  /* 수평선 */
  :deep(hr) {
    border: none;
    border-top: 1px solid var(--divider-color);
    margin: 20px 0;
  }

  /* 표 */
  :deep(table) {
    border-collapse: collapse;
    margin: 12px 0;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    display: block;
    white-space: nowrap;
  }

  :deep(table) thead,
  :deep(table) tbody,
  :deep(table) tr {
    display: table-row;
  }

  :deep(table) th,
  :deep(table) td {
    display: table-cell;
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    text-align: left;
  }

  :deep(table) th {
    background: var(--code-color);
    font-weight: 600;
  }

  :deep(table) tbody tr:nth-child(even) {
    background: var(--code-color);
  }
}
</style>
