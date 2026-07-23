declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string
    numpages: number
    info: any
    metadata: any
    version: string
  }
  function pdfParse(data: Buffer, options?: any): Promise<PdfParseResult>
  export = pdfParse
}
