import { Injectable } from '@angular/core'; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  AlignmentType,
} from 'docx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  constructor() {}

 async generateWord(elementId: string, fileName: string = 'factura.docx'): Promise<void> {
    try {
      const contentContainer = document.getElementById(elementId);
      if (!contentContainer) {
        console.error('Contenedor no encontrado para exportar Word');
        return;
      }

      const sections: any[] = [];
      const pageSections = contentContainer.querySelectorAll('.pdf-page-section');

      pageSections.forEach((page: Element) => {
        const children: (Paragraph | Table)[] = [];
        const sectionTitles = page.querySelectorAll('.section-title');

        sectionTitles.forEach((titleEl: Element) => {
          const titleText = titleEl.textContent?.trim() || 'Sección';
          children.push(
            new Paragraph({
              text: titleText,
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.START,
              spacing: { after: 200, before: 200 },
            })
          );

          const tableWrapper = titleEl.nextElementSibling as HTMLElement;
          const tableEl = tableWrapper?.querySelector('table') as HTMLTableElement;
          if (!tableEl) return;

          const rows: TableRow[] = [];
          Array.from(tableEl.rows).forEach((tr: HTMLTableRowElement) => {
            const cells: TableCell[] = [];
            Array.from(tr.cells).forEach((td: HTMLTableCellElement) => {
              const isBold = td.classList.contains('bold-text');
              const isRed = td.classList.contains('text-danger');
              const text = td.textContent?.trim() || '';

              cells.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      text,
                      alignment: td.classList.contains('amount-col') ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      run: { bold: isBold, color: isRed ? 'FF0000' : '000000' },
                    }),
                  ],
                  columnSpan: td.colSpan || 1,
                  rowSpan: td.rowSpan || 1,
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                  },
                  shading: {
                    fill: td.classList.contains('percentage-col') ? 'F2F2F2' : 'auto',
                    type: ShadingType.CLEAR,
                  },
                })
              );
            });
            rows.push(new TableRow({ children: cells }));
          });

          children.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              },
            })
          );
        });

        sections.push({ properties: {}, children });
      });

      const doc = new Document({ sections });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      console.log('Word generado ✅');
    } catch (error) {
      console.error('Error exportando Word:', error);
    }
  }
  // 🔹 Exportar TODO en UNA sola hoja
  public async generatePDF(elementId: string, fileName: string = 'factura.pdf'): Promise<void> {
    const data = document.getElementById(elementId);
    if (!data) {
      console.error('Elemento no encontrado:', elementId);
      return;
    }
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 20; // margen en mm
    const pdfWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
    const pdfHeight = pdf.internal.pageSize.getHeight() - 2 * margin;
    // 🔹 Clonamos el contenido para no afectar el DOM
    const clonedData = data.cloneNode(true) as HTMLElement;
    clonedData.style.position = 'absolute';
    clonedData.style.left = '-9999px';
    document.body.appendChild(clonedData);
    // 🔹 Reemplazar selects por su valor de texto
    clonedData.querySelectorAll('select').forEach(select => {
      const s = select as HTMLSelectElement;
      // Obtener el texto del option seleccionado mediante el value
      const selectedOption = Array.from(s.options).find(opt => opt.value === s.value);
      const text = selectedOption?.text || '';
      const span = document.createElement('span');
      span.innerText = text;
      span.style.display = 'inline-block';
      span.style.width = '100%';
      span.style.textAlign = 'center';
      select.parentNode?.replaceChild(span, select);
    });

    // 🔹 Convertir todo el contenedor en una sola imagen
    const canvas = await html2canvas(clonedData, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      windowWidth: clonedData.scrollWidth,
      windowHeight: clonedData.scrollHeight,
      ignoreElements: (el: { classList: { contains: (arg0: string) => any; }; }) => el.classList.contains('no-export')
    } as any);
    document.body.removeChild(clonedData);
    const imgData = canvas.toDataURL('image/png');
    const imgProps = (pdf as any).getImageProperties(imgData);
    // Escalar para ajustarlo en UNA hoja
    let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight; // 🔹 Forzamos que encaje en la hoja
    }
    pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, imgHeight, undefined, 'FAST');
    pdf.save(fileName);
    console.log('PDF generado en una sola hoja ✅');
  }
  
}
