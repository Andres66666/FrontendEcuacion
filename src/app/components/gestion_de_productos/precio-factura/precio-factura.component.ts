import { Component } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx-js-style';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
} from 'docx';
import { Router } from '@angular/router';

@Component({
  selector: 'app-precio-factura',
  imports: [CommonModule, FormsModule],
  templateUrl: './precio-factura.component.html',
  styleUrl: './precio-factura.component.css',
})
export class PrecioFacturaComponent {
  constructor(private router: Router) {}
  exportToExcel(): void {
    const tables = document.querySelectorAll('#contentToExport table');
    if (tables.length === 0) {
      console.warn('No tables found to export to Excel.');
      return;
    }

    try {
      console.log('Generando archivo Excel...');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([]);
      let current_row = 0;

      XLSX.utils.sheet_add_aoa(
        ws,
        [['III. PRECIO FACTURA METODO MALLA FINITA']],
        { origin: 'A1' }
      );
      if (ws['A1']) ws['A1'].s = { font: { bold: true } };
      current_row += 2;

      tables.forEach((table, index) => {
        let sectionTitle = `Tabla ${index + 1}`;
        const parentDiv = table.closest('.table-responsive-wrapper');
        if (parentDiv?.previousElementSibling?.tagName === 'H3') {
          sectionTitle =
            parentDiv.previousElementSibling.textContent?.trim() ||
            sectionTitle;
        }

        XLSX.utils.sheet_add_aoa(ws, [[sectionTitle]], {
          origin: `A${current_row}`,
        });
        if (ws[XLSX.utils.encode_cell({ r: current_row, c: 0 })]) {
          ws[XLSX.utils.encode_cell({ r: current_row, c: 0 })].s = {
            font: { bold: true },
          };
        }
        current_row += 1;

        const tableStartRow = current_row;
        XLSX.utils.sheet_add_dom(ws, table, { origin: `A${current_row}` });

        const currentSheetRef = ws['!ref'];
        if (currentSheetRef) {
          const tableRange = XLSX.utils.decode_range(currentSheetRef);

          // Asegurar que todas las celdas existen, incluso vacías
          for (let R = tableRange.s.r; R <= tableRange.e.r; ++R) {
            for (let C = tableRange.s.c; C <= tableRange.e.c; ++C) {
              const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
              if (!ws[cell_address]) ws[cell_address] = { v: '' };
            }
          }

          // Aplicar bordes a todo el rango visible
          for (let R = tableRange.s.r; R <= tableRange.e.r; ++R) {
            for (let C = tableRange.s.c; C <= tableRange.e.c; ++C) {
              const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
              ws[cell_address].s = {
                ...(ws[cell_address].s || {}),
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } },
                },
              };
            }
          }

          // Detectar merges y replicar bordes dentro del área combinada
          const merges = ws['!merges'] || [];
          merges.forEach((merge) => {
            for (let R = merge.s.r; R <= merge.e.r; ++R) {
              for (let C = merge.s.c; C <= merge.e.c; ++C) {
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cell_address]) ws[cell_address] = { v: '' };

                ws[cell_address].s = {
                  ...(ws[cell_address].s || {}),
                  border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } },
                  },
                };
              }
            }
          });

          // Negrita para encabezados
          const headerRow = table.querySelector('thead tr');
          if (headerRow) {
            const headerCells = headerRow.querySelectorAll('th');
            headerCells.forEach((_, i) => {
              const cell_address = XLSX.utils.encode_cell({
                r: tableStartRow,
                c: tableRange.s.c + i,
              });
              if (ws[cell_address]) {
                ws[cell_address].s = {
                  ...(ws[cell_address].s || {}),
                  font: { bold: true },
                };
              }
            });
          }
        }

        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        current_row = range.e.r + 3;
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Datos Consolidado');
      XLSX.writeFile(wb, 'precio-factura.xlsx');
      console.log('Archivo Excel generado exitosamente!');
    } catch (error) {
      console.error('Error generando archivo Excel:', error);
    }
  }
  async exportToPdf(): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' size
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20; // 10 mm margin on each side
    let currentYPosition = 20; // Starting Y position for content after title

    // Add the main title on the first page
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      'III. PRECIO FACTURA METODO MALLA FINITA',
      pdf.internal.pageSize.getWidth() / 2,
      currentYPosition,
      {
        align: 'center',
      }
    );
    currentYPosition += 15; // Move down after title for the content

    // Select all HTML elements marked as a 'pdf-page-section'
    const pageSections = document.querySelectorAll('.pdf-page-section');

    if (pageSections.length === 0) {
      console.error(
        'No elements with class "pdf-page-section" found for PDF export. Please define sections for pagination.'
      );
      return;
    }

    try {
      console.log('Generating PDF...');

      // Loop through each defined HTML page section
      for (let i = 0; i < pageSections.length; i++) {
        const section = pageSections[i] as HTMLElement;

        // Clone the section to prevent modifying the live DOM and to remove elements not needed in PDF
        const clonedSection = section.cloneNode(true) as HTMLElement;
        const exportButtons = clonedSection.querySelector(
          '.export-buttons-container'
        );
        if (exportButtons) {
          exportButtons.remove(); // Remove export buttons from the cloned element before rendering to canvas
        }

        // Temporarily append the cloned section off-screen to ensure html2canvas renders it correctly
        // with all computed styles.
        clonedSection.style.position = 'absolute';
        clonedSection.style.left = '-9999px';
        document.body.appendChild(clonedSection);

        // Render the cloned section to a canvas (image)
        const canvas = await html2canvas(clonedSection, {
          scale: 2, // Increase scale for better resolution in PDF
          useCORS: true, // Important if you have images from different origins
          windowWidth: clonedSection.scrollWidth, // Ensure all content is captured
          windowHeight: clonedSection.scrollHeight, // Ensure all content is captured
        });

        // Remove the temporary cloned section from the DOM
        document.body.removeChild(clonedSection);

        const imgData = canvas.toDataURL('image/png');
        const imgProps = (pdf as any).getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // If this is not the very first section (after the main title), add a new page
        // This ensures each 'pdf-page-section' starts on a fresh page.
        if (i > 0) {
          pdf.addPage();
          currentYPosition = 10; // Reset Y position for the new page, with some top margin
        }

        // Add the section's content as an image to the PDF
        // The following logic handles if a single 'pdf-page-section' itself overflows a single PDF page.
        let heightLeft = imgHeight;
        let imgPosition = currentYPosition; // Start position for the image on the current PDF page

        pdf.addImage(imgData, 'PNG', 10, imgPosition, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight() - imgPosition; // Calculate remaining height after first placement

        while (heightLeft > 0) {
          pdf.addPage();
          imgPosition = -(imgHeight - heightLeft); // Adjust image position for the next page slice
          pdf.addImage(imgData, 'PNG', 10, imgPosition, pdfWidth, imgHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
        }
      }

      pdf.save('precio-factura.pdf');
      console.log('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }
  async exportToWord(): Promise<void> {
    try {
      console.log('Generating Word file...');

      const docxSections: any[] = []; // Renombrado a docxSections para evitar confusión
      const contentContainer = document.getElementById('contentToExport');

      if (!contentContainer) {
        console.error('Content container not found for Word export.');
        return;
      }

      // Add the main title (this should be its own section or at the very beginning)
      const mainTitleElement = contentContainer.querySelector(
        '.section-title-main'
      );
      if (mainTitleElement) {
        docxSections.push({
          properties: {},
          children: [
            new Paragraph({
              text: mainTitleElement.textContent || '',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
          ],
        });
      }

      // Get all the logical page sections from your HTML
      const htmlPageSections =
        contentContainer.querySelectorAll('.pdf-page-section');

      htmlPageSections.forEach((htmlSectionElement: Element, index: number) => {
        const childrenForDocxSection: (Paragraph | Table | PageBreak)[] = [];

        // Iterate through each section (h3 + table) within the current HTML page section
        const sectionElementsInPage =
          htmlSectionElement.querySelectorAll('.section-title');

        sectionElementsInPage.forEach((sectionTitleElement: Element) => {
          const sectionTitle =
            sectionTitleElement.textContent?.trim() || 'Section';

          // Find the table immediately following this section title
          let currentElement: Element | null =
            sectionTitleElement.nextElementSibling;
          while (
            currentElement &&
            !currentElement.classList.contains('table-responsive-wrapper')
          ) {
            currentElement = currentElement.nextElementSibling;
          }

          const tableElement = currentElement?.querySelector(
            'table'
          ) as HTMLTableElement;

          // If a table is found immediately after the title, add them together
          if (tableElement) {
            const tableRows: TableRow[] = [];

            // Process table headers
            const headerRowElement = tableElement.querySelector('thead tr');
            if (headerRowElement) {
              const headerCells: TableCell[] = [];
              Array.from(headerRowElement.children).forEach((th: Element) => {
                const cellText = th.textContent?.trim() || '';
                const colSpan = th.hasAttribute('colspan')
                  ? parseInt(th.getAttribute('colspan') || '1', 10)
                  : 1;
                const rowSpan = th.hasAttribute('rowspan')
                  ? parseInt(th.getAttribute('rowspan') || '1', 10)
                  : 1;

                headerCells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: cellText,
                        alignment: AlignmentType.CENTER,
                        run: {
                          bold: true,
                        },
                      }),
                    ],
                    columnSpan: colSpan,
                    rowSpan: rowSpan,
                    borders: {
                      top: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                      bottom: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                      left: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                      right: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                    },
                    shading: {
                      fill: 'F2F2F2', // Light gray for headers
                      color: 'auto',
                      type: ShadingType.CLEAR,
                    },
                  })
                );
              });
              tableRows.push(
                new TableRow({ children: headerCells, tableHeader: true })
              );
            }

            // Process table body rows
            const bodyRowsElements = tableElement.querySelectorAll('tbody tr');
            bodyRowsElements.forEach((rowElement: Element) => {
              const rowCells: TableCell[] = [];
              const isDashed =
                rowElement.classList.contains('dashed-bottom-row') ||
                rowElement.classList.contains('dashed-bottom');
              const isYellowBg = rowElement.classList.contains('yellow-bg');
              const isBoldRow = rowElement.classList.contains('bold-text');

              Array.from(rowElement.children).forEach((td: Element) => {
                const cellText = td.textContent?.trim() || '';
                const colSpan = td.hasAttribute('colspan')
                  ? parseInt(td.getAttribute('colspan') || '1', 10)
                  : 1;
                const rowSpan = td.hasAttribute('rowspan')
                  ? parseInt(td.getAttribute('rowspan') || '1', 10)
                  : 1;
                const isGreenBg = td.classList.contains('green-bg');
                const isBoldCell = td.classList.contains('bold-text');
                const isRedText = td.classList.contains('red-text');
                const isIndent = td.classList.contains('indent');

                const children: Paragraph[] = [];
                // Handle inner spans for bold text (e.g., A=77%)
                if (td.querySelector('span.bold-text')) {
                  Array.from(td.childNodes).forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                      children.push(
                        new Paragraph({
                          text: node.textContent || '',
                          alignment: AlignmentType.LEFT,
                        })
                      );
                    } else if (
                      node.nodeType === Node.ELEMENT_NODE &&
                      (node as HTMLElement).classList.contains('bold-text')
                    ) {
                      children.push(
                        new Paragraph({
                          text: node.textContent || '',
                          alignment: AlignmentType.LEFT,
                          run: {
                            bold: true,
                          },
                        })
                      );
                    }
                  });
                } else {
                  children.push(
                    new Paragraph({
                      text: cellText,
                      alignment:
                        td.classList.contains('amount-col') ||
                        td.classList.contains('percentage-col') ||
                        td.classList.contains('ideal-col')
                          ? AlignmentType.RIGHT
                          : AlignmentType.LEFT,
                      run: {
                        bold: isBoldCell || isBoldRow,
                        color: isRedText ? 'FF0000' : '000000', // Red color for red-text
                      },
                      indent: isIndent ? { left: 720 } : undefined, // Approx 0.5 inch indent (720 twips)
                    })
                  );
                }

                rowCells.push(
                  new TableCell({
                    children: children,
                    columnSpan: colSpan,
                    rowSpan: rowSpan,
                    borders: {
                      top: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                      bottom: {
                        style: isDashed
                          ? BorderStyle.DASHED
                          : BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                      left: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                      right: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: '000000',
                      },
                    },
                    shading: {
                      fill: isGreenBg
                        ? '92D050'
                        : isYellowBg
                        ? 'FFFF00'
                        : 'auto', // Green or Yellow background
                      color: 'auto',
                      type: ShadingType.CLEAR,
                    },
                  })
                );
              });
              tableRows.push(new TableRow({ children: rowCells }));
            });

            // Add the paragraph and table to the current DOCX section's children
            childrenForDocxSection.push(
              new Paragraph({
                text: sectionTitle,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
                keepNext: true, // Keep the title with its table
              })
            );
            childrenForDocxSection.push(
              new Table({
                rows: tableRows,
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: '000000',
                  },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: '000000',
                  },
                  left: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: '000000',
                  },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: '000000',
                  },
                  insideHorizontal: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: '000000',
                  },
                  insideVertical: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: '000000',
                  },
                },
              })
            );
          }
        });

        // Add the accumulated children for this HTML page section to a new DOCX section
        docxSections.push({
          properties: {},
          children: childrenForDocxSection,
        });
      });

      const doc = new Document({
        sections: docxSections, // Use the new docxSections array
      });

      const blob = await Packer.toBlob(doc);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'precio-factura.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Word file generated successfully!');
    } catch (error) {
      console.error('Error generating Word file:', error);
    }
  }
  accion(): void {
    this.router.navigate(['panel-control/gastos-operaciones']);
  }
}
