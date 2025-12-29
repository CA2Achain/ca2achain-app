# Legal Documents - Frontend Integration

This directory contains human-readable legal content that gets integrated into the CA2AChain frontend UI for digital consent and compliance.

## File Organization

### Legal Content Files

**📜 privacy-policy.md**
- Complete CCPA privacy policy content
- Used by: PrivacyPolicyModal.tsx, RegistrationFlow.tsx
- Integration: Parse markdown, display in scrollable modal with consent checkboxes

**📄 terms-of-service.md**
- Service terms and AB 1263 compliance obligations  
- Used by: TermsOfServiceModal.tsx, DealerRegistration.tsx
- Integration: Parse markdown, require acceptance before account creation

**✅ consent-forms.md**
- Buyer and dealer consent form templates
- Used by: BuyerConsentForm.tsx, DealerAgreementForm.tsx
- Integration: Extract consent requirements, create interactive checkboxes

**📊 ccpa-compliance-checklist.md**
- Implementation tracking for developers
- Used by: Privacy dashboard components, admin interface
- Integration: Reference for building CCPA rights interface

## Frontend Integration Points

### React Components Structure
```
src/components/legal/
├── PrivacyPolicyModal.tsx      # privacy-policy.md content
├── TermsOfServiceModal.tsx     # terms-of-service.md content
├── BuyerConsentForm.tsx        # buyer consent from consent-forms.md
├── DealerAgreementForm.tsx     # dealer agreement from consent-forms.md
├── CCPAPrivacySettings.tsx     # User privacy rights interface
└── LegalDocumentViewer.tsx     # Generic markdown legal doc viewer
```

### Pages Integration
```
src/pages/legal/
├── privacy.tsx                 # Full privacy policy page
├── terms.tsx                   # Full terms of service page
├── consent-buyer.tsx           # Standalone buyer consent page
└── consent-dealer.tsx          # Standalone dealer consent page
```

### TypeScript Interfaces
```
src/types/legal.ts              # Legal consent tracking types
src/hooks/useLegalConsent.ts    # React hook for consent management
src/utils/legalParser.ts        # Markdown parsing utilities
```

## Digital Consent Implementation

### Required User Experience Flow

**1. Registration Consent Process:**
```
User Registration → Privacy Policy Modal → Terms Modal → Specific Consents → Account Creation
```

**2. Consent Tracking:**
- Document version user consented to
- Timestamp and IP address
- Specific consent checkboxes selected
- Digital signature (name + "I agree")

**3. CCPA Rights Interface:**
- Data download (Right to Know)
- Account deletion (Right to Delete)  
- Privacy preferences (Opt-out controls)
- Consent history viewing

### Backend API Integration

**Consent Recording:**
```typescript
POST /api/consent/record
{
  document_type: 'privacy_policy' | 'terms_of_service',
  document_version: '1.0',
  consents_given: Record<string, boolean>,
  digital_signature: string,
  timestamp: string
}
```

**Legal Document Serving:**
```typescript
GET /api/legal/privacy-policy    # Returns processed privacy policy
GET /api/legal/terms-of-service  # Returns processed terms
GET /api/legal/consent-forms     # Returns consent requirements
```

## Implementation Priority

### Phase 1: Core Legal Components ⏳
- [ ] Parse markdown legal documents
- [ ] Create PrivacyPolicyModal with scroll tracking
- [ ] Create TermsOfServiceModal with acceptance
- [ ] Build consent tracking hook

### Phase 2: Registration Integration ⏳
- [ ] Integrate legal modals into registration flow
- [ ] Add specific AB 1263 consent checkboxes
- [ ] Implement digital signature collection
- [ ] Connect to backend consent API

### Phase 3: CCPA Compliance Interface ⏳
- [ ] Build privacy settings dashboard
- [ ] Add data download functionality
- [ ] Implement account deletion flow
- [ ] Create consent history viewer

## Legal Compliance Notes

### Digital Consent Requirements
- ✅ **Readable Format:** Markdown → HTML rendering
- ✅ **Scroll Completion:** Track user read entire document  
- ✅ **Explicit Consent:** Checkbox for each major consent point
- ✅ **Audit Trail:** Timestamp, IP, version, specific consents
- ✅ **Cannot Bypass:** Must accept to proceed

### AB 1263 Specific Requirements
- Age verification disclosure before ID collection
- Address verification requirements explanation
- Dealer information sharing limitations
- Legal citation references for compliance

### CCPA Specific Requirements  
- Right to Know implementation (data export)
- Right to Delete implementation (account deletion)
- Right to Opt-Out (no data sales disclosure)
- Non-discrimination policy explanation

## Developer Notes

### Markdown Processing
```typescript
// Example: Convert legal markdown to React components
import { remark } from 'remark';
import html from 'remark-html';

const processLegalMarkdown = async (markdownContent: string) => {
  const result = await remark().use(html).process(markdownContent);
  return result.toString();
};
```

### Consent Validation
```typescript
// Example: Validate required consents before proceeding
const validateRequiredConsents = (consents: ConsentRecord): boolean => {
  const required = ['ageConfirmation', 'ab1263Acknowledgment', 'privacyPolicy'];
  return required.every(key => consents[key] === true);
};
```

### Legal Document Versioning
```typescript
// Example: Track document versions for legal compliance
interface LegalDocumentVersion {
  document_type: string;
  version: string;
  effective_date: string;
  content_hash: string; // Verify content integrity
}
```

---

**Next Steps:**
1. Create TypeScript types for legal consent tracking
2. Build markdown parser utilities  
3. Implement core legal UI components
4. Integrate consent flow into registration

**Legal Status:** Content ready for frontend integration, requires legal counsel review before production use.