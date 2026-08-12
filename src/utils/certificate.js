import jsPDF from "jspdf";

const loadImageBase64 = async (src) => {
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => {
                console.error(`Failed to read blob as data URL: ${src}`);
                resolve(null);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error(`Failed to fetch image: ${src}`, e);
        return null;
    }
};

export const generateCertificate = (data) => {
    const { studentName, chestNo, eventName, place, grade, team, appName, date, assets } = data;
    const { themeImg, logoImg, compassImg } = assets || {};

    // Create new PDF (Landscape A4)
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 2. Draw Theme Background Pattern
    if (themeImg) {
        // Draw the full theme image
        doc.addImage(themeImg, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

    // 3. Fill Left & Center Area with #faefcf Custom Background
    // This covers placeholder text of the theme but preserves the right pattern
    doc.setFillColor(250, 239, 207); // #faefcf
    const leftPaneWidth = 182;
    doc.rect(8, 8, leftPaneWidth, pageHeight - 16, 'F');

    // 4. Draw Compass Watermark on the Left Side
    const centerLeftX = 8 + (leftPaneWidth / 2); // 99mm
    if (compassImg) {
        try {
            // Draw compass watermark with low opacity
            const gState = new doc.GState({ opacity: 0.06 });
            doc.saveGraphicsState();
            doc.setGState(gState);
            doc.addImage(compassImg, 'PNG', centerLeftX - 55, 105 - 55, 110, 110);
            doc.restoreGraphicsState();
        } catch (e) {
            console.warn("jsPDF GState/opacity is not supported; drawing watermark with fallback", e);
            // Fallback (draw at full opacity or skip)
            doc.addImage(compassImg, 'PNG', centerLeftX - 55, 105 - 55, 110, 110);
        }
    }

    // 5. Draw Gold Borders & Dividing Line to separate content pane and theme pattern
    doc.setDrawColor(184, 144, 71); // Gold color #b89047
    doc.setLineWidth(1.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    doc.setLineWidth(0.5);
    doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

    // Dividing Line
    doc.setLineWidth(1);
    doc.line(8 + leftPaneWidth, 8, 8 + leftPaneWidth, pageHeight - 8);

    // 6. Draw Logo (Hamartia Logo)
    if (logoImg) {
        doc.addImage(logoImg, 'PNG', 18, 16, 50, 20);
    }

    // 7. Add Certificate Content Text
    // Title
    doc.setTextColor(92, 64, 21); // Dark brown/gold #5c4015
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("CERTIFICATE OF MERIT", centerLeftX, 60, { align: "center" });

    // Subtitle
    doc.setTextColor(120, 100, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("PROUDLY PRESENTED TO", centerLeftX, 70, { align: "center" });

    // Student Name
    doc.setTextColor(44, 30, 11); // Very dark brown/black #2c1e0b
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(32);
    doc.text(studentName.toUpperCase(), centerLeftX, 90, { align: "center" });

    // Underline below Name
    doc.setDrawColor(184, 144, 71);
    doc.setLineWidth(0.8);
    doc.line(centerLeftX - 55, 95, centerLeftX + 55, 95);

    // Recognition Description
    doc.setTextColor(92, 64, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text("in recognition of achieving", centerLeftX, 108, { align: "center" });

    // Place & Grade
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(145, 56, 49); // Crimson accent color
    const placeText = `${place.toUpperCase()} PLACE`;
    const gradeText = grade ? ` | GRADE ${grade.toUpperCase()}` : "";
    doc.text(`${placeText}${gradeText}`, centerLeftX, 122, { align: "center" });

    // Event
    doc.setTextColor(92, 64, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text("in the event", centerLeftX, 134, { align: "center" });

    doc.setTextColor(44, 30, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(eventName.toUpperCase(), centerLeftX, 146, { align: "center" });

    // Chest & Team
    doc.setTextColor(120, 100, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Chest No: ${chestNo}   |   Team: ${team}`, centerLeftX, 158, { align: "center" });

    // 8. Footer (Date and Signature)
    // Date (Left bottom of content pane)
    doc.setTextColor(92, 64, 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${date || new Date().toLocaleDateString()}`, 20, 185);
    doc.setDrawColor(184, 144, 71);
    doc.setLineWidth(0.5);
    doc.line(20, 180, 70, 180);

    // Signature (Right bottom of content pane)
    doc.setFont("helvetica", "bold");
    doc.text("General Convener", 130, 180);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Arts Festival Committee", 130, 185);
    doc.setDrawColor(184, 144, 71);
    doc.setLineWidth(0.5);
    doc.line(130, 175, 175, 175);

    // Save the PDF
    doc.save(`Certificate_${studentName.replace(/\s+/g, '_')}_${eventName.replace(/\s+/g, '_')}.pdf`);
};

