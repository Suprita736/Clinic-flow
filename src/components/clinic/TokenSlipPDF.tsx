import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";

interface TokenSlipPDFProps {
  tokenNumber: number;
  patientName: string;
  trackingCode: string;
  doctorName: string;
  doctorSpecialization: string;
}

export function TokenSlipActions({ tokenNumber, patientName, trackingCode, doctorName, doctorSpecialization }: TokenSlipPDFProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const generatePdf = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 150] // 80mm thermal receipt width
      });

      // Clinic Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("ClinicFlow", 40, 15, { align: "center" });

      // Subtitle
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text("Official Patient Token", 40, 22, { align: "center" });

      // Doctor Info
      pdf.setTextColor(0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(doctorName, 40, 28, { align: "center" });
      if (doctorSpecialization) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100);
        pdf.text(doctorSpecialization, 40, 32, { align: "center" });
      }

      // Patient Name
      pdf.setTextColor(0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text(patientName, 40, 42, { align: "center" });

      // Token Number (Boxed)
      pdf.setLineWidth(0.5);
      pdf.rect(15, 46, 50, 18, "S");
      pdf.setFontSize(36);
      pdf.setFont("helvetica", "bold");
      pdf.text(`#${tokenNumber}`, 40, 60, { align: "center" });

      // Convert SVG QR code to PNG and Embed
      const svgElement = slipRef.current?.querySelector('svg');
      if (svgElement) {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 150;
            canvas.height = 150;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "white";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, 150, 150);
              const pngData = canvas.toDataURL("image/png");
              // Add image to PDF at center (x=20 for width=40 gives center 40mm)
              pdf.addImage(pngData, "PNG", 20, 71, 40, 40); 
            }
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load SVG for PDF generation"));
          };
          img.src = url;
        });
      }

      // Tracking Instructions
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Scan to track live wait time", 40, 112, { align: "center" });

      // Tracking URL
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      const trackUrl = `${window.location.origin}/track/${trackingCode}`;
      const splitUrl = pdf.splitTextToSize(trackUrl, 70);
      pdf.text(splitUrl, 40, 118, { align: "center" });

      // Issue Date
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`Issued: ${new Date().toLocaleString()}`, 40, 140, { align: "center" });

      pdf.save(`Token_${tokenNumber}_${patientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setDownloading(false);
    }
  };

  const printSlip = () => {
    const printContent = slipRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Token #${tokenNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            .token-num { font-size: 48px; font-weight: bold; margin: 10px 0; border: 2px solid #000; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .patient { font-size: 18px; margin: 10px 0; }
            .qr-container { margin: 20px auto; }
            .footer { font-size: 12px; color: #555; margin-top: 20px; }
            .link { font-size: 10px; word-break: break-all; margin-top: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>ClinicFlow</h1>
          <div class="footer">${doctorName} ${doctorSpecialization ? `— ${doctorSpecialization}` : ''}</div>
          <p class="patient">Patient: ${patientName}</p>
          <div class="token-num">#${tokenNumber}</div>
          <div class="qr-container">
            ${slipRef.current?.querySelector('svg')?.outerHTML || ''}
          </div>
          <p>Scan to track live wait time</p>
          <p class="link">${window.location.origin}/track/${trackingCode}</p>
          <div class="footer">Issued: ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden component solely for capturing via printSlip and SVG extraction */}
      <div className="absolute -left-[9999px] top-0">
        <div
          ref={slipRef}
          className="bg-white p-6 w-[300px] flex flex-col items-center justify-center text-center font-sans text-black"
          style={{ width: '300px', backgroundColor: 'white', color: 'black' }}
        >
          <h1 className="text-2xl font-bold mb-1">ClinicFlow</h1>
          <p
            style={{
              fontSize: "12px",
              color: "#666",
              marginBottom: "16px",
            }}
          >
            Official Patient Token
          </p>

          <p className="text-sm font-bold text-black">{doctorName}</p>
          <p className="text-xs text-muted-foreground mb-4">{doctorSpecialization}</p>

          <p className="text-lg font-medium">{patientName}</p>

          <div className="text-5xl font-bold border-4 border-black rounded-xl px-6 py-2 my-2">
            #{tokenNumber}
          </div>

          <div className="my-2 bg-white p-2">
            <QRCodeSVG
              value={`${window.location.origin}/track/${trackingCode}`}
              size={150}
              level="M"
              includeMargin={true}
            />
          </div>

          <p className="text-sm font-bold mt-2">Scan to track live wait time</p>
          <p
            style={{
              fontSize: "10px",
              color: "#666",
              wordBreak: "break-all",
              marginTop: "4px",
            }}
          >{window.location.origin}/track/{trackingCode}</p>

          <p
            style={{
              fontSize: "10px",
              color: "#999",
              marginTop: "24px",
            }}
          >
            Issued: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        <Button className="flex-1" variant="outline" onClick={generatePdf} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download PDF
        </Button>
        <Button className="flex-1" variant="outline" onClick={printSlip}>
          <Printer className="h-4 w-4 mr-2" />
          Print Slip
        </Button>
      </div>
    </div>
  );
}
