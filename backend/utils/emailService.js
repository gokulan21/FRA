const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        if (config.emailUser && config.emailPassword) {
            this.transporter = nodemailer.createTransporter({
                service: config.emailService,
                auth: {
                    user: config.emailUser,
                    pass: config.emailPassword
                }
            });
        } else {
            console.log('Email service not configured. Emails will be logged to console.');
        }
    }

    async sendEmail(to, subject, html, text) {
        try {
            if (!this.transporter) {
                console.log('Email would be sent:');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Content: ${text || html}`);
                return { success: true, message: 'Email logged to console' };
            }

            const mailOptions = {
                from: `${config.appName} <${config.emailUser}>`,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, '')
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendNGORegistrationNotification(ngo) {
        const subject = 'New NGO Registration - Approval Required';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a7c59;">New NGO Registration</h2>
                <p>A new NGO has registered on the FRA Patta Management System and requires approval.</p>
                
                <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>NGO Details:</h3>
                    <p><strong>Email:</strong> ${ngo.email}</p>
                    <p><strong>Organization:</strong> ${ngo.profile.organization || 'Not provided'}</p>
                    <p><strong>Name:</strong> ${ngo.profile.name || 'Not provided'}</p>
                    <p><strong>District:</strong> ${ngo.profile.district || 'Not provided'}</p>
                    <p><strong>Area of Operation:</strong> ${ngo.profile.areaOfOperation || 'Not provided'}</p>
                    <p><strong>Registration Date:</strong> ${new Date(ngo.createdAt).toLocaleDateString()}</p>
                </div>
                
                <p>Please log in to the system to review and approve this NGO registration.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(config.supportEmail, subject, html);
    }

    async sendNGOApprovalEmail(ngo) {
        const subject = 'NGO Registration Approved - Welcome to FRA Patta Management System';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a7c59;">Registration Approved!</h2>
                <p>Dear ${ngo.profile.name || ngo.email},</p>
                
                <p>Congratulations! Your NGO registration has been approved for the FRA Patta Management System.</p>
                
                <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>What's Next?</h3>
                    <ul>
                        <li>You can now log in to the system using your registered email and password</li>
                        <li>Access your dashboard to view assigned tasks and areas</li>
                        <li>Submit reports and communicate with the Ministry</li>
                        <li>Download relevant policies and guidelines</li>
                    </ul>
                </div>
                
                <p>We look forward to working with you to support tribal communities and implement the Forest Rights Act effectively.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(ngo.email, subject, html);
    }

    async sendNGORejectionEmail(ngo, reason) {
        const subject = 'NGO Registration Status - Action Required';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545;">Registration Update</h2>
                <p>Dear ${ngo.profile.name || ngo.email},</p>
                
                <p>Thank you for your interest in joining the FRA Patta Management System. After careful review, we need additional information or clarification regarding your registration.</p>
                
                ${reason ? `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h3>Reason for Review:</h3>
                    <p>${reason}</p>
                </div>
                ` : ''}
                
                <p>Please feel free to contact us for clarification or to resubmit your application with the required information.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(ngo.email, subject, html);
    }

    async sendAssignmentNotification(assignment) {
        const subject = `New Assignment: ${assignment.area}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a7c59;">New Assignment Received</h2>
                <p>Dear ${assignment.assignedTo.profile?.name || assignment.assignedTo.email},</p>
                
                <p>You have been assigned a new task in the FRA Patta Management System.</p>
                
                <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Assignment Details:</h3>
                    <p><strong>Area:</strong> ${assignment.area}</p>
                    <p><strong>Deadline:</strong> ${new Date(assignment.deadline).toLocaleDateString()}</p>
                    <p><strong>Priority:</strong> ${assignment.priority.toUpperCase()}</p>
                    <p><strong>Assigned By:</strong> ${assignment.assignedBy.email}</p>
                </div>
                
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>Instructions:</h4>
                    <p>${assignment.instructions}</p>
                </div>
                
                <p>Please log in to the system to view complete details and start working on this assignment.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(assignment.assignedTo.email, subject, html);
    }

    async sendAssignmentCompletionNotification(assignment) {
        const subject = `Assignment Completed: ${assignment.area}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Assignment Completed</h2>
                <p>Dear Ministry Official,</p>
                
                <p>An assignment has been marked as completed by ${assignment.assignedTo.profile?.name || assignment.assignedTo.email}.</p>
                
                <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Assignment Details:</h3>
                    <p><strong>Area:</strong> ${assignment.area}</p>
                    <p><strong>NGO:</strong> ${assignment.assignedTo.profile?.name || assignment.assignedTo.email}</p>
                    <p><strong>Completed On:</strong> ${new Date(assignment.completedAt).toLocaleDateString()}</p>
                    <p><strong>Original Deadline:</strong> ${new Date(assignment.deadline).toLocaleDateString()}</p>
                </div>
                
                ${assignment.completionNotes ? `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>Completion Notes:</h4>
                    <p>${assignment.completionNotes}</p>
                </div>
                ` : ''}
                
                <p>Please log in to the system to review the complete report and provide feedback.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(assignment.assignedBy.email, subject, html);
    }

    async sendReportSubmissionNotification(assignment) {
        const subject = `Field Report Submitted: ${assignment.area}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a7c59;">Field Report Submitted</h2>
                <p>Dear Ministry Official,</p>
                
                <p>A detailed field report has been submitted by ${assignment.assignedTo.profile?.name || assignment.assignedTo.email}.</p>
                
                <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Report Summary:</h3>
                    <p><strong>Area:</strong> ${assignment.area}</p>
                    <p><strong>NGO:</strong> ${assignment.assignedTo.profile?.name || assignment.assignedTo.email}</p>
                    <p><strong>Submitted On:</strong> ${new Date(assignment.report.submittedAt).toLocaleDateString()}</p>
                </div>
                
                ${assignment.report.summary ? `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>Report Summary:</h4>
                    <p>${assignment.report.summary.substring(0, 200)}...</p>
                </div>
                ` : ''}
                
                <p>The report includes findings, recommendations, and challenges identified during the field visit. Please log in to view the complete report.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(assignment.assignedBy.email, subject, html);
    }

    async sendPasswordResetEmail(user, resetToken) {
        const subject = 'Password Reset Request - FRA Patta Management System';
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a7c59;">Password Reset Request</h2>
                <p>Dear User,</p>
                
                <p>You have requested to reset your password for the FRA Patta Management System.</p>
                
                <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p>Click the button below to reset your password:</p>
                    <a href="${resetUrl}" style="background: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Reset Password</a>
                </div>
                
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                
                <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${config.appName}.<br>
                        For support, contact: ${config.supportEmail}
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmail(user.email, subject, html);
    }
}

module.exports = new EmailService();
