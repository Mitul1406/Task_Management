declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: "jpeg" | "png" | "webp"; quality?: number };
    html2canvas?: any;
    jsPDF?: any;
  }

  interface Html2Pdf {
    from(src: HTMLElement): Html2Pdf;
    set(opt: Html2PdfOptions): Html2Pdf;
    save(): void;
  }

  const html2pdf: () => Html2Pdf;
  export default html2pdf;
}