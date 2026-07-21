declare module 'pdfkit' {
  interface PDFDocumentOptions {
    size?: string
    margins?: { top: number; bottom: number; left: number; right: number }
    info?: {
      Title?: string
      Author?: string
      Subject?: string
      [key: string]: string | undefined
    }
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions)
    on(event: 'data', listener: (chunk: Buffer) => void): this
    on(event: 'end', listener: () => void): this
    on(event: 'error', listener: (err: Error) => void): this
    rect(x: number, y: number, width: number, height: number): this
    fill(color: string): this
    fontSize(size: number): this
    font(font: string): this
    fillColor(color: string): this
    text(text: string, x?: number, y?: number, options?: { width?: number; align?: string; continued?: boolean }): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    strokeColor(color: string): this
    lineWidth(width: number): this
    stroke(): this
    end(): this
    page: { width: number; margins: { top: number; bottom: number; left: number; right: number } }
  }

  export default PDFDocument
}
