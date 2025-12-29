/**
 * Legal Consent and Compliance Types
 * 
 * TypeScript interfaces for digital legal consent tracking,
 * CCPA compliance, and AB 1263 verification requirements.
 */

// =============================================
// Core Legal Document Types
// =============================================

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export type LegalDocumentType = 
  | 'privacy_policy'
  | 'terms_of_service' 
  | 'buyer_consent'
  | 'dealer_agreement'
  | 'ab1263_disclosure';

// =============================================
// Digital Consent Tracking
// =============================================

export interface ConsentRecord {
  id: string;
  user_id: string;
  user_type: 'buyer' | 'dealer';
  document_type: LegalDocumentType;
  document_version: string;
  consents_given: Record<string, boolean>;
  digital_signature: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  consent_method: 'registration' | 'update' | 'reconfirmation';
}

export interface BuyerConsents {
  // Age and Identity
  ageConfirmation: boolean;                    // "I am at least 18 years old"
  identityVerification: boolean;               // "I consent to government ID verification"
  
  // AB 1263 Compliance
  ab1263Acknowledgment: boolean;               // "I understand AB 1263 requires this verification"
  ab1263Disclosure: boolean;                   // "I have read the AB 1263 disclosure"
  
  // Data Collection and Use
  personaVerification: boolean;                // "I consent to Persona identity verification"
  dataEncryption: boolean;                     // "I understand my data will be encrypted"
  dataRetention: boolean;                      // "I understand data retention policies"
  
  // Information Sharing
  dealerSharing: boolean;                      // "I consent to sharing verification status with dealers"
  zeroKnowledgeUnderstanding: boolean;         // "I understand dealers get only verified/not verified"
  
  // Blockchain and Privacy
  blockchainStorage: boolean;                  // "I consent to blockchain proof storage"
  blockchainImmutability: boolean;            // "I understand blockchain records cannot be deleted"
  blockchainNoPersonalData: boolean;          // "I understand blockchain contains no personal data"
  
  // Privacy Rights (CCPA)
  ccpaRights: boolean;                         // "I understand my CCPA privacy rights"
  rightToKnow: boolean;                        // "I understand my right to access data"
  rightToDelete: boolean;                      // "I understand my right to delete data"
  rightToOptOut: boolean;                      // "I understand my right to opt-out"
  
  // Legal Agreements
  privacyPolicy: boolean;                      // "I have read and agree to the Privacy Policy"
  termsOfService: boolean;                     // "I have read and agree to the Terms of Service"
  
  // Payment
  paymentAuthorization: boolean;               // "I authorize $2 verification fee"
}

export interface DealerConsents {
  // Business and Legal
  businessLicense: boolean;                    // "My business is properly licensed"
  ab1263Compliance: boolean;                   // "I will comply with AB 1263 requirements"
  legalObligations: boolean;                   // "I understand my legal obligations"
  
  // Data Protection
  dataProtection: boolean;                     // "I will protect verification data appropriately"
  noPersonalDataRequest: boolean;              // "I will not request buyer personal information"
  verificationDataSecurity: boolean;          // "I will secure verification results"
  
  // Compliance Actions
  mandatoryActions: boolean;                   // "I will follow all mandatory compliance actions"
  shippingRequirements: boolean;              // "I will use required shipping methods"
  recordKeeping: boolean;                      // "I will maintain required records"
  
  // API Usage
  apiUsageTerms: boolean;                      // "I agree to API usage terms"
  apiSecurityObligation: boolean;             // "I will secure API credentials"
  subscriptionTerms: boolean;                 // "I agree to subscription terms"
  
  // Legal Agreements
  privacyPolicy: boolean;                      // "I have read and agree to the Privacy Policy"
  termsOfService: boolean;                     // "I have read and agree to the Terms of Service"
  dataProcessingAgreement: boolean;           // "I agree to the Data Processing Agreement"
}

// =============================================
// AB 1263 Compliance Types
// =============================================

export interface AB1263Disclosure {
  version: string;
  effective_date: string;
  disclosure_text: string;
  legal_citations: string[];
  mandatory_acknowledgments: AB1263Acknowledgment[];
}

export interface AB1263Acknowledgment {
  id: string;
  requirement: string;
  legal_citation: string;
  penalty_description: string;
  required_for: 'buyer' | 'dealer' | 'both';
}

export interface AB1263ComplianceRecord {
  verification_id: string;
  buyer_id: string;
  dealer_id: string;
  disclosure_version: string;
  acknowledgments_received: Record<string, boolean>;
  timestamp: string;
  compliance_status: 'compliant' | 'non_compliant' | 'pending';
}

