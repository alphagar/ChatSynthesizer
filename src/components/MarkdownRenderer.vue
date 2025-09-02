<template>
  <div class="markdown-renderer" ref="markdownRef"></div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

interface Props {
  content: string
}

const props = defineProps<Props>()
const markdownRef = ref<HTMLElement>()

// 고유 ID 생성 함수
const generateId = () => 'code_' + Math.random().toString(36).substr(2, 9)

// marked 설정
marked.setOptions({
  breaks: true,
  gfm: true,
})

// marked 커스텀 렌더러 설정
const renderer = new marked.Renderer()

// 코드 블록에 복사 버튼과 언어 표시 추가
renderer.code = function(token) {
  const { text, lang } = token
  const language = lang || 'text'
  const codeId = generateId()
  const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  return `
    <div class="code-block-container">
      <div class="code-header">
        <span class="code-language">${language}</span>
        <button class="copy-button" onclick="copyCodeBlock('${codeId}')" title="코드 복사">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M8 5H6C5.45 5 5 5.45 5 6V18C5 18.55 5.45 19 6 19H16C16.55 19 17 18.55 17 18V16M9 1H19C19.55 1 20 1.45 20 2V14C20 14.55 19.55 15 19 15H9C8.45 15 8 14.55 8 14V2C8 1.45 8.45 1 9 1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <pre class="code-block"><code id="${codeId}" class="hljs language-${language}">${escapedText}</code></pre>
    </div>
  `
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

// 복사 기능을 위한 전역 함수
declare global {
  interface Window {
    copyCodeBlock: (codeId: string) => void
  }
}

// 복사 기능 구현
window.copyCodeBlock = async (codeId: string) => {
  try {
    const codeElement = document.getElementById(codeId)
    if (codeElement) {
      const text = codeElement.textContent || ''
      await navigator.clipboard.writeText(text)
      
      // 복사 완료 피드백
      const button = codeElement.closest('.code-block-container')?.querySelector('.copy-button')
      if (button) {
        const originalTitle = button.getAttribute('title')
        button.setAttribute('title', '복사됨!')
        button.classList.add('copied')
        setTimeout(() => {
          button.setAttribute('title', originalTitle || '코드 복사')
          button.classList.remove('copied')
        }, 2000)
      }
    }
  } catch (error) {
    console.error('복사 실패:', error)
  }
}

// marked를 사용한 마크다운 렌더링 및 하이라이팅 적용
const updateContent = async () => {
  if (!markdownRef.value) return
  
  try {
    const html = await marked.parse(props.content)
    markdownRef.value.innerHTML = html
    
    // 하이라이팅 적용
    await nextTick()
    const codeElements = markdownRef.value.querySelectorAll('pre code.hljs')
    codeElements.forEach((element) => {
      hljs.highlightElement(element as HTMLElement)
    })
  } catch (error) {
    console.error('Markdown parsing error:', error)
    markdownRef.value.innerHTML = props.content.replace(/\n/g, '<br>')
  }
}

// props.content 변경 감지
watch(() => props.content, updateContent, { immediate: false })

// 컴포넌트 마운트 시 초기 렌더링
onMounted(updateContent)
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

  /* 코드 블록 컨테이너 */
  :deep(.code-block-container) {
    position: relative;
    margin: 16px 0;
    border-radius: 12px;
    overflow: hidden;
    background: #1a1b26;
    border: 1px solid #2a2b3d;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* 코드 헤더 */
  :deep(.code-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #16171f;
    border-bottom: 1px solid #2a2b3d;
  }

  /* 언어 표시 */
  :deep(.code-language) {
    font-size: 12px;
    color: #7c7d8c;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  /* 복사 버튼 */
  :deep(.copy-button) {
    background: transparent;
    border: 1px solid #3a3b4d;
    border-radius: 6px;
    padding: 6px;
    color: #7c7d8c;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.copy-button:hover) {
    background: #2a2b3d;
    color: #a9b1d6;
    border-color: #4a4b5d;
    transform: translateY(-1px);
  }

  :deep(.copy-button.copied) {
    background: #0f9963;
    border-color: #0f9963;
    color: white;
  }

  /* 코드 블록 */
  :deep(.code-block) {
    background: #1a1b26;
    padding: 16px;
    margin: 0;
    overflow-x: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Cascadia Code', monospace;
    font-size: 14px;
    line-height: 1.6;
    border-radius: 0;
    
    code {
      background: transparent;
      padding: 0;
      border-radius: 0;
      font-size: inherit;
      line-height: inherit;
      color: #a9b1d6;
    }
  }

  /* 스크롤바 커스텀 */
  :deep(.code-block) {
    scrollbar-width: thin;
    scrollbar-color: #3a3b4d #1a1b26;
  }

  :deep(.code-block::-webkit-scrollbar) {
    height: 8px;
  }

  :deep(.code-block::-webkit-scrollbar-track) {
    background: #1a1b26;
  }

  :deep(.code-block::-webkit-scrollbar-thumb) {
    background: #3a3b4d;
    border-radius: 4px;
  }

  :deep(.code-block::-webkit-scrollbar-thumb:hover) {
    background: #4a4b5d;
  }

  /* 표준 코드 블록 (fallback) */
  :deep(pre:not(.code-block)) {
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
  :deep(code.inline-code), :deep(code:not(.hljs)) {
    background: var(--code-color);
    padding: 3px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Cascadia Code', monospace;
    font-size: 0.9em;
    border: 1px solid var(--border-color);
    color: var(--text-color-1);
    font-weight: 500;
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
    margin: 16px 0;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    display: block;
    white-space: nowrap;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    padding: 12px 16px;
    text-align: left;
    white-space: normal;
  }

  :deep(table) th {
    background: var(--code-color);
    font-weight: 600;
    color: var(--text-color-1);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  :deep(table) tbody tr:nth-child(even) {
    background: var(--code-color);
  }

  :deep(table) tbody tr:hover {
    background: var(--hover-color);
  }

  /* 반응형 디자인 */
  @media (max-width: 768px) {
    :deep(.code-block-container) {
      margin: 12px 0;
      border-radius: 8px;
    }

    :deep(.code-header) {
      padding: 6px 12px;
    }

    :deep(.code-language) {
      font-size: 11px;
    }

    :deep(.copy-button) {
      padding: 4px;
    }

    :deep(.code-block) {
      padding: 12px;
      font-size: 13px;
    }

    :deep(table) th,
    :deep(table) td {
      padding: 8px 12px;
      font-size: 14px;
    }
  }

  /* 접근성 개선 */
  :deep(.copy-button:focus) {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* 고대비 모드 지원 */
  @media (prefers-contrast: high) {
    :deep(.code-block-container) {
      border-width: 2px;
    }
    
    :deep(.copy-button) {
      border-width: 2px;
    }
  }

  /* 애니메이션 줄이기 선호 시 */
  @media (prefers-reduced-motion: reduce) {
    :deep(.copy-button),
    :deep(*) {
      transition: none !important;
      animation: none !important;
    }
  }

  /* 인쇄 스타일 */
  @media print {
    :deep(.code-header),
    :deep(.copy-button) {
      display: none;
    }
    
    :deep(.code-block-container) {
      border: 1px solid #000;
      break-inside: avoid;
    }
    
    :deep(.code-block) {
      background: white !important;
      color: black !important;
    }
  }
}
</style>
