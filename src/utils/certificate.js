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

const setFontSafe = (doc, fontName, fontStyle, fallbackFont = "times") => {
    try {
        doc.setFont(fontName, fontStyle);
    } catch (e) {
        doc.setFont(fallbackFont, fontStyle);
    }
};

export const generateValidationNo = (chestNo, eventName, studentName, validationNo) => {
    if (validationNo && String(validationNo).trim()) {
        return String(validationNo).trim().toUpperCase();
    }
    const raw = `${chestNo || ''}-${eventName || ''}-${studentName || ''}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = (hash << 5) - hash + raw.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(36).toUpperCase().padStart(5, '0');
    const suffix = String(chestNo || 'X').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `HAF26-${suffix}-${hex}`;
};

export const generateCertificate = (data) => {
    const { studentName, chestNo, eventName, place, grade, team, appName, date, validationNo, certNo, assets } = data || {};
    const { themeImg } = assets || {};

    // Safe string fallbacks (Full original event name preserved)
    const safeStudentName = String(studentName || "Participant").trim();
    const safeChestNo = chestNo ? String(chestNo).trim() : "";
    const safeEventName = String(eventName || "Event").trim();
    const safePlace = String(place || "").trim();
    const safeGrade = grade ? String(grade).trim() : "";
    const safeTeam = team ? String(team).trim() : "";

    // Create new PDF (Landscape A4: 297mm x 210mm)
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Draw Official Template Background Image
    if (themeImg) {
        doc.addImage(themeImg, 'JPEG', 0, 0, pageWidth, pageHeight);
    } else {
        // Fallback cream background
        doc.setFillColor(250, 239, 207);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    // 2. Certificate Verification Number (Top Right Header: X=175mm, Y=18mm)
    const validNo = generateValidationNo(safeChestNo, safeEventName, safeStudentName, validationNo || certNo);
    doc.setTextColor(1, 49, 95); // Color #01315f (RGB 1, 49, 95)
    doc.setFontSize(8.5);
    setFontSafe(doc, "CooperBT", "bold", "times");
    doc.text(validNo, 210, 196);

    // 3. Student Name (Centered above underline line, Color: #01315f, Font: Canva Student Font / Times, Size: 63.5pt base)
    setFontSafe(doc, "CanvaStudentFont", "bolditalic", "times");
    
    const baseNameFontSize = 63.5;
    doc.setFontSize(baseNameFontSize);

    // Measure Student Name width at 63.5pt
    let nameWidth = doc.getTextWidth ? doc.getTextWidth(safeStudentName) : safeStudentName.length * (baseNameFontSize * 0.22);
    
    // Max width allowed over the presentation underline line = 135mm
    const maxNameWidth = 135;
    let nameFontSize = baseNameFontSize;

    // Scale font size down proportionally if name width exceeds 135mm so long names never overflow
    if (nameWidth > maxNameWidth) {
        nameFontSize = baseNameFontSize * (maxNameWidth / nameWidth);
        doc.setFontSize(nameFontSize);
        nameWidth = doc.getTextWidth ? doc.getTextWidth(safeStudentName) : safeStudentName.length * (nameFontSize * 0.22);
    }

    // Calculate exact centered start X position over the underline line (Center X = 86.5mm)
    const startX = Math.max(20, 86.5 - (nameWidth / 2));
    doc.text(safeStudentName, startX, 112);

    // 4. Achievement Details Paragraph (Color: #01315f, Font: Cooper BT, Base Size: 15.1pt)
    doc.setTextColor(1, 49, 95); // Color #01315f (RGB 1, 49, 95)

    const placeFormatted = safePlace ? (safePlace.match(/\d+/) ? `${safePlace} Place` : `${safePlace} Place`) : "Participation";
    const baseFontSize = 15.1;

    // Define line 1 segments cleanly
    const seg1 = { text: "For Securing", bold: false };
    const seg2 = { text: placeFormatted, bold: true };
    const seg3 = { text: "in the Event", bold: false };
    const seg4 = { text: safeEventName, bold: true };
    const seg5 = safeGrade ? { text: "with", bold: false } : null;
    const seg6 = safeGrade ? { text: `Grade - ${safeGrade.toUpperCase()}`, bold: true } : null;
    const seg7 = { text: "at", bold: false };
    const seg8 = { text: "Hamartia Arts Fest 2026–27", bold: true };

    const segments = [seg1, seg2, seg3, seg4, seg5, seg6, seg7, seg8].filter(Boolean);

    // Measure exact space width at 15.1pt
    doc.setFontSize(baseFontSize);
    setFontSafe(doc, "CooperBT", "normal", "times");
    const spaceWidthAt15 = (doc.getTextWidth && doc.getTextWidth("   ") > 0) ? (doc.getTextWidth("   ") / 3) : (baseFontSize * 0.098);

    // Measure line 1 total width including explicit spaceWidthAt15
    let line1WidthAt15 = 0;
    segments.forEach((seg, idx) => {
        setFontSafe(doc, "CooperBT", seg.bold ? "bold" : "normal", "times");
        seg.width15 = doc.getTextWidth ? doc.getTextWidth(seg.text) : seg.text.length * (baseFontSize * 0.18);
        line1WidthAt15 += seg.width15;
        if (idx < segments.length - 1) {
            line1WidthAt15 += spaceWidthAt15;
        }
    });

    // Printable width from X=23mm to X=240mm is 217mm.
    // If line 1 exceeds 217mm, auto-scale line 1 font size so it stays on 1 single clean line!
    const maxLine1Width = 217;
    let line1FontSize = baseFontSize;
    if (line1WidthAt15 > maxLine1Width) {
        line1FontSize = baseFontSize * (maxLine1Width / line1WidthAt15);
    }

    doc.setFontSize(line1FontSize);
    setFontSafe(doc, "CooperBT", "normal", "times");
    const spaceWidth = (doc.getTextWidth && doc.getTextWidth("   ") > 0) ? (doc.getTextWidth("   ") / 3) : (line1FontSize * 0.098);

    const yStart = 135;
    const lineSpacing = 7.2; // Uniform line spacing throughout
    let currentX = 23;
    let currentY = yStart;

    // Render Line 1 on 1 single clean line with explicit spaceWidth gaps
    segments.forEach((seg, idx) => {
        setFontSafe(doc, "CooperBT", seg.bold ? "bold" : "normal", "times");
        const w = doc.getTextWidth ? doc.getTextWidth(seg.text) : seg.text.length * (line1FontSize * 0.18);
        doc.text(seg.text, currentX, currentY);
        currentX += w;
        if (idx < segments.length - 1) {
            currentX += spaceWidth;
        }
    });

    // Paragraph body at 15.1pt font size with 7.2mm line spacing
    doc.setFontSize(baseFontSize);
    setFontSafe(doc, "CooperBT", "normal", "times");
    currentY += lineSpacing;

    const bodyText = "In recognition of your outstanding talent, creativity, and dedication. Your exceptional artistic skills and creative vision have earned you this well-deserved achievement, reflecting your passion and commitment to excellence in art.";
    
    // Split body text into individual lines to apply uniform lineSpacing
    const splitBody = doc.splitTextToSize ? doc.splitTextToSize(bodyText, 215) : [bodyText];
    splitBody.forEach((line) => {
        doc.text(line, 23, currentY);
        currentY += lineSpacing;
    });

    // Line 3: Congratulations (at 15.1pt font size with identical line spacing)
    setFontSafe(doc, "CooperBT", "normal", "times");
    doc.text("Congratulations on this remarkable achievement!", 23, currentY);

    // Save the PDF
    const fileStudent = safeStudentName.replace(/\s+/g, '_');
    const fileEvent = safeEventName.replace(/\s+/g, '_');
    doc.save(`Certificate_${fileStudent}_${fileEvent}.pdf`);
};
