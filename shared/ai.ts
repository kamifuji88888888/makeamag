export interface AiPageSample {
  pageIndex: number
  text: string
}

export interface AiPublicationSuggestion {
  title: string
  publisherName: string
  issueLabel: string
  description: string
}

export interface AiTocSuggestion {
  title: string
  pageIndex: number
}

export interface AiAnalysisResult {
  provider: 'openai' | 'heuristic'
  publication: AiPublicationSuggestion
  tableOfContents: AiTocSuggestion[]
}

export interface AiAnalyzeRequest {
  fileName: string
  pages: AiPageSample[]
  existingTocCount?: number
}
