const mongoose = require('mongoose');

const pattaSchema = new mongoose.Schema({
    claimantName: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    village: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    approvalDate: {
        type: Date
    },
    landArea: {
        type: Number
    },
    coordinates: {
        latitude: Number,
        longitude: Number
    },
    filePath: {
        type: String,
        required: true
    },
    extractedData: {
        type: Object
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Patta', pattaSchema);