/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'swissqrbill' {
    export class SwissQRBill {
        constructor(data: any);
        attachTo(doc: any): void;
        getStream(): any;
    }
}

declare module 'swissqrbill/pdf' {
    export class SwissQRBill {
        constructor(data: any);
        // QR Bill specific
        addQRBill(): void;
        // PDFKit methods (legacy API — SwissQRBill extended PDFDocument)
        pipe(destination: any): any;
        end(): void;
        fontSize(size: number): this;
        font(src: string): this;
        text(text: string, x?: number, y?: number, options?: any): this;
        rect(x: number, y: number, w: number, h: number): this;
        fill(color: string): this;
        fillColor(color: string): this;
        moveTo(x: number, y: number): this;
        lineTo(x: number, y: number): this;
        stroke(color?: string): this;
    }
}
