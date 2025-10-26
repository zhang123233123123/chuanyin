/** Lightweight reader converts supported files to plain text for AI summarisation */
const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

let jszipPromise: Promise<any> | null = null;

async function ensureJSZip(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('仅支持在浏览器环境解析 DOCX 文件');
  }
  if ((window as any).JSZip) {
    return (window as any).JSZip;
  }
  if (!jszipPromise) {
    jszipPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = JSZIP_CDN;
      script.async = true;
      script.onload = () => {
        if ((window as any).JSZip) {
          resolve((window as any).JSZip);
        } else {
          reject(new Error('JSZip 加载失败，请刷新后重试'));
        }
      };
      script.onerror = () =>
        reject(new Error('无法加载 JSZip 库，请检查网络连接'));
      document.head.appendChild(script);
    });
  }
  return jszipPromise;
}

async function readDocx(file: File): Promise<string> {
  const JSZip = await ensureJSZip();
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) {
    throw new Error('未找到文档内容，请确认上传的是有效的 DOCX 文件');
  }
  const xml = await documentFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
  const lines = paragraphs
    .map(p =>
      Array.from(p.getElementsByTagName('w:t'))
        .map(t => t.textContent || '')
        .join('')
        .trim()
    )
    .filter(Boolean);
  return lines.join('\n');
}

async function readText(file: File): Promise<string> {
  const text = await file.text();
  return text.trim();
}

export async function readExperienceFile(file: File): Promise<string> {
  const name = file.name || '';
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'docx') {
    return readDocx(file);
  }
  if (['txt', 'md', 'markdown'].includes(ext || '')) {
    return readText(file);
  }
  throw new Error('暂时只支持 .docx / .txt / .md 文件，请转换后再上传');
}
