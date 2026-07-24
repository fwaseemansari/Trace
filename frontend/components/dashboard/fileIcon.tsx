import { File, FileSpreadsheet, FileText, FileType, Presentation } from 'lucide-react'

export function getFileMeta(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'pdf':
      return { Icon: FileType, label: 'PDF', color: 'text-[#e5679a]' }
    case 'doc':
    case 'docx':
      return { Icon: FileText, label: 'DOCX', color: 'text-[#6667ab]' }
    case 'csv':
      return { Icon: FileSpreadsheet, label: 'CSV', color: 'text-[#62d0a0]' }
    case 'ppt':
    case 'pptx':
      return { Icon: Presentation, label: 'PPTX', color: 'text-[#d99b52]' }
    case 'txt':
      return { Icon: FileText, label: 'TXT', color: 'text-[#c79bb2]' }
    default:
      return { Icon: File, label: ext.toUpperCase() || 'FILE', color: 'text-muted-foreground' }
  }
}
