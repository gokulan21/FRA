const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

class PDFExtractor {
    constructor() {
        // Regular expressions for extracting different fields
        this.patterns = {
            claimantName: [
                /(?:claimant|applicant|name)[:\s]*([a-zA-Z\s]+)/i,
                /name[:\s]*([a-zA-Z\s]+)/i,
                /श्री[.\s]*([a-zA-Z\s\u0900-\u097F]+)/i
            ],
            district: [
                /district[:\s]*([a-zA-Z\s]+)/i,
                /जिला[:\s]*([a-zA-Z\s\u0900-\u097F]+)/i
            ],
            village: [
                /village[:\s]*([a-zA-Z\s]+)/i,
                /गाँव[:\s]*([a-zA-Z\s\u0900-\u097F]+)/i
            ],
            state: [
                /state[:\s]*([a-zA-Z\s]+)/i,
                /राज्य[:\s]*([a-zA-Z\s\u0900-\u097F]+)/i
            ],
            landArea: [
                /(?:area|land)[:\s]*([0-9.]+)\s*(?:hectare|acre|ha)/i,
                /क्षेत्रफल[:\s]*([0-9.]+)/i
            ],
            approvalDate: [
                /(?:approval|approved)[:\s]*(?:date|on)[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
                /(?:date|dated)[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i
            ]
        };
    }

    async extractPattaData(filePath) {
        try {
            const extractedData = {};
            
            if (path.extname(filePath).toLowerCase() === '.pdf') {
                extractedData = await this.extractFromPDF(filePath);
            } else {
                extractedData = await this.extractFromDocument(filePath);
            }

            // Post-process and validate extracted data
            return this.validateAndCleanData(extractedData);

        } catch (error) {
            console.error('Error extracting patta data:', error);
            return {
                error: 'Failed to extract data from document',
                claimantName: 'Unknown',
                district: 'Unknown',
                village: 'Unknown',
                state: 'Unknown'
            };
        }
    }

    async extractFromPDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;

        return this.extractFieldsFromText(text);
    }

    async extractFromDocument(filePath) {
        // For DOC/DOCX files, we would need additional libraries
        // For now, return basic structure
        return {
            claimantName: 'Document Processing Required',
            district: 'Manual Entry Required',
            village: 'Manual Entry Required',
            state: 'Manual Entry Required',
            extractionNote: 'DOC/DOCX processing not fully implemented'
        };
    }

    extractFieldsFromText(text) {
        const extractedData = {};
        
        // Clean the text
        const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

        // Extract each field using patterns
        Object.keys(this.patterns).forEach(field => {
            const patterns = this.patterns[field];
            
            for (const pattern of patterns) {
                const match = cleanText.match(pattern);
                if (match && match[1]) {
                    extractedData[field] = this.cleanExtractedValue(match[1], field);
                    break;
                }
            }
        });

        // Try to extract coordinates if present
        const coordPattern = /(?:lat|latitude)[:\s]*([0-9.-]+)[,\s]*(?:lon|long|longitude)[:\s]*([0-9.-]+)/i;
        const coordMatch = cleanText.match(coordPattern);
        if (coordMatch) {
            extractedData.coordinates = {
                latitude: parseFloat(coordMatch[1]),
                longitude: parseFloat(coordMatch[2])
            };
        }

        return extractedData;
    }

    cleanExtractedValue(value, fieldType) {
        let cleaned = value.trim();
        
        switch (fieldType) {
            case 'claimantName':
                // Remove common prefixes and clean name
                cleaned = cleaned.replace(/^(Mr|Mrs|Ms|Dr|Sri|Smt)\.?\s*/i, '');
                cleaned = cleaned.replace(/[^a-zA-Z\s\u0900-\u097F]/g, '');
                break;
                
            case 'district':
            case 'village':
            case 'state':
                // Clean location names
                cleaned = cleaned.replace(/[^a-zA-Z\s\u0900-\u097F]/g, '');
                break;
                
            case 'landArea':
                // Extract numeric value
                const numMatch = cleaned.match(/([0-9.]+)/);
                if (numMatch) {
                    cleaned = parseFloat(numMatch[1]);
                }
                break;
                
            case 'approvalDate':
                // Try to parse date
                cleaned = this.parseDate(cleaned);
                break;
        }
        
        return cleaned;
    }

    parseDate(dateString) {
        try {
            // Handle different date formats
            const formats = [
                /([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})/,
                /([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{2})/
            ];

            for (const format of formats) {
                const match = dateString.match(format);
                if (match) {
                    let day = parseInt(match[1]);
                    let month = parseInt(match[2]);
                    let year = parseInt(match[3]);
                    
                    // Handle 2-digit years
                    if (year < 100) {
                        year += year < 50 ? 2000 : 1900;
                    }
                    
                    return new Date(year, month - 1, day);
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    validateAndCleanData(data) {
        const validated = {};
        
        // Validate claimant name
        if (data.claimantName && typeof data.claimantName === 'string' && data.claimantName.length > 2) {
            validated.claimantName = data.claimantName.substring(0, 100);
        }
        
        // Validate location fields
        ['district', 'village', 'state'].forEach(field => {
            if (data[field] && typeof data[field] === 'string' && data[field].length > 1) {
                validated[field] = data[field].substring(0, 50);
            }
        });
        
        // Validate land area
        if (data.landArea && !isNaN(data.landArea) && data.landArea > 0) {
            validated.landArea = parseFloat(data.landArea);
        }
        
        // Validate approval date
        if (data.approvalDate instanceof Date && !isNaN(data.approvalDate)) {
            validated.approvalDate = data.approvalDate;
        }
        
        // Validate coordinates
        if (data.coordinates && 
            typeof data.coordinates.latitude === 'number' && 
            typeof data.coordinates.longitude === 'number' &&
            Math.abs(data.coordinates.latitude) <= 90 &&
            Math.abs(data.coordinates.longitude) <= 180) {
            validated.coordinates = data.coordinates;
        }
        
        // Add extraction metadata
        validated.extractionMetadata = {
            extractedAt: new Date(),
            extractedFields: Object.keys(validated),
            confidence: this.calculateConfidence(validated)
        };
        
        return validated;
    }

    calculateConfidence(data) {
        const totalFields = 6; // claimantName, district, village, state, landArea, approvalDate
        const extractedFields = Object.keys(data).filter(key => 
            key !== 'extractionMetadata' && key !== 'coordinates'
        ).length;
        
        return Math.round((extractedFields / totalFields) * 100);
    }
}

module.exports = new PDFExtractor();