// =============================================
// CCPA Privacy Rights Types
// =============================================

export interface CCPARequest {
  id: string;
  user_id: string;
  request_type: CCPARequestType;
  status: CCPARequestStatus;
  requested_at: string;
  fulfilled_at: string | null;
  data_provided: any | null;
  verification_method: 'email' | 'identity_verification';
  notes: string;
}

export type CCPARequestType = 
  | 'right_to_know'      // Data export request
  | 'right_to_delete'    // Account deletion request
  | 'right_to_correct'   // Data correction request
  | 'right_to_portability'; // Data portability request

export type CCPARequestStatus =
  | 'pending'
  | 'verified'
  | 'processing'
  | 'completed'
  | 'denied'
  | 'expired';

export interface CCPADataExport {
  user_id: string;
  export_date: string;
  data_categories: DataCategory[];
  total_records: number;
  format: 'json' | 'csv' | 'pdf';
  download_url: string;
  expires_at: string;
}

export interface DataCategory {
  category: string;
  description: string;
  record_count: number;
  retention_period: string;
  can_be_deleted: boolean;
  deletion_exceptions: string[];
}

// =============================================
// Legal Document Interaction Types
// =============================================

export interface LegalDocumentView {
  user_id: string;
  document_type: LegalDocumentType;
  document_version: string;
  view_started: string;
  view_completed: string | null;
  scroll_progress: number; // 0-100%
  time_spent: number; // seconds
  completed_reading: boolean;
}

export interface DigitalSignature {
  signature_type: 'typed_name' | 'checkbox' | 'button_click';
  signature_value: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  document_hash: string; // Verify content integrity
}

// =============================================
// Frontend UI State Types
// =============================================

export interface LegalModalState {
  isOpen: boolean;
  documentType: LegalDocumentType;
  requireConsent: boolean;
  hasScrolledToBottom: boolean;
  consentCheckboxes: Record<string, boolean>;
  isLoading: boolean;
}

export interface ConsentFlowState {
  currentStep: ConsentFlowStep;
  completedSteps: ConsentFlowStep[];
  consentsGiven: Partial<BuyerConsents | DealerConsents>;
  documentsViewed: LegalDocumentType[];
  canProceed: boolean;
  errors: string[];
}

export type ConsentFlowStep =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'ab1263_disclosure'
  | 'specific_consents'
  | 'digital_signature'
  | 'payment_authorization'
  | 'completion';

// =============================================
// API Request/Response Types
// =============================================

export interface RecordConsentRequest {
  document_type: LegalDocumentType;
  document_version: string;
  consents_given: Record<string, boolean>;
  digital_signature: string;
  consent_method: 'registration' | 'update' | 'reconfirmation';
}

export interface RecordConsentResponse {
  success: boolean;
  consent_id: string;
  timestamp: string;
  next_required_consents?: LegalDocumentType[];
}

export interface GetLegalDocumentRequest {
  document_type: LegalDocumentType;
  version?: string; // Latest if not specified
  format?: 'markdown' | 'html' | 'pdf';
}

export interface GetLegalDocumentResponse {
  document: LegalDocument;
  consent_requirements: string[];
  version_history: LegalDocument[];
}

// =============================================
// Validation and Utility Types
// =============================================

export interface ConsentValidation {
  isValid: boolean;
  missingConsents: string[];
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface LegalComplianceStatus {
  user_id: string;
  privacy_policy_accepted: boolean;
  terms_of_service_accepted: boolean;
  ab1263_disclosed: boolean;
  ccpa_rights_acknowledged: boolean;
  all_consents_current: boolean;
  last_updated: string;
  requires_reconfirmation: boolean;
}

// =============================================
// Constants and Enums
// =============================================

export const REQUIRED_BUYER_CONSENTS: (keyof BuyerConsents)[] = [
  'ageConfirmation',
  'ab1263Acknowledgment', 
  'personaVerification',
  'dealerSharing',
  'blockchainStorage',
  'ccpaRights',
  'privacyPolicy',
  'termsOfService',
  'paymentAuthorization'
];

export const REQUIRED_DEALER_CONSENTS: (keyof DealerConsents)[] = [
  'businessLicense',
  'ab1263Compliance',
  'dataProtection',
  'mandatoryActions',
  'apiUsageTerms',
  'privacyPolicy',
  'termsOfService',
  'dataProcessingAgreement'
];

export const CCPA_REQUEST_TIMEFRAMES = {
  response_time: 45, // days
  verification_time: 10, // days
  fulfillment_time: 45, // days
  appeal_time: 30 // days
} as const;