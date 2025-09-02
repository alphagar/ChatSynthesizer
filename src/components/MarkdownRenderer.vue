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

// 언어별 아이콘 매핑
const getLanguageIcon = (language: string): string => {
  const iconMap: Record<string, string> = {
    javascript: '🟨',
    typescript: '🔷',
    python: '🐍',
    java: '☕',
    html: '🌐',
    css: '🎨',
    scss: '💅',
    json: '📋',
    xml: '📄',
    yaml: '⚙️',
    bash: '💻',
    shell: '🐚',
    powershell: '💙',
    sql: '🗄️',
    php: '🐘',
    ruby: '💎',
    go: '🐹',
    rust: '🦀',
    cpp: '⚡',
    c: '🔧',
    swift: '🍃',
    kotlin: '🎯',
    dart: '🎢',
    vue: '💚',
    react: '⚛️',
    angular: '🅰️',
    markdown: '📝',
    text: '📄'
  }
  
  return iconMap[language.toLowerCase()] || '⚡'
}

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
  const languageIcon = getLanguageIcon(language)
  const lineCount = text.split('\n').length
  
  return `
    <div class="modern-code-container" data-language="${language}">
      <div class="code-toolbar">
        <div class="toolbar-left">
          <div class="language-badge">
            <span class="language-icon">${languageIcon}</span>
            <span class="language-text">${language}</span>
          </div>
          <div class="code-info">
            <span class="line-count">${lineCount} ${lineCount === 1 ? 'line' : 'lines'}</span>
          </div>
        </div>
        <div class="toolbar-right">
          <button class="modern-copy-btn" onclick="copyCodeBlock('${codeId}')" title="코드 복사" aria-label="코드 복사">
            <div class="btn-content">
              <svg class="copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <span class="btn-text">복사</span>
            </div>
          </button>
        </div>
      </div>
      <div class="code-content-wrapper">
        <pre class="modern-code-block"><code id="${codeId}" class="hljs language-${language}">${escapedText}</code></pre>
      </div>
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

// 복사 기능 구현 (현대화된 피드백)
window.copyCodeBlock = async (codeId: string) => {
  try {
    const codeElement = document.getElementById(codeId)
    if (codeElement) {
      const text = codeElement.textContent || ''
      await navigator.clipboard.writeText(text)
      
      // 현대화된 복사 완료 피드백
      const button = codeElement.closest('.modern-code-container')?.querySelector('.modern-copy-btn')
      if (button) {
        const originalTitle = button.getAttribute('title')
        const btnText = button.querySelector('.btn-text')
        const copyIcon = button.querySelector('.copy-icon')
        const checkIcon = button.querySelector('.check-icon')
        
        // 상태 변경
        button.setAttribute('title', '복사됨!')
        button.classList.add('copied')
        if (btnText) btnText.textContent = '복사됨'
        if (copyIcon) (copyIcon as HTMLElement).style.display = 'none'
        if (checkIcon) (checkIcon as HTMLElement).style.display = 'block'
        
        // 원래 상태로 복원
        setTimeout(() => {
          button.setAttribute('title', originalTitle || '코드 복사')
          button.classList.remove('copied')
          if (btnText) btnText.textContent = '복사'
          if (copyIcon) (copyIcon as HTMLElement).style.display = 'block'
          if (checkIcon) (checkIcon as HTMLElement).style.display = 'none'
        }, 2500)
      }
    }
  } catch (error) {
    console.error('복사 실패:', error)
    
    // 에러 피드백
    const codeElement = document.getElementById(codeId)
    const button = codeElement?.closest('.modern-code-container')?.querySelector('.modern-copy-btn')
    if (button) {
      const btnText = button.querySelector('.btn-text')
      button.classList.add('error')
      if (btnText) btnText.textContent = '실패'
      setTimeout(() => {
        button.classList.remove('error')
        if (btnText) btnText.textContent = '복사'
      }, 2000)
    }
  }
}

// marked를 사용한 마크다운 렌더링 및 하이라이팅 적용
const updateContent = async () => {
  if (!markdownRef.value) return
  
  try {
    const html = await marked.parse(props.content)
    markdownRef.value.innerHTML = html
    
    // 현대적인 코드 블록에 하이라이팅 적용
    await nextTick()
    const codeElements = markdownRef.value.querySelectorAll('.modern-code-block code.hljs')
    codeElements.forEach((element) => {
      hljs.highlightElement(element as HTMLElement)
    })

    // 코드 컨테이너에 등장 애니메이션 추가
    const codeContainers = markdownRef.value.querySelectorAll('.modern-code-container')
    codeContainers.forEach((container, index) => {
      (container as HTMLElement).style.animation = `slideInUp 0.6s ease-out ${index * 0.1}s both`
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


}
</style>

<!-- 동적으로 생성되는 코드 블록을 위한 전역 스타일 (스코프 제한) -->
<style>
.markdown-renderer {
  /* 현대적인 코드 블록 컨테이너 */
  .modern-code-container {
    position: relative;
    margin: 20px 0;
    border-radius: 16px;
    overflow: hidden;
    background: var(--card-color);
    border: 1px solid var(--border-color);
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .modern-code-container:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 4px 8px rgba(0, 0, 0, 0.08);
  }

  /* 현대적인 툴바 */
  .code-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: linear-gradient(135deg, var(--code-color) 0%, var(--hover-color) 100%);
    border-bottom: 1px solid var(--divider-color);
    backdrop-filter: blur(8px);
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  /* 현대적인 언어 배지 */
  .language-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--primary-color);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(32, 128, 240, 0.3);
  }

  .language-icon {
    font-size: 14px;
    animation: pulse 2s infinite;
  }

  .code-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .line-count {
    font-size: 11px;
    color: var(--text-color-3);
    padding: 4px 8px;
    background: var(--code-color);
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    border: 1px solid var(--border-color);
  }

  /* 현대적인 복사 버튼 */
  .modern-copy-btn {
    position: relative;
    background: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 8px 16px;
    color: var(--text-color-2);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    overflow: hidden;
    min-width: 80px;
    justify-content: center;
  }

  .modern-copy-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .modern-copy-btn:hover::before {
    left: 100%;
  }

  .modern-copy-btn:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 4px 12px rgba(32, 128, 240, 0.3);
  }

  .modern-copy-btn.copied {
    background: var(--success-color);
    border-color: var(--success-color);
    color: white;
    transform: scale(1.05);
  }

  .modern-copy-btn.error {
    background: var(--error-color);
    border-color: var(--error-color);
    color: white;
    animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
    z-index: 1;
  }

  .check-icon {
    display: none;
  }

  .copy-icon, .check-icon {
    transition: all 0.3s ease;
  }

  /* 현대적인 코드 콘텐츠 래퍼 */
  .code-content-wrapper {
    position: relative;
    background: var(--code-color);
    overflow: hidden;
  }

  /* 현대적인 코드 블록 */
  .modern-code-block {
    background: var(--code-color);
    padding: 24px;
    margin: 0;
    overflow-x: auto;
    font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Cascadia Code', monospace;
    font-size: 14px;
    line-height: 1.7;
    border-radius: 0;
    position: relative;
  }
  
  .modern-code-block code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
    line-height: inherit;
    color: var(--text-color-1);
    font-weight: 400;
    font-feature-settings: 'liga' 1, 'calt' 1;
  }

  /* 현대적인 스크롤바 */
  .modern-code-block {
    scrollbar-width: thin;
    scrollbar-color: var(--primary-color-hover) var(--code-color);
  }

  .modern-code-block::-webkit-scrollbar {
    height: 6px;
  }

  .modern-code-block::-webkit-scrollbar-track {
    background: var(--code-color);
    border-radius: 3px;
  }

  .modern-code-block::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 3px;
    transition: background 0.3s ease;
  }

  .modern-code-block::-webkit-scrollbar-thumb:hover {
    background: var(--primary-color-hover);
  }

  /* 코드 하이라이팅 향상 */
  .modern-code-block .hljs {
    background: transparent !important;
    color: var(--text-color-1);
  }

  /* 현대적인 애니메이션 키프레임 */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 현대적인 반응형 디자인 */
  @media (max-width: 768px) {
    .modern-code-container {
      margin: 16px 0;
      border-radius: 12px;
    }

    .code-toolbar {
      padding: 10px 16px;
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .toolbar-left {
      justify-content: space-between;
      width: 100%;
    }

    .toolbar-right {
      justify-content: center;
    }

    .language-badge {
      padding: 5px 10px;
      font-size: 11px;
    }

    .language-icon {
      font-size: 12px;
    }

    .modern-copy-btn {
      padding: 6px 12px;
      font-size: 12px;
      min-width: 70px;
    }

    .modern-code-block {
      padding: 16px;
      font-size: 13px;
      line-height: 1.6;
    }

    .line-count {
      font-size: 10px;
      padding: 3px 6px;
    }
  }

  @media (max-width: 480px) {
    .modern-code-container {
      margin: 12px -8px;
      border-radius: 8px;
    }

    .code-toolbar {
      padding: 8px 12px;
    }

    .modern-code-block {
      padding: 12px;
      font-size: 12px;
    }
  }

  /* 접근성 개선 */
  .modern-copy-btn:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(32, 128, 240, 0.2);
  }

  .modern-copy-btn:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* 고대비 모드 지원 */
  @media (prefers-contrast: high) {
    .modern-code-container {
      border-width: 2px;
      box-shadow: none;
    }
    
    .modern-copy-btn {
      border-width: 2px;
    }

    .language-badge {
      box-shadow: none;
      border: 2px solid currentColor;
    }
  }

  /* 다크모드 감지 및 추가 스타일링 */
  @media (prefers-color-scheme: dark) {
    .modern-code-container {
      box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.3),
        0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  /* 애니메이션 줄이기 선호 시 */
  @media (prefers-reduced-motion: reduce) {
    .modern-copy-btn,
    .modern-code-container,
    .language-icon,
    * {
      transition: none !important;
      animation: none !important;
      transform: none !important;
    }
  }

  /* 인쇄 스타일 */
  @media print {
    .code-toolbar,
    .modern-copy-btn {
      display: none;
    }
    
    .modern-code-container {
      border: 2px solid #000;
      break-inside: avoid;
      box-shadow: none;
      background: white !important;
    }
    
    .modern-code-block {
      background: white !important;
    }

    .modern-code-block code {
      color: black !important;
    }
  }
}
</style>
