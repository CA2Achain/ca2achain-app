export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-4">Privacy Policy</h1>
      <p className="mb-4">
        CA2AChain is built with privacy at its core. We use zero-knowledge proof (ZKP) technology to verify your identity and address without exposing your personal information to sellers. Your sensitive data is encrypted at rest and only decrypted when absolutely necessary for verification purposes.
      </p>
      <p className="mb-4">
        Under CCPA, you have the right to request deletion of your personal data at any time. All verification events are logged to the blockchain using cryptographic hashes that do not reveal any personal data, ensuring non-repudiation and audit trails without compromising your privacy.
      </p>
      <p className="mb-4">
        We never sell your personal information to third parties. Sellers only receive a verification result (age verified, address verified) along with a unique verification ID for their records. Your actual name, date of birth, driver's license number, and address remain private and protected.
      </p>
      <p className="mb-4">
        For detailed information about how we collect, use, and protect your data, please contact our privacy team.
      </p>
    </div>
  )
}