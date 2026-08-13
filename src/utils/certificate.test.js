import { describe, it, expect, vi } from "vitest";
import { generateCertificate, generateValidationNo } from "./certificate";

// Mock jsPDF constructor
vi.mock("jspdf", () => {
    return {
        default: vi.fn().mockImplementation(function () {
            this.internal = {
                pageSize: {
                    getWidth: () => 297,
                    getHeight: () => 210
                }
            };
            this.addImage = vi.fn();
            this.setFillColor = vi.fn();
            this.rect = vi.fn();
            this.setDrawColor = vi.fn();
            this.setLineWidth = vi.fn();
            this.line = vi.fn();
            this.setTextColor = vi.fn();
            this.setFont = vi.fn();
            this.setFontSize = vi.fn();
            this.getTextWidth = vi.fn().mockReturnValue(20);
            this.splitTextToSize = vi.fn().mockImplementation((txt) => [txt]);
            this.text = vi.fn();
            this.save = vi.fn();
            this.GState = function () {};
            this.saveGraphicsState = vi.fn();
            this.setGState = vi.fn();
            this.restoreGraphicsState = vi.fn();
        })
    };
});

describe("Certificate Utility", () => {
    it("should generate deterministic validation numbers", () => {
        const val1 = generateValidationNo("A101", "Painting", "John Doe");
        const val2 = generateValidationNo("A101", "Painting", "John Doe");
        expect(val1).toBe(val2);
        expect(val1).toMatch(/^HAF26-A101-[A-Z0-9]+$/);
    });

    it("should use explicit validationNo if passed", () => {
        const val = generateValidationNo("A101", "Painting", "John Doe", "CUSTOM-12345");
        expect(val).toBe("CUSTOM-12345");
    });

    it("should generate certificate with validation number without throwing error", () => {
        expect(() => {
            generateCertificate({
                studentName: "John Doe",
                chestNo: "A101",
                eventName: "TRANSLATION URDU-MALAYALAM",
                place: "1st",
                grade: "A",
                team: "AETHER",
                date: "12/08/2026",
                assets: {
                    themeImg: "data:image/jpeg;base64,mock"
                }
            });
        }).not.toThrow();
    });

    it("should handle missing optional properties gracefully", () => {
        expect(() => {
            generateCertificate({});
        }).not.toThrow();
    });
});
