# CA2AChain Privacy Policy

**Effective Date:** [Date]  
**Last Updated:** [Date]

## Overview

CA2AChain provides zero-knowledge identity verification services to comply with California Assembly Bill 1263 (AB 1263) regarding firearm accessory purchases. This Privacy Policy explains how we collect, use, store, and protect your personal information in compliance with the California Consumer Privacy Act (CCPA) and other applicable privacy laws.

## 1. Information We Collect

### Personal Information Categories (CCPA)

**Identity Information:**
- Full name
- Date of birth
- Government-issued ID number (driver's license)
- Email address
- Phone number (optional)

**Address Information:**
- Residential address from government ID
- Shipping addresses (for verification purposes)

**Verification Data:**
- Government ID photos and data
- Biometric verification results
- Identity verification session data

**Financial Information:**
- Payment method for one-time $39 verification fee
- Payment transaction records

**Commercial Information:**
- Verification requests from dealers
- Purchase compliance records
- Transaction histories

## 2. How We Collect Information

**Direct Collection:**
- Registration forms
- Identity verification process (via Persona)
- Payment processing (via Stripe)

**Automatic Collection:**
- API request logs
- System access logs
- Security monitoring data

**Third-Party Sources:**
- Government ID verification (Persona)
- Address validation services
- Payment processing (Stripe)

## 3. How We Use Your Information

### Primary Uses (AB 1263 Compliance)

**Age Verification:**
- Verify buyers are 18+ years old
- Generate cryptographic age proofs
- Provide verification to authorized dealers

**Address Verification:**
- Verify California residency when required
- Confirm shipping address matches ID address
- Prevent out-of-state sales when prohibited

**Legal Compliance:**
- Meet AB 1263 firearm accessory verification requirements
- Maintain audit trails for regulatory compliance
- Support law enforcement investigations when legally required

### Technical Implementation

**Zero-Knowledge Proofs:**
- Your personal data is encrypted and stored securely
- Dealers receive only "verified" or "not verified" responses
- Your actual age, address, and ID details are never shared with dealers

**Blockchain Storage:**
- Cryptographic proofs of verification are stored on Polygon blockchain
- These proofs confirm verification occurred without revealing personal data
- Blockchain records are immutable and court-verifiable

## 4. Information Sharing and Disclosure

### Who We Share With

**Authorized Dealers (Limited Data Only):**
- Verification results: "Age Verified: Yes/No"
- Address match results: "Address Verified: Yes/No"
- Compliance requirements and legal citations
- **We DO NOT share:** Your actual age, address, name, or ID details

**Service Providers:**
- **Identity Verification:** Persona (government ID verification)
- **Payment Processing:** Stripe (payment transactions)
- **Email Service:** Resend (transactional emails only)
- **Database:** Supabase (encrypted data storage)
- **Blockchain:** Polygon network (cryptographic proofs only)

**Legal Disclosures:**
- Court orders and subpoenas
- Law enforcement investigations (when legally required)
- Regulatory audits and compliance reviews

### What We NEVER Share

- Your actual date of birth
- Your home address
- Your driver's license number
- Your government ID photos
- Your payment information
- Any personally identifiable information beyond verification results

## 5. Data Storage and Security

### Encryption and Protection

**At Rest:**
- All personal data encrypted using AES-256
- Encryption keys stored separately from data
- Supabase Vault for sensitive information

**In Transit:**
- TLS 1.3 encryption for all API communications
- Certificate pinning for mobile applications
- End-to-end encryption for sensitive operations

**Access Controls:**
- Multi-factor authentication required
- Role-based access permissions
- Regular security audits and monitoring

### Data Locations

**Primary Storage:** United States (Supabase)
**Blockchain Storage:** Polygon network (cryptographic proofs only)
**Payment Data:** Stripe (PCI DSS compliant)
**Verification Data:** Persona (identity verification partner)

## 6. Your California Privacy Rights (CCPA)

### Right to Know

You have the right to know:
- What personal information we collect
- How we use your personal information
- Who we share your personal information with
- How long we keep your personal information

**To exercise:** Email privacy@ca2achain.com or use the "Download My Data" feature in your account.

### Right to Delete

You have the right to request deletion of your personal information.

**Important Blockchain Notice:** While we will delete all personal data from our databases, cryptographic verification proofs stored on the blockchain cannot be deleted due to the immutable nature of blockchain technology. These proofs contain NO personal information - only mathematical confirmations that verification occurred.

**To exercise:** Email privacy@ca2achain.com or use the "Delete Account" feature in your account.

### Right to Opt-Out of Sale

**We do not sell your personal information.** We only share verification results (verified/not verified) with authorized dealers for AB 1263 compliance purposes.

### Right to Non-Discrimination

We will not discriminate against you for exercising your CCPA rights. However, note that identity verification is required by law for firearm accessory purchases, so account deletion will prevent future use of our service.

### CCPA Request Process

**Response Time:** 45 days maximum
**Verification:** We may request additional information to verify your identity
**Format:** Data provided in commonly used electronic format
**Cost:** No fee for requests (up to twice per 12-month period)

## 7. Data Retention

### Personal Data (Deletable per CCPA)

**Identity Information:** Until account deletion or 7 years after last activity
**Verification Records:** Until account deletion or 7 years for legal compliance
**Payment Information:** 7 years for financial record requirements
**Communication Records:** 3 years or until account deletion

### Blockchain Records (Permanent)

**Verification Proofs:** Permanently stored on blockchain (no personal data)
**Compliance Records:** Immutable audit trail for legal protection
**Court Evidence:** Available for legal proceedings even after data deletion

**Important:** Blockchain records contain only cryptographic proofs that verification occurred. They do not contain names, addresses, dates of birth, or any personally identifiable information.

## 8. AB 1263 Compliance Notice

### Legal Requirement Disclosure

California Assembly Bill 1263 requires age and address verification for firearm accessory purchases. By using CA2AChain:

- Your identity will be verified once for lifetime use
- Verification results will be shared with authorized dealers
- Compliance records will be maintained for legal protection
- Audit trails may be requested by law enforcement or courts

### Dealer Information Sharing

When you make a purchase, we share with the dealer:
- ✅ Age verification status (verified/not verified)
- ✅ Address verification status (verified/not verified) 
- ✅ Compliance requirements they must follow
- ❌ Your actual age, address, name, or ID details

### Compliance Benefits

- **One-time verification:** Never repeat the process
- **Privacy protection:** Dealers get verification without your personal data
- **Legal compliance:** Meets all AB 1263 requirements
- **Court protection:** Immutable audit trail for legal disputes

## 9. International Users

Our service is designed for California residents and US-based firearm accessory dealers. We do not intentionally collect information from individuals outside the United States.

If you are accessing our service from outside the US, your information may be transferred to and processed in the United States where our servers are located.

## 10. Children's Privacy

Our service is only available to individuals 18 years or older. We do not knowingly collect personal information from children under 18. If we discover we have collected information from a child under 18, we will delete it immediately.

## 11. Changes to This Policy

We may update this Privacy Policy to reflect changes in our practices or for legal compliance. 

**Notification:** We will notify you of material changes via email and by posting the updated policy on our website.
**Effective Date:** Changes become effective 30 days after posting unless otherwise specified.
**Continued Use:** Your continued use of our service after changes become effective constitutes acceptance of the updated policy.

## 12. Contact Information

### Privacy Questions

**Email:** privacy@ca2achain.com
**Mail:** 
CA2AChain Privacy Office
[Address]

### CCPA Requests

**Email:** ccpa@ca2achain.com
**Online:** Account dashboard > Privacy Settings
**Phone:** [Phone Number] (Mon-Fri 9AM-5PM PST)

### Legal Compliance

**Email:** legal@ca2achain.com
**Mail:** 
CA2AChain Legal Department
[Address]

## 13. Legal Basis for Processing (GDPR Compliance)

For users subject to GDPR, our legal basis for processing includes:
- **Legal Compliance:** AB 1263 firearm accessory verification requirements
- **Legitimate Interests:** Fraud prevention and security
- **Contract Performance:** Providing verification services
- **Consent:** For marketing communications (where applicable)

---

**This Privacy Policy is designed to comply with:**
- California Consumer Privacy Act (CCPA)
- California Assembly Bill 1263 (AB 1263)
- General Data Protection Regulation (GDPR)
- California Civil Code Section 1798 et seq.
- Federal privacy and data protection laws

**Last Legal Review:** [Date]
**Next Scheduled Review:** [Date]