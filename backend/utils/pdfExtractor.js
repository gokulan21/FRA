const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

class PDFExtractor {
    constructor() {
        // Enhanced regular expressions for better extraction
        this.patterns = {
            claimantName: [
                /(?:claimant|applicant|name|holder)[:\s]*([a-zA-Z\s]+)/i,
                /name[:\s]*([a-zA-Z\s]+)/i,
                /श्री[.\s]*([a-zA-Z\s\u0900-\u097F]+)/i,
                /holder[:\s]*([a-zA-Z\s]+)/i,
                /beneficiary[:\s]*([a-zA-Z\s]+)/i
            ],
            district: [
                /district[:\s]*([a-zA-Z\s]+)/i,
                /जिला[:\s]*([a-zA-Z\s\u0900-\u097F]+)/i,
                /dist[:\s]*([a-zA-Z\s]+)/i
            ],
            village: [
                /village[:\s]*([a-zA-Z\s]+)/i,
                /गाँव[:\s]*([a-zA-Z\s\u0900-\u097F]+)/i,
                /gram[:\s]*([a-zA-Z\s]+)/i
            ],
            state: [
                /state[:\s]*([a-zA-Z\s]+)/i,
                /राज्य[:\s]*([a-zA-Z\s\u0900-\u097F]+)/i
            ],
            landArea: [
                /(?:area|land|क्षेत्रफल)[:\s]*([0-9.]+)\s*(?:hectare|acre|ha|एकड़)/i,
                /([0-9.]+)\s*(?:hectare|acre|ha|एकड़)/i,
                /area[:\s]*([0-9.]+)/i
            ],
            approvalDate: [
                /(?:approval|approved|date|dated)[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
                /([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/g
            ]
        };
    }

    async extractPattaData(filePath) {
        try {
            const extractedData = {};
            
            if (path.extname(filePath).toLowerCase() === '.pdf') {
                const result = await this.extractFromPDF(filePath);
                Object.assign(extractedData, result);
            } else {
                const result = await this.extractFromDocument(filePath);
                Object.assign(extractedData, result);
            }

            // Post-process and validate extracted data
            return this.validateAndCleanData(extractedData);

        } catch (error) {
            console.error('Error extracting patta data:', error);
            return {
                error: 'Failed to extract data from document',
                claimantName: 'Document Processing Required',
                district: 'Manual Entry Required',
                village: 'Manual Entry Required',
                state: 'Manual Entry Required',
                extractionNote: 'Please verify extracted information'
            };
        }
    }

    async extractFromPDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;

        console.log('PDF Text extracted:', text.substring(0, 500)); // Debug log
        return this.extractFieldsFromText(text);
    }

    async extractFromDocument(filePath) {
        // For DOC/DOCX files - basic text extraction
        try {
            // You might want to use mammoth or similar library for better DOC extraction
            const text = fs.readFileSync(filePath, 'utf8');
            return this.extractFieldsFromText(text);
        } catch (error) {
            return {
                claimantName: 'Document Processing Required',
                district: 'Manual Entry Required',
                village: 'Manual Entry Required',
                state: 'Manual Entry Required',
                extractionNote: 'DOC/DOCX processing requires manual verification'
            };
        }
    }

    extractFieldsFromText(text) {
        const extractedData = {};
        
        // Clean the text
        const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        console.log('Cleaned text for extraction:', cleanText.substring(0, 300)); // Debug log

        // Extract each field using patterns
        Object.keys(this.patterns).forEach(field => {
            const patterns = this.patterns[field];
            
            for (const pattern of patterns) {
                const match = cleanText.match(pattern);
                if (match && match[1]) {
                    extractedData[field] = this.cleanExtractedValue(match[1], field);
                    console.log(`Extracted ${field}:`, extractedData[field]); // Debug log
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
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
                break;
                
            case 'district':
            case 'village':
            case 'state':
                // Clean location names
                cleaned = cleaned.replace(/[^a-zA-Z\s\u0900-\u097F]/g, '');
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
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
        } else {
            validated.claimantName = 'Name extraction required';
        }
        
        // Validate location fields
        ['district', 'village', 'state'].forEach(field => {
            if (data[field] && typeof data[field] === 'string' && data[field].length > 1) {
                validated[field] = data[field].substring(0, 50);
            } else {
                validated[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} required`;
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
            key !== 'extractionMetadata' && key !== 'coordinates' && 
            !data[key].toString().includes('required')
        ).length;
        
        return Math.round((extractedFields / totalFields) * 100);
    }
}

module.exports = new PDFExtractor();
